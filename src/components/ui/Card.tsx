import type { ReactNode, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: boolean;
}

export default function Card({ children, padding = true, className = '', ...props }: CardProps) {
  return (
    <div
      className={`bg-card border border-border rounded-2xl ${padding ? 'p-4' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
