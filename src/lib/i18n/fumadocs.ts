export function fumadocsMessages(ui: Record<string, string>) {
  return {
    'On this page(table of contents)': ui.toc,
    'No Headings(table of contents)': ui.noHeadings,
    'Table of Contents(inline table of contents)': ui.toc,
    'Copy Anchor Link(heading anchor)(aria-label)': ui.copyAnchor,
    'Copy Text(code block)(aria-label)': ui.copy,
    'Copied Text(code block)(aria-label)': ui.copied,
    'Previous Page(pagination)': ui.previous,
    'Next Page(pagination)': ui.next,
    'Open Sidebar(sidebar)(aria-label)': ui.menu,
    'Close Sidebar(sidebar)(aria-label)': ui.close,
    'Toggle Menu(mobile menu)(aria-label)': ui.menu,
  };
}
