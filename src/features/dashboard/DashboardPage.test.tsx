import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from './DashboardPage';
import { ApplicationProvider } from '../../application/ApplicationContext';
import { ToastProvider } from '../../context/ToastContext';
import * as authModule from '../auth/AuthContext';
import * as workspaceModule from '../../context/WorkspaceContext';

const { todayISO, todayDayName, nonMatchingDay, MOCK_DAYS } = vi.hoisted(() => {
  const MOCK_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const now = new Date();
  const todayIdx = now.getDay();
  const todayDayName = MOCK_DAYS[todayIdx];
  const nonMatchingDay = MOCK_DAYS[(todayIdx + 1) % 7];
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const todayISO = `${y}-${m}-${d}`;
  return { todayISO, todayDayName, nonMatchingDay, MOCK_DAYS };
});

vi.mock('../../utils/date', () => ({
  getTodayISO: vi.fn(() => todayISO),
  formatDateWithDay: vi.fn((d) => d),
  INDONESIAN_DAYS: ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
}));

describe('DashboardPage Navigation Context', () => {
  const mockOnNavigate = vi.fn();
  const mockSetSelectedAssignment = vi.fn();

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
      dayOfWeek: nonMatchingDay,
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
      dayOfWeek: todayDayName,
    },
  ];

  const mockApp = {
    meetings: {
      getAll: vi.fn().mockResolvedValue([]),
    },
    enrollment: {
      getByAcademicYear: vi.fn().mockResolvedValue([]),
    },
    grades: {
      getAssessmentItems: vi.fn().mockResolvedValue([]),
      getScoresByItemIds: vi.fn().mockResolvedValue([]),
    },
    attendance: {
      getDailySession: vi.fn().mockResolvedValue(null),
    },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      user: { uid: 'teacher-uid' },
      profile: { uid: 'teacher-uid', role: 'TEACHER', displayName: 'Ustadz Ahmad' },
    } as any);

    vi.spyOn(workspaceModule, 'useWorkspace').mockReturnValue({
      activeAcademicYear: { id: 'ay-2025', label: '2025/2026', isArchived: false },
      activeSemester: 'GANJIL',
      teachingAssignments: mockAssignments,
      classes: [
        { id: 'cls-1', name: '7A' },
        { id: 'cls-2', name: '8B' },
      ],
      weeklySchedule: [],
      setSelectedAssignment: mockSetSelectedAssignment,
      homeroomClass: null,
      selectedClassId: null,
      setSelectedClassId: vi.fn(),
    } as any);
  });

  const renderDashboard = () => {
    return render(
      <MemoryRouter>
        <ToastProvider>
          <ApplicationProvider app={mockApp}>
            <DashboardPage onNavigate={mockOnNavigate} />
          </ApplicationProvider>
        </ToastProvider>
      </MemoryRouter>
    );
  };

  it('1. Opening Presensi from schedule card passes that card assignmentId and sets workspace assignment', async () => {
    renderDashboard();

    // From Focus Banner (8B assignment)
    const focusPresensiBtn = await screen.findByRole('button', { name: /presensi kelas sekarang/i });
    expect(focusPresensiBtn).toBeInTheDocument();

    fireEvent.click(focusPresensiBtn);

    expect(mockSetSelectedAssignment).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'asg-2', className: '8B' })
    );
    expect(mockOnNavigate).toHaveBeenCalledWith('attendance-subject', {
      assignmentId: 'asg-2',
      date: todayISO,
    });
  });

  it('2. Opening Jurnal continues to pass the same assignment context', async () => {
    renderDashboard();

    // From Focus Banner, click Detail Sesi (which navigates to meetings)
    const detailBtn = await screen.findByRole('button', { name: /detail sesi/i });
    expect(detailBtn).toBeInTheDocument();

    fireEvent.click(detailBtn);

    expect(mockSetSelectedAssignment).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'asg-2', className: '8B' })
    );
    expect(mockOnNavigate).toHaveBeenCalledWith('meetings', { assignmentId: 'asg-2' });
  });

  it('3. The selected assignment does not accidentally default to the first list item when Dashboard context points to another valid assignment', async () => {
    renderDashboard();

    // From My Teaching list, find the level 4 heading for exact "Kelas 8B"
    const class8BHeading = await screen.findByRole('heading', { level: 4, name: /^kelas\s*8b$/i });
    expect(class8BHeading).toBeInTheDocument();

    const row8B = class8BHeading.closest('.group');
    expect(row8B).toBeTruthy();

    const presensi8BBtn = within(row8B as HTMLElement).getByRole('button', { name: /^presensi$/i });
    fireEvent.click(presensi8BBtn);

    expect(mockSetSelectedAssignment).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'asg-2' })
    );
    expect(mockOnNavigate).toHaveBeenCalledWith('attendance-subject', { assignmentId: 'asg-2' });
    expect(mockOnNavigate).not.toHaveBeenCalledWith('attendance-subject', { assignmentId: 'asg-1' });
  });

  describe('Stage 2.1 Regression Tests: Schedule Navigation & Isolation', () => {

    it('Test A — Semester and academic-year isolation', async () => {
      const isolationAssignments = [
        {
          id: 'asg-ganjil-active-ay',
          teacherId: 'teacher-uid',
          classId: 'cls-1',
          className: '7A',
          subjectId: 'sub-1',
          subjectName: 'Fikih Ganjil',
          academicYearId: 'ay-2025',
          semester: 'GANJIL',
          dayOfWeek: todayDayName,
          isActive: true,
        },
        {
          id: 'asg-genap-active-ay',
          teacherId: 'teacher-uid',
          classId: 'cls-2',
          className: '8B',
          subjectId: 'sub-2',
          subjectName: 'Akidah Genap',
          academicYearId: 'ay-2025',
          semester: 'GENAP',
          dayOfWeek: todayDayName,
          isActive: true,
        },
        {
          id: 'asg-other-ay',
          teacherId: 'teacher-uid',
          classId: 'cls-3',
          className: '9C',
          subjectId: 'sub-3',
          subjectName: 'Quran Lain',
          academicYearId: 'ay-old-2024',
          semester: 'GENAP',
          dayOfWeek: todayDayName,
          isActive: true,
        },
      ];

      vi.spyOn(workspaceModule, 'useWorkspace').mockReturnValue({
        activeAcademicYear: { id: 'ay-2025', label: '2025/2026', isArchived: false },
        activeSemester: 'GENAP',
        teachingAssignments: isolationAssignments,
        classes: [
          { id: 'cls-1', name: '7A' },
          { id: 'cls-2', name: '8B' },
          { id: 'cls-3', name: '9C' },
        ],
        weeklySchedule: [],
        setSelectedAssignment: mockSetSelectedAssignment,
        homeroomClass: null,
        selectedClassId: null,
        setSelectedClassId: vi.fn(),
      } as any);

      renderDashboard();

      // Only 8B should appear in greeting/class counts and lists
      expect(screen.getByText(/Semester GENAP TP 2025\/2026 • 1 Kelas Diampu/i)).toBeInTheDocument();

      // Non-matching semester / academic year assignments must NOT appear
      expect(screen.queryByText(/Fikih Ganjil/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Quran Lain/i)).not.toBeInTheDocument();
      expect(screen.getByText(/Akidah Genap/i)).toBeInTheDocument();

      // Active assignment can still be selected and navigated
      const presensiBtn = await screen.findByRole('button', { name: /presensi kelas sekarang/i });
      fireEvent.click(presensiBtn);

      expect(mockSetSelectedAssignment).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'asg-genap-active-ay', className: '8B' })
      );
      expect(mockOnNavigate).toHaveBeenCalledWith('attendance-subject', {
        assignmentId: 'asg-genap-active-ay',
        date: todayISO,
      });
    });

    it('Test B — Multi-slot schedules[] support without duplicating cards', async () => {
      const scheduleAssignments = [
        {
          id: 'asg-match-slot',
          teacherId: 'teacher-uid',
          classId: 'cls-1',
          className: '7A',
          subjectId: 'sub-1',
          subjectName: 'Fikih Multi-Slot',
          academicYearId: 'ay-2025',
          semester: 'GANJIL',
          isActive: true,
          schedules: [
            { day: todayDayName, timeSlot: '07:30 - 09:00', room: 'R. 101' },
          ],
        },
        {
          id: 'asg-nomatch-slot',
          teacherId: 'teacher-uid',
          classId: 'cls-2',
          className: '8B',
          subjectId: 'sub-2',
          subjectName: 'Sejarah Lain Hari',
          academicYearId: 'ay-2025',
          semester: 'GANJIL',
          isActive: true,
          schedules: [
            { day: nonMatchingDay, timeSlot: '09:00 - 10:30', room: 'R. 102' },
          ],
        },
        {
          id: 'asg-multi-sameday',
          teacherId: 'teacher-uid',
          classId: 'cls-3',
          className: '9C',
          subjectId: 'sub-3',
          subjectName: 'Matematika Double',
          academicYearId: 'ay-2025',
          semester: 'GANJIL',
          isActive: true,
          schedules: [
            { day: todayDayName, timeSlot: '07:00 - 08:00', room: 'Lab A' },
            { day: todayDayName, timeSlot: '10:00 - 11:00', room: 'Lab B' },
          ],
        },
        {
          id: 'asg-legacy-fallback',
          teacherId: 'teacher-uid',
          classId: 'cls-4',
          className: '9D',
          subjectId: 'sub-4',
          subjectName: 'Bahasa Arab Legacy',
          academicYearId: 'ay-2025',
          semester: 'GANJIL',
          isActive: true,
          dayOfWeek: todayDayName,
          timeSlot: '11:00 - 12:00',
          room: 'R. 201',
        },
      ];

      vi.spyOn(workspaceModule, 'useWorkspace').mockReturnValue({
        activeAcademicYear: { id: 'ay-2025', label: '2025/2026', isArchived: false },
        activeSemester: 'GANJIL',
        teachingAssignments: scheduleAssignments,
        classes: [
          { id: 'cls-1', name: '7A' },
          { id: 'cls-2', name: '8B' },
          { id: 'cls-3', name: '9C' },
          { id: 'cls-4', name: '9D' },
        ],
        weeklySchedule: [],
        setSelectedAssignment: mockSetSelectedAssignment,
        homeroomClass: null,
        selectedClassId: null,
        setSelectedClassId: vi.fn(),
      } as any);

      renderDashboard();

      // Find Jadwal Hari Ini section container
      const scheduleHeader = await screen.findByText(new RegExp(`Jadwal Hari Ini`, 'i'));
      const scheduleContainer = scheduleHeader.closest('.rounded-3xl') as HTMLElement;
      expect(scheduleContainer).toBeTruthy();

      // asg-nomatch-slot must NOT appear in Jadwal Hari Ini
      expect(within(scheduleContainer).queryByText('Sejarah Lain Hari')).not.toBeInTheDocument();

      // asg-match-slot must appear in Jadwal Hari Ini with its time slot and room
      expect(within(scheduleContainer).getByText('Fikih Multi-Slot')).toBeInTheDocument();
      expect(within(scheduleContainer).getByText('07:30 - 09:00')).toBeInTheDocument();
      expect(within(scheduleContainer).getByText('Ruang: R. 101')).toBeInTheDocument();

      // asg-legacy-fallback must match via legacy dayOfWeek fallback
      expect(within(scheduleContainer).getByText('Bahasa Arab Legacy')).toBeInTheDocument();
      expect(within(scheduleContainer).getByText('11:00 - 12:00')).toBeInTheDocument();
      expect(within(scheduleContainer).getByText('Ruang: R. 201')).toBeInTheDocument();

      // asg-multi-sameday has 2 slots on today, but must produce exactly ONE card in schedule timeline
      const occurrencesInSchedule = within(scheduleContainer).getAllByText('Matematika Double');
      expect(occurrencesInSchedule).toHaveLength(1);
    });

    it('Test C — Full Presensi navigation context with existing meeting', async () => {
      const assignmentWithMeeting = {
        id: 'asg-with-meeting-1',
        teacherId: 'teacher-uid',
        classId: 'cls-1',
        className: '7A',
        subjectId: 'sub-1',
        subjectName: 'Fikih Terjadwal',
        academicYearId: 'ay-2025',
        semester: 'GANJIL',
        isActive: true,
        dayOfWeek: todayDayName,
        timeSlot: '07:30 - 09:00',
      };

      vi.spyOn(workspaceModule, 'useWorkspace').mockReturnValue({
        activeAcademicYear: { id: 'ay-2025', label: '2025/2026', isArchived: false },
        activeSemester: 'GANJIL',
        teachingAssignments: [assignmentWithMeeting],
        classes: [{ id: 'cls-1', name: '7A' }],
        weeklySchedule: [],
        setSelectedAssignment: mockSetSelectedAssignment,
        homeroomClass: null,
        selectedClassId: null,
        setSelectedClassId: vi.fn(),
      } as any);

      // Meeting exists for todayISO
      mockApp.meetings.getAll.mockResolvedValueOnce([
        {
          id: 'mtg-known-789',
          academicYearId: 'ay-2025',
          semester: 'GANJIL',
          teachingAssignmentId: 'asg-with-meeting-1',
          classId: 'cls-1',
          subjectId: 'sub-1',
          date: todayISO,
          meetingNumber: 1,
          topic: 'Thaharah',
        },
      ]);

      renderDashboard();

      // Find Presensi button on the schedule card in Jadwal Hari Ini
      const scheduleHeader = await screen.findByText(new RegExp(`Jadwal Hari Ini`, 'i'));
      const scheduleContainer = scheduleHeader.closest('.rounded-3xl') as HTMLElement;
      expect(scheduleContainer).toBeTruthy();

      const isiPresensiBtn = within(scheduleContainer).getByRole('button', { name: /isi presensi/i });
      fireEvent.click(isiPresensiBtn);

      expect(mockSetSelectedAssignment).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'asg-with-meeting-1' })
      );
      expect(mockOnNavigate).toHaveBeenCalledWith('attendance-subject', {
        assignmentId: 'asg-with-meeting-1',
        date: todayISO,
        meetingId: 'mtg-known-789',
      });
    });

    it('Test D — Opening Presensi without meeting passes assignment and date with no meetingId', async () => {
      const assignmentWithoutMeeting = {
        id: 'asg-no-meeting-1',
        teacherId: 'teacher-uid',
        classId: 'cls-2',
        className: '8B',
        subjectId: 'sub-2',
        subjectName: 'Akidah Tanpa Pertemuan',
        academicYearId: 'ay-2025',
        semester: 'GANJIL',
        isActive: true,
        dayOfWeek: todayDayName,
        timeSlot: '09:00 - 10:30',
      };

      vi.spyOn(workspaceModule, 'useWorkspace').mockReturnValue({
        activeAcademicYear: { id: 'ay-2025', label: '2025/2026', isArchived: false },
        activeSemester: 'GANJIL',
        teachingAssignments: [assignmentWithoutMeeting],
        classes: [{ id: 'cls-2', name: '8B' }],
        weeklySchedule: [],
        setSelectedAssignment: mockSetSelectedAssignment,
        homeroomClass: null,
        selectedClassId: null,
        setSelectedClassId: vi.fn(),
      } as any);

      // No meetings return
      mockApp.meetings.getAll.mockResolvedValueOnce([]);

      renderDashboard();

      const scheduleHeader = await screen.findByText(new RegExp(`Jadwal Hari Ini`, 'i'));
      const scheduleContainer = scheduleHeader.closest('.rounded-3xl') as HTMLElement;
      expect(scheduleContainer).toBeTruthy();

      const isiPresensiBtn = within(scheduleContainer).getByRole('button', { name: /isi presensi/i });
      fireEvent.click(isiPresensiBtn);

      expect(mockSetSelectedAssignment).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'asg-no-meeting-1' })
      );
      expect(mockOnNavigate).toHaveBeenCalledWith('attendance-subject', {
        assignmentId: 'asg-no-meeting-1',
        date: todayISO,
      });

      // Verify meetingId is strictly not sent
      const lastCallArgs = mockOnNavigate.mock.calls[mockOnNavigate.mock.calls.length - 1];
      expect(lastCallArgs[1].meetingId).toBeUndefined();
    });
  });
});
