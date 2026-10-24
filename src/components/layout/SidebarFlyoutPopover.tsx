import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface FlyoutSubMenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}

export interface SidebarFlyoutPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRect: DOMRect | null;
  groupTitle: string;
  items: FlyoutSubMenuItem[];
  currentRoute: string;
  onSelectSubItem: (subId: string) => void;
  isSubItemActive: (subId: string) => boolean;
}

export const SidebarFlyoutPopover: React.FC<SidebarFlyoutPopoverProps> = ({
  isOpen,
  onClose,
  triggerRect,
  groupTitle,
  items,
  onSelectSubItem,
  isSubItemActive,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    const handlePointerDownOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      // Do nothing if click is inside the popover itself
      if (popoverRef.current && popoverRef.current.contains(target)) {
        return;
      }
      // If clicking any sidebar nav-item, let the nav-item's own click handler toggle/switch
      if (target.closest && target.closest('[data-nav-item="true"]')) {
        return;
      }
      onClose();
    };

    const handleScrollOrResize = () => {
      onClose();
    };

    document.addEventListener('mousedown', handlePointerDownOutside);
    document.addEventListener('touchstart', handlePointerDownOutside);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      document.removeEventListener('mousedown', handlePointerDownOutside);
      document.removeEventListener('touchstart', handlePointerDownOutside);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !triggerRect) return null;

  // Auto-flip positioning calculation to prevent viewport boundary clipping
  const popoverWidth = 224; // 14rem
  const estimatedHeight = 44 + items.length * 38;
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;

  let left = triggerRect.right + 8;
  if (left + popoverWidth > viewportWidth - 8) {
    left = Math.max(8, triggerRect.left - popoverWidth - 8);
  }

  let top = triggerRect.top;
  // If popover overflows bottom of viewport, flip upwards
  if (top + estimatedHeight > viewportHeight - 16) {
    top = Math.max(16, triggerRect.bottom - estimatedHeight);
  }

  return createPortal(
    <div
      ref={popoverRef}
      role="menu"
      aria-label={`Menu ${groupTitle}`}
      data-testid="sidebar-flyout-popover"
      className="fixed z-45 w-56 rounded-2xl border p-1.5 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 select-none"
      style={{
        left: `${Math.round(left)}px`,
        top: `${Math.round(top)}px`,
        maxHeight: 'calc(100vh - 32px)',
        overflowY: 'auto',
        background: 'var(--ds-surface-elevated)',
        borderColor: 'var(--ds-border)',
        boxShadow: '0 16px 36px -4px rgba(0, 0, 0, 0.22), 0 0 0 1px var(--ds-border)',
      }}
    >
      {/* Popover Header Card with Group Title */}
      <div className="flex items-center justify-between px-2.5 py-1.5 mb-1 border-b" style={{ borderColor: 'var(--ds-border)' }}>
        <span className="text-[11px] font-bold uppercase tracking-wider truncate" style={{ color: 'var(--ds-accent)' }}>
          {groupTitle}
        </span>
        <span
          className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
          style={{ background: 'var(--ds-surface-muted)', color: 'var(--ds-text-muted)' }}
        >
          {items.length} Menu
        </span>
      </div>

      {/* Sub-menu Item List */}
      <div className="space-y-0.5" role="none">
        {items.map((sub) => {
          const SubIcon = sub.icon;
          const isActive = isSubItemActive(sub.id);

          return (
            <button
              key={sub.id}
              role="menuitem"
              type="button"
              onClick={() => {
                onSelectSubItem(sub.id);
                onClose();
              }}
              data-active={isActive ? 'true' : 'false'}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-left transition-colors cursor-pointer group ${
                isActive
                  ? 'font-bold'
                  : 'hover:bg-[var(--ds-surface-muted)]'
              }`}
              style={{
                color: isActive ? 'var(--ds-accent)' : 'var(--ds-text)',
                background: isActive ? 'var(--ds-accent-soft)' : undefined,
              }}
            >
              <span
                className="shrink-0 transition-colors flex items-center justify-center"
                style={{
                  color: isActive ? 'var(--ds-accent)' : 'var(--ds-text-muted)',
                }}
              >
                <SubIcon className="w-4 h-4" />
              </span>
              <span className="truncate flex-1">{sub.label}</span>
              {isActive && (
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: 'var(--ds-accent)' }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>,
    document.body
  );
};
