import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ActionMenu from './ActionMenu';

afterEach(() => {
  cleanup();
  document.querySelectorAll('[data-menu-anchor]').forEach((node) => node.remove());
});

describe('ActionMenu', () => {
  it('portals the menu to the document body and exposes destination actions', async () => {
    const anchor = document.createElement('button');
    anchor.dataset.menuAnchor = '';
    document.body.append(anchor);
    const onAction = vi.fn();
    render(
      <ActionMenu
        anchor={anchor}
        columns={[{ id: 'todo', title: 'To Do' }]}
        onAction={onAction}
        onClose={vi.fn()}
      />
    );

    const menu = screen.getByRole('menu');
    expect(menu.parentElement).toBe(document.body);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Move to…' }));
    await user.click(screen.getByRole('button', { name: 'To Do' }));
    expect(onAction).toHaveBeenCalledWith('move', 'todo');
  });
});
