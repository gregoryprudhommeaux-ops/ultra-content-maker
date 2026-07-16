/** Append a labeled source block into the combined inspiration reference text. */
export function appendInspirationReferenceBlock(
  current: string,
  label: string,
  body: string,
): string {
  const block = `--- ${label.trim()} ---\n${body.trim()}`;
  const base = current.trim();
  if (!base) return block;
  if (base.includes(block)) return base;
  return `${base}\n\n${block}`;
}
