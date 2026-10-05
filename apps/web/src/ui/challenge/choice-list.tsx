// Large answer choices (quiz, reading questions): tap one to select it, then "Kiểm tra".
import { mapBoth } from '../i18n/i18n';
import { Bi } from '../i18n/use-t';
import { twin } from '../quest/content-text';

export function ChoiceList({
  choices,
  en,
  selected,
  onSelect,
  fill,
  label,
}: {
  choices: ReadonlyArray<{ id: string; text: string }>;
  /** The choices' English twins, in order, when the step has them (textbook choices have none). */
  en?: readonly string[] | undefined;
  selected: string | null;
  onSelect: (id: string) => void;
  fill: (text: string) => string;
  label: string;
}) {
  return (
    <div className="choice-list" role="radiogroup" aria-label={label}>
      {choices.map((c, i) => (
        <button
          key={c.id}
          type="button"
          role="radio"
          aria-checked={selected === c.id}
          className={`choice${selected === c.id ? ' choice--selected' : ''}`}
          data-id={`choice-${c.id}`}
          onClick={() => onSelect(c.id)}
        >
          <Bi {...mapBoth(twin(c.text, en?.[i]), fill)} />
        </button>
      ))}
    </div>
  );
}
