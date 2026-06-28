interface DateSelectorProps {
  value: string;
  onChange: (date: string) => void;
}

export function DateSelector({ value, onChange }: DateSelectorProps) {
  return (
    <label className="field">
      <span>Date</span>
      <input type="date" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
