import React from 'react';

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  id?: string;
  error?: string | null;
};

export function Input({ label, id, error, className = '', ...rest }: InputProps) {
  const inputId = id || `input-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-[var(--color-ink)]">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`border border-gray-200 rounded-md px-3 py-2 focus-ring focus:border-[var(--color-primary)] ${className}`}
        aria-invalid={error ? 'true' : 'false'}
        {...rest}
      />
      {error && (
        <div role="alert" className="text-sm text-[var(--color-danger)]" aria-live="assertive">
          {error}
        </div>
      )}
    </div>
  );
}

export default Input;
