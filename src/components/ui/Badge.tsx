type BadgeVariant = 'mandatory' | 'flexible' | 'savings' | 'income' | 'warn' | 'danger' | 'default';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  mandatory: 'bg-accent-light text-accent',
  flexible:  'bg-sand text-text2',
  savings:   'bg-success-bg text-success',
  income:    'bg-alice text-ink',
  warn:      'bg-warning-bg text-warning',
  danger:    'bg-danger-bg text-danger',
  default:   'bg-sand text-muted',
};

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[20px] px-2.5 py-1 text-[11px] font-semibold ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
