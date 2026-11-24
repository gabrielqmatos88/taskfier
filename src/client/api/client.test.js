import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from './client';

afterEach(() => vi.unstubAllGlobals());

describe('local API client', () => {
  it('sends same-origin requests and Idempotency-Key for created cards', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue({ status: 201, ok: true, json: async () => ({ id: 'new-card' }) });
    vi.stubGlobal('fetch', fetch);

    await expect(api.createCard('column/1', { title: 'Task' }, 'plan-task-1')).resolves.toEqual({
      id: 'new-card'
    });
    expect(fetch).toHaveBeenCalledWith('/api/columns/column%2F1/cards', {
      method: 'POST',
      body: JSON.stringify({ title: 'Task' }),
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'plan-task-1' }
    });
  });

  it('returns null for no-content responses and surfaces API errors', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({ status: 204, ok: true })
      .mockResolvedValueOnce({
        status: 409,
        ok: false,
        json: async () => ({ error: 'WIP limit reached' })
      });
    vi.stubGlobal('fetch', fetch);

    await expect(api.deleteCard('card-1')).resolves.toBeNull();
    await expect(api.createCard('column-1', { title: 'Task' }, 'key')).rejects.toThrow(
      'WIP limit reached'
    );
  });
});
