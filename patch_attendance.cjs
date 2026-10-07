const fs = require('fs');
let code = fs.readFileSync('src/features/teacher/SubjectAttendancePage.tsx', 'utf8');

// 1. Lazy Modals
code = code.replace(/import \{ MeetingFormModal \} from '.\/MeetingFormModal';/, 'const MeetingFormModal = React.lazy(() => import(\'./MeetingFormModal\').then(m => ({ default: m.MeetingFormModal })));');
code = code.replace(/import \{ UnsavedChangesModal \} from '\.\.\/\.\.\/components\/common\/UnsavedChangesModal';/, 'const UnsavedChangesModal = React.lazy(() => import(\'../../components/common/UnsavedChangesModal\').then(m => ({ default: m.UnsavedChangesModal })));');
code = code.replace(/import \{ AttendanceHolidaysModal \} from '\.\.\/\.\.\/components\/common\/AttendanceHolidaysModal';/, 'const AttendanceHolidaysModal = React.lazy(() => import(\'../../components/common/AttendanceHolidaysModal\').then(m => ({ default: m.AttendanceHolidaysModal })));');

// 2. Wrap Modals with Suspense
const modalsStart = '{/* Quick Meeting Modal */}';
const modalsBlock = code.substring(code.indexOf(modalsStart));
const newModalsBlock = '<React.Suspense fallback={null}>\n      ' + modalsBlock.replace('    </div>', '    </React.Suspense>\n    </div>');
code = code.substring(0, code.indexOf(modalsStart)) + newModalsBlock;

// 3. Extract AttendanceRow
const rowStartStr = '{filteredRows.map((row) => {';
const rowEndStr = '                    </tbody>';
const rowStartIdx = code.indexOf(rowStartStr);
const rowEndIdx = code.indexOf(rowEndStr, rowStartIdx);
const rowBlock = code.substring(rowStartIdx, rowEndIdx);

const rowExtracted = `{filteredRows.map((row) => (
                        <AttendanceRow
                          key={row.studentId}
                          row={row}
                          isArchivedYear={isArchivedYear}
                          handleStatusChange={handleStatusChange}
                          handleNoteChange={handleNoteChange}
                        />
                      ))}
`;

code = code.replace(rowBlock, rowExtracted);

