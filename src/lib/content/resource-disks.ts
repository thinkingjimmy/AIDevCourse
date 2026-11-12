export function parseResourceDiskIds(items: string) {
  return items.split(',').map(id => id.trim());
}
