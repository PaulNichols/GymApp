import type { SupplementLog } from '../models/foodLog';

interface SupplementCardProps {
  supplements: SupplementLog;
  onChange: (supplements: SupplementLog) => void;
}

export function SupplementCard({ supplements, onChange }: SupplementCardProps) {
  const updateItem = (index: number, taken: boolean) => {
    const items = supplements.items.map((item, itemIndex) => (itemIndex === index ? { ...item, taken } : item));
    onChange({ ...supplements, items });
  };

  return (
    <section className="panel">
      <div className="panel-title">
        <h2>Morning supplements</h2>
      </div>

      <label className="check-row primary-check">
        <input
          type="checkbox"
          checked={supplements.morningSupplementsTaken}
          onChange={(event) => onChange({ ...supplements, morningSupplementsTaken: event.target.checked })}
        />
        <span>Took morning supplements</span>
      </label>

      <div className="check-list">
        {supplements.items.map((item, index) => (
          <label className="check-row" key={item.name}>
            <input type="checkbox" checked={item.taken} onChange={(event) => updateItem(index, event.target.checked)} />
            <span>{item.name}</span>
          </label>
        ))}
      </div>

      <label className="field">
        <span>Supplement notes</span>
        <textarea
          value={supplements.notes}
          placeholder="Anything different today"
          onChange={(event) => onChange({ ...supplements, notes: event.target.value })}
        />
      </label>
    </section>
  );
}
