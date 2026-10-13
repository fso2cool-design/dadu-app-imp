import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from './DashboardPage';
import { ApplicationProvider } from '../../application/ApplicationContext';
import { ToastProvider } from '../../context/ToastContext';
import * as authModule from '../auth/AuthContext';
import * as workspaceModule from '../../context/WorkspaceContext';

const MOCK_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const todayIdx = new Date().getDay();
const todayDayName = MOCK_DAYS[todayIdx];

vi.mock('../../utils/date', () => ({
  getTodayISO: vi.fn(() => '2026-10-10'),
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
      dayOfWeek: 'Minggu',
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
      activeAcademicYear: { id: 'ay-2025', name: '2025/2026', isArchived: false },
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
    expect(mockOnNavigate).toHaveBeenCalledWith('attendance-subject', { assignmentId: 'asg-2' });
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
});
