import type { ReactNode } from 'react';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'accent' | 'muted';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-success/20 text-success border-success/30',
  warning: 'bg-warning/20 text-warning border-warning/30',
  danger:  'bg-danger/20 text-danger border-danger/30',
  accent:  'bg-accent/20 text-accent border-accent/30',
  muted:   'bg-border/40 text-muted border-border/40',
};

export function Badge({ children, variant = 'muted', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
