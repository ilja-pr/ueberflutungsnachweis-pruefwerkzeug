import { useEffect, useRef, useState } from 'react';
import { parseNum } from '../lib/format';

interface Props {
  value: number | null;
  onChange: (v: number | null) => void;
  unit?: string;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
}

/** Zahlenfeld, das "1,5" und "1.5" akzeptiert und beim Tippen nichts umformatiert. */
export function NumInput({ value, onChange, unit, placeholder, ariaLabel, className, disabled }: Props) {
  const [text, setText] = useState(value === null ? '' : String(value).replace('.', ','));
  const last = useRef<number | null>(value);

  useEffect(() => {
    if (value !== last.current) {
      last.current = value;
      setText(value === null ? '' : String(value).replace('.', ','));
    }
  }, [value]);

  const invalid = text.trim() !== '' && parseNum(text) === null;
  return (
    <span className={`numwrap ${className ?? ''}`}>
      <input
        type="text"
        inputMode="decimal"
        value={text}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-invalid={invalid}
        placeholder={placeholder}
        onChange={(ev) => {
          setText(ev.target.value);
          const n = parseNum(ev.target.value);
          if (n !== null || ev.target.value.trim() === '') {
            last.current = n;
            onChange(n);
          }
        }}
      />
      {unit && <span className="unit">{unit}</span>}
    </span>
  );
}
