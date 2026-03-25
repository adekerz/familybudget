interface MoneyInputProps {
  value: number | '';
  onChange: (value: number | '') => void;
  placeholder?: string;
  autoFocus?: boolean;
  large?: boolean;
}

export function MoneyInput({ value, onChange, placeholder = '0', autoFocus, large }: MoneyInputProps) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^\d]/g, '');
    onChange(raw === '' ? '' : parseInt(raw, 10));
  }

  const displayValue = value === '' ? '' :
    value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={`w-full bg-card border border-border rounded-xl px-4 pr-10
          text-ink font-bold focus:outline-none focus:border-accent
          focus:ring-2 focus:ring-accent-light placeholder:text-muted
          transition-all text-center
          ${large ? 'py-4 text-2xl' : 'py-3 text-lg'}`}
      />
      <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-muted font-bold
        ${large ? 'text-xl' : 'text-base'}`}>
        ₸
      </span>
    </div>
  );
}
