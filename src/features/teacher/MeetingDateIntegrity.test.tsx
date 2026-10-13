import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MeetingFormModal } from './MeetingFormModal';
import { ApplicationProvider } from '../../application/ApplicationContext';
import type { Meeting } from '../../types';

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'teacher-1' } }),
}));

const mockAssignments = [
  {
    id: 'ta-1',
    className: '7A',
    subjectName: 'Fikih',
    subjectCode: 'FKH',
    classId: 'c-1',
    subjectId: 's-1',
  },
];

const mockAcademicYear = { id: 'ay-2026', label: '2026/2027', isArchived: false };

vi.mock('../../context/WorkspaceContext', () => ({
  useWorkspace: () => ({
    teachingAssignments: mockAssignments,
    activeAcademicYear: mockAcademicYear,
    activeSemester: 'GANJIL',
    triggerSyncFeedback: vi.fn(),
    checkIsHoliday: vi.fn(() => ({ isHoliday: false })),
  }),
}));

describe('MeetingFormModal Date Editability & Attendance Lock (Criteria 1, 2, 3, 8, 9)', () => {
  const mockGetByMeeting = vi.fn();
  const mockUpdateMeeting = vi.fn();
  const mockGetAllMeetings = vi.fn();

  const mockApp = {
    attendance: {
      getByMeeting: mockGetByMeeting,
    },
    meetings: {
      update: mockUpdateMeeting,
      getAll: mockGetAllMeetings,
    },
  } as any;

  const mockMeetingToEdit: Meeting = {
    id: 'meet-1',
    academicYearId: 'ay-2026',
    semester: 'GANJIL',
    teachingAssignmentId: 'ta-1',
    classId: 'c-1',
    subjectId: 's-1',
    meetingNumber: 2,
    date: '2026-10-10',
    topic: 'Materi Rukun Islam',
    learningObjectives: 'Siswa memahami',
    activities: 'Diskusi kelompok',
    method: 'Tatap Muka',
    notes: 'Catatan guru',
    status: 'COMPLETED',
    createdAt: '2026-10-10T07:00:00.000Z' as any,
    updatedAt: '2026-10-10T07:00:00.000Z' as any,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetByMeeting.mockResolvedValue([]);
    mockGetAllMeetings.mockResolvedValue([]);
    mockUpdateMeeting.mockResolvedValue(undefined);
  });

  it('Criteria 1: allows date editing when meeting has no linked attendance', async () => {
    mockGetByMeeting.mockResolvedValue([]);

    render(
      <ApplicationProvider app={mockApp}>
        <MeetingFormModal
          isOpen={true}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          meetingToEdit={mockMeetingToEdit}
          defaultAssignmentId="ta-1"
        />
      </ApplicationProvider>
    );

    await waitFor(() => {
      const dateInput = screen.getByDisplayValue('2026-10-10') as HTMLInputElement;
      expect(dateInput.disabled).toBe(false);
    });

    expect(screen.queryByText('(Terkunci)')).toBeNull();
    expect(
      screen.queryByText(/Tanggal jurnal dikunci karena masih terhubung dengan presensi/i)
    ).toBeNull();
  });

  it('Criteria 2: disables date editing and displays lock explanation when attendance is linked', async () => {
    mockGetByMeeting.mockResolvedValue([
      { id: 'att-1', studentId: 's-1', meetingId: 'meet-1', date: '2026-10-10' },
    ]);

    render(
      <ApplicationProvider app={mockApp}>
        <MeetingFormModal
          isOpen={true}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          meetingToEdit={mockMeetingToEdit}
          defaultAssignmentId="ta-1"
        />
      </ApplicationProvider>
    );

    await waitFor(() => {
      const dateInput = screen.getByDisplayValue('2026-10-10') as HTMLInputElement;
      expect(dateInput.disabled).toBe(true);
    });

    expect(screen.getByText('(Terkunci)')).toBeDefined();
    expect(
      screen.getByText(/Tanggal jurnal dikunci karena masih terhubung dengan presensi/i)
    ).toBeDefined();
  });

  it('Criteria 3: allows other safe fields to be edited and submitted while date is locked', async () => {
    mockGetByMeeting.mockResolvedValue([
      { id: 'att-1', studentId: 's-1', meetingId: 'meet-1', date: '2026-10-10' },
    ]);

    const handleSuccess = vi.fn();

    render(
      <ApplicationProvider app={mockApp}>
        <MeetingFormModal
          isOpen={true}
          onClose={vi.fn()}
          onSuccess={handleSuccess}
          meetingToEdit={mockMeetingToEdit}
          defaultAssignmentId="ta-1"
        />
      </ApplicationProvider>
    );

    await waitFor(() => {
      const dateInput = screen.getByDisplayValue('2026-10-10') as HTMLInputElement;
      expect(dateInput.disabled).toBe(true);
    });

    // Edit topic field (safe field)
    const topicInput = screen.getByDisplayValue('Materi Rukun Islam');
    fireEvent.change(topicInput, { target: { value: 'Materi Rukun Islam (Revisi)' } });

    // Submit form (button label is 'Simpan Perubahan' when meetingToEdit)
    const submitBtn = screen.getByRole('button', { name: /Simpan Perubahan/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockUpdateMeeting).toHaveBeenCalledTimes(1);
    });

    const updateCall = mockUpdateMeeting.mock.calls[0];
    expect(updateCall[0]).toBe('teacher-1');
    expect(updateCall[1]).toBe('meet-1');
    expect(updateCall[2].topic).toBe('Materi Rukun Islam (Revisi)');
    expect(updateCall[2].date).toBe('2026-10-10'); // original date preserved
    expect(handleSuccess).toHaveBeenCalledTimes(1);
  });

  it('Criteria 8: enables date editing after reopening when attendance has been unlinked', async () => {
    // Step 1: Initial render with linked attendance
    mockGetByMeeting.mockResolvedValue([
      { id: 'att-1', studentId: 's-1', meetingId: 'meet-1', date: '2026-10-10' },
    ]);

    const { rerender } = render(
      <ApplicationProvider app={mockApp}>
        <MeetingFormModal
          isOpen={true}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          meetingToEdit={mockMeetingToEdit}
          defaultAssignmentId="ta-1"
        />
      </ApplicationProvider>
    );

    await waitFor(() => {
      const dateInput = screen.getByDisplayValue('2026-10-10') as HTMLInputElement;
      expect(dateInput.disabled).toBe(true);
    });

    // Step 2: Modal closed
    rerender(
      <ApplicationProvider app={mockApp}>
        <MeetingFormModal
          isOpen={false}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          meetingToEdit={null}
          defaultAssignmentId="ta-1"
        />
      </ApplicationProvider>
    );

    // Step 3: Attendance unlinked in Firestore -> now getByMeeting resolves to []
    mockGetByMeeting.mockResolvedValue([]);

    // Step 4: Reopening modal
    rerender(
      <ApplicationProvider app={mockApp}>
        <MeetingFormModal
          isOpen={true}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          meetingToEdit={mockMeetingToEdit}
          defaultAssignmentId="ta-1"
        />
      </ApplicationProvider>
    );

    // Date is now unlocked without any manual unlock button
    await waitFor(() => {
      const dateInput = screen.getByDisplayValue('2026-10-10') as HTMLInputElement;
      expect(dateInput.disabled).toBe(false);
    });
    expect(screen.queryByText('(Terkunci)')).toBeNull();
  });

  it('Criteria 9: keeps date locked if unlink failed and attendance records remain linked', async () => {
    // Step 1: Initial render with linked attendance
    mockGetByMeeting.mockResolvedValue([
      { id: 'att-1', studentId: 's-1', meetingId: 'meet-1', date: '2026-10-10' },
    ]);

    const { rerender } = render(
      <ApplicationProvider app={mockApp}>
        <MeetingFormModal
          isOpen={true}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          meetingToEdit={mockMeetingToEdit}
          defaultAssignmentId="ta-1"
        />
      </ApplicationProvider>
    );

    await waitFor(() => {
      const dateInput = screen.getByDisplayValue('2026-10-10') as HTMLInputElement;
      expect(dateInput.disabled).toBe(true);
    });

    // Close
    rerender(
      <ApplicationProvider app={mockApp}>
        <MeetingFormModal
          isOpen={false}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          meetingToEdit={null}
          defaultAssignmentId="ta-1"
        />
      </ApplicationProvider>
    );

    // Unlink save failed, records still exist
    mockGetByMeeting.mockResolvedValue([
      { id: 'att-1', studentId: 's-1', meetingId: 'meet-1', date: '2026-10-10' },
    ]);

    // Reopen
    rerender(
      <ApplicationProvider app={mockApp}>
        <MeetingFormModal
          isOpen={true}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          meetingToEdit={mockMeetingToEdit}
          defaultAssignmentId="ta-1"
        />
      </ApplicationProvider>
    );

    // Date remains locked
    await waitFor(() => {
      const dateInput = screen.getByDisplayValue('2026-10-10') as HTMLInputElement;
      expect(dateInput.disabled).toBe(true);
    });
    expect(screen.getByText('(Terkunci)')).toBeDefined();
  });
});
