import { author } from '@/lib/site-config';

const urlLimit = 6000;
const actions = [
  { kind: 'question', template: '01-question.yml', prefix: 'Question', field: 'question' },
  { kind: 'correction', template: '02-correction.yml', prefix: 'Correction', field: 'original' },
] as const;

type IssueContext = { title: string; pageUrl: string; text: string; excerptNotice: string };

export function createIssueLinks({ title, pageUrl, text, excerptNotice }: IssueContext) {
  const passage = text.trim();
  const makeLinks = (excerpt: string, truncated: boolean) => actions.map(action => {
    const quote = `> ${excerpt.replaceAll('\n', '\n> ')}${truncated ? `\n\n${excerptNotice}` : ''}\n\n`;
    const parameters = new URLSearchParams({
      template: action.template,
      title: `[${action.prefix}] ${title}`,
      page: `${title} — ${pageUrl}`,
      [action.field]: quote,
    });
    return { kind: action.kind, href: `${author.projectUrl}/issues/new?${parameters}` };
  });
  const links = makeLinks(passage, false);
  if (links.every(link => link.href.length <= urlLimit)) return { links, truncated: false };

  // Budget the encoded URL, since a CJK character can occupy nine URL characters.
  const characters = Array.from(passage);
  let low = 0;
  let high = Math.min(characters.length, urlLimit);
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (makeLinks(characters.slice(0, middle).join(''), true).every(link => link.href.length <= urlLimit)) low = middle;
    else high = middle - 1;
  }
  return { links: makeLinks(characters.slice(0, low).join(''), true), truncated: true };
}
