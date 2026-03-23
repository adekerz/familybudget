interface ProgressBarProps {
  value: number; // 0-100
  className?: string;
  animated?: boolean;
}

export function ProgressBar({ value, className = '', animated = true }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  let colorClass = 'bg-success';
  if (clamped >= 80) colorClass = 'bg-danger';
  else if (clamped >= 60) colorClass = 'bg-warning';

  return (
    <div className={`w-full h-2 rounded-full bg-border overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full ${colorClass} ${animated ? 'transition-all duration-700 ease-out' : ''}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
