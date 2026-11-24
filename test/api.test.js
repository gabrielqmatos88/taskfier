import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { request as httpRequest } from 'node:http';

let child,
  base,
  dataDir,
  logs = '';
async function freePort() {
  const s = createServer();
  await new Promise((resolve) => s.listen(0, '127.0.0.1', resolve));
  const port = s.address().port;
  await new Promise((resolve) => s.close(resolve));
  return port;
}
async function request(path, options = {}) {
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers || {}) }
  });
  const data = res.status === 204 ? null : await res.json();
  return { res, data };
}
before(async () => {
  dataDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  child = spawn(process.execPath, ['src/server.js'], {
    env: { ...process.env, PORT: String(port), KANBAN_DATA_DIR: dataDir },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stdout.on('data', (x) => (logs += x));
  child.stderr.on('data', (x) => (logs += x));
  for (let i = 0; i < 80; i++) {
    if (child.exitCode !== null) throw new Error(`Server exited: ${logs}`);
    try {
      if ((await fetch(`${base}/api/health`)).ok) return;
    } catch {}
    await delay(100);
  }
  throw new Error(`Server did not start: ${logs}`);
});
after(async () => {
  if (child && !child.killed) {
    child.kill('SIGTERM');
    await Promise.race([new Promise((r) => child.once('exit', r)), delay(3000)]);
  }
  if (dataDir) await rm(dataDir, { recursive: true, force: true });
});

test('board, card, ordering, WIP, search, and import/export APIs work together', async () => {
  let { data: boards } = await request('/api/boards');
  assert.equal(boards.length, 1);
  let { data: board } = await request(`/api/boards/${boards[0].id}`);
  assert.deepEqual(
    board.columns.map((c) => c.title),
    ['Backlog', 'To Do', 'WIP', 'Done', 'Archive']
  );
  const idByTitle = Object.fromEntries(board.columns.map((c) => [c.title, c.id]));
  let response = await request(`/api/boards/${board.id}/columns`, {
    method: 'POST',
    body: JSON.stringify({ title: 'Review' })
  });
  assert.equal(response.res.status, 201);
  const label = (
    await request(`/api/boards/${board.id}/labels`, {
      method: 'POST',
      body: JSON.stringify({ name: 'AI', color: '#6255d9' })
    })
  ).data;
  const ordered = (await request(`/api/boards/${board.id}`)).data.columns;
  assert.equal(ordered.at(-1).title, 'Archive');
  assert.equal(ordered[ordered.length - 2].title, 'Review');
  response = await request(`/api/columns/${idByTitle['To Do']}/cards`, {
    method: 'POST',
    body: JSON.stringify({
      title: 'Write plan',
      description: 'seed a board',
      labelIds: [label.id],
      priority: 'high',
      checklist: [{ text: 'Review', done: false }]
    })
  });
  assert.equal(response.res.status, 201, `${JSON.stringify(response.data)}\n${logs}`);
  const card = response.data;
  assert.equal(card.color, 'yellow');
  assert.equal(card.labels[0].name, 'AI');
  assert.equal(
    (
      await request(`/api/cards/${card.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ columnId: 'missing-column' })
      })
    ).res.status,
    400
  );
  assert.equal(
    (
      await request('/api/cards/missing-card', {
        method: 'PATCH',
        body: JSON.stringify({ title: 'No card' })
      })
    ).res.status,
    404
  );
  response = await request(`/api/cards/${card.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ columnId: idByTitle.WIP, color: 'purple' })
  });
  assert.equal(response.data.column_id, idByTitle.WIP);
  assert.equal(response.data.color, 'purple');
  const search = await request(`/api/boards/${board.id}/cards?q=seed&label=${label.id}`);
  assert.equal(search.data.length, 1);
  await request(`/api/columns/${idByTitle.WIP}`, {
    method: 'PATCH',
    body: JSON.stringify({ wipLimit: 1, wipMode: 'hard' })
  });
  const rejected = await request(`/api/columns/${idByTitle.WIP}/cards`, {
    method: 'POST',
    body: JSON.stringify({ title: 'Over limit' })
  });
  assert.equal(rejected.res.status, 409);
  await request(`/api/cards/${card.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ columnId: idByTitle.Archive })
  });
  const archive = (await request(`/api/boards/${board.id}`)).data.columns.find(
    (c) => c.title === 'Archive'
  );
  assert.equal(archive.cards.length, 1);
  const exported = (await request('/api/export')).data;
  assert.equal(exported.boards.length, 1);
  assert.equal(
    exported.boards[0].columns.find((c) => c.title === 'Archive').cards[0].labels[0].name,
    'AI'
  );
  const imported = await request('/api/import', { method: 'POST', body: JSON.stringify(exported) });
  assert.equal(imported.res.status, 201);
  const allBoards = (await request('/api/boards')).data;
  assert.equal(allBoards.length, 2);
  const copy = (
    await request(`/api/boards/${allBoards.find((b) => b.id !== board.id).id}?archive=all`)
  ).data;
  assert.equal(copy.columns.find((c) => c.title === 'Archive').cards[0].labels[0].name, 'AI');
});

test('protected default columns and non-empty column deletion are rejected', async () => {
  const boards = (await request('/api/boards')).data;
  const board = (await request(`/api/boards/${boards[0].id}`)).data;
  const backlog = board.columns[0];
  assert.equal((await request(`/api/columns/${backlog.id}`, { method: 'DELETE' })).res.status, 403);
  const custom = (
    await request(`/api/boards/${board.id}/columns`, {
      method: 'POST',
      body: JSON.stringify({ title: 'Busy' })
    })
  ).data;
  const card = (
    await request(`/api/columns/${custom.id}/cards`, {
      method: 'POST',
      body: JSON.stringify({ title: 'Keep me' })
    })
  ).data;
  assert.equal((await request(`/api/columns/${custom.id}`, { method: 'DELETE' })).res.status, 409);
  await request(`/api/cards/${card.id}`, { method: 'DELETE' });
  assert.equal(
    (await request('/api/deleted/cards')).data.some((x) => x.id === card.id),
    true
  );
  assert.equal(
    (await request(`/api/cards/${card.id}/restore`, { method: 'POST' })).res.status,
    200
  );
});
test('SQLite state survives an Express process restart', async () => {
  const boards = (await request('/api/boards')).data;
  const board = (await request(`/api/boards/${boards[0].id}`)).data;
  const created = await request(`/api/columns/${board.columns[0].id}/cards`, {
    method: 'POST',
    body: JSON.stringify({ title: 'Persist across restart' })
  });
  assert.equal(created.res.status, 201);
  const old = child;
  old.kill('SIGTERM');
  await new Promise((resolve) => old.once('exit', resolve));
  logs = '';
  child = spawn(process.execPath, ['src/server.js'], {
    env: { ...process.env, PORT: new URL(base).port, KANBAN_DATA_DIR: dataDir },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stdout.on('data', (x) => (logs += x));
  child.stderr.on('data', (x) => (logs += x));
  let ready = false;
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch(`${base}/api/health`)).ok) {
        ready = true;
        break;
      }
    } catch {}
    await delay(100);
  }
  assert.equal(ready, true, logs);
  const reloaded = await request(`/api/boards/${board.id}`);
  assert.equal(
    reloaded.data.columns[0].cards.some((c) => c.title === 'Persist across restart'),
    true
  );
});
test('archive reveals the latest 10 by default and retains older cards', async () => {
  const board = (await request('/api/boards')).data[0];
  const view = (await request(`/api/boards/${board.id}`)).data;
  const archive = view.columns.find((c) => c.title === 'Archive');
  const created = [];
  for (let i = 0; i < 11; i++) {
    const result = await request(`/api/columns/${archive.id}/cards`, {
      method: 'POST',
      body: JSON.stringify({ title: `Archived ${i}` })
    });
    created.push(result.data.id);
  }
  const recent = (await request(`/api/boards/${board.id}`)).data.columns.find(
    (c) => c.title === 'Archive'
  ).cards;
  const all = (await request(`/api/boards/${board.id}?archive=all`)).data.columns.find(
    (c) => c.title === 'Archive'
  ).cards;
  assert.equal(recent.length, 10);
  assert.equal(all.length, archive.cards.length + 11);
  assert.equal(
    recent.some((c) => c.id === created[0]),
    false
  );
  assert.equal(all[0].id, created.at(-1));
});

test('API refuses non-local Host headers', async () => {
  const status = await new Promise((resolve, reject) => {
    const req = httpRequest(
      {
        hostname: '127.0.0.1',
        port: new URL(base).port,
        path: '/api/health',
        headers: { host: 'remote.example' }
      },
      (res) => {
        res.resume();
        resolve(res.statusCode);
      }
    );
    req.on('error', reject);
    req.end();
  });
  assert.equal(status, 403);
});
test('external tools can create boards and invalid payloads are rejected', async () => {
  const created = await request('/api/boards', {
    method: 'POST',
    body: JSON.stringify({ title: 'Automation plan', background: '#dbeafe' })
  });
  assert.equal(created.res.status, 201);
  const listed = (await request('/api/boards')).data;
  assert.equal(
    listed.some((board) => board.id === created.data.id),
    true
  );
  const columns = (await request(`/api/boards/${created.data.id}/columns`)).data;
  assert.deepEqual(
    columns.map((column) => column.title),
    ['Backlog', 'To Do', 'WIP', 'Done', 'Archive']
  );
  assert.equal(
    (
      await request('/api/boards', {
        method: 'POST',
        body: JSON.stringify({ title: 'Bad', background: 'url(javascript:alert(1))' })
      })
    ).res.status,
    400
  );
  assert.equal(
    (
      await request(`/api/columns/${columns[1].id}/cards`, {
        method: 'POST',
        body: JSON.stringify({ title: 'Bad priority', priority: 'not-a-priority' })
      })
    ).res.status,
    400
  );
  assert.equal(
    (
      await request(`/api/columns/${columns[1].id}/cards`, {
        method: 'POST',
        body: JSON.stringify({ title: 'Bad color', color: 'rainbow' })
      })
    ).res.status,
    400
  );
});
test('Idempotency-Key prevents duplicate cards on AI client retries', async () => {
  const board = (await request('/api/boards')).data[0],
    view = (await request(`/api/boards/${board.id}`)).data,
    column = view.columns[1];
  const path = `/api/columns/${column.id}/cards`,
    body = JSON.stringify({ title: 'Retry-safe task' }),
    headers = { 'Idempotency-Key': 'ai-plan-task-42' };
  const first = await request(path, { method: 'POST', body, headers });
  assert.equal(first.res.status, 201);
  const retry = await request(path, { method: 'POST', body, headers });
  assert.equal(retry.res.status, 200);
  assert.equal(retry.data.id, first.data.id);
  const conflict = await request(path, {
    method: 'POST',
    body: JSON.stringify({ title: 'Different task' }),
    headers
  });
  assert.equal(conflict.res.status, 409);
});
