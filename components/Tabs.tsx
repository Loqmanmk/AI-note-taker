type TabsProps<T extends string> = {
  label: string;
  tabs: readonly (readonly [id: T, label: string])[];
  selected: T;
  onSelect: (id: T) => void;
  disabled?: boolean;
  className?: string;
};

/** A row of tabs. The caller renders the panel for the selected tab. */
export function Tabs<T extends string>({ label, tabs, selected, onSelect, disabled, className = "tabs" }: TabsProps<T>) {
  return (
    <div className={className} role="tablist" aria-label={label}>
      {tabs.map(([id, text]) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={selected === id}
          disabled={disabled}
          onClick={() => onSelect(id)}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