const componentExtracted = `
const AttendanceRow = React.memo(({ row, isArchivedYear, handleStatusChange, handleNoteChange }: any) => {
  const rowHighlightClass = 
    row.status === 'SICK'
      ? 'bg-amber-50/50 hover:bg-amber-100/60 dark:bg-amber-950/20 dark:hover:bg-amber-950/30'
      : row.status === 'PERMITTED'
      ? 'bg-sky-50/50 hover:bg-sky-100/60 dark:bg-sky-950/20 dark:hover:bg-sky-950/30'
      : row.status === 'ABSENT'
      ? 'bg-rose-50/50 hover:bg-rose-100/60 dark:bg-rose-950/20 dark:hover:bg-rose-950/30'
      : row.status === 'DISPENSATION'
      ? 'bg-purple-50/50 hover:bg-purple-100/60 dark:bg-purple-950/20 dark:hover:bg-purple-950/30'
      : 'hover:bg-[var(--ds-accent-soft)]';

  const stickyCellClass =
    row.status === 'SICK'
      ? 'bg-amber-50/90 dark:bg-[#19150e] group-hover:bg-amber-100/80 dark:group-hover:bg-[#201a11]'
      : row.status === 'PERMITTED'
      ? 'bg-sky-50/90 dark:bg-[#0f1724] group-hover:bg-sky-100/80 dark:group-hover:bg-[#141f30]'
      : row.status === 'ABSENT'
      ? 'bg-rose-50/90 dark:bg-[#1c1114] group-hover:bg-rose-100/80 dark:group-hover:bg-[#241519]'
      : row.status === 'DISPENSATION'
      ? 'bg-purple-50/90 dark:bg-[#181120] group-hover:bg-purple-100/80 dark:group-hover:bg-[#20162a]'
      : 'bg-[var(--ds-surface-elevated)] group-hover:bg-[var(--ds-accent-soft)]';

  return (
    <tr className={\`transition-colors group \${rowHighlightClass}\`}>
      <td className={\`sticky left-0 z-10 py-3 px-4 text-center font-mono font-bold text-slate-700 dark:text-slate-200 border-r border-[var(--ds-border)] \${stickyCellClass}\`}>
        {row.rollNumber}
      </td>
      <td className={\`sticky left-12 z-10 py-3 px-4 border-r border-[var(--ds-border)] \${stickyCellClass}\`}>
        <span className="font-bold text-slate-800 dark:text-slate-100 block">{row.studentName}</span>
      </td>
      <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400 border-r border-[var(--ds-border)]">
        {row.nis || '-'}
      </td>
      <td className="py-3 px-4 text-center border-r border-[var(--ds-border)]">
        <span className={\`px-2 py-0.5 rounded text-[10px] font-bold \${
          row.gender === 'L' ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400' : 'bg-pink-50 dark:bg-pink-950/60 text-pink-700 dark:text-pink-400'
        }\`}>
          {row.gender}
        </span>
      </td>
      <td className="py-3 px-4 text-center border-r border-[var(--ds-border)]">
        <div className="inline-flex items-center gap-1.5 p-1 bg-[var(--ds-surface-muted)] rounded-xl border border-[var(--ds-border)]">
          <button
            type="button"
            disabled={isArchivedYear}
            onClick={() => handleStatusChange(row.studentId, 'PRESENT')}
            className={\`w-8 h-8 rounded-lg text-xs font-bold transition-all \${isArchivedYear ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} \${
              row.status === 'PRESENT'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-white hover:bg-[var(--ds-accent-soft)] hover:text-emerald-600 dark:hover:text-emerald-400'
            }\`}
            title="Hadir (H)"
          >
            H
          </button>
          <button
            type="button"
            disabled={isArchivedYear}
            onClick={() => handleStatusChange(row.studentId, 'SICK')}
            className={\`w-8 h-8 rounded-lg text-xs font-bold transition-all \${isArchivedYear ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} \${
              row.status === 'SICK'
                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-white hover:bg-[var(--ds-accent-soft)] hover:text-amber-600 dark:hover:text-amber-400'
            }\`}
            title="Sakit (S)"
          >
            S
          </button>
          <button
            type="button"
            disabled={isArchivedYear}
            onClick={() => handleStatusChange(row.studentId, 'PERMITTED')}
            className={\`w-8 h-8 rounded-lg text-xs font-bold transition-all \${isArchivedYear ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} \${
              row.status === 'PERMITTED'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-white hover:bg-[var(--ds-accent-soft)] hover:text-sky-600 dark:hover:text-sky-400'
            }\`}
            title="Izin (I)"
          >
            I
          </button>
          <button
            type="button"
            disabled={isArchivedYear}
            onClick={() => handleStatusChange(row.studentId, 'ABSENT')}
            className={\`w-8 h-8 rounded-lg text-xs font-bold transition-all \${isArchivedYear ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} \${
              row.status === 'ABSENT'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-white hover:bg-[var(--ds-accent-soft)] hover:text-rose-600 dark:hover:text-rose-400'
            }\`}
            title="Alpa (A)"
          >
            A
          </button>
          <button
            type="button"
            disabled={isArchivedYear}
            onClick={() => handleStatusChange(row.studentId, 'DISPENSATION')}
            className={\`w-8 h-8 rounded-lg text-xs font-bold transition-all \${isArchivedYear ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} \${
              row.status === 'DISPENSATION'
                ? 'btn-primary text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-white hover:bg-[var(--ds-accent-soft)] hover:text-indigo-600 dark:hover:text-indigo-400'
            }\`}
            title="Dispensasi (D)"
          >
            D
          </button>
        </div>
      </td>
      <td className="py-3 px-4">
        <input
          type="text"
          disabled={isArchivedYear}
          value={row.note}
          onChange={e => handleNoteChange(row.studentId, e.target.value)}
          placeholder={isArchivedYear ? '-' : 'Keterangan...'}
          className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] text-slate-800 dark:text-slate-100 text-xs focus:ring-1 focus:ring-[var(--ds-focus)] disabled:opacity-60 disabled:cursor-not-allowed"
        />
      </td>
    </tr>
  );
}, (prev: any, next: any) => {
  return prev.row === next.row && prev.isArchivedYear === next.isArchivedYear;
});

export const SubjectAttendancePage =`

code = code.replace('export const SubjectAttendancePage: React.FC =', componentExtracted);
fs.writeFileSync('src/features/teacher/SubjectAttendancePage.tsx', code);
console.log('SubjectAttendancePage patched successfully');
