/**
 * [INPUT]: Vitest and project source modules.
 * [OUTPUT]: Deterministic unit test configuration.
 * [POS]: Colocated unit configuration for content, routing, and storage tests.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['tests/unit/**/*.test.ts'] } });
