import styles from './LabelSelection.module.css';
export default function LabelSelection({ labels, selected, onChange }) {
 if(!labels.length)return <small>No labels yet</small>;
 return <div className={styles.checkboxes}>{labels.map(label=><label key={label.id}><input type="checkbox" checked={selected.includes(label.id)} onChange={e=>onChange(e.target.checked?[...selected,label.id]:selected.filter(id=>id!==label.id))}/><span style={{borderBottom:`2px solid ${label.color}`}}>{label.name}</span></label>)}</div>;
}
