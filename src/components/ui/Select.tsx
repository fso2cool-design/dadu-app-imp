import type React from 'react';
import { useId } from 'react';
import { CaretDown } from '@phosphor-icons/react';
import { cx } from './cx';
import { CONTROL_CLASS, CONTROL_STYLE, FieldFrame, describedBy } from './Input';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.ComponentProps<'select'>, 'children'> {
  options: SelectOption[];
  label?: string;
  helperText?: string;
  error?: string;
  placeholder?: string;
  containerClassName?: string;
}

export function Select({
  id,
  options,
  label,
  helperText,
  error,
  placeholder,
  containerClassName,
  className,
  style,
  value,
  defaultValue,
  'aria-describedby': ariaDescribedBy,
  ...rest
}: SelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  // Uncontrolled + placeholder: start on the placeholder instead of the first option.
  const initial =
    value === undefined && defaultValue === undefined && placeholder ? '' : defaultValue;

  return (
    <FieldFrame
      id={selectId}
      label={label}
      helperText={helperText}
      error={error}
      className={containerClassName}
    >
      <div className="relative">
        <select
          id={selectId}
          value={value}
          defaultValue={initial}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(selectId, helperText, error, ariaDescribedBy)}
          className={cx(CONTROL_CLASS, 'appearance-none pl-3 pr-9', className)}
          style={{ ...CONTROL_STYLE, ...style }}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[var(--ds-text-muted)]"
        >
          <CaretDown className="h-4 w-4" weight="bold" />
        </span>
      </div>
    </FieldFrame>
  );
}
