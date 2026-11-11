# Rehearsal: browser text editing

Reference: Stageshow `table-edit`. The scene keeps its select, type, Enter, then dependent-display update sequence. The host uses the site's own controls, Phosphor icons, typography, and colors. The reference source is kept in local review artifacts; the Stageshow runtime is not bundled.

The 17.4-second sequence opens Inspect, activates the element picker, hovers over the title with a native-style highlight, clicks the title to select its DOM node, selects the text, types the new title, and commits with Enter. Seven reading pauses of 0.6–1 seconds freeze the scene between key actions without slowing pointer movement or typing. Completed input stays visible for 2.2 seconds before Enter. The preview updates one second after Enter appears, then holds the edited result. Only two lightweight icon controls remain at the lower right. The practice stays independent.

Recorded the actual lesson at a 1440px viewport, including fourteen checkpoints for the context menu, picker, hover highlight, selected DOM node, text selection, partial input, complete input, Enter, commit, and final result. Captured static initial and result views at 390px. The focused E2E scenarios also cover 320px with enlarged text, no JavaScript, reduced motion, pause and resume, replay, offscreen pause, bottom-right control placement, and independent practice state.

Local review artifacts are in `.artifacts/frontend-animation-refinement/recording/`. The reviewed hover frame shows the picker active and the page title highlighted before DOM selection. The 8s frame shows complete input while the page still has its original title. The result frames show the new title. A centered gray-backed white subtitle overlays the lower part of the animation and follows each action. During the input hold and confirmation, a distinct Enter keycap accompanies the instruction; after the commit, the subtitle reports that the title has updated. The same live status remains available to assistive technology.

The initial capture helper clipped tall components inside the lesson's scroll container. Reusing the existing responsive capture helper corrected the review images. The initial add-button E2E could click server-rendered content before hydration; it now waits for the lesson's client-ready signal.

The standalone Stageshow playground and film gate were not run. Verification records the actual destination component rather than a separate reference preview. Native DevTools UI automation is not included; the practice check applies external DOM text edits and verifies their effect on the live title and escaped HTML mirror.

Subtitle verification records the same full sequence under `.artifacts/frontend-subtitles/recording/`. The Enter instruction is visible throughout the input hold and confirmation. E2E coverage checks the matching captions at selection, typing, confirmation, and the final result, including 320px with enlarged text and the Enter keycap.

Overlay subtitle review artifacts are in `.artifacts/frontend-video-subtitles/`. The phone check verifies that the subtitle stays inside the animation, remains centered, and clears the edited text with enlarged fonts. Playback controls remain outside the subtitle at the lower right.

Pacing review artifacts are in `.artifacts/frontend-pacing/`. E2E coverage advances playback during the menu and hover pauses and verifies that the cursor and visual state stay still. It also checks the extended text selection and confirmation holds.
