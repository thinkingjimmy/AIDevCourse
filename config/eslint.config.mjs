/**
 * [INPUT]: Next.js TypeScript and accessibility lint rules.
 * [OUTPUT]: Project lint configuration.
 * [POS]: Shared quality configuration.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { defineConfig, globalIgnores } from 'eslint/config';
import next from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';
export default defineConfig([...next, ...typescript, globalIgnores(['.source*/**', '.next*/**', '.artifacts/**'])]);
