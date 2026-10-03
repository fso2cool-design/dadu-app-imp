import React, { useId } from 'react';
import { WarningCircle } from '@phosphor-icons/react';
import { cx } from './cx';

/** Shared control styling for Input and Select. */
export const CONTROL_CLASS =
  'ds-ui-control w-full h-10 text-sm bg-[var(--ds-input)] text-[var(--ds-text)] border-[var(--ds-border)] placeholder:text-[var(--ds-text-muted)] disabled:cursor-not-allowed disabled:opacity-50';

export const CONTROL_STYLE: React.CSSProperties = {
  borderWidth: 'var(--ds-border-width)',
  borderStyle: 'solid',
  borderRadius: 'var(--ds-radius-md)',
  fontFamily: 'var(--ds-font-sans)',
  transition: 'border-color var(--ds-transition-fast), box-shadow var(--ds-transition-fast)',
};

interface FieldFrameProps {
  id: string;
  label?: string;
  helperText?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

/** Label + helper + error wiring shared by Input and Select. */
export function FieldFrame({ id, label, helperText, error, children, className }: FieldFrameProps) {
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-[var(--ds-text)]">
          {label}
        </label>
      )}
      {children}
      {helperText && !error && (
        <p id={`${id}-helper`} className="text-xs text-[var(--ds-text-muted)]">
          {helperText}
        </p>
      )}
      {error && (
        // Error text sits on its own danger block so it reads in every system,
        // including neo-brutalism dark where dangerFg (black) would vanish on the card.
        <p
          id={`${id}-error`}
          className="inline-flex items-center gap-1.5 self-start px-2 py-1 text-xs font-medium bg-[var(--ds-danger-bg)] text-[var(--ds-danger-fg)]"
          style={{ borderRadius: 'var(--ds-radius-sm)' }}
        >
          <WarningCircle aria-hidden="true" weight="bold" className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

export function describedBy(id: string, helperText?: string, error?: string, extra?: string) {
  const ids = [extra, error ? `${id}-error` : helperText ? `${id}-helper` : undefined].filter(
    Boolean,
  );
  return ids.length ? ids.join(' ') : undefined;
}

export interface InputProps extends Omit<React.ComponentProps<'input'>, 'size'> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
}

export function Input({
  id,
  label,
  helperText,
  error,
  leftIcon,
  rightIcon,
  containerClassName,
  className,
  style,
  'aria-describedby': ariaDescribedBy,
  ...rest
}: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldFrame
      id={inputId}
      label={label}
      helperText={helperText}
      error={error}
      className={containerClassName}
    >
      <div className="relative">
        {leftIcon && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[var(--ds-text-muted)]"
          >
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(inputId, helperText, error, ariaDescribedBy)}
          className={cx(CONTROL_CLASS, leftIcon ? 'pl-9' : 'pl-3', rightIcon ? 'pr-9' : 'pr-3', className)}
          style={{ ...CONTROL_STYLE, ...style }}
          {...rest}
        />
        {rightIcon && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[var(--ds-text-muted)]"
          >
            {rightIcon}
          </span>
        )}
      </div>
    </FieldFrame>
  );
}
