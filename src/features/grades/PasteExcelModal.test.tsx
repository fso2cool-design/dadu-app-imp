import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PasteExcelModal } from './PasteExcelModal';
import { AssessmentItem, Enrollment } from '../../types';

describe('PasteExcelModal component interactions', () => {
  const mockOnClose = vi.fn();
  const mockOnApplyScores = vi.fn();

  const mockItems: AssessmentItem[] = [
    {
      id: 'item-1',
      teachingAssignmentId: 'asg-1',
      name: 'Ulangan Harian 1',
      category: 'FORMATIVE',
      weight: 30,
    } as unknown as AssessmentItem,
  ];

  const mockEnrollments: Enrollment[] = [
    { id: 'enr-1', studentId: 'stu-1', rollNumber: 1, student: { fullName: 'Ahmad Dahlan' } } as unknown as Enrollment,
    { id: 'enr-2', studentId: 'stu-2', rollNumber: 2, student: { fullName: 'Budi Santoso' } } as unknown as Enrollment,
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('11. when input is invalid, apply button is disabled and apply is blocked', () => {
    render(
      <PasteExcelModal
        isOpen={true}
        onClose={mockOnClose}
        targetAssessmentItem={mockItems[0]}
        assessmentItems={mockItems}
        enrollments={mockEnrollments}
        onApplyScores={mockOnApplyScores}
      />
    );

    const textarea = screen.getByPlaceholderText(/Contoh isi paste 1 kolom/i);
    // Paste invalid data (e.g. 85abc)
    fireEvent.change(textarea, { target: { value: '85abc\n90' } });

    // Should display validation error
    expect(screen.getByText(/Validasi Gagal:/i)).toBeDefined();
    expect(screen.getByText(/"85abc" bukan angka nilai yang valid/i)).toBeDefined();

    // The Apply button should be disabled
    const applyBtn = screen.getByRole('button', { name: /Terapkan Nilai/i });
    expect(applyBtn).toBeDisabled();

    // Attempting to click disabled button does not trigger onApplyScores
    fireEvent.click(applyBtn);
    expect(mockOnApplyScores).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('12. cancellation closes the modal without applying any scores', () => {
    render(
      <PasteExcelModal
        isOpen={true}
        onClose={mockOnClose}
        targetAssessmentItem={mockItems[0]}
        assessmentItems={mockItems}
        enrollments={mockEnrollments}
        onApplyScores={mockOnApplyScores}
      />
    );

    const textarea = screen.getByPlaceholderText(/Contoh isi paste 1 kolom/i);
    fireEvent.change(textarea, { target: { value: '85\n90' } });

    const cancelBtn = screen.getByRole('button', { name: /Batal/i });
    fireEvent.click(cancelBtn);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnApplyScores).not.toHaveBeenCalled();
  });

  it('applies scores correctly when input is valid', () => {
    render(
      <PasteExcelModal
        isOpen={true}
        onClose={mockOnClose}
        targetAssessmentItem={mockItems[0]}
        assessmentItems={mockItems}
        enrollments={mockEnrollments}
        onApplyScores={mockOnApplyScores}
      />
    );

    const textarea = screen.getByPlaceholderText(/Contoh isi paste 1 kolom/i);
    fireEvent.change(textarea, { target: { value: '85\n90,5' } });

    const applyBtn = screen.getByRole('button', { name: /Terapkan Nilai/i });
    expect(applyBtn).not.toBeDisabled();

    fireEvent.click(applyBtn);

    expect(mockOnApplyScores).toHaveBeenCalledWith(
      {
        'stu-1': 85,
        'stu-2': 90.5,
      },
      'item-1'
    );
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('preserves state during exit animation lifecycle and resets cleanly upon reopening', () => {
    const { rerender } = render(
      <PasteExcelModal
        isOpen={true}
        onClose={mockOnClose}
        targetAssessmentItem={mockItems[0]}
        assessmentItems={mockItems}
        enrollments={mockEnrollments}
        onApplyScores={mockOnApplyScores}
      />
    );

    // 1. Open modal and enter invalid data to set text and trigger error state
    const textarea = screen.getByPlaceholderText(/Contoh isi paste 1 kolom/i);
    fireEvent.change(textarea, { target: { value: '85abc\n90' } });

    expect(textarea).toHaveValue('85abc\n90');
    expect(screen.getByText(/Validasi Gagal:/i)).toBeInTheDocument();

    // 2. Trigger close (isOpen = false); AnimatePresence retains content during exit transition
    rerender(
      <PasteExcelModal
        isOpen={false}
        onClose={mockOnClose}
        targetAssessmentItem={mockItems[0]}
        assessmentItems={mockItems}
        enrollments={mockEnrollments}
        onApplyScores={mockOnApplyScores}
      />
    );

    // 3. Verify state is NOT cleared prematurely while closing DOM is still mounted
    const closingTextarea = screen.queryByPlaceholderText(/Contoh isi paste 1 kolom/i);
    expect(closingTextarea).toBeInTheDocument();
    expect(closingTextarea).toHaveValue('85abc\n90');
    expect(screen.getByText(/Validasi Gagal:/i)).toBeInTheDocument();

    // 4. Reopen modal and verify that input and error state reset completely
    rerender(
      <PasteExcelModal
        isOpen={true}
        onClose={mockOnClose}
        targetAssessmentItem={mockItems[0]}
        assessmentItems={mockItems}
        enrollments={mockEnrollments}
        onApplyScores={mockOnApplyScores}
      />
    );

    const reopenedTextarea = screen.getByPlaceholderText(/Contoh isi paste 1 kolom/i);
    expect(reopenedTextarea).toHaveValue('');
    expect(screen.queryByText(/Validasi Gagal:/i)).not.toBeInTheDocument();
  });
});
