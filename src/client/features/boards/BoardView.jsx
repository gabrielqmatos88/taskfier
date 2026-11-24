import KanbanCard from '../cards/KanbanCard';
import styles from './BoardView.module.css';
import { filterCards } from '../search/filterCards';

function Column({ column, cards, archivedCount, expanded, onAdd, onEdit, onCardMenu, onColumnMenu, onToggleArchive, onDrop, onDragStart }) {
  const over = column.wip_limit && cards.length >= column.wip_limit;
  const isArchive = column.title === 'Archive';
  return <section className={styles.column} data-column={column.id} onDragOver={e => { if (e.target.closest('[data-column-content]')) { e.preventDefault(); e.currentTarget.classList.add(styles.dragTarget); } }} onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) e.currentTarget.classList.remove(styles.dragTarget); }} onDrop={e => { if (e.target.closest('[data-column-content]')) { e.preventDefault(); e.currentTarget.classList.remove(styles.dragTarget); onDrop(e, column.id); } }}>
    <header className={styles.columnHead}><span className={styles.columnTitle}>{column.title}</span><span className={styles.columnCount}>{cards.length}{column.wip_limit ? ` / ${column.wip_limit}` : ''}</span>{over && <span className={`${styles.wipWarning} ${column.wip_mode === 'hard' ? styles.wipDanger : ''}`} title={`WIP limit ${column.wip_mode === 'hard' ? 'reached' : 'exceeded'}`}>{column.wip_mode === 'hard' ? 'Limit' : 'Over limit'}</span>}<button className={styles.iconButton} title="Column settings" aria-label="Column settings" onClick={() => onColumnMenu(column.id)}>⋯</button></header>
    <div className={styles.columnContent} data-column-content="" data-column={column.id}>{cards.map(card => <KanbanCard key={card.id} card={card} columnId={column.id} onEdit={onEdit} onMenu={onCardMenu} onDragStart={onDragStart}/>)}</div>
    {isArchive && (expanded ? archivedCount > 10 : archivedCount === 10) && <button className={styles.archiveToggle} onClick={onToggleArchive}>{expanded ? 'Show latest 10' : 'Show all archived cards'}</button>}
    {!isArchive && <div className={styles.addWrap}><button className={styles.addCard} onClick={() => onAdd(column.id)}>＋ Add a card</button></div>}
  </section>;
}
export default function BoardView({ board, filter, archiveExpanded, onAdd, onEdit, onCardMenu, onColumnMenu, onToggleArchive, onDrop, onDragStart, onAddColumn }) {
  if (!board) return null;
  return <section className={styles.board} aria-label="Kanban board">{board.columns.map(column => {
    const cards = filterCards(column.cards, filter);
    return <Column key={column.id} column={column} cards={cards} archivedCount={column.cards.length} expanded={archiveExpanded} onAdd={onAdd} onEdit={onEdit} onCardMenu={onCardMenu} onColumnMenu={onColumnMenu} onToggleArchive={onToggleArchive} onDrop={onDrop} onDragStart={onDragStart}/>;
  })}<button className={styles.addColumn} onClick={onAddColumn}>＋ Add column</button></section>;
}
