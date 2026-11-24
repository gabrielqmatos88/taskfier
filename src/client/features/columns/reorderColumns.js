export function reorderedColumnIds(columns, columnId, direction) {
  const index = columns.findIndex((column) => column.id === columnId),
    next = index + direction;
  if (index <= 0 || index >= columns.length - 1 || next <= 0 || next >= columns.length - 1)
    return null;
  const ids = columns.map((column) => column.id);
  [ids[index], ids[next]] = [ids[next], ids[index]];
  return ids;
}
