import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  SubjectAttendancePage,
  clearSubjectAttendanceCaches,
} from './SubjectAttendancePage';
import { ApplicationProvider } from '../../application/ApplicationContext';
import { ToastProvider } from '../../context/ToastContext';
import * as authModule from '../auth/AuthContext';
import * as workspaceModule from '../../context/WorkspaceContext';

vi.mock('./MeetingsJournalPage', () => ({
  invalidateMeetingsJournalCache: vi.fn(),
}));

vi.mock('../../utils/date', () => ({
  getTodayISO: vi.fn(() => '2026-10-10'),
  formatDateIndonesian: vi.fn((d) => d),
}));

vi.mock('../../utils/lazyXlsx', () => ({
  loadXlsx: vi.fn(),
}));

describe('SubjectAttendance Context Integrity & Safety (Reqs 4-13)', () => {
  const mockGetByAssignment = vi.fn();
  const mockGetByClass = vi.fn();
  const mockGetByDate = vi.fn();
  const mockSaveSubjectAttendance = vi.fn();
  const mockSetSelectedAssignment = vi.fn();
  const mockGetAllMeetings = vi.fn();

  const mockAssignments = [
    {
      id: 'asg-1',
      teacherId: 'teacher-uid',
      classId: 'cls-1',
      className: '7A',
      subjectId: 'sub-1',
      subjectName: 'Fikih',
      subjectCode: 'FKH',
      academicYearId: 'ay-2025',
      semester: 'GANJIL',
    },
    {
      id: 'asg-2',
      teacherId: 'teacher-uid',
      classId: 'cls-2',
      className: '8B',
      subjectId: 'sub-2',
      subjectName: 'Akidah Akhlak',
      subjectCode: 'AA',
      academicYearId: 'ay-2025',
      semester: 'GANJIL',
    },
  ];

  const mockStudentsClass1 = [
    {
      id: 'enr-1',
      studentId: 'std-1',
      rollNumber: 1,
      status: 'ACTIVE',
      student: { id: 'std-1', fullName: 'Ahmad Dahlan', nis: '1001', gender: 'L' as const },
    },
  ];

  const mockStudentsClass2 = [
    {
      id: 'enr-2',
      studentId: 'std-2',
      rollNumber: 1,
      status: 'ACTIVE',
      student: { id: 'std-2', fullName: 'Budi Santoso', nis: '1002', gender: 'L' as const },
    },
  ];

  const mockMeetingsAsg1 = [
    {
      id: 'mtg-asg1-1',
      meetingNumber: 1,
      date: '2026-10-10',
      topic: 'Bab 1 Fikih',
      teachingAssignmentId: 'asg-1',
      classId: 'cls-1',
      subjectId: 'sub-1',
    },
  ];

  const mockMeetingsAsg2 = [
    {
      id: 'mtg-asg2-1',
      meetingNumber: 1,
      date: '2026-10-10',
      topic: 'Bab 1 Akidah',
      teachingAssignmentId: 'asg-2',
      classId: 'cls-2',
      subjectId: 'sub-2',
    },
  ];

  const mockApp = {
    meeting: {
      getByAssignment: mockGetByAssignment,
    },
    meetings: {
      getAll: mockGetAllMeetings,
    },
    enrollment: {
      getByClass: mockGetByClass,
    },
    attendance: {
      getByDate: mockGetByDate,
      getByAssignment: vi.fn().mockResolvedValue([]),
      getByMeetingIds: vi.fn().mockResolvedValue([]),
      saveSubjectAttendance: mockSaveSubjectAttendance,
    },
  } as any;

  const mockAcademicYear = { id: 'ay-2025', name: '2025/2026', isArchived: false };
  const mockAttendanceSettings = { schoolDaysOption: 6, holidays: [] };
  const mockCheckIsHoliday = vi.fn().mockReturnValue({ isHoliday: false });
  const mockTriggerSyncFeedback = vi.fn();
  const mockUpdateAttendanceSettings = vi.fn();

  let currentWorkspaceAssignment: any = null;

  const workspaceState = {
    teachingAssignments: mockAssignments,
    activeAcademicYear: mockAcademicYear,
    activeSemester: 'GANJIL',
    get selectedAssignment() {
      return currentWorkspaceAssignment;
    },
    setSelectedAssignment: mockSetSelectedAssignment,
    triggerSyncFeedback: mockTriggerSyncFeedback,
    checkIsHoliday: mockCheckIsHoliday,
    attendanceSettings: mockAttendanceSettings,
    updateAttendanceSettings: mockUpdateAttendanceSettings,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    clearSubjectAttendanceCaches();
    currentWorkspaceAssignment = null;

    mockGetByClass.mockImplementation((_uid: string, _yearId: string, classId: string) => {
      if (classId === 'cls-2') return Promise.resolve(mockStudentsClass2);
      return Promise.resolve(mockStudentsClass1);
    });

    mockGetAllMeetings.mockImplementation((_uid: string, filter: any) => {
      if (filter.teachingAssignmentId === 'asg-2') return Promise.resolve(mockMeetingsAsg2);
      return Promise.resolve(mockMeetingsAsg1);
    });

    mockGetByDate.mockResolvedValue([]);
    mockSaveSubjectAttendance.mockResolvedValue({
      totalPresent: 1,
      totalSick: 0,
      totalPermitted: 0,
      totalAbsent: 0,
      totalDispensation: 0,
    });

    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      user: { uid: 'teacher-uid' },
      profile: { uid: 'teacher-uid', role: 'TEACHER', displayName: 'Ustadz Ahmad' },
    } as any);

    vi.spyOn(workspaceModule, 'useWorkspace').mockReturnValue(workspaceState as any);
  });

  const renderPage = (initialContext?: any) => {
    return render(
      <MemoryRouter>
        <ToastProvider>
          <ApplicationProvider app={mockApp}>
            <SubjectAttendancePage initialContext={initialContext} />
          </ApplicationProvider>
        </ToastProvider>
      </MemoryRouter>
    );
  };

  const getAssignmentSelect = async () => {
    const label = await screen.findByText(/Rombel & Mapel:/i);
    return (label.parentElement?.querySelector('select') || label.nextElementSibling) as HTMLSelectElement;
  };

  const getMeetingSelect = async () => {
    const label = await screen.findByText(/Tautkan ke Jurnal:/i);
    return label.parentElement?.querySelector('select') as HTMLSelectElement;
  };

  it('Req 4: Valid explicit route assignment takes precedence over first assignment', async () => {
    renderPage({ assignmentId: 'asg-2' });

    const select = await getAssignmentSelect();
    expect(select).toHaveValue('asg-2');
    expect(await screen.findByText('Budi Santoso')).toBeInTheDocument();
  });

  it('Req 5: Valid workspace assignment is used when explicit route state is absent', async () => {
    currentWorkspaceAssignment = mockAssignments[1]; // asg-2
    renderPage(undefined);

    const select = await getAssignmentSelect();
    expect(select).toHaveValue('asg-2');
    expect(await screen.findByText('Budi Santoso')).toBeInTheDocument();
  });

  it('Req 6: Existing fallback to first assignment remains available when neither source supplies valid assignment', async () => {
    currentWorkspaceAssignment = null;
    renderPage(undefined);

    const select = await getAssignmentSelect();
    expect(select).toHaveValue('asg-1');
    expect(await screen.findByText('Ahmad Dahlan')).toBeInTheDocument();
  });

  it('Req 7: Initialization logic does not overwrite subsequent manual assignment selection', async () => {
    renderPage({ assignmentId: 'asg-1' });

    const select = await getAssignmentSelect();
    expect(select).toHaveValue('asg-1');

    fireEvent.change(select, { target: { value: 'asg-2' } });

    await waitFor(() => {
      expect(select).toHaveValue('asg-2');
    });
    expect(await screen.findByText('Budi Santoso')).toBeInTheDocument();
  });

  it('Req 8: Switching assignments clears stale meeting selection from previous assignment', async () => {
    renderPage({ assignmentId: 'asg-1', meetingId: 'mtg-asg1-1' });

    const assignmentSelect = await getAssignmentSelect();
    const meetingSelect = await getMeetingSelect();

    await waitFor(() => {
      expect(meetingSelect).toHaveValue('mtg-asg1-1');
    });

    // 1. Verify clean initial state: new session with matching navContext must NOT be dirty
    expect(screen.queryByText(/Perubahan belum disimpan/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // 2. Switch to asg-2 while clean: must proceed immediately without opening unsaved-changes dialog
    fireEvent.change(assignmentSelect, { target: { value: 'asg-2' } });

    await waitFor(() => {
      expect(assignmentSelect).toHaveValue('asg-2');
      expect(meetingSelect).toHaveValue('');
    });

    // 3. Verify dialog remained closed and stale meeting from previous assignment was cleared
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText(/Perubahan belum disimpan/i)).not.toBeInTheDocument();
  });

  it('Req 8b: Manual meeting-link change after clean navContext initialization is recognized as dirty', async () => {
    renderPage({ assignmentId: 'asg-1', meetingId: 'mtg-asg1-1' });

    const assignmentSelect = await getAssignmentSelect();
    const meetingSelect = await getMeetingSelect();

    await waitFor(() => {
      expect(meetingSelect).toHaveValue('mtg-asg1-1');
    });
    expect(screen.queryByText(/Perubahan belum disimpan/i)).not.toBeInTheDocument();

    // Manually uncheck/change meeting link to unlinked ("")
    fireEvent.change(meetingSelect, { target: { value: '' } });

    // Now it should be recognized as dirty!
    expect(screen.getByText(/Perubahan belum disimpan/i)).toBeInTheDocument();

    // Attempting to switch assignment now triggers unsaved changes modal
    fireEvent.change(assignmentSelect, { target: { value: 'asg-2' } });

    const modal = await screen.findByRole('dialog');
    expect(modal).toBeInTheDocument();
    expect(within(modal).getByText(/Presensi Siswa Belum Disimpan/i)).toBeInTheDocument();
  });

  it('Req 9: Workspace context and visible assignment remain synchronized after manual switch', async () => {
    renderPage({ assignmentId: 'asg-1' });

    const assignmentSelect = await getAssignmentSelect();
    fireEvent.change(assignmentSelect, { target: { value: 'asg-2' } });

    await waitFor(() => {
      expect(mockSetSelectedAssignment).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'asg-2', className: '8B' })
      );
    });
  });

  it('Req 10: Canceling unsaved-changes confirmation keeps active assignment and state intact', async () => {
    renderPage({ assignmentId: 'asg-1' });
    await screen.findByText('Ahmad Dahlan');

    // Make dirty by toggling attendance
    const sickButtons = screen.getAllByTitle('Sakit (S)');
    fireEvent.click(sickButtons[0]);

    // Attempt to switch assignment
    const assignmentSelect = await getAssignmentSelect();
    fireEvent.change(assignmentSelect, { target: { value: 'asg-2' } });

    // Modal appears
    const modal = await screen.findByRole('dialog');
    expect(modal).toBeInTheDocument();

    // Click "Batal"
    const cancelBtn = within(modal).getByRole('button', { name: /batal/i });
    fireEvent.click(cancelBtn);

    // Modal closed, assignment remains asg-1, changes still present
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(assignmentSelect).toHaveValue('asg-1');
    expect(screen.getByText('Ahmad Dahlan')).toBeInTheDocument();
  });

  it('Req 11: Cross-assignment meeting link is rejected before save', async () => {
    // When meetings list includes a meeting belonging to another assignment (asg-2)
    mockGetAllMeetings.mockImplementation((_uid: string, filter: any) => {
      if (filter.teachingAssignmentId === 'asg-1') {
        return Promise.resolve([
          ...mockMeetingsAsg1,
          {
            id: 'mtg-cross',
            meetingNumber: 99,
            date: '2026-10-10',
            topic: 'Bab Asing',
            teachingAssignmentId: 'asg-2', // Belongs to asg-2!
            classId: 'cls-2',
            subjectId: 'sub-2',
          },
        ]);
      }
      return Promise.resolve(mockMeetingsAsg2);
    });

    renderPage({ assignmentId: 'asg-1' });
    await screen.findByText('Ahmad Dahlan');

    // Select the cross-assignment meeting first while form is clean
    const meetingSelect = await getMeetingSelect();
    await waitFor(() => {
      expect(screen.getByText('Jurnal Ke-99')).toBeInTheDocument();
    });
    fireEvent.change(meetingSelect, { target: { value: 'mtg-cross' } });

    // Mark student status to satisfy completion requirement
    const presentButtons = screen.getAllByTitle('Hadir (H)');
    fireEvent.click(presentButtons[0]);

    const saveButton = screen.getAllByRole('button', { name: /simpan presensi/i })[0];
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockSaveSubjectAttendance).not.toHaveBeenCalled();
    });
    expect(await screen.findByText(/Relasi pertemuan tidak valid/i)).toBeInTheDocument();
  });

  it('Req 12: Independent attendance can be saved without meeting link', async () => {
    renderPage({ assignmentId: 'asg-1' });
    await screen.findByText('Ahmad Dahlan');

    // Make sure meeting is unlinked ("-- Tidak ditautkan --", value: "")
    const meetingSelect = await getMeetingSelect();
    expect(meetingSelect).toHaveValue('');

    // Set Ahmad Dahlan to Hadir (H)
    const presentButtons = screen.getAllByTitle('Hadir (H)');
    fireEvent.click(presentButtons[0]);

    const saveButton = screen.getAllByRole('button', { name: /simpan presensi/i })[0];
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockSaveSubjectAttendance).toHaveBeenCalledWith(
        'teacher-uid',
        expect.objectContaining({
          teachingAssignmentId: 'asg-1',
          date: '2026-10-10',
          meetingId: null,
        })
      );
    });
  });

  it('Req 13: Destination assignment existing valid meeting link loaded cleanly', async () => {
    // Destination asg-2 has existing saved attendance record linked to mtg-asg2-1
    mockGetByDate.mockImplementation((_uid: string, assignmentId: string) => {
      if (assignmentId === 'asg-2') {
        return Promise.resolve([
          {
            id: 'rec-asg2-1',
            studentId: 'std-2',
            status: 'PRESENT',
            note: '',
            meetingId: 'mtg-asg2-1',
            date: '2026-10-10',
          },
        ]);
      }
      return Promise.resolve([]);
    });

    renderPage({ assignmentId: 'asg-1' });
    const assignmentSelect = await getAssignmentSelect();

    // Switch to asg-2
    fireEvent.change(assignmentSelect, { target: { value: 'asg-2' } });

    const meetingSelect = await getMeetingSelect();
    await waitFor(() => {
      expect(meetingSelect).toHaveValue('mtg-asg2-1');
    });
  });

  describe('Priority 2: Stale Navigation Context Isolation (Switching Assignments)', () => {
    it('1, 2, 3, 5: Context A remains valid on A, but does not error or block save on B after switch', async () => {
      // 1. Initial navigation from assignment A with valid meeting mtg-asg1-1
      renderPage({ assignmentId: 'asg-1', meetingId: 'mtg-asg1-1' });

      const assignmentSelect = await getAssignmentSelect();
      const meetingSelect = await getMeetingSelect();

      await waitFor(() => {
        expect(assignmentSelect).toHaveValue('asg-1');
        expect(meetingSelect).toHaveValue('mtg-asg1-1');
      });
      expect(screen.queryByText(/tidak ditemukan pada penugasan ini/i)).not.toBeInTheDocument();

      // 2. User switches to assignment B (asg-2) while initial context for asg-1 was present
      fireEvent.change(assignmentSelect, { target: { value: 'asg-2' } });

      await waitFor(() => {
        expect(assignmentSelect).toHaveValue('asg-2');
        expect(meetingSelect).toHaveValue('');
      });
      await screen.findByText('Budi Santoso');

      // 3. Stale context from asg-1 must NOT produce contextError on asg-2
      expect(screen.queryByText(/tidak ditemukan pada penugasan ini/i)).not.toBeInTheDocument();

      // 4. Mark student as present on asg-2 so attendance is complete
      const presentButtons = screen.getAllByTitle('Hadir (H)');
      fireEvent.click(presentButtons[0]);

      // 5. Save button must NOT be disabled by stale contextError and must save asg-2
      const saveButton = screen.getAllByRole('button', { name: /simpan presensi/i })[0];
      expect(saveButton).toBeEnabled();

      fireEvent.click(saveButton);
      await waitFor(() => {
        expect(mockSaveSubjectAttendance).toHaveBeenCalledWith(
          'teacher-uid',
          expect.objectContaining({
            teachingAssignmentId: 'asg-2',
            date: '2026-10-10',
            meetingId: null,
          })
        );
      });
    });

    it('4a: Valid meeting context provided for assignment B can be loaded and used', async () => {
      // Direct navigation with valid context for asg-2
      renderPage({ assignmentId: 'asg-2', meetingId: 'mtg-asg2-1' });

      const assignmentSelect = await getAssignmentSelect();
      const meetingSelect = await getMeetingSelect();

      await waitFor(() => {
        expect(assignmentSelect).toHaveValue('asg-2');
        expect(meetingSelect).toHaveValue('mtg-asg2-1');
      });
      expect(screen.queryByText(/tidak ditemukan pada penugasan ini/i)).not.toBeInTheDocument();

      const presentButtons = screen.getAllByTitle('Hadir (H)');
      fireEvent.click(presentButtons[0]);

      const saveButton = screen.getAllByRole('button', { name: /simpan presensi/i })[0];
      expect(saveButton).toBeEnabled();

      fireEvent.click(saveButton);
      await waitFor(() => {
        expect(mockSaveSubjectAttendance).toHaveBeenCalledWith(
          'teacher-uid',
          expect.objectContaining({
            teachingAssignmentId: 'asg-2',
            meetingId: 'mtg-asg2-1',
          })
        );
      });
    });

    it('4b: After switching from A to B, user can explicitly select and link valid meeting of B', async () => {
      renderPage({ assignmentId: 'asg-1', meetingId: 'mtg-asg1-1' });

      const assignmentSelect = await getAssignmentSelect();
      const meetingSelect = await getMeetingSelect();

      await waitFor(() => {
        expect(meetingSelect).toHaveValue('mtg-asg1-1');
      });

      // Switch to asg-2
      fireEvent.change(assignmentSelect, { target: { value: 'asg-2' } });

      await waitFor(() => {
        expect(assignmentSelect).toHaveValue('asg-2');
        expect(meetingSelect).toHaveValue('');
      });

      // Explicitly link mtg-asg2-1 from B's available meetings
      fireEvent.change(meetingSelect, { target: { value: 'mtg-asg2-1' } });
      expect(meetingSelect).toHaveValue('mtg-asg2-1');

      const presentButtons = screen.getAllByTitle('Hadir (H)');
      fireEvent.click(presentButtons[0]);

      const saveButton = screen.getAllByRole('button', { name: /simpan presensi/i })[0];
      expect(saveButton).toBeEnabled();

      fireEvent.click(saveButton);
      await waitFor(() => {
        expect(mockSaveSubjectAttendance).toHaveBeenCalledWith(
          'teacher-uid',
          expect.objectContaining({
            teachingAssignmentId: 'asg-2',
            meetingId: 'mtg-asg2-1',
          })
        );
      });
    });

    it('6a: Context error on active assignment blocks save, but switching cleanly to valid assignment clears error', async () => {
      // asg-1 opened with nonexistent meeting ID
      renderPage({ assignmentId: 'asg-1', meetingId: 'non-existent-meeting' });

      const assignmentSelect = await getAssignmentSelect();
      await screen.findByText('Ahmad Dahlan');

      // Error must appear for active assignment A
      expect(await screen.findByText(/Pertemuan jurnal dengan ID "non-existent-meeting" tidak ditemukan/i)).toBeInTheDocument();

      // Form is complete once marked, but Save button must remain disabled due to contextError
      const presentButtons = screen.getAllByTitle('Hadir (H)');
      fireEvent.click(presentButtons[0]);

      const saveButton = screen.getAllByRole('button', { name: /simpan presensi/i })[0];
      expect(saveButton).toBeDisabled();

      // Switch to asg-2 via modal discard
      fireEvent.change(assignmentSelect, { target: { value: 'asg-2' } });

      const modal = await screen.findByRole('dialog');
      expect(modal).toBeInTheDocument();
      const discardBtn = within(modal).getByRole('button', { name: /buang/i });
      fireEvent.click(discardBtn);

      await waitFor(() => {
        expect(assignmentSelect).toHaveValue('asg-2');
      });
      await screen.findByText('Budi Santoso');

      // Error banner from asg-1 must be cleared
      expect(screen.queryByText(/tidak ditemukan pada penugasan ini/i)).not.toBeInTheDocument();

      // Mark student on asg-2 and verify save is enabled
      const presentButtonsAsg2 = screen.getAllByTitle('Hadir (H)');
      fireEvent.click(presentButtonsAsg2[0]);

      const saveButtonAsg2 = screen.getAllByRole('button', { name: /simpan presensi/i })[0];
      expect(saveButtonAsg2).toBeEnabled();

      fireEvent.click(saveButtonAsg2);
      await waitFor(() => {
        expect(mockSaveSubjectAttendance).toHaveBeenCalledWith(
          'teacher-uid',
          expect.objectContaining({
            teachingAssignmentId: 'asg-2',
          })
        );
      });
    });

    it('6b: Date mismatch context error on active assignment blocks save, but switching away clears it', async () => {
      // asg-1 opened with date mismatch (meeting date is 2026-10-10, navContext date is 2026-10-12)
      renderPage({ assignmentId: 'asg-1', meetingId: 'mtg-asg1-1', date: '2026-10-12' });

      const assignmentSelect = await getAssignmentSelect();
      await screen.findByText('Ahmad Dahlan');

      // Error must appear for date mismatch
      expect(await screen.findByText(/tidak cocok dengan tanggal presensi/i)).toBeInTheDocument();

      const presentButtons = screen.getAllByTitle('Hadir (H)');
      fireEvent.click(presentButtons[0]);

      const saveButton = screen.getAllByRole('button', { name: /simpan presensi/i })[0];
      expect(saveButton).toBeDisabled();

      // Switch to asg-2 via modal discard
      fireEvent.change(assignmentSelect, { target: { value: 'asg-2' } });

      const modal = await screen.findByRole('dialog');
      const discardBtn = within(modal).getByRole('button', { name: /buang/i });
      fireEvent.click(discardBtn);

      await waitFor(() => {
        expect(assignmentSelect).toHaveValue('asg-2');
      });
      await screen.findByText('Budi Santoso');

      // Date mismatch error must be gone
      expect(screen.queryByText(/tidak cocok dengan tanggal presensi/i)).not.toBeInTheDocument();

      // Mark student on asg-2 and save successfully
      const presentButtonsAsg2 = screen.getAllByTitle('Hadir (H)');
      fireEvent.click(presentButtonsAsg2[0]);

      const saveButtonAsg2 = screen.getAllByRole('button', { name: /simpan presensi/i })[0];
      expect(saveButtonAsg2).toBeEnabled();

      fireEvent.click(saveButtonAsg2);
      await waitFor(() => {
        expect(mockSaveSubjectAttendance).toHaveBeenCalledWith(
          'teacher-uid',
          expect.objectContaining({
            teachingAssignmentId: 'asg-2',
          })
        );
      });
    });

    it('7: Sequence A -> B -> A for context without assignmentId maintains safe scoping and persistence precedence', async () => {
      // 1. Enter Presensi with navContext meeting mtg-asg1-1 but WITHOUT assignmentId
      renderPage({ meetingId: 'mtg-asg1-1' });

      const assignmentSelect = await getAssignmentSelect();
      const meetingSelect = await getMeetingSelect();

      // Initial assignment fallback chooses first assignment (asg-1)
      await waitFor(() => {
        expect(assignmentSelect).toHaveValue('asg-1');
        expect(meetingSelect).toHaveValue('mtg-asg1-1');
      });
      expect(screen.queryByText(/tidak ditemukan pada penugasan ini/i)).not.toBeInTheDocument();

      // 2. User switches A -> B (asg-1 -> asg-2)
      fireEvent.change(assignmentSelect, { target: { value: 'asg-2' } });

      await waitFor(() => {
        expect(assignmentSelect).toHaveValue('asg-2');
        expect(meetingSelect).toHaveValue('');
      });
      await screen.findByText('Budi Santoso');

      // Ensure assignment B does NOT receive meeting A and has no error
      expect(screen.queryByText(/tidak ditemukan pada penugasan ini/i)).not.toBeInTheDocument();

      // 3. User switches B -> A (asg-2 -> asg-1) without remounting
      fireEvent.change(assignmentSelect, { target: { value: 'asg-1' } });

      await waitFor(() => {
        expect(assignmentSelect).toHaveValue('asg-1');
      });
      await screen.findByText('Ahmad Dahlan');

      // For fresh unedited session, meeting A remains the initial suggested meeting for assignment A
      expect(meetingSelect).toHaveValue('mtg-asg1-1');
      expect(screen.queryByText(/tidak ditemukan pada penugasan ini/i)).not.toBeInTheDocument();

      // Mark Ahmad Dahlan and save
      const presentButtons = screen.getAllByTitle('Hadir (H)');
      fireEvent.click(presentButtons[0]);

      const saveButton = screen.getAllByRole('button', { name: /simpan presensi/i })[0];
      expect(saveButton).toBeEnabled();

      fireEvent.click(saveButton);
      await waitFor(() => {
        expect(mockSaveSubjectAttendance).toHaveBeenCalledWith(
          'teacher-uid',
          expect.objectContaining({
            teachingAssignmentId: 'asg-1',
            meetingId: 'mtg-asg1-1',
          })
        );
      });
    });
  });
});
