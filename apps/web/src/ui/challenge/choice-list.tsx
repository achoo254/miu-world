// Large answer choices (quiz, reading questions): tap one to select it, then "Kiểm tra".
export function ChoiceList({
  choices,
  selected,
  onSelect,
  fill,
  label,
}: {
  choices: ReadonlyArray<{ id: string; text: string }>;
  selected: string | null;
  onSelect: (id: string) => void;
  fill: (text: string) => string;
  label: string;
}) {
  return (
    <div className="choice-list" role="radiogroup" aria-label={label}>
      {choices.map((c) => (
        <button
          key={c.id}
          type="button"
          role="radio"
          aria-checked={selected === c.id}
          className={`choice${selected === c.id ? ' choice--selected' : ''}`}
          data-id={`choice-${c.id}`}
          onClick={() => onSelect(c.id)}
        >
          {fill(c.text)}
        </button>
      ))}
    </div>
  );
}
