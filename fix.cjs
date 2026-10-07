const fs = require('fs');
const file = 'c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/features/teacher/SubjectAttendancePage.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "const initialRowsRef = useRef<string>('[]');",
  "const initialRowsRef = useRef<string>('[]');\n  const initialMeetingIdRef = useRef<string | null>(null);"
);

content = content.replace(
  "initialRowsRef.current = JSON.stringify(rows.map(r => ({ id: r.studentId, s: r.status, n: r.note })));",
  "initialRowsRef.current = JSON.stringify(rows.map(r => ({ id: r.studentId, s: r.status, n: r.note })));\n        initialMeetingIdRef.current = existingRecords.length > 0 ? (existingRecords[0].meetingId || '') : '';"
);

content = content.replace(
  "disabled={(!isDirty && !isNewRecord) || savingAttendance || studentRows.length === 0 || isArchivedYear}",
  "disabled={(!isDirty && !isNewRecord && selectedMeetingId !== initialMeetingIdRef.current) || savingAttendance || studentRows.length === 0 || isArchivedYear}"
);

content = content.replace(
  "isDirty || isNewRecord \n                    ? 'bg-[var(--ds-accent)]",
  "(isDirty || isNewRecord || selectedMeetingId !== initialMeetingIdRef.current) \n                    ? 'bg-[var(--ds-accent)]"
);

content = content.replace(
  "initialRowsRef.current = JSON.stringify(studentRows.map(r => ({ id: r.studentId, s: r.status, n: r.note })));",
  "initialRowsRef.current = JSON.stringify(studentRows.map(r => ({ id: r.studentId, s: r.status, n: r.note })));\n      initialMeetingIdRef.current = selectedMeetingId || '';"
);

fs.writeFileSync(file, content);
console.log('Fixed button disabled state');
