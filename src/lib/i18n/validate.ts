/**
 * [INPUT]: Message dictionaries and the ICU message AST parser.
 * [OUTPUT]: Key, text, syntax, and interpolation parity validation.
 * [POS]: Pure dictionary contract; plural categories may vary between languages.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { parse, TYPE, type MessageFormatElement } from '@formatjs/icu-messageformat-parser';
type Dictionary = { [key: string]: string | Dictionary };
export function flattenMessages(dictionary: Dictionary, prefix = ''): Record<string, string> {
  return Object.fromEntries(Object.entries(dictionary).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string' ? [[path, value]] : Object.entries(flattenMessages(value, path));
  }));
}
function parameters(elements: MessageFormatElement[], result = new Set<string>()) {
  for (const element of elements) {
    if ('value' in element && element.type !== TYPE.literal && element.type !== TYPE.tag) result.add(element.value);
    if ('options' in element) for (const option of Object.values(element.options)) parameters(option.value, result);
    if ('children' in element) parameters(element.children, result);
  }
  return [...result].sort();
}
export function validateDictionaries(dictionaries: Record<string, Dictionary>) {
  const reference = flattenMessages(dictionaries.en);
  const signatures = Object.fromEntries(Object.entries(reference).map(([key, value]) => [key, parameters(parse(value)).join(',')]));
  for (const [locale, dictionary] of Object.entries(dictionaries)) {
    const messages = flattenMessages(dictionary);
    if (Object.keys(messages).sort().join('|') !== Object.keys(reference).sort().join('|')) throw new Error(`${locale}: message key mismatch`);
    for (const [key, value] of Object.entries(messages)) {
      if (!value.trim()) throw new Error(`${locale}.${key}: empty message`);
      let signature: string;
      try { signature = parameters(parse(value)).join(','); }
      catch (error) { throw new Error(`${locale}.${key}: invalid ICU message`, { cause: error }); }
      if (signature !== signatures[key]) throw new Error(`${locale}.${key}: interpolation parameter mismatch`);
    }
  }
  return Object.keys(reference).length;
}
