// Large number keys for PIN entry on a tablet; the PIN input next to it stays the source of truth.

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export function PinPad({ value, onChange, maxLength = 6 }: { value: string; onChange(next: string): void; maxLength?: number }) {
  const press = (digit: string) => {
    if (value.length < maxLength) onChange(value + digit);
  };
  return (
    <div className="pin-pad" role="group" aria-label="Bàn phím số">
      {DIGITS.map((d) => (
        <button key={d} type="button" className="pin-key" onClick={() => press(d)}>
          {d}
        </button>
      ))}
      <button type="button" className="pin-key pin-key--word" aria-label="Xóa số cuối" onClick={() => onChange(value.slice(0, -1))}>
        Xóa
      </button>
      <button type="button" className="pin-key" onClick={() => press('0')}>
        0
      </button>
      <button type="button" className="pin-key pin-key--word" onClick={() => onChange('')}>
        Xóa hết
      </button>
    </div>
  );
}
