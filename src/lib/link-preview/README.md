# src/lib/link-preview/

> L2 | Parent: [../README.md](../README.md)

- `model.ts`: Serializable preview metadata shared by the browser and server.
- `address.ts`: Public IPv4 validation and bounded Cloudflare HTTPS DNS fallback when a local proxy returns only benchmark-range addresses; private and reserved answers remain blocked.
- `remote.ts`: Bounded HTTPS metadata reads with public IPv4 DNS pinning, redirect checks, a shared deadline, and text-only metadata extraction.
- `service.ts`: Published-catalog lookup, outbound-link allowlist, cached external previews, and explicit unavailable results; local articles need no network request.

[PROTOCOL]: Update this header when making changes, then check README.md.
