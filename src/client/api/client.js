async function request(path, options = {}) {
  const headers = {
    ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {})
  };
  const response = await fetch(path, { ...options, headers });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}
const json = (method, body, headers) => ({ method, body: JSON.stringify(body), headers });
export const api = {
  boards: () => request('/api/boards'),
  board: (id, all = false) =>
    request(`/api/boards/${encodeURIComponent(id)}?archive=${all ? 'all' : 'recent'}`),
  createBoard: (title) => request('/api/boards', json('POST', { title })),
  updateBoard: (id, body) => request(`/api/boards/${encodeURIComponent(id)}`, json('PATCH', body)),
  labels: (id) => request(`/api/boards/${encodeURIComponent(id)}/labels`),
  createLabel: (id, body) =>
    request(`/api/boards/${encodeURIComponent(id)}/labels`, json('POST', body)),
  createColumn: (id, body) =>
    request(`/api/boards/${encodeURIComponent(id)}/columns`, json('POST', body)),
  updateColumn: (id, body) =>
    request(`/api/columns/${encodeURIComponent(id)}`, json('PATCH', body)),
  deleteColumn: (id) => request(`/api/columns/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  reorderColumns: (id, ids) =>
    request(`/api/boards/${encodeURIComponent(id)}/columns/order`, json('PUT', { ids })),
  createCard: (id, body, key) =>
    request(
      `/api/columns/${encodeURIComponent(id)}/cards`,
      json('POST', body, key ? { 'Idempotency-Key': key } : undefined)
    ),
  updateCard: (id, body) => request(`/api/cards/${encodeURIComponent(id)}`, json('PATCH', body)),
  deleteCard: (id) => request(`/api/cards/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  reorderCards: (id, ids) =>
    request(`/api/columns/${encodeURIComponent(id)}/cards/order`, json('PUT', { ids })),
  deletedCards: () => request('/api/deleted/cards'),
  restoreCard: (id) => request(`/api/cards/${encodeURIComponent(id)}/restore`, { method: 'POST' }),
  exportData: () => request('/api/export'),
  importData: (data) => request('/api/import', json('POST', data))
};
