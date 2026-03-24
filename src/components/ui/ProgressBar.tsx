interface ProgressBarProps {
  value: number; // 0-100
  className?: string;
  animated?: boolean;
  color?: 'mandatory' | 'flexible' | 'savings' | 'auto';
}

export function ProgressBar({ value, className = '', animated = true, color = 'auto' }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  let fillColor = '';
  if (color === 'mandatory') fillColor = 'bg-accent';
  else if (color === 'flexible') fillColor = 'bg-text2';
  else if (color === 'savings') fillColor = 'bg-success';
  else {
    // auto: color by percentage
    if (clamped >= 100) fillColor = 'bg-danger';
    else if (clamped >= 80) fillColor = 'bg-warning';
    else if (clamped >= 60) fillColor = 'bg-text2';
    else fillColor = 'bg-accent';
  }

  return (
    <div className={`w-full h-[7px] rounded-full bg-sand overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full ${fillColor} ${animated ? 'transition-all duration-700 ease-out' : ''}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
