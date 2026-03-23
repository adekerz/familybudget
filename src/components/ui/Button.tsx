import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:bg-accent/90',
  secondary: 'bg-bg-card border border-bg-border text-white hover:bg-bg-border',
  ghost: 'bg-transparent text-gray-400 hover:text-white hover:bg-bg-card',
  danger: 'bg-danger/10 text-danger hover:bg-danger/20',
};

export default function Button({ variant = 'primary', fullWidth, children, className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`
        px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200
        active:scale-95 disabled:opacity-50 disabled:pointer-events-none
        ${variantClasses[variant]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}
