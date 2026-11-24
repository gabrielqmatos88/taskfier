import { createHash } from 'node:crypto';
import express from 'express';
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = resolve(process.env.KANBAN_DATA_DIR || resolve(root, 'data'));
mkdirSync(dataDir, { recursive: true });
const db = new Database(resolve(dataDir, 'kanban.sqlite'));
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');
const schemaVersion = db.pragma('user_version', { simple: true });
if (schemaVersion > 2) throw new Error(`Database schema ${schemaVersion} is newer than this application`);
db.exec(`
  CREATE TABLE IF NOT EXISTS boards (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, background TEXT NOT NULL DEFAULT '#f3f4f6',
    deleted_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS columns (
    id TEXT PRIMARY KEY, board_id TEXT NOT NULL REFERENCES boards(id), title TEXT NOT NULL,
    position INTEGER NOT NULL, is_system INTEGER NOT NULL DEFAULT 0,
    wip_limit INTEGER, wip_mode TEXT NOT NULL DEFAULT 'soft', deleted_at TEXT
  );
  CREATE TABLE IF NOT EXISTS labels (
    id TEXT PRIMARY KEY, board_id TEXT NOT NULL REFERENCES boards(id), name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#64748b', UNIQUE(board_id, name)
  );
  CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY, board_id TEXT NOT NULL REFERENCES boards(id), column_id TEXT NOT NULL REFERENCES columns(id),
    title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', color TEXT NOT NULL DEFAULT 'yellow',
    priority TEXT NOT NULL DEFAULT 'normal', deadline TEXT, checklist TEXT NOT NULL DEFAULT '[]',
    position INTEGER NOT NULL, archived_at TEXT, deleted_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS card_labels (
    card_id TEXT NOT NULL REFERENCES cards(id), label_id TEXT NOT NULL REFERENCES labels(id),
    PRIMARY KEY(card_id, label_id)
  );
  CREATE TABLE IF NOT EXISTS idempotency_keys (
    column_id TEXT NOT NULL REFERENCES columns(id), key TEXT NOT NULL,
    request_hash TEXT NOT NULL, response_json TEXT NOT NULL, created_at TEXT NOT NULL,
    PRIMARY KEY(column_id,key)
  );
`);
db.pragma('user_version = 2');
const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const palette = new Set(['yellow', 'green', 'red', 'blue', 'purple', 'gray', 'white']);
const defaults = ['Backlog', 'To Do', 'WIP', 'Done', 'Archive'];
const priorities = new Set(['low', 'normal', 'high', 'urgent']);
const validDeadline = value => value === null || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)));
const validChecklist = items => Array.isArray(items) && items.length <= 100 && items.every(item => item && validTitle(item.text) && item.text.length <= 500 && typeof item.done === 'boolean');

function seedBoard() {
  if (db.prepare('SELECT 1 FROM boards WHERE deleted_at IS NULL LIMIT 1').get()) return;
  const boardId = id();
  const timestamp = now();
  const create = db.transaction(() => {
    db.prepare('INSERT INTO boards (id,title,created_at,updated_at) VALUES (?,?,?,?)').run(boardId, 'My Kanban', timestamp, timestamp);
    defaults.forEach((title, position) => db.prepare('INSERT INTO columns (id,board_id,title,position,is_system) VALUES (?,?,?,?,?)').run(id(), boardId, title, position, Number(title === 'Backlog' || title === 'Archive')));
  });
  create();
}
seedBoard();
db.prepare("UPDATE columns SET is_system=CASE WHEN title IN ('Backlog','Archive') THEN 1 ELSE 0 END").run();

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));
app.use((req,_res,next)=>{if(req.body===undefined)req.body={};next();});
if (process.env.NODE_ENV !== 'production') app.use(express.static(resolve(root, 'public')));
app.use((req, res, next) => {
  if (req.path.startsWith('/api/') && req.get('host') && !/^localhost(?::\d+)?$|^127\.0\.0\.1(?::\d+)?$|^\[::1\](?::\d+)?$/.test(req.get('host'))) return res.status(403).json({ error: 'Localhost access only' });
  next();
});

