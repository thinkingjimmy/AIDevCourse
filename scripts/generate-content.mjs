/**
 * [INPUT]: Active content mode and the installed Fumadocs generator.
 * [OUTPUT]: Generated MDX modules and catalog in the mode's isolated source directory.
 * [POS]: Cross-platform content generation entry for TypeScript checks.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { postInstall } from 'fumadocs-mdx/next';
import { contentMode } from '../config/content-mode.mjs';

await postInstall({ configPath: 'config/source.config.ts', outDir: contentMode.generated });
