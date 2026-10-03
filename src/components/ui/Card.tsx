import type React from 'react';
import { cx } from './cx';

type Padding = 'none' | 'sm' | 'md' | 'lg';
type Elevation = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends React.ComponentProps<'div'> {
  padding?: Padding;
  elevation?: Elevation;
}

const PADDING_CLASS: Record<Padding, string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-7',
};

export function Card({
  padding = 'md',
  elevation = 'sm',
  className,
  style,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={cx(
        'bg-[var(--ds-surface-elevated)] text-[var(--ds-text)] border-[var(--ds-border)] flex flex-col gap-4',
        PADDING_CLASS[padding],
        className,
      )}
      style={{
        borderWidth: 'var(--ds-border-width)',
        borderStyle: 'solid',
        borderRadius: 'var(--ds-radius-lg)',
        boxShadow: `var(--ds-elevation-${elevation})`,
        fontFamily: 'var(--ds-font-sans)',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, ...rest }: React.ComponentProps<'div'>) {
  return <div className={cx('flex flex-col gap-1', className)} {...rest} />;
}

export function CardTitle({ className, ...rest }: React.ComponentProps<'h3'>) {
  return (
    <h3
      className={cx('text-base font-semibold leading-tight text-[var(--ds-text)]', className)}
      {...rest}
    />
  );
}

export function CardDescription({ className, ...rest }: React.ComponentProps<'p'>) {
  return <p className={cx('text-sm text-[var(--ds-text-muted)]', className)} {...rest} />;
}

export function CardContent({ className, ...rest }: React.ComponentProps<'div'>) {
  return <div className={cx('flex flex-col gap-4', className)} {...rest} />;
}

export function CardFooter({ className, style, ...rest }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cx('flex flex-wrap items-center justify-end gap-2 pt-4', className)}
      style={{ borderTop: 'var(--ds-border-width) solid var(--ds-border)', ...style }}
      {...rest}
    />
  );
}
