import type React from 'react';
import { CircleNotch } from '@phosphor-icons/react';
import { cx } from './cx';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ComponentProps<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

// Colours come only from --ds-* variables so the button follows whichever
// design system scope it is rendered in (app root or a preview container).
const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--ds-accent)] text-[var(--ds-accent-fg)] border-[var(--ds-border)] hover:bg-[var(--ds-accent-hover)]',
  secondary:
    'bg-[var(--ds-surface-muted)] text-[var(--ds-text)] border-[var(--ds-border)] hover:bg-[var(--ds-accent-soft)]',
  outline:
    'bg-transparent text-[var(--ds-text)] border-[var(--ds-border)] hover:bg-[var(--ds-accent-soft)]',
  ghost: 'bg-transparent text-[var(--ds-text)] border-transparent hover:bg-[var(--ds-accent-soft)]',
  danger: 'bg-[var(--ds-danger-bg)] text-[var(--ds-danger-fg)] border-[var(--ds-danger-fg)]',
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-5 text-base gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  type = 'button',
  disabled,
  className,
  style,
  children,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      data-variant={variant}
      className={cx(
        'ds-ui-control inline-flex items-center justify-center font-semibold whitespace-nowrap select-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANT_CLASS[variant],
        SIZE_CLASS[size],
        fullWidth && 'w-full',
        className,
      )}
      style={{
        borderWidth: 'var(--ds-border-width)',
        borderStyle: 'solid',
        borderRadius: 'var(--ds-radius-md)',
        boxShadow: variant === 'ghost' ? 'none' : 'var(--ds-elevation-sm)',
        fontFamily: 'var(--ds-font-sans)',
        transition:
          'background-color var(--ds-transition-fast), box-shadow var(--ds-transition-fast)',
        ...style,
      }}
      {...rest}
    >
      {loading ? (
        <CircleNotch aria-hidden="true" className="h-4 w-4 animate-spin" />
      ) : (
        icon && <span aria-hidden="true" className="inline-flex">{icon}</span>
      )}
      {children}
    </button>
  );
}
