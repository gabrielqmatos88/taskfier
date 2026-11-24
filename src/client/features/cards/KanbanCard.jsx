import styles from '../boards/BoardView.module.css';
export default function KanbanCard({ card, columnId, onEdit, onMenu, onDragStart }) {
  return (
    <article
      className={`${styles.card} ${styles[card.color] || styles.yellow}`}
      draggable
      tabIndex="0"
      onDoubleClick={() => onEdit(card.id, columnId)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onEdit(card.id, columnId);
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onMenu(card.id, e.currentTarget);
      }}
      onDragStart={(e) => onDragStart(e, card.id)}
      data-card={card.id}
      data-column={columnId}
    >
      <button
        type="button"
        className={styles.cardAction}
        aria-label="Card actions"
        onClick={(e) => {
          e.stopPropagation();
          onMenu(card.id, e.currentTarget);
        }}
      >
        ⋯
      </button>
      <h3 className={styles.cardTitle}>{card.title}</h3>
      {card.description && <p className={styles.cardDescription}>{card.description}</p>}
      <div className={styles.cardMeta}>
        {card.priority && card.priority !== 'normal' && (
          <span className={`${styles.pill} ${styles[`priority_${card.priority}`]}`}>
            {card.priority}
          </span>
        )}
        {card.deadline && (
          <span className={`${styles.pill} ${styles.deadline}`}>◷ {card.deadline}</span>
        )}
        {(card.labels || []).map((label) => (
          <span
            className={styles.pill}
            key={label.id}
            style={{ borderLeft: `3px solid ${label.color}` }}
          >
            {label.name}
          </span>
        ))}
        {card.checklist?.length > 0 && (
          <span className={styles.pill}>
            ☑ {card.checklist.filter((x) => x.done).length}/{card.checklist.length}
          </span>
        )}
      </div>
    </article>
  );
}
