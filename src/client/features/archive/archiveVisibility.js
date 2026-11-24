export function archiveQuery(expanded) {
  return expanded ? 'all' : 'recent';
}
export function nextArchiveVisibility(expanded) {
  return !expanded;
}
