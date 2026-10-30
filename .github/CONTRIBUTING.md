# Contributing

Small, focused contributions are welcome. Check existing issues before starting a feature. Explain the user problem, expected behavior, and affected language or course.

## Setup

Use Node 22.17.0 or a later 22.x patch and pnpm 10.30.3. Run `pnpm install --frozen-lockfile`, then `pnpm dev`. Start from the [repository README](../README.md) for commands and the directory map.

Never commit `.env` files, API keys, dependencies, build output, or generated test evidence. The application does not require third-party service credentials for local development.

## Make a change

- Follow the existing TypeScript and React conventions. Use English for code, comments, and commit messages.
- Keep routes focused on composition. Put shared behavior in the smallest existing module that owns it.
- Add an abstraction when it removes actual duplication. Remove unused code instead of keeping speculative interfaces.
- Keep source files below 800 lines and each directory at eight maintained files or fewer. Keep the root for discoverable project files.
- Update relevant setup, architecture, or authoring guidance when behavior changes.
- Keep keyboard access, native links, narrow-screen reading, reduced motion, and storage failure behavior intact.
- Use the [authoring guide](../docs/authoring.md) for content changes. Translate interface messages in all five dictionaries. Preserve stable course and lesson IDs.
- Submit only content and artwork you have permission to distribute under the repository license.

## Validate

Write failure cases before changing isolated domain behavior. Prefer browser or CLI integration checks for new behavior. Do not add unit tests after implementation; retain and run the existing checks.

Run `pnpm check` and `pnpm build`. Then run only E2E cases for the modules changed, for example:

```bash
pnpm test:e2e tests/e2e/navigation.spec.ts --project=chromium
```

Lesson interactions need the isolated fixture build:

```bash
CONTENT_TEST=1 pnpm build
CONTENT_TEST=1 pnpm test:e2e tests/e2e/navigation.spec.ts --project=chromium
```

Both commands in the fixture pair need the same environment. Use the appropriate shell syntax on Windows. Public courses build to `.next`; fixtures build to `.next-test`. Never deploy fixtures.

E2E writes repeatable evidence to `.artifacts/e2e/public/` or `.artifacts/e2e/fixtures/`. Attach relevant screenshots or logs to your PR. Full three-browser matrices run in CI and before a release. Find browser cases in [tests/e2e](../tests/e2e/).

For dependency changes, run `pnpm audit --prod` and verify a frozen-lockfile install. CI rejects high or critical production advisories.

## Submit a pull request

Explain the problem and resulting behavior. List commands actually run and any checks still pending. Add screenshots for visible changes. Keep unrelated cleanup separate. Use a clear title and a ready-for-review PR when the work is complete.

Be respectful and specific in reviews. Discuss behavior and code. Do not post private information, harassment, or personal attacks. Maintainers may close contributions that do not follow these expectations.
