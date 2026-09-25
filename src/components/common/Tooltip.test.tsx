import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { Tooltip } from './Tooltip';

describe('Tooltip Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders trigger child and does not show tooltip initially', () => {
    render(
      <Tooltip content="Tooltip Text">
        <button type="button">Trigger</button>
      </Tooltip>
    );

    expect(screen.getByText('Trigger')).toBeInTheDocument();
    expect(screen.queryByText('Tooltip Text')).not.toBeInTheDocument();
  });

  it('shows tooltip content after hover delay', () => {
    render(
      <Tooltip content="Keterangan Tombol" delay={150}>
        <button type="button">Hover Me</button>
      </Tooltip>
    );

    const trigger = screen.getByText('Hover Me');
    fireEvent.mouseEnter(trigger);

    // Before delay expires, not yet visible
    expect(screen.queryByText('Keterangan Tombol')).not.toBeInTheDocument();

    // Fast-forward time past delay
    act(() => {
      vi.advanceTimersByTime(160);
    });

    expect(screen.getByText('Keterangan Tombol')).toBeInTheDocument();
  });

  it('hides tooltip immediately on mouse leave', () => {
    render(
      <Tooltip content="Keterangan Tombol" delay={100}>
        <button type="button">Hover Me</button>
      </Tooltip>
    );

    const trigger = screen.getByText('Hover Me');
    fireEvent.mouseEnter(trigger);

    act(() => {
      vi.advanceTimersByTime(110);
    });

    expect(screen.getByText('Keterangan Tombol')).toBeInTheDocument();

    fireEvent.mouseLeave(trigger);

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.queryByText('Keterangan Tombol')).not.toBeInTheDocument();
  });

  it('automatically adds aria-label to child if not already present', () => {
    render(
      <Tooltip content="Aksesibilitas Label">
        <button type="button">Action</button>
      </Tooltip>
    );

    const trigger = screen.getByText('Action');
    expect(trigger).toHaveAttribute('aria-label', 'Aksesibilitas Label');
  });

  it('renders shortcut badge when shortcut prop is provided', () => {
    render(
      <Tooltip content="Simpan Data" shortcut="Ctrl+S" delay={50}>
        <button type="button">Save</button>
      </Tooltip>
    );

    const trigger = screen.getByText('Save');
    fireEvent.mouseEnter(trigger);

    act(() => {
      vi.advanceTimersByTime(60);
    });

    expect(screen.getByText('Ctrl+S')).toBeInTheDocument();
  });

  it('does not display tooltip when disabled is true', () => {
    render(
      <Tooltip content="Disabled Tooltip" disabled delay={50}>
        <button type="button">Disabled Action</button>
      </Tooltip>
    );

    const trigger = screen.getByText('Disabled Action');
    fireEvent.mouseEnter(trigger);

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.queryByText('Disabled Tooltip')).not.toBeInTheDocument();
  });
});
