import { useState, useEffect, useRef } from 'react';

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'value'> {
  value: number;
  onChange: (val: number) => void;
}

export default function NumberInput({ value, onChange, className, ...rest }: NumberInputProps) {
  const [display, setDisplay] = useState(value === 0 && !rest.readOnly ? '' : String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setDisplay(value === 0 ? '' : String(value));
    }
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    // Allow only digits, dot, comma, minus
    if (!/^[\d.,-]*$/.test(raw)) return;
    setDisplay(raw);
    const num = parseFloat(raw.replace(/,/g, ''));
    onChange(isNaN(num) ? 0 : num);
  }

  function handleBlur() {
    const num = parseFloat(display.replace(/,/g, ''));
    const finalVal = isNaN(num) ? 0 : num;
    setDisplay(finalVal === 0 ? '' : String(finalVal));
    onChange(finalVal);
  }

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
      className={className}
      {...rest}
    />
  );
}
