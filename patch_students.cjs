const fs = require('fs');
let code = fs.readFileSync('src/features/students/StudentsMasterPage.tsx', 'utf8');

// 1. Lazy Modals
code = code.replace(/import \{ ImportStudentsModal \} from '\.\/ImportStudentsModal';/, 'const ImportStudentsModal = React.lazy(() => import(\'./ImportStudentsModal\').then(m => ({ default: m.ImportStudentsModal })));');
code = code.replace(/import \{ StudentFormModal \} from '\.\/StudentFormModal';/, 'const StudentFormModal = React.lazy(() => import(\'./StudentFormModal\').then(m => ({ default: m.StudentFormModal })));');
code = code.replace(/import \{ StudentDetailModal \} from '\.\/StudentDetailModal';/, 'const StudentDetailModal = React.lazy(() => import(\'./StudentDetailModal\').then(m => ({ default: m.StudentDetailModal })));');
code = code.replace(/import \{ TransferClassModal \} from '\.\/TransferClassModal';/, 'const TransferClassModal = React.lazy(() => import(\'./TransferClassModal\').then(m => ({ default: m.TransferClassModal })));');
code = code.replace(/import \{ DeduplicateStudentsModal \} from '\.\/DeduplicateStudentsModal';/, 'const DeduplicateStudentsModal = React.lazy(() => import(\'./DeduplicateStudentsModal\').then(m => ({ default: m.DeduplicateStudentsModal })));');
code = code.replace(/import \{ StudentCustomPrintModal \} from '\.\/StudentCustomPrintModal';/, 'const StudentCustomPrintModal = React.lazy(() => import(\'./StudentCustomPrintModal\').then(m => ({ default: m.StudentCustomPrintModal })));');
code = code.replace(/import \{ ManageCustomFieldsModal \} from '\.\/ManageCustomFieldsModal';/, 'const ManageCustomFieldsModal = React.lazy(() => import(\'./ManageCustomFieldsModal\').then(m => ({ default: m.ManageCustomFieldsModal })));');
code = code.replace(/import \{ StudentProgressReportModal \} from '\.\/StudentProgressReportModal';/, 'const StudentProgressReportModal = React.lazy(() => import(\'./StudentProgressReportModal\').then(m => ({ default: m.StudentProgressReportModal })));');
code = code.replace(/import \{ StudentIdCardModal \} from '\.\/StudentIdCardModal';/, 'const StudentIdCardModal = React.lazy(() => import(\'./StudentIdCardModal\').then(m => ({ default: m.StudentIdCardModal })));');

// 2. Wrap Modals with Suspense
const modalsStart = '{/* Modals */}';
const modalsIdx = code.indexOf(modalsStart);
const modalsBlock = code.substring(modalsIdx);
let newModalsBlock = '<React.Suspense fallback={null}>\n      ' + modalsBlock;

const lastDiv = newModalsBlock.lastIndexOf('</div>');
newModalsBlock = newModalsBlock.substring(0, lastDiv) + '</React.Suspense>\n    </div>' + newModalsBlock.substring(lastDiv + 6);

code = code.substring(0, modalsIdx) + newModalsBlock;

fs.writeFileSync('src/features/students/StudentsMasterPage.tsx', code);
console.log('StudentsMasterPage patched successfully');
