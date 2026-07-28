import React from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
};

export function Button({ variant = 'primary', className = '', children, ...rest }: ButtonProps) {
  const base = 'rounded-md px-4 py-2 text-sm font-medium focus-ring min-touch';
  const variants: Record<string, string> = {
    primary: `bg-[var(--color-primary)] text-[var(--color-primary-contrast)] hover:opacity-95 shadow-sm ${base}`,
    secondary: `bg-[var(--color-surface)] text-[var(--color-ink)] border border-gray-200 hover:bg-gray-50 ${base}`,
    ghost: `bg-transparent text-[var(--color-primary)] ${base}`,
  };

  return (
    <button className={`${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export default Button;
