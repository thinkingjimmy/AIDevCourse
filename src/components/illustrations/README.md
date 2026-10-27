# src/components/illustrations/

> L2 | Parent: [../README.md](../README.md)

- `animation.ts`: Shared animation channels, hover reversal from an optional data-illustration-hover ancestor, optional loopOnHover with a 0.6-second hold at each end, offscreen pause, and reduced-motion handling. The illustration remains its own hover target when no ancestor is marked.
- `mac-explode.tsx`: Homepage Mac illustration, projection, part timing, and easing. Hover repeatedly assembles and explodes the Mac; pointer leave returns it to the exploded pose. Reduced motion shows a static exploded view.
- `mac-explode-markup.ts`: Trusted static Mac SVG artwork and animation targets.
- `chip-explode.tsx`: Shared course chip illustration and layer timing. Hover repeatedly assembles and explodes the chip, then pointer leave restores the exploded pose. The hero shows callouts only after opening settles; catalog cards omit them. Reduced motion shows a static exploded view.
- `chip-explode-markup.ts`: Trusted static chip SVG artwork, a cropped card export without leader lines or names, and the projection axis.

[PROTOCOL]: Update this header when making changes, then check README.md.
