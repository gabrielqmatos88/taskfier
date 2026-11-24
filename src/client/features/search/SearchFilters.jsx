import styles from '../../App.module.css';
export default function SearchFilters({ filter, labels, onChange, onClear }) {
  return (
    <section className={styles.toolbar} aria-label="Find cards">
      <label className={styles.searchBox}>
        <span aria-hidden="true">⌕</span>
        <input
          type="search"
          placeholder="Search titles and descriptions"
          aria-label="Search titles and descriptions"
          value={filter.q}
          onChange={(e) => onChange({ ...filter, q: e.target.value })}
        />
      </label>
      <select
        aria-label="Filter by label"
        value={filter.label}
        onChange={(e) => onChange({ ...filter, label: e.target.value })}
      >
        <option value="">All labels</option>
        {labels.map((label) => (
          <option key={label.id} value={label.id}>
            {label.name}
          </option>
        ))}
      </select>
      <input
        aria-label="Filter by deadline"
        type="date"
        value={filter.deadline}
        onChange={(e) => onChange({ ...filter, deadline: e.target.value })}
      />
      <button className="quietButton" onClick={onClear}>
        Clear filters
      </button>
    </section>
  );
}
