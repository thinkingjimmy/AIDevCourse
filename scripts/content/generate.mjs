import { postInstall } from 'fumadocs-mdx/next';
import { contentMode } from '../../config/content/content-mode.mjs';

await postInstall({ configPath: 'config/source.config.ts', outDir: contentMode.generated });
