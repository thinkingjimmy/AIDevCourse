/**
 * [INPUT]: Published article summaries or normalized external page metadata.
 * [OUTPUT]: Serializable LinkPreviewData for the preview endpoint and card.
 * [POS]: Shared contract between the link-preview service and MDX renderer.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
export type LinkPreviewData = {
  title: string;
  description: string;
  image?: string;
};
