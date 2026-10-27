# Security

> L2 | Parent: [README.md](./README.md)

Security fixes target the current `main` branch. There is no separate support commitment for old releases.

Do not put exploit details, credentials, or personal data in public issues. If GitHub shows **Report a vulnerability** in this repository's Security tab, use that private reporting flow. If private reporting is unavailable, open an issue asking the maintainer to enable it. Include no vulnerability details in that request.

A private report should include the affected commit, reproduction steps, expected behavior, actual behavior, and impact. Use a local copy of the site for reproduction.

Course MDX is trusted repository content, subject to the authoring validator. This application does not accept uploaded MDX or arbitrary user code. Learning records stay in browser storage. Test fixtures must not enter a deployment build.

Repository settings, including private vulnerability reporting and branch protection, are managed on GitHub. Their presence is not guaranteed by this file.

Run `pnpm audit --prod` when reviewing dependencies. CI rejects high or critical production advisories. Apply compatible fixes, keep the lockfile current, and verify affected routes and content behavior before release. An audit result describes known package advisories; it does not replace code review.

The development-only Next.js ESLint chain includes `braces@3.0.3`, which has an [unpatched stack-exhaustion advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). It is absent from the production dependency audit. Keep lint glob patterns under repository control and reassess this dependency when updating the toolchain; do not suppress the full audit finding.

[PROTOCOL]: Update this header when making changes, then check README.md.
