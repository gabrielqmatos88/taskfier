import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, createEvent, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

const { api } = vi.hoisted(() => ({
  api: {
    boards: vi.fn(),
    board: vi.fn(),
    labels: vi.fn(),
    createBoard: vi.fn(),
    updateBoard: vi.fn(),
    createCard: vi.fn(),
    updateCard: vi.fn(),
    deleteCard: vi.fn(),
    createColumn: vi.fn(),
    updateColumn: vi.fn(),
    deleteColumn: vi.fn(),
    reorderColumns: vi.fn(),
    reorderCards: vi.fn(),
    deletedCards: vi.fn(),
    restoreCard: vi.fn(),
    exportData: vi.fn(),
    importData: vi.fn()
  }
}));
vi.mock('./api/client', () => ({ api }));
afterEach(() => cleanup());

const board = {
  id: 'board-1',
  title: 'Launch plan',
  background: '#f3f4f6',
  columns: ['Backlog', 'To Do', 'WIP', 'Done', 'Archive'].map((title, position) => ({
    id: `column-${position}`,
    title,
    position,
    is_system: position === 0 || position === 4,
    wip_limit: null,
    wip_mode: 'soft',
    cards: []
  }))
};

beforeEach(() => {
  vi.clearAllMocks();
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close() {
    this.open = false;
  };
  api.boards.mockResolvedValue([{ id: board.id, title: board.title }]);
  api.board.mockResolvedValue(board);
  api.labels.mockResolvedValue([]);
  api.createCard.mockResolvedValue({ id: 'new-card' });
  api.updateCard.mockResolvedValue({});
  api.reorderColumns.mockResolvedValue([]);
  api.deletedCards.mockResolvedValue([]);
  api.restoreCard.mockResolvedValue({});
});

describe('Kanban React app', () => {
  it('loads the selected board and its default columns', async () => {
    render(<App />);
    expect((await screen.findByRole('textbox', { name: 'Board title' })).value).toBe(board.title);
    for (const title of ['Backlog', 'To Do', 'WIP', 'Done', 'Archive'])
      expect(screen.getByText(title)).toBeTruthy();
  });

  it('creates a card through the existing local API', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('textbox', { name: 'Board title' });
    await user.click(screen.getAllByRole('button', { name: '＋ Add a card' })[0]);
    const cardDialog = screen.getByRole('heading', { name: 'New card' }).closest('dialog');
    await user.type(cardDialog.querySelector('input[autocomplete="off"]'), 'Write migration plan');
    await user.click(screen.getByRole('button', { name: 'Save card' }));
    await waitFor(() => expect(api.createCard).toHaveBeenCalled());
    expect(api.createCard).toHaveBeenCalledWith(
      'column-0',
      expect.objectContaining({ title: 'Write migration plan' }),
      expect.any(String)
    );
  });

  it('moves a card across columns through the drag-and-drop handler', async () => {
    const populated = structuredClone(board);
    populated.columns[1].cards = [
      {
        id: 'card-1',
        title: 'Task',
        description: '',
        color: 'yellow',
        priority: 'normal',
        labels: [],
        checklist: []
      }
    ];
    populated.columns[2].cards = [
      {
        id: 'target-1',
        title: 'Target',
        description: '',
        color: 'blue',
        priority: 'normal',
        labels: [],
        checklist: []
      }
    ];
    api.board.mockResolvedValue(populated);
    render(<App />);
    await screen.findByText('Task');
    const target = screen.getByText('Target').closest('[data-card]');
    const drop = createEvent.drop(target);
    Object.defineProperty(drop, 'dataTransfer', {
      value: { getData: vi.fn().mockReturnValue('card-1') }
    });
    fireEvent(target, drop);
    await waitFor(() =>
      expect(api.updateCard).toHaveBeenCalledWith('card-1', { columnId: 'column-2', position: 0 })
    );
  });

  it('configures and reorders columns through their settings dialog', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('textbox', { name: 'Board title' });
    await user.click(screen.getAllByRole('button', { name: 'Column settings' })[2]);
    await user.click(screen.getByRole('button', { name: '← Move left' }));
    expect(api.reorderColumns).toHaveBeenCalledWith('board-1', [
      'column-0',
      'column-2',
      'column-1',
      'column-3',
      'column-4'
    ]);
  });

  it('restores a soft-deleted card from the recovery dialog', async () => {
    const user = userEvent.setup();
    api.deletedCards.mockResolvedValue([
      { id: 'deleted-1', title: 'Old task', board_title: board.title, column_title: 'Done' }
    ]);
    render(<App />);
    await screen.findByRole('textbox', { name: 'Board title' });
    await user.click(screen.getByRole('button', { name: 'Deleted' }));
    await user.click(screen.getByRole('button', { name: 'Restore' }));
    expect(api.restoreCard).toHaveBeenCalledWith('deleted-1');
  });

  it('shows API load errors instead of rendering a stale board', async () => {
    api.boards.mockRejectedValue(new Error('offline'));
    render(<App />);
    expect(await screen.findByText(/Cannot connect to the local API: offline/)).toBeTruthy();
  });
});
