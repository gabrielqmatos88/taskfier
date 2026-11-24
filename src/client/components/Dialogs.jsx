import { useEffect, useRef, useState } from 'react';
import styles from './Dialogs.module.css';
import LabelSelection from '../features/labels/LabelSelection';
function Modal({ open, children, onClose, compact = false }) {
  const ref = useRef(null),
    closeCallback = useRef(onClose);
  closeCallback.current = onClose;
  useEffect(() => {
    const d = ref.current;
    if (!d || !open) return;
    d.showModal();
    const backdrop = (e) => {
      if (e.target === d) closeCallback.current();
    };
    const dismissed = () => closeCallback.current();
    d.addEventListener('click', backdrop);
    d.addEventListener('close', dismissed);
    return () => {
      d.removeEventListener('click', backdrop);
      d.removeEventListener('close', dismissed);
      if (d.open) d.close();
    };
  }, [open]);
  return (
    <dialog ref={ref} className={`dialog ${compact ? 'compactDialog' : ''} ${styles.dialog}`}>
      {children}
    </dialog>
  );
}
export function CardDialog({
  open,
  card,
  columnId,
  labels,
  onClose,
  onSave,
  onDelete,
  onCreateLabel
}) {
  const [form, setForm] = useState(null),
    [newLabel, setNewLabel] = useState(''),
    [newColor, setNewColor] = useState('#64748b'),
    [checkText, setCheckText] = useState('');
  useEffect(() => {
    if (open)
      setForm({
        title: card?.title || '',
        description: card?.description || '',
        color: card?.color || 'yellow',
        priority: card?.priority || 'normal',
        deadline: card?.deadline || '',
        checklist: card?.checklist || [],
        labelIds: (card?.labels || []).map((x) => x.id)
      });
  }, [open, card]);
  const change = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  return (
    <Modal open={open} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ ...form, deadline: form.deadline || null, columnId });
        }}
      >
        <header className="dialogHeader">
          <div>
            <p className={styles.eyebrow}>CARD DETAILS</p>
            <h2>{card ? 'Edit card' : 'New card'}</h2>
          </div>
          <button className="iconButton" type="button" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>
        <label>
          Title
          <input
            required
            maxLength="200"
            autoComplete="off"
            value={form?.title || ''}
            onChange={(e) => change('title', e.target.value)}
          />
        </label>
        <label>
          Description
          <textarea
            rows="4"
            placeholder="Add useful context"
            value={form?.description || ''}
            onChange={(e) => change('description', e.target.value)}
          />
        </label>
        <div className="formRow">
          <label>
            Priority
            <select
              value={form?.priority || 'normal'}
              onChange={(e) => change('priority', e.target.value)}
            >
              {['low', 'normal', 'high', 'urgent'].map((x) => (
                <option key={x} value={x}>
                  {x[0].toUpperCase() + x.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Deadline
            <input
              type="date"
              value={form?.deadline || ''}
              onChange={(e) => change('deadline', e.target.value)}
            />
          </label>
        </div>
        <label>
          Card color
          <select value={form?.color || 'yellow'} onChange={(e) => change('color', e.target.value)}>
            {['yellow', 'green', 'red', 'blue', 'purple', 'gray', 'white'].map((x) => (
              <option key={x} value={x}>
                {x[0].toUpperCase() + x.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend>Labels</legend>
          <LabelSelection
            labels={labels}
            selected={form?.labelIds || []}
            onChange={(ids) => change('labelIds', ids)}
          />
          <div className="inlineCreate">
            <input
              placeholder="Create a label"
              maxLength="100"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
            />
            <input
              aria-label="New label color"
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
            />
            <button
              type="button"
              className="quietButton"
              onClick={async () => {
                if (await onCreateLabel(newLabel.trim(), newColor)) {
                  setNewLabel('');
                }
              }}
            >
              Add label
            </button>
          </div>
        </fieldset>
        <fieldset>
          <legend>Checklist</legend>
          {(form?.checklist || []).map((item, i) => (
            <div className={styles.checklistRow} key={`${i}-${item.text}`}>
              <input
                aria-label={`Mark ${item.text} complete`}
                type="checkbox"
                checked={item.done}
                onChange={(e) =>
                  change(
                    'checklist',
                    form.checklist.map((x, n) => (n === i ? { ...x, done: e.target.checked } : x))
                  )
                }
              />
              <span style={{ textDecoration: item.done ? 'line-through' : '' }}>{item.text}</span>
              <button
                type="button"
                aria-label="Remove checklist item"
                onClick={() =>
                  change(
                    'checklist',
                    form.checklist.filter((_, n) => n !== i)
                  )
                }
              >
                ×
              </button>
            </div>
          ))}
          <div className="inlineCreate">
            <input
              placeholder="Add checklist item"
              value={checkText}
              onChange={(e) => setCheckText(e.target.value)}
            />
            <button
              type="button"
              className="quietButton"
              onClick={() => {
                if (!checkText.trim()) return;
                change('checklist', [...form.checklist, { text: checkText.trim(), done: false }]);
                setCheckText('');
              }}
            >
              Add item
            </button>
          </div>
        </fieldset>
        <div className="dialogActions">
          {card && (
            <button type="button" className="dangerButton" onClick={onDelete}>
              Delete card
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="quietButton" onClick={onClose}>
            Cancel
          </button>
          <button className="primaryButton" type="submit">
            Save card
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function BoardDialog({ open, onClose, onCreate }) {
  const [title, setTitle] = useState('');
  useEffect(() => {
    if (open) setTitle('');
  }, [open]);
  return (
    <Modal open={open} onClose={onClose} compact>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onCreate(title);
        }}
      >
        <header className="dialogHeader">
          <h2>New board</h2>
          <button type="button" className="iconButton" onClick={onClose}>
            ×
          </button>
        </header>
        <label>
          Board title
          <input
            required
            maxLength="200"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <div className="dialogActions">
          <span className="spacer" />
          <button type="button" className="quietButton" onClick={onClose}>
            Cancel
          </button>
          <button className="primaryButton">Create board</button>
        </div>
      </form>
    </Modal>
  );
}
export function ColumnDialog({ open, column, index, count, onClose, onSave, onDelete, onMove }) {
  const [title, setTitle] = useState(''),
    [limit, setLimit] = useState(''),
    [mode, setMode] = useState('soft');
  useEffect(() => {
    if (open) {
      setTitle(column?.title || '');
      setLimit(column?.wip_limit || '');
      setMode(column?.wip_mode || 'soft');
    }
  }, [open, column]);
  return (
    <Modal open={open} onClose={onClose} compact>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ title, wipLimit: limit ? Number(limit) : null, wipMode: mode });
        }}
      >
        <header className="dialogHeader">
          <h2>{column ? 'Column settings' : 'Add column'}</h2>
          <button type="button" className="iconButton" onClick={onClose}>
            ×
          </button>
        </header>
        <label>
          Column name
          <input
            required
            maxLength="200"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <div className="formRow">
          <label>
            WIP limit
            <input
              type="number"
              min="1"
              placeholder="No limit"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
            />
          </label>
          <label>
            Limit type
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="soft">Soft warning</option>
              <option value="hard">Hard limit</option>
            </select>
          </label>
        </div>
        {column && (
          <div className={styles.reorder}>
            <button
              type="button"
              className="quietButton"
              disabled={index <= 1}
              onClick={() => onMove(-1)}
            >
              ← Move left
            </button>
            <button
              type="button"
              className="quietButton"
              disabled={index >= count - 2}
              onClick={() => onMove(1)}
            >
              Move right →
            </button>
          </div>
        )}
        <div className="dialogActions">
          {column && !['Backlog', 'Archive'].includes(column.title) && (
            <button type="button" className="dangerButton" onClick={onDelete}>
              Delete column
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="quietButton" onClick={onClose}>
            Cancel
          </button>
          <button className="primaryButton">Save</button>
        </div>
      </form>
    </Modal>
  );
}
export function DeletedDialog({ open, cards, onClose, onRestore }) {
  return (
    <Modal open={open} onClose={onClose} compact>
      <header className="dialogHeader">
        <h2>Deleted cards</h2>
        <button className="iconButton" onClick={onClose}>
          ×
        </button>
      </header>
      {cards.length ? (
        cards.map((c) => (
          <div className={styles.deletedRow} key={c.id}>
            <div>
              <strong>{c.title}</strong>
              <small>
                {c.board_title} · {c.column_title}
              </small>
            </div>
            <button className="quietButton" onClick={() => onRestore(c.id)}>
              Restore
            </button>
          </div>
        ))
      ) : (
        <p className="emptyState">No deleted cards.</p>
      )}
    </Modal>
  );
}
