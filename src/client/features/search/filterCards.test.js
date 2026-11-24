import { describe, expect, it } from 'vitest';
import { filterCards } from './filterCards';

const cards = [
  { id: '1', title: 'Prepare release', description: 'Final review', deadline: '2026-12-01', labels: [{ id: 'release' }] },
  { id: '2', title: 'Prepare release notes', description: 'Draft', deadline: '2026-12-02', labels: [{ id: 'docs' }] },
  { id: '3', title: 'Fix search', description: 'Unrelated', deadline: null, labels: [{ id: 'release' }] },
];

describe('filterCards', () => {
  it('combines text, label, and deadline filters', () => {
    expect(filterCards(cards, { q: 'RELEASE', label: 'release', deadline: '2026-12-01' }).map(card => card.id)).toEqual(['1']);
  });

  it('returns all cards when filters are empty', () => {
    expect(filterCards(cards, { q: '', label: '', deadline: '' })).toEqual(cards);
  });
});
