import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './ActionMenu.module.css';
export default function ActionMenu({ anchor, columns, onAction, onClose }) {
  const [move, setMove] = useState(false);
  const ref = useRef(null);
  const [position, setPosition] = useState({ left: 8, top: 8 });
  useLayoutEffect(() => {
    if (!anchor || !ref.current) return;
    const rect = anchor.getBoundingClientRect();
    const menu = ref.current.getBoundingClientRect();
    let top = rect.bottom + 4;
    if (top + menu.height > innerHeight - 8) top = Math.max(8, rect.top - menu.height - 4);
    setPosition({
      left: Math.max(8, Math.min(rect.right - menu.width, innerWidth - menu.width - 8)),
      top
    });
  }, [anchor, move]);
  useEffect(() => {
    const outside = (e) => {
      if (!ref.current?.contains(e.target) && !anchor?.contains(e.target)) onClose();
    };
    const scroll = () => onClose();
    document.addEventListener('click', outside, true);
    window.addEventListener('scroll', scroll, true);
    window.addEventListener('resize', scroll);
    return () => {
      document.removeEventListener('click', outside, true);
      window.removeEventListener('scroll', scroll, true);
      window.removeEventListener('resize', scroll);
    };
  }, [anchor, onClose]);
  if (!anchor) return null;
  return createPortal(
    <div ref={ref} className={styles.menu} style={position} role="menu">
      {move ? (
        <>
          <button onClick={() => setMove(false)}>← Back</button>
          {columns.map((c) => (
            <button key={c.id} onClick={() => onAction('move', c.id)}>
              {c.title}
            </button>
          ))}
        </>
      ) : (
        <>
          <button onClick={() => onAction('edit')}>Edit card</button>
          <button onClick={() => setMove(true)}>Move to…</button>
          <button onClick={() => onAction('archive')}>Move to Archive</button>
          <button className={styles.danger} onClick={() => onAction('delete')}>
            Delete card
          </button>
        </>
      )}
    </div>,
    document.body
  );
}
