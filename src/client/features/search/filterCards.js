export function filterCards(cards, filter) {
  const query = filter.q.toLowerCase();
  return cards.filter(
    (card) =>
      (!query || `${card.title} ${card.description}`.toLowerCase().includes(query)) &&
      (!filter.label || card.labels?.some((label) => label.id === filter.label)) &&
      (!filter.deadline || card.deadline === filter.deadline)
  );
}
