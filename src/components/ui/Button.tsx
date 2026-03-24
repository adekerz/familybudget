import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:   'bg-accent text-white hover:bg-accent/90 active:scale-[0.97]',
  secondary: 'bg-card text-accent border border-accent hover:bg-accent-light active:scale-[0.97]',
  ghost:     'bg-alice text-ink border border-border hover:bg-sand active:scale-[0.97]',
  danger:    'bg-danger-bg text-danger border border-danger/30 hover:bg-danger/10 active:scale-[0.97]',
};

export default function Button({ variant = 'primary', fullWidth, children, className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`
        px-5 py-2.5 rounded-[22px] font-semibold text-sm transition-all duration-150
        disabled:opacity-50 disabled:pointer-events-none inline-flex items-center gap-2
        ${variantClasses[variant]}
        ${fullWidth ? 'w-full justify-center' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}
