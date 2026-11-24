import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BoardView from './BoardView';

const noop = vi.fn();
const archiveCards = Array.from({ length: 10 }, (_, index) => ({
  id: `card-${index}`,
  title: `Archived task ${index}`,
  description: '',
  color: 'yellow',
  priority: 'normal',
  labels: [],
  checklist: []
}));

describe('BoardView', () => {
  it('offers to reveal older archive cards when the default ten-card window is full', () => {
    render(
      <BoardView
        board={{ columns: [{ id: 'archive', title: 'Archive', cards: archiveCards }] }}
        filter={{ q: '', label: '', deadline: '' }}
        archiveExpanded={false}
        onAdd={noop}
        onEdit={noop}
        onCardMenu={noop}
        onColumnMenu={noop}
        onToggleArchive={noop}
        onDrop={noop}
        onDragStart={noop}
        onAddColumn={noop}
      />
    );

    expect(screen.getByRole('button', { name: 'Show all archived cards' })).toBeTruthy();
  });
});
