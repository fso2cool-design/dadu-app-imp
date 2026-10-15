import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  AssessmentColumnHeader,
  ASSESSMENT_CATEGORY_LABELS
} from './GradesPage';
import { AssessmentCategory, AssessmentItem } from '../../types';

describe('Grades AssessmentColumnHeader', () => {
  const baseItem: AssessmentItem = {
    id: 'asg-item-1',
    academicYearId: 'ay-2026',
    semester: 'GANJIL',
    teachingAssignmentId: 'ta-1',
    classId: 'cls-1',
    subjectId: 'sub-1',
    name: 'Ulangan Eksponen',
    category: 'QUIZ',
    assessmentDate: '2026-10-15',
    maxScore: 100,
    weight: 20,
    isIncludedInFinalScore: true,
    createdAt: '2026-10-15T00:00:00.000Z',
    updatedAt: '2026-10-15T00:00:00.000Z',
  };

  const renderHeader = (props: Partial<React.ComponentProps<typeof AssessmentColumnHeader>> = {}) => {
    return render(
      <table>
        <thead>
          <tr>
            <AssessmentColumnHeader
              item={baseItem}
              {...props}
            />
          </tr>
        </thead>
      </table>
    );
  };

  describe('Indonesian category mapping', () => {
    const supportedCategories: Array<{ category: AssessmentCategory; expectedLabel: string }> = [
      { category: 'QUIZ', expectedLabel: 'Sumatif' },
      { category: 'MIDTERM', expectedLabel: 'STS / PTS' },
      { category: 'FINAL', expectedLabel: 'SAS / PAS' },
      { category: 'PROJECT', expectedLabel: 'Proyek' },
      { category: 'ASSIGNMENT', expectedLabel: 'Tugas / LKPD' },
      { category: 'PRACTICE', expectedLabel: 'Praktik' },
      { category: 'OTHER', expectedLabel: 'Lainnya' },
    ];

    supportedCategories.forEach(({ category, expectedLabel }) => {
      it(`renders correct Indonesian label "${expectedLabel}" for category enum "${category}"`, () => {
        renderHeader({
          item: {
            ...baseItem,
            id: `item-${category}`,
            category,
          },
        });

        const categoryBadge = screen.getByTestId('assessment-header-category');
        expect(categoryBadge.textContent).toBe(expectedLabel);
        expect(ASSESSMENT_CATEGORY_LABELS[category]).toBe(expectedLabel);
      });
    });

    it('falls back to raw string if an unmapped category is encountered', () => {
      renderHeader({
        item: {
          ...baseItem,
          category: 'CUSTOM_ENUM' as unknown as AssessmentCategory,
        },
      });

      const categoryBadge = screen.getByTestId('assessment-header-category');
      expect(categoryBadge.textContent).toBe('CUSTOM_ENUM');
    });
  });

  describe('Name prominence and full inspection', () => {
    it('displays assessment name as primary header text with title attribute', () => {
      renderHeader({
        item: {
          ...baseItem,
          name: 'Penilaian Sumatif Bab 1',
        },
      });

      const nameEl = screen.getByTestId('assessment-header-name');
      expect(nameEl.textContent).toBe('Penilaian Sumatif Bab 1');
      expect(nameEl.getAttribute('title')).toBe('Penilaian Sumatif Bab 1');
      expect(nameEl.className).toContain('font-bold');
      expect(nameEl.className).toContain('line-clamp-2');
    });

    it('preserves complete long name in full text content and tooltip title attribute', () => {
      const longName = 'Penilaian Harian Bersama Bab 3: Sistem Pertidaksamaan Linear Dua Variabel Kelas X';
      renderHeader({
        item: {
          ...baseItem,
          name: longName,
        },
      });

      const nameEl = screen.getByTestId('assessment-header-name');
      expect(nameEl.textContent).toBe(longName);
      expect(nameEl.getAttribute('title')).toBe(longName);
      expect(nameEl.className).toContain('line-clamp-2');
      expect(nameEl.className).toContain('break-words');
    });

    it('ensures category badge is distinct and cannot be confused with assessment name', () => {
      renderHeader({
        item: {
          ...baseItem,
          name: 'Tugas Mandiri 1',
          category: 'ASSIGNMENT',
        },
      });

      const nameEl = screen.getByTestId('assessment-header-name');
      const categoryBadge = screen.getByTestId('assessment-header-category');

      expect(nameEl.textContent).toBe('Tugas Mandiri 1');
      expect(categoryBadge.textContent).toBe('Tugas / LKPD');
      expect(categoryBadge.className).toContain('text-[9px]');
      expect(nameEl.compareDocumentPosition(categoryBadge)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });
  });

  describe('Action handlers and completion display', () => {
    it('invokes onEdit and onDelete when action buttons are clicked', () => {
      const handleEdit = vi.fn();
      const handleDelete = vi.fn();

      renderHeader({
        item: baseItem,
        onEdit: handleEdit,
        onDelete: handleDelete,
      });

      const editBtn = screen.getByRole('button', { name: /edit kolom/i });
      const deleteBtn = screen.getByRole('button', { name: /hapus kolom/i });

      fireEvent.click(editBtn);
      expect(handleEdit).toHaveBeenCalledTimes(1);
      expect(handleEdit).toHaveBeenCalledWith(baseItem);

      fireEvent.click(deleteBtn);
      expect(handleDelete).toHaveBeenCalledTimes(1);
      expect(handleDelete).toHaveBeenCalledWith(baseItem.id, baseItem.name);
    });

    it('disables action buttons and shows tooltip when isDirty is true', () => {
      const handleEdit = vi.fn();
      const handleDelete = vi.fn();

      renderHeader({
        item: baseItem,
        isDirty: true,
        onEdit: handleEdit,
        onDelete: handleDelete,
      });

      const buttons = screen.getAllByRole('button', { name: /simpan nilai terlebih dahulu/i });
      expect(buttons).toHaveLength(2);
      expect(buttons[0]).toBeDisabled();
      expect(buttons[1]).toBeDisabled();
    });

    it('renders completion progress accurately', () => {
      renderHeader({
        item: baseItem,
        completion: {
          filled: 25,
          total: 30,
          percentage: 83,
          isComplete: false,
        },
      });

      expect(screen.getByText('25/30')).toBeInTheDocument();
      expect(screen.getByText('83%')).toBeInTheDocument();
    });
  });
});
