import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  position?: TooltipPosition;
  delay?: number;
  disabled?: boolean;
  className?: string;
  shortcut?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 150,
  disabled = false,
  className = '',
  shortcut,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const calculateCoords = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();

    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = rect.top - 8;
        left = rect.left + rect.width / 2;
        break;
      case 'bottom':
        top = rect.bottom + 8;
        left = rect.left + rect.width / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2;
        left = rect.left - 8;
        break;
      case 'right':
        top = rect.top + rect.height / 2;
        left = rect.right + 8;
        break;
    }

    setCoords({ top, left });
  }, [position]);

  const handleMouseEnter = () => {
    if (disabled || !content) return;
    timeoutRef.current = setTimeout(() => {
      calculateCoords();
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Update coords on scroll or resize if visible
  useEffect(() => {
    if (!isVisible) return;
    const handleScrollOrResize = () => {
      calculateCoords();
    };
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isVisible, calculateCoords]);

  // Clone child to attach mouse event handlers and ref
  const child = React.Children.only(children) as React.ReactElement<any>;
  const childProps: any = {
    ref: (node: HTMLElement | null) => {
      triggerRef.current = node;
      const { ref } = child as any;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref && 'current' in ref) {
        ref.current = node;
      }
    },
    onMouseEnter: (e: React.MouseEvent) => {
      handleMouseEnter();
      child.props.onMouseEnter?.(e);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      handleMouseLeave();
      child.props.onMouseLeave?.(e);
    },
    onFocus: (e: React.FocusEvent) => {
      handleMouseEnter();
      child.props.onFocus?.(e);
    },
    onBlur: (e: React.FocusEvent) => {
      handleMouseLeave();
      child.props.onBlur?.(e);
    },
  };

  // Add aria-label if not already provided on child
  if (!child.props['aria-label'] && typeof content === 'string') {
    childProps['aria-label'] = content;
  }

  const getTransformOrigin = () => {
    switch (position) {
      case 'top':
        return '-translate-x-1/2 -translate-y-full';
      case 'bottom':
        return '-translate-x-1/2 translate-y-0';
      case 'left':
        return '-translate-x-full -translate-y-1/2';
      case 'right':
        return 'translate-x-0 -translate-y-1/2';
    }
  };

  const getArrowClasses = () => {
    switch (position) {
      case 'top':
        return 'top-full left-1/2 -translate-x-1/2 -mt-1 border-t-slate-900 dark:border-t-[#141722] border-x-transparent border-b-transparent border-4';
      case 'bottom':
        return 'bottom-full left-1/2 -translate-x-1/2 -mb-1 border-b-slate-900 dark:border-b-[#141722] border-x-transparent border-t-transparent border-4';
      case 'left':
        return 'left-full top-1/2 -translate-y-1/2 -ml-1 border-l-slate-900 dark:border-l-[#141722] border-y-transparent border-r-transparent border-4';
      case 'right':
        return 'right-full top-1/2 -translate-y-1/2 -mr-1 border-r-slate-900 dark:border-r-[#141722] border-y-transparent border-l-transparent border-4';
    }
  };

  return (
    <>
      {React.cloneElement(child, childProps)}
      {typeof document !== 'undefined' &&
        createPortal(
          isVisible && coords && (
            <div
              style={{
                position: 'fixed',
                top: coords.top,
                left: coords.left,
              }}
              className={`fixed z-9999 pointer-events-none ${getTransformOrigin()} select-none animate-in fade-in zoom-in-95 duration-150`}
            >
              <div
                className={`relative px-2.5 py-1.5 rounded-lg text-xs font-medium text-white bg-slate-900/95 dark:bg-[#141722]/95 backdrop-blur-md shadow-xl border border-slate-700/70 dark:border-emerald-500/40 flex items-center gap-1.5 whitespace-nowrap ${className}`}
              >
                <span>{content}</span>
                {shortcut && (
                  <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/10 dark:bg-emerald-950/60 text-slate-300 dark:text-emerald-300 border border-white/10 dark:border-emerald-500/30">
                    {shortcut}
                  </kbd>
                )}
                {/* Caret Arrow */}
                <span className={`absolute w-0 h-0 pointer-events-none ${getArrowClasses()}`} />
              </div>
            </div>
          ),
          document.body
        )}
    </>
  );
};