const fail = (res, status, error) => res.status(status).json({ error });
const getBoard = (boardId) => db.prepare('SELECT * FROM boards WHERE id=? AND deleted_at IS NULL').get(boardId);
const getColumn = (columnId) => db.prepare('SELECT * FROM columns WHERE id=? AND deleted_at IS NULL').get(columnId);
const getCard = (cardId) => db.prepare('SELECT * FROM cards WHERE id=? AND deleted_at IS NULL').get(cardId);
const validTitle = (v) => typeof v === 'string' && v.trim().length > 0 && v.trim().length <= 200;
const cardLabels = (cardId) => db.prepare('SELECT l.* FROM labels l JOIN card_labels cl ON l.id=cl.label_id WHERE cl.card_id=? ORDER BY l.name').all(cardId);
function cardsForColumn(columnId, archiveAll = false) {
  const rows = db.prepare(`SELECT * FROM cards WHERE column_id=? AND deleted_at IS NULL ORDER BY position, created_at DESC`).all(columnId);
  const isArchive = db.prepare('SELECT title FROM columns WHERE id=?').get(columnId)?.title === 'Archive';
  const visible = isArchive && !archiveAll ? rows.filter((c) => c.archived_at).sort((a,b) => b.archived_at.localeCompare(a.archived_at)).slice(0,10) : rows;
  return visible.map((c) => ({ ...c, checklist: JSON.parse(c.checklist), labels: cardLabels(c.id) }));
}
function boardView(boardId, archiveAll = false) {
  const board = getBoard(boardId);
  if (!board) return null;
  const columns = db.prepare('SELECT * FROM columns WHERE board_id=? AND deleted_at IS NULL ORDER BY position').all(boardId);
  return { ...board, labels:db.prepare('SELECT * FROM labels WHERE board_id=? ORDER BY name').all(boardId), columns: columns.map((c) => ({ ...c, cards: cardsForColumn(c.id, archiveAll) })) };
}
function normalizeColumnPositions(boardId) {
  const cols = db.prepare('SELECT id FROM columns WHERE board_id=? AND deleted_at IS NULL ORDER BY position').all(boardId);
  const update = db.prepare('UPDATE columns SET position=? WHERE id=?');
  cols.forEach((c, i) => update.run(i, c.id));
}
function reorderCards(columnId, orderedIds) {
  const current = db.prepare('SELECT id FROM cards WHERE column_id=? AND deleted_at IS NULL').all(columnId).map((x) => x.id);
  if (!Array.isArray(orderedIds) || orderedIds.length !== current.length || new Set(orderedIds).size !== current.length || orderedIds.some((x) => !current.includes(x))) return false;
  const update = db.prepare('UPDATE cards SET position=?,updated_at=? WHERE id=?');
  const t = now();
  db.transaction(() => orderedIds.forEach((cardId, i) => update.run(i, t, cardId)))();
  return true;
}

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/boards', (_req, res) => res.json(db.prepare('SELECT id,title,background,created_at,updated_at FROM boards WHERE deleted_at IS NULL ORDER BY created_at').all()));
app.post('/api/boards', (req, res) => {
  const title = req.body?.title;
  if (!validTitle(title)) return fail(res, 400, 'Title is required (maximum 200 characters)');
  const background=req.body.background??'#f3f4f6';if(typeof background!=='string'||!/^#[0-9a-f]{6}$/i.test(background))return fail(res,400,'Background must be a hex color');
  const boardId = id(), t = now();
  const create = db.transaction(() => {
    db.prepare('INSERT INTO boards (id,title,background,created_at,updated_at) VALUES (?,?,?,?,?)').run(boardId, title.trim(), background, t, t);
    defaults.forEach((name, position) => db.prepare('INSERT INTO columns (id,board_id,title,position,is_system) VALUES (?,?,?,?,?)').run(id(), boardId, name, position, Number(name === 'Backlog' || name === 'Archive')));
  });
  create(); res.status(201).json(boardView(boardId));
});
app.get('/api/boards/:boardId', (req, res) => {
  const board = boardView(req.params.boardId, req.query.archive === 'all');
  return board ? res.json(board) : fail(res, 404, 'Board not found');
});
app.patch('/api/boards/:boardId', (req, res) => {
  const board = getBoard(req.params.boardId);
  if (!board) return fail(res, 404, 'Board not found');
  const title = req.body.title ?? board.title, background = req.body.background ?? board.background;
  if (!validTitle(title)) return fail(res, 400, 'Title is required (maximum 200 characters)');
  if (typeof background !== 'string' || !/^#[0-9a-f]{6}$/i.test(background)) return fail(res, 400, 'Background must be a hex color');
  db.prepare('UPDATE boards SET title=?,background=?,updated_at=? WHERE id=?').run(title.trim(), background, now(), board.id);
  res.json(boardView(board.id));
});
app.delete('/api/boards/:boardId', (req, res) => {
  const board = getBoard(req.params.boardId);
  if (!board) return fail(res, 404, 'Board not found');
  const t = now();
  db.transaction(() => {
    db.prepare('UPDATE boards SET deleted_at=?,updated_at=? WHERE id=?').run(t,t,board.id);
    db.prepare('UPDATE cards SET deleted_at=?,updated_at=? WHERE board_id=? AND deleted_at IS NULL').run(t,t,board.id);
  })();
  res.status(204).end();
});
app.get('/api/boards/:boardId/columns', (req, res) => {
  if (!getBoard(req.params.boardId)) return fail(res,404,'Board not found');
  res.json(db.prepare('SELECT * FROM columns WHERE board_id=? AND deleted_at IS NULL ORDER BY position').all(req.params.boardId));
});
app.post('/api/boards/:boardId/columns', (req, res) => {
  if (!getBoard(req.params.boardId)) return fail(res,404,'Board not found');
  if (!validTitle(req.body?.title)) return fail(res,400,'Column title is required');
  if (['Backlog','Archive'].includes(req.body.title.trim()) || db.prepare('SELECT 1 FROM columns WHERE board_id=? AND lower(title)=lower(?) AND deleted_at IS NULL').get(req.params.boardId,req.body.title.trim())) return fail(res,409,'Column name is reserved or already used');
  const columnId=id(), boardId=req.params.boardId;
  const archive=db.prepare("SELECT position FROM columns WHERE board_id=? AND title='Archive' AND deleted_at IS NULL").get(boardId);
  if(!archive)return fail(res,500,'Board is missing its Archive column');
  db.transaction(()=>{
    db.prepare('UPDATE columns SET position=position+1 WHERE board_id=? AND deleted_at IS NULL AND position>=?').run(boardId,archive.position);
    db.prepare('INSERT INTO columns (id,board_id,title,position) VALUES (?,?,?,?)').run(columnId,boardId,req.body.title.trim(),archive.position);
  })();
  res.status(201).json(getColumn(columnId));
});
app.patch('/api/columns/:columnId', (req,res) => {
  const col=getColumn(req.params.columnId); if(!col)return fail(res,404,'Column not found');
  if(req.body.title!==undefined){if(!validTitle(req.body.title))return fail(res,400,'Column title is required');if(['Backlog','Archive'].includes(col.title)&&req.body.title.trim()!==col.title)return fail(res,403,'Backlog and Archive names are fixed');if(db.prepare('SELECT 1 FROM columns WHERE board_id=? AND id<>? AND lower(title)=lower(?) AND deleted_at IS NULL').get(col.board_id,col.id,req.body.title.trim()))return fail(res,409,'Column name already used');db.prepare('UPDATE columns SET title=? WHERE id=?').run(req.body.title.trim(),col.id);}
  if(req.body.wipLimit!==undefined){const n=req.body.wipLimit;if(n!==null&&(!Number.isInteger(n)||n<1||n>10000))return fail(res,400,'WIP limit must be a positive integer or null');}
  if(req.body.wipLimit!==undefined||req.body.wipMode!==undefined){const limit=Object.hasOwn(req.body,'wipLimit')?req.body.wipLimit:col.wip_limit, mode=req.body.wipMode??col.wip_mode;if(!['soft','hard'].includes(mode))return fail(res,400,'WIP mode must be soft or hard');db.prepare('UPDATE columns SET wip_limit=?,wip_mode=? WHERE id=?').run(limit,mode,col.id);}
  res.json(getColumn(col.id));
});
app.delete('/api/columns/:columnId', (req,res)=>{
  const col=getColumn(req.params.columnId); if(!col)return fail(res,404,'Column not found');
  const cols=db.prepare('SELECT * FROM columns WHERE board_id=? AND deleted_at IS NULL ORDER BY position').all(col.board_id);
  if(col.title==='Backlog'||col.title==='Archive')return fail(res,403,'Backlog and Archive cannot be deleted');
  if(db.prepare('SELECT 1 FROM cards WHERE column_id=? AND deleted_at IS NULL').get(col.id))return fail(res,409,'Move cards out of this column before deleting it');
  db.prepare('UPDATE columns SET deleted_at=? WHERE id=?').run(now(),col.id); normalizeColumnPositions(col.board_id); res.status(204).end();
});
app.put('/api/boards/:boardId/columns/order',(req,res)=>{
  if(!getBoard(req.params.boardId))return fail(res,404,'Board not found');
  const cols=db.prepare('SELECT * FROM columns WHERE board_id=? AND deleted_at IS NULL ORDER BY position').all(req.params.boardId);
  const ids=req.body?.ids;
  if(!Array.isArray(ids)||ids.length!==cols.length||new Set(ids).size!==ids.length||ids.some(x=>!cols.some(c=>c.id===x)))return fail(res,400,'Order must contain each column exactly once');
  const first=cols.find(c=>c.title==='Backlog'),last=cols.find(c=>c.title==='Archive');
  if(ids[0]!==first?.id||ids.at(-1)!==last?.id)return fail(res,400,'Backlog must remain first and Archive last');
  db.transaction(()=>ids.forEach((x,i)=>db.prepare('UPDATE columns SET position=? WHERE id=?').run(i,x)))();
  res.json(db.prepare('SELECT * FROM columns WHERE board_id=? AND deleted_at IS NULL ORDER BY position').all(req.params.boardId));
});
app.get('/api/boards/:boardId/labels',(req,res)=>{if(!getBoard(req.params.boardId))return fail(res,404,'Board not found');res.json(db.prepare('SELECT * FROM labels WHERE board_id=? ORDER BY name').all(req.params.boardId));});
app.post('/api/boards/:boardId/labels',(req,res)=>{if(!getBoard(req.params.boardId))return fail(res,404,'Board not found');const name=req.body?.name,color=req.body.color??'#64748b';if(!validTitle(name))return fail(res,400,'Label name is required');if(typeof color!=='string'||!/^#[0-9a-f]{6}$/i.test(color))return fail(res,400,'Label color must be a hex color');const labelId=id();try{db.prepare('INSERT INTO labels (id,board_id,name,color) VALUES (?,?,?,?)').run(labelId,req.params.boardId,name.trim(),color);res.status(201).json(db.prepare('SELECT * FROM labels WHERE id=?').get(labelId));}catch(e){if(e.code?.startsWith('SQLITE_CONSTRAINT'))return fail(res,409,'Label already exists');throw e;}});
app.get('/api/boards/:boardId/cards',(req,res)=>{
  if(!getBoard(req.params.boardId))return fail(res,404,'Board not found');
  const q=String(req.query.q||'').trim(), label=req.query.label, deadline=req.query.deadline;
  let rows=db.prepare('SELECT * FROM cards WHERE board_id=? AND deleted_at IS NULL ORDER BY created_at DESC').all(req.params.boardId);
  if(q)rows=rows.filter(c=>`${c.title} ${c.description}`.toLowerCase().includes(q.toLowerCase()));
  if(deadline)rows=rows.filter(c=>c.deadline===deadline);
  if(label)rows=rows.filter(c=>cardLabels(c.id).some(l=>l.id===label||l.name===label));
  res.json(rows.map(c=>({...c,checklist:JSON.parse(c.checklist),labels:cardLabels(c.id)})));
});
app.post('/api/columns/:columnId/cards',(req,res)=>{
  const col=getColumn(req.params.columnId); if(!col)return fail(res,404,'Column not found');
  const title=req.body?.title,description=req.body?.description??'',priority=req.body?.priority??'normal',deadline=req.body?.deadline??null,checklist=req.body?.checklist??[];
  if(!validTitle(title))return fail(res,400,'Card title is required (maximum 200 characters)');
  if(typeof description!=='string'||description.length>10000)return fail(res,400,'Description must be text no longer than 10000 characters');
  if(!priorities.has(priority)||!validDeadline(deadline)||!validChecklist(checklist))return fail(res,400,'Invalid priority, deadline, or checklist');
  const key=req.get('Idempotency-Key');
  if(key!==undefined&&!/^[A-Za-z0-9._:-]{1,200}$/.test(key))return fail(res,400,'Idempotency-Key must be 1-200 safe characters');
  const requestHash=key?createHash('sha256').update(JSON.stringify({columnId:col.id,body:req.body})).digest('hex'):null;
  if(key){const prior=db.prepare('SELECT request_hash,response_json FROM idempotency_keys WHERE column_id=? AND key=?').get(col.id,key);if(prior){if(prior.request_hash!==requestHash)return fail(res,409,'Idempotency-Key was already used with a different request');return res.status(200).json(JSON.parse(prior.response_json));}}
  const count=db.prepare('SELECT COUNT(*) AS n FROM cards WHERE column_id=? AND deleted_at IS NULL').get(col.id).n;
  if(col.wip_limit&&col.wip_mode==='hard'&&count>=col.wip_limit)return fail(res,409,'Column WIP limit reached');
  const cardId=id(),t=now(), color=req.body.color??'yellow';if(!palette.has(color))return fail(res,400,'Unsupported card color');
  const create=db.transaction(()=>{
    db.prepare('UPDATE cards SET position=position+1 WHERE column_id=? AND deleted_at IS NULL').run(col.id);
    db.prepare('INSERT INTO cards (id,board_id,column_id,title,description,color,priority,deadline,checklist,position,archived_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').run(cardId,col.board_id,col.id,title.trim(),description,color,priority,deadline,JSON.stringify(checklist),0,col.title==='Archive'?t:null,t,t);
    const labels=Array.isArray(req.body.labelIds)?req.body.labelIds:[];
    for(const labelId of labels){if(!db.prepare('SELECT 1 FROM labels WHERE id=? AND board_id=?').get(labelId,col.board_id))throw new Error('Invalid label');db.prepare('INSERT INTO card_labels(card_id,label_id) VALUES(?,?)').run(cardId,labelId);}
    const stored=db.prepare('SELECT * FROM cards WHERE id=?').get(cardId);
    const response={...stored,labels:cardLabels(cardId),checklist:JSON.parse(stored.checklist)};
    if(key)db.prepare('INSERT INTO idempotency_keys(column_id,key,request_hash,response_json,created_at) VALUES(?,?,?,?,?)').run(col.id,key,requestHash,JSON.stringify(response),t);
    return response;
  });
  try{return res.status(201).json(create());}catch(e){if(e.message==='Invalid label')return fail(res,400,e.message);throw e;}
});
app.patch('/api/cards/:cardId',(req,res)=>{
  const card=getCard(req.params.cardId);if(!card)return fail(res,404,'Card not found');
  const title=req.body.title??card.title, desc=req.body.description??card.description, color=req.body.color??card.color;
  if(!validTitle(title))return fail(res,400,'Card title is required');if(typeof desc!=='string'||desc.length>10000)return fail(res,400,'Description must be text no longer than 10000 characters');if(!palette.has(color))return fail(res,400,'Unsupported card color');
  const col=req.body.columnId?getColumn(req.body.columnId):getColumn(card.column_id);if(!col||col.board_id!==card.board_id)return fail(res,400,'Invalid destination column');
  const moving=col.id!==card.column_id;
  if(moving&&col.wip_limit&&col.wip_mode==='hard'&&db.prepare('SELECT COUNT(*) AS n FROM cards WHERE column_id=? AND deleted_at IS NULL').get(col.id).n>=col.wip_limit)return fail(res,409,'Column WIP limit reached');
  const t=now(), checklist=req.body.checklist??JSON.parse(card.checklist), deadline=req.body.deadline===undefined?card.deadline:(req.body.deadline||null), priority=req.body.priority??card.priority, requestedPosition=req.body.position;
  if(requestedPosition!==undefined&&(!Number.isInteger(requestedPosition)||requestedPosition<0))return fail(res,400,'Position must be a non-negative integer');
  if(!validChecklist(checklist)||!priorities.has(priority)||!validDeadline(deadline))return fail(res,400,'Invalid checklist, priority, or deadline');
  try{db.transaction(()=>{
    if(moving){const count=db.prepare('SELECT COUNT(*) AS n FROM cards WHERE column_id=? AND deleted_at IS NULL').get(col.id).n;const position=Math.min(requestedPosition??0,count);db.prepare('UPDATE cards SET position=position+1 WHERE column_id=? AND deleted_at IS NULL AND position>=?').run(col.id,position);db.prepare('UPDATE cards SET column_id=?,position=?,archived_at=?,updated_at=? WHERE id=?').run(col.id,position,col.title==='Archive'?(card.archived_at||t):null,t,card.id);}
    db.prepare('UPDATE cards SET title=?,description=?,color=?,deadline=?,priority=?,checklist=?,updated_at=? WHERE id=?').run(title.trim(),desc,color,deadline,priority,JSON.stringify(checklist),t,card.id);
    if(Array.isArray(req.body.labelIds)){db.prepare('DELETE FROM card_labels WHERE card_id=?').run(card.id);for(const labelId of req.body.labelIds){if(!db.prepare('SELECT 1 FROM labels WHERE id=? AND board_id=?').get(labelId,card.board_id))throw new Error('Invalid label');db.prepare('INSERT INTO card_labels(card_id,label_id) VALUES(?,?)').run(card.id,labelId);}}
  })();}catch(e){if(e.message==='Invalid label')return fail(res,400,e.message);throw e;}
  const updated=getCard(card.id);res.json({...updated,checklist:JSON.parse(updated.checklist),labels:cardLabels(card.id)});
});
app.put('/api/columns/:columnId/cards/order',(req,res)=>{const col=getColumn(req.params.columnId);if(!col)return fail(res,404,'Column not found');if(!reorderCards(col.id,req.body?.ids))return fail(res,400,'Order must contain each active card exactly once');res.json(cardsForColumn(col.id,true));});
app.get('/api/deleted/cards',(_req,res)=>{const cards=db.prepare('SELECT c.*,b.title AS board_title,col.title AS column_title FROM cards c JOIN boards b ON b.id=c.board_id JOIN columns col ON col.id=c.column_id WHERE c.deleted_at IS NOT NULL AND b.deleted_at IS NULL ORDER BY c.deleted_at DESC').all();res.json(cards.map(c=>({...c,checklist:JSON.parse(c.checklist),labels:cardLabels(c.id)})));});
app.delete('/api/cards/:cardId',(req,res)=>{const card=getCard(req.params.cardId);if(!card)return fail(res,404,'Card not found');db.prepare('UPDATE cards SET deleted_at=?,updated_at=? WHERE id=?').run(now(),now(),card.id);res.status(204).end();});
app.post('/api/cards/:cardId/restore',(req,res)=>{const card=db.prepare('SELECT * FROM cards WHERE id=? AND deleted_at IS NOT NULL').get(req.params.cardId);if(!card)return fail(res,404,'Deleted card not found');db.prepare('UPDATE cards SET deleted_at=NULL,updated_at=? WHERE id=?').run(now(),card.id);res.json(getCard(card.id));});
app.get('/api/export',(req,res)=>{const boards=db.prepare('SELECT * FROM boards WHERE deleted_at IS NULL').all().map(b=>boardView(b.id,true));res.json({format:'local-kanban',version:1,exportedAt:now(),boards});});
app.post('/api/import',(req,res)=>{
  const data=req.body;if(data?.format!=='local-kanban'||data.version!==1||!Array.isArray(data.boards))return fail(res,400,'Unsupported import format');
  const insert=db.transaction(()=>{
    for(const b of data.boards){if(!validTitle(b.title)||!Array.isArray(b.columns))throw new Error('Invalid board data');const boardId=id(),t=now();db.prepare('INSERT INTO boards(id,title,background,created_at,updated_at) VALUES(?,?,?,?,?)').run(boardId,b.title.trim(),/^#[0-9a-f]{6}$/i.test(b.background)?b.background:'#f3f4f6',t,t);
      const map=new Map();for(const c of b.columns){if(!validTitle(c.title)||!Array.isArray(c.cards))throw new Error('Invalid column data');const colId=id();map.set(c.id,colId);db.prepare('INSERT INTO columns(id,board_id,title,position,is_system,wip_limit,wip_mode) VALUES(?,?,?,?,?,?,?)').run(colId,boardId,c.title,db.prepare('SELECT COUNT(*) AS n FROM columns WHERE board_id=?').get(boardId).n,Number(c.title==='Backlog'||c.title==='Archive'),c.wip_limit||null,c.wip_mode==='hard'?'hard':'soft');}
      const labels=new Map();const allLabels=[...(b.labels||[]),...b.columns.flatMap(c=>c.cards.flatMap(card=>card.labels||[]))];for(const label of allLabels){if(!labels.has(label.id)){let record=db.prepare('SELECT id FROM labels WHERE board_id=? AND name=?').get(boardId,label.name);if(!record){const labelId=id();db.prepare('INSERT INTO labels(id,board_id,name,color) VALUES(?,?,?,?)').run(labelId,boardId,label.name,/^#[0-9a-f]{6}$/i.test(label.color)?label.color:'#64748b');record={id:labelId};}labels.set(label.id,record.id);}}
      for(const c of b.columns)for(const card of c.cards){if(!validTitle(card.title))throw new Error('Invalid card data');const cardId=id();db.prepare('INSERT INTO cards(id,board_id,column_id,title,description,color,priority,deadline,checklist,position,archived_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').run(cardId,boardId,map.get(c.id),card.title.trim(),card.description||'',palette.has(card.color)?card.color:'yellow',['low','normal','high','urgent'].includes(card.priority)?card.priority:'normal',card.deadline||null,JSON.stringify(Array.isArray(card.checklist)?card.checklist:[]),Number.isInteger(card.position)?card.position:0,card.archived_at||null,t,t);for(const label of card.labels||[]){const labelId=labels.get(label.id);if(labelId)db.prepare('INSERT INTO card_labels(card_id,label_id) VALUES(?,?)').run(cardId,labelId);}}
    }
  });
  try{insert();}catch(e){return fail(res,400,`Import rejected: ${e.message}`);}res.status(201).json({imported:data.boards.length});
});
if (process.env.NODE_ENV === 'production') {
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));
  app.use(express.static(resolve(root, 'dist')));
}
app.use((err, _req, res, _next) => { console.error(err);res.status(500).json({error:'Internal server error'}); });

const port=Number(process.env.PORT||4173);
const server=app.listen(port,'127.0.0.1',()=>console.log(`Kanban listening on http://127.0.0.1:${port}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>{db.close();process.exit(0);}));
