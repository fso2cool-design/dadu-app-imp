const fs = require('fs');

function replaceLinesInFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  const isCrlf = content.includes('\r\n');
  let normalized = content.replace(/\r\n/g, '\n');

  replacements.forEach(([targetLines, replLines], idx) => {
    const target = targetLines.join('\n');
    const repl = replLines.join('\n');
    if (!normalized.includes(target)) {
      console.error(`Target not found in ${filePath} at index ${idx}:\nFIRST LINE: ${targetLines[0]}`);
      process.exit(1);
    }
    normalized = normalized.replace(target, repl);
  });

  const finalContent = isCrlf ? normalized.replace(/\n/g, '\r\n') : normalized;
  fs.writeFileSync(filePath, finalContent, 'utf8');
  console.log(`Successfully updated ${filePath}`);
}

// ========================================================
// 1. ManageCustomFieldsModal.tsx
// ========================================================
{
  const file = 'src/features/students/ManageCustomFieldsModal.tsx';
  const replacements = [
    // Helper Banner
    [
      [
        '        {/* Helper Banner */}',
        '        <div className="p-3.5 rounded-xl bg-orange-50/70 dark:bg-slate-800/80 border border-orange-200/60 dark:border-slate-700/60 flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">',
        '          <FileCsv className="w-4 h-4 text-orange-600 dark:text-cyan-400 shrink-0 mt-0.5" />',
        '          <div className="leading-relaxed">',
        '            <strong className="text-slate-900 dark:text-slate-100">Fleksibel & Otomatis:</strong> Kolom yang Anda buat di sini akan otomatis muncul di form input siswa, profil detail, template Excel, serta dipetakan secara otomatis saat Anda melakukan <strong>Impor Data Siswa via Excel / CSV</strong>.',
        '          </div>',
        '        </div>'
      ],
      [
        '        {/* Helper Banner */}',
        '        <div className="p-3.5 rounded-xl bg-[var(--ds-surface-muted)] border border-[var(--ds-border)] flex items-start gap-2.5 text-xs text-[var(--ds-text)]">',
        '          <FileCsv className="w-4 h-4 text-[var(--ds-accent)] shrink-0 mt-0.5" />',
        '          <div className="leading-relaxed">',
        '            <strong className="text-[var(--ds-text)]">Fleksibel & Otomatis:</strong> Kolom yang Anda buat di sini akan otomatis muncul di form input siswa, profil detail, template Excel, serta dipetakan secara otomatis saat Anda melakukan <strong>Impor Data Siswa via Excel / CSV</strong>.',
        '          </div>',
        '        </div>'
      ]
    ],
    // Drawer Form Header
    [
      [
        '        {/* Add or Edit Form */}',
        '        {(isAddingNew || editingFieldId) && (',
        '          <form onSubmit={handleSaveField} className="p-4 rounded-xl border border-orange-200 dark:border-cyan-800 bg-orange-50/30 dark:bg-cyan-950/20 space-y-3">',
        '            <div className="flex items-center justify-between pb-2 border-b border-slate-200/70 dark:border-slate-700/70">',
        '              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">',
        '                <Sliders className="w-3.5 h-3.5 text-orange-500 dark:text-cyan-400" />',
        '                {editingFieldId ? \'Edit Kolom Kustom\' : \'Tambah Kolom Kustom Baru\'}',
        '              </span>',
        '              <button',
        '                type="button"',
        '                onClick={resetForm}',
        '                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"',
        '              >',
        '                <X className="w-4 h-4" />',
        '              </button>',
        '            </div>'
      ],
      [
        '        {/* Add or Edit Form */}',
        '        {(isAddingNew || editingFieldId) && (',
        '          <form onSubmit={handleSaveField} className="p-4 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] space-y-3">',
        '            <div className="flex items-center justify-between pb-2 border-b border-[var(--ds-border)]">',
        '              <span className="text-xs font-bold text-[var(--ds-text)] flex items-center gap-1.5">',
        '                <Sliders className="w-3.5 h-3.5 text-[var(--ds-accent)]" />',
        '                {editingFieldId ? \'Edit Kolom Kustom\' : \'Tambah Kolom Kustom Baru\'}',
        '              </span>',
        '              <button',
        '                type="button"',
        '                onClick={resetForm}',
        '                className="text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] p-1 rounded-md cursor-pointer"',
        '              >',
        '                <X className="w-4 h-4" />',
        '              </button>',
        '            </div>'
      ]
    ],
    // Input Nama
    [
      [
        '                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">',
        '                  Nama Kolom / Label <span className="text-rose-500">*</span>',
        '                </label>',
        '                <input',
        '                  type="text"',
        '                  required',
        '                  value={name}',
        '                  onChange={e => setName(e.target.value)}',
        '                  placeholder="Contoh: Nomor KIP / PIP"',
        '                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"',
        '                />'
      ],
      [
        '                <label className="block text-[11px] font-semibold text-[var(--ds-text)] mb-1">',
        '                  Nama Kolom / Label <span className="text-rose-500">*</span>',
        '                </label>',
        '                <input',
        '                  type="text"',
        '                  required',
        '                  value={name}',
        '                  onChange={e => setName(e.target.value)}',
        '                  placeholder="Contoh: Nomor KIP / PIP"',
        '                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] text-[var(--ds-text)] focus:ring-2 focus:ring-[var(--ds-accent)]"',
        '                />'
      ]
    ],
    // Select Tipe
    [
      [
        '                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">',
        '                  Tipe Data',
        '                </label>',
        '                <select',
        '                  value={type}',
        '                  onChange={e => setType(e.target.value as any)}',
        '                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 cursor-pointer"',
        '                >'
      ],
      [
        '                <label className="block text-[11px] font-semibold text-[var(--ds-text)] mb-1">',
        '                  Tipe Data',
        '                </label>',
        '                <select',
        '                  value={type}',
        '                  onChange={e => setType(e.target.value as any)}',
        '                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] text-[var(--ds-text)] focus:ring-2 focus:ring-[var(--ds-accent)] cursor-pointer"',
        '                >'
      ]
    ],
    // Opsi Pilihan
    [
      [
        '                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">',
        '                  Opsi Pilihan (Pisahkan dengan koma)',
        '                </label>',
        '                <input',
        '                  type="text"',
        '                  value={optionsStr}',
        '                  onChange={e => setOptionsStr(e.target.value)}',
        '                  placeholder="Contoh: A, B, AB, O"',
        '                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"',
        '                />'
      ],
      [
        '                <label className="block text-[11px] font-semibold text-[var(--ds-text)] mb-1">',
        '                  Opsi Pilihan (Pisahkan dengan koma)',
        '                </label>',
        '                <input',
        '                  type="text"',
        '                  value={optionsStr}',
        '                  onChange={e => setOptionsStr(e.target.value)}',
        '                  placeholder="Contoh: A, B, AB, O"',
        '                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] text-[var(--ds-text)] focus:ring-2 focus:ring-[var(--ds-accent)]"',
        '                />'
      ]
    ],
    // Deskripsi & Checkbox
    [
      [
        '                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">',
        '                  Keterangan Singkat (Opsional)',
        '                </label>',
        '                <input',
        '                  type="text"',
        '                  value={description}',
        '                  onChange={e => setDescription(e.target.value)}',
        '                  placeholder="Contoh: Bantuan beasiswa siswa"',
        '                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"',
        '                />',
        '              </div>',
        '',
        '              <div className="pt-3">',
        '                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">',
        '                  <input',
        '                    type="checkbox"',
        '                    checked={showInTable}',
        '                    onChange={e => setShowInTable(e.target.checked)}',
        '                    className="w-4 h-4 rounded text-orange-500 dark:text-cyan-500 focus:ring-orange-400"',
        '                  />',
        '                  <span>Tampilkan sebagai Kolom di Tabel Siswa</span>',
        '                </label>',
        '              </div>'
      ],
      [
        '                <label className="block text-[11px] font-semibold text-[var(--ds-text)] mb-1">',
        '                  Keterangan Singkat (Opsional)',
        '                </label>',
        '                <input',
        '                  type="text"',
        '                  value={description}',
        '                  onChange={e => setDescription(e.target.value)}',
        '                  placeholder="Contoh: Bantuan beasiswa siswa"',
        '                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] text-[var(--ds-text)] focus:ring-2 focus:ring-[var(--ds-accent)]"',
        '                />',
        '              </div>',
        '',
        '              <div className="pt-3">',
        '                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[var(--ds-text)]">',
        '                  <input',
        '                    type="checkbox"',
        '                    checked={showInTable}',
        '                    onChange={e => setShowInTable(e.target.checked)}',
        '                    className="w-4 h-4 rounded accent-[var(--ds-accent)]"',
        '                  />',
        '                  <span>Tampilkan sebagai Kolom di Tabel Siswa</span>',
        '                </label>',
        '              </div>'
      ]
    ],
    // Drawer buttons (Batal)
    [
      [
        '              <button',
        '                type="button"',
        '                onClick={resetForm}',
        '                className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer"',
        '              >',
        '                Batal',
        '              </button>'
      ],
      [
        '              <button',
        '                type="button"',
        '                onClick={resetForm}',
        '                className="px-3 py-1.5 rounded-lg border border-[var(--ds-border)] text-[var(--ds-text)] hover:bg-[var(--ds-surface-muted)] text-xs font-medium cursor-pointer"',
        '              >',
        '                Batal',
        '              </button>'
      ]
    ],
    // List Box Header
    [
      [
        '        {/* Existing Custom Fields List */}',
        '        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900/50">',
        '          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">',
        '            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">',
        '              Daftar Kolom Kustom Aktif ({customFields.length})',
        '            </span>'
      ],
      [
        '        {/* Existing Custom Fields List */}',
        '        <div className="border border-[var(--ds-border)] rounded-xl overflow-hidden bg-[var(--ds-surface)]">',
        '          <div className="p-3 bg-[var(--ds-surface-muted)] border-b border-[var(--ds-border)] flex items-center justify-between">',
        '            <span className="text-xs font-bold text-[var(--ds-text)]">',
        '              Daftar Kolom Kustom Aktif ({customFields.length})',
        '            </span>'
      ]
    ],
    // Empty state & divider
    [
      [
        '          {customFields.length === 0 ? (',
        '            <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">',
        '              Belum ada kolom kustom. Klik tombol "Tambah Kolom" di atas untuk menambahkan data seperti Nomor KIP, Asal Sekolah, atau Golongan Darah.',
        '            </div>',
        '          ) : (',
        '            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">'
      ],
      [
        '          {customFields.length === 0 ? (',
        '            <div className="p-6 text-center text-xs text-[var(--ds-text-muted)]">',
        '              Belum ada kolom kustom. Klik tombol "Tambah Kolom" di atas untuk menambahkan data seperti Nomor KIP, Asal Sekolah, atau Golongan Darah.',
        '            </div>',
        '          ) : (',
        '            <div className="divide-y divide-[var(--ds-border)]">'
      ]
    ],
    // Row Item Header
    [
      [
        '                <div key={field.id} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">',
        '                  <div className="min-w-0 flex-1">',
        '                    <div className="flex items-center gap-2">',
        '                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100">',
        '                        {field.name}',
        '                      </span>',
        '                      <span className="text-[10px] px-2 py-0.5 rounded-md font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">',
        '                        {field.type}',
        '                      </span>'
      ],
      [
        '                <div key={field.id} className="p-3 flex items-center justify-between gap-3 hover:bg-[var(--ds-surface-muted)] transition-colors">',
        '                  <div className="min-w-0 flex-1">',
        '                    <div className="flex items-center gap-2">',
        '                      <span className="text-xs font-bold text-[var(--ds-text)]">',
        '                        {field.name}',
        '                      </span>',
        '                      <span className="text-[10px] px-2 py-0.5 rounded-md font-mono bg-[var(--ds-surface-muted)] text-[var(--ds-text-muted)] border border-[var(--ds-border)]">',
        '                        {field.type}',
        '                      </span>'
      ]
    ],
    // Row Details Key Code
    [
      [
        '                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-3">',
        '                      <span>Kode: <code className="font-mono text-orange-600 dark:text-cyan-400">{field.key}</code></span>'
      ],
      [
        '                    <div className="text-[11px] text-[var(--ds-text-muted)] mt-0.5 flex items-center gap-3">',
        '                      <span>Kode: <code className="font-mono text-[var(--ds-accent)]">{field.key}</code></span>'
      ]
    ],
    // Toggle button inactive
    [
      [
        '                          : \'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:text-slate-800 dark:hover:text-slate-200\''
      ],
      [
        '                          : \'bg-[var(--ds-surface-muted)] text-[var(--ds-text-muted)] border border-[var(--ds-border)] hover:text-[var(--ds-text)]\''
      ]
    ],
    // Edit button
    [
      [
        '                    <button',
        '                      type="button"',
        '                      onClick={() => handleStartEdit(field)}',
        '                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"',
        '                      title="Edit kolom ini"',
        '                    >'
      ],
      [
        '                    <button',
        '                      type="button"',
        '                      onClick={() => handleStartEdit(field)}',
        '                      className="p-1.5 rounded-lg text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] hover:bg-[var(--ds-surface-muted)] cursor-pointer"',
        '                      title="Edit kolom ini"',
        '                    >'
      ]
    ],
    // Footer & Selesai button
    [
      [
        '        <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">',
        '          <button',
        '            type="button"',
        '            onClick={onClose}',
        '            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold cursor-pointer"',
        '          >',
        '            Selesai',
        '          </button>',
        '        </div>'
      ],
      [
        '        <div className="flex justify-end pt-3 border-t border-[var(--ds-border)]">',
        '          <button',
        '            type="button"',
        '            onClick={onClose}',
        '            className="btn-primary px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"',
        '          >',
        '            Selesai',
        '          </button>',
        '        </div>'
      ]
    ]
  ];

  replaceLinesInFile(file, replacements);
}

// ========================================================
// 2. MeetingFormModal.tsx
// ========================================================
{
  const file = 'src/features/teacher/MeetingFormModal.tsx';
  const replacements = [
    // Switcher
    [
      [
        '        {/* Tipe Agenda Switcher */}',
        '        <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center gap-1 border border-slate-200 dark:border-slate-700">',
        '          <button',
        '            type="button"',
        '            onClick={() => setMeetingType(\'CLASS\')}',
        '            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${',
        '              meetingType === \'CLASS\'',
        '                ? \'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-xs\'',
        '                : \'text-slate-600 dark:text-slate-400 hover:text-slate-900\'',
        '            }`}',
        '          >',
        '            <BookOpen className="w-3.5 h-3.5" />',
        '            <span>KBM Tatap Muka di Kelas</span>',
        '          </button>',
        '          <button',
        '            type="button"',
        '            onClick={() => {',
        '              setMeetingType(\'MADRASAH_ACTIVITY\');',
        '              if (!topic) {',
        '                setTopic(PRESETS_BY_CATEGORY[\'Rapat Dinas Dewan Guru\'][0] || \'Rapat Dinas Dewan Guru\');',
        '              }',
        '            }}',
        '            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${',
        '              meetingType === \'MADRASAH_ACTIVITY\'',
        '                ? \'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-xs\'',
        '                : \'text-slate-600 dark:text-slate-400 hover:text-slate-900\'',
        '            }`}',
        '          >'
      ],
      [
        '        {/* Tipe Agenda Switcher */}',
        '        <div className="p-1 rounded-xl bg-[var(--ds-surface-muted)] flex items-center gap-1 border border-[var(--ds-border)]">',
        '          <button',
        '            type="button"',
        '            onClick={() => setMeetingType(\'CLASS\')}',
        '            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${',
        '              meetingType === \'CLASS\'',
        '                ? \'bg-[var(--ds-surface)] text-[var(--ds-accent)] shadow-xs\'',
        '                : \'text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]\'',
        '            }`}',
        '          >',
        '            <BookOpen className="w-3.5 h-3.5" />',
        '            <span>KBM Tatap Muka di Kelas</span>',
        '          </button>',
        '          <button',
        '            type="button"',
        '            onClick={() => {',
        '              setMeetingType(\'MADRASAH_ACTIVITY\');',
        '              if (!topic) {',
        '                setTopic(PRESETS_BY_CATEGORY[\'Rapat Dinas Dewan Guru\'][0] || \'Rapat Dinas Dewan Guru\');',
        '              }',
        '            }}',
        '            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${',
        '              meetingType === \'MADRASAH_ACTIVITY\'',
        '                ? \'bg-[var(--ds-surface)] text-amber-700 dark:text-amber-400 shadow-xs\'',
        '                : \'text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]\'',
        '            }`}',
        '          >'
      ]
    ],
    // Section 1 Assignment Select
    [
      [
        '            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">',
        '              {meetingType === \'MADRASAH_ACTIVITY\' ? \'Jam Rombel Terpakai\' : \'Rombel Kelas & Mata Pelajaran\'} <span className="text-rose-500">*</span>',
        '              {meetingToEdit && <span className="text-[10px] text-amber-600 font-normal ml-1">(Terkunci saat edit)</span>}',
        '            </label>',
        '            <select',
        '              value={assignmentId}',
        '              onChange={e => handleAssignmentChange(e.target.value)}',
        '              disabled={!!meetingToEdit}',
        '              required',
        '              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed"'
      ],
      [
        '            <label className="block text-xs font-semibold text-[var(--ds-text)] mb-1">',
        '              {meetingType === \'MADRASAH_ACTIVITY\' ? \'Jam Rombel Terpakai\' : \'Rombel Kelas & Mata Pelajaran\'} <span className="text-rose-500">*</span>',
        '              {meetingToEdit && <span className="text-[10px] text-amber-600 font-normal ml-1">(Terkunci saat edit)</span>}',
        '            </label>',
        '            <select',
        '              value={assignmentId}',
        '              onChange={e => handleAssignmentChange(e.target.value)}',
        '              disabled={!!meetingToEdit}',
        '              required',
        '              className="w-full px-3 py-2 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] text-xs font-semibold text-[var(--ds-text)] focus:ring-2 focus:ring-[var(--ds-accent)] disabled:bg-[var(--ds-surface-muted)] disabled:text-[var(--ds-text-muted)] disabled:cursor-not-allowed cursor-pointer"'
      ]
    ],
    // Section 1 Meeting Number Input
    [
      [
        '            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">',
        '              Pertemuan Ke- <span className="text-rose-500">*</span>',
        '              {meetingToEdit && <span className="text-[10px] text-amber-600 font-normal ml-1">(Kunci)</span>}',
        '            </label>',
        '            <input',
        '              type="number"',
        '              min={1}',
        '              required',
        '              disabled={!!meetingToEdit}',
        '              value={meetingNumber}',
        '              onChange={e => setMeetingNumber(Number(e.target.value))}',
        '              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 text-center disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed"',
        '            />'
      ],
      [
        '            <label className="block text-xs font-semibold text-[var(--ds-text)] mb-1">',
        '              Pertemuan Ke- <span className="text-rose-500">*</span>',
        '              {meetingToEdit && <span className="text-[10px] text-amber-600 font-normal ml-1">(Kunci)</span>}',
        '            </label>',
        '            <input',
        '              type="number"',
        '              min={1}',
        '              required',
        '              disabled={!!meetingToEdit}',
        '              value={meetingNumber}',
        '              onChange={e => setMeetingNumber(Number(e.target.value))}',
        '              className="w-full px-3 py-2 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 text-center disabled:bg-[var(--ds-surface-muted)] disabled:text-[var(--ds-text-muted)] disabled:cursor-not-allowed"',
        '            />'
      ]
    ],
    // Section 2: Date, TimeSlot, Status
    [
      [
        '        {/* Section 2: Date, Time Slot, and Status */}',
        '        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">',
        '          <div>',
        '            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">',
        '              Tanggal Kegiatan <span className="text-rose-500">*</span>',
        '            </label>',
        '            <input',
        '              type="date"',
        '              required',
        '              value={date}',
        '              onChange={e => setDate(e.target.value)}',
        '              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200"',
        '            />',
        '            {holidayInfo.isHoliday && (',
        '              <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">',
        '                <WarningCircle className="w-3.5 h-3.5 shrink-0" />',
        '                <span>Libur: {holidayInfo.reason}</span>',
        '              </p>',
        '            )}',
        '          </div>',
        '',
        '          <div>',
        '            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">',
        '              Jam Pelajaran / Waktu',
        '            </label>',
        '            <input',
        '              type="text"',
        '              value={timeSlot}',
        '              onChange={e => setTimeSlot(e.target.value)}',
        '              placeholder="07:30 - 09:00 (Jam 1-2)"',
        '              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200"',
        '            />',
        '          </div>',
        '',
        '          <div>',
        '            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">',
        '              Status Agenda',
        '            </label>',
        '            <select',
        '              value={status}',
        '              onChange={e => setStatus(e.target.value as MeetingStatus)}',
        '              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200"',
        '            >'
      ],
      [
        '        {/* Section 2: Date, Time Slot, and Status */}',
        '        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">',
        '          <div>',
        '            <label className="block text-xs font-semibold text-[var(--ds-text)] mb-1">',
        '              Tanggal Kegiatan <span className="text-rose-500">*</span>',
        '            </label>',
        '            <input',
        '              type="date"',
        '              required',
        '              value={date}',
        '              onChange={e => setDate(e.target.value)}',
        '              className="w-full px-3 py-2 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] text-xs text-[var(--ds-text)] focus:ring-2 focus:ring-[var(--ds-accent)]"',
        '            />',
        '            {holidayInfo.isHoliday && (',
        '              <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">',
        '                <WarningCircle className="w-3.5 h-3.5 shrink-0" />',
        '                <span>Libur: {holidayInfo.reason}</span>',
        '              </p>',
        '            )}',
        '          </div>',
        '',
        '          <div>',
        '            <label className="block text-xs font-semibold text-[var(--ds-text)] mb-1">',
        '              Jam Pelajaran / Waktu',
        '            </label>',
        '            <input',
        '              type="text"',
        '              value={timeSlot}',
        '              onChange={e => setTimeSlot(e.target.value)}',
        '              placeholder="07:30 - 09:00 (Jam 1-2)"',
        '              className="w-full px-3 py-2 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] text-xs text-[var(--ds-text)] focus:ring-2 focus:ring-[var(--ds-accent)]"',
        '            />',
        '          </div>',
        '',
        '          <div>',
        '            <label className="block text-xs font-semibold text-[var(--ds-text)] mb-1">',
        '              Status Agenda',
        '            </label>',
        '            <select',
        '              value={status}',
        '              onChange={e => setStatus(e.target.value as MeetingStatus)}',
        '              className="w-full px-3 py-2 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] text-xs font-semibold text-[var(--ds-text)] focus:ring-2 focus:ring-[var(--ds-accent)] cursor-pointer"',
        '            >'
      ]
    ],
    // Non-KBM Category Select
    [
      [
        '              <select',
        '                value={activityCategory}',
        '                onChange={e => handleCategoryChange(e.target.value)}',
        '                className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500"',
        '              >'
      ],
      [
        '              <select',
        '                value={activityCategory}',
        '                onChange={e => handleCategoryChange(e.target.value)}',
        '                className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-[var(--ds-surface)] text-xs font-semibold text-[var(--ds-text)] focus:ring-2 focus:ring-amber-500 cursor-pointer"',
        '              >'
      ]
    ],
    // Non-KBM Topic Input
    [
      [
        '              <input',
        '                type="text"',
        '                required',
        '                value={topic}',
        '                onChange={e => setTopic(e.target.value)}',
        '                placeholder="Contoh: Rapat Pembagian Tugas Dewan Guru Semester Ganjil"',
        '                className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"',
        '              />'
      ],
      [
        '              <input',
        '                type="text"',
        '                required',
        '                value={topic}',
        '                onChange={e => setTopic(e.target.value)}',
        '                placeholder="Contoh: Rapat Pembagian Tugas Dewan Guru Semester Ganjil"',
        '                className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-[var(--ds-surface)] text-xs font-medium text-[var(--ds-text)] focus:ring-2 focus:ring-amber-500"',
        '              />'
      ]
    ],
    // Non-KBM Presets Button
    [
      [
        '                      className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-white dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 cursor-pointer transition-colors"'
      ],
      [
        '                      className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[var(--ds-surface)] hover:bg-[var(--ds-surface-muted)] text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 cursor-pointer transition-colors"'
      ]
    ],
    // Non-KBM Activities Textarea
    [
      [
        '              <textarea',
        '                rows={2}',
        '                value={activities}',
        '                onChange={e => setActivities(e.target.value)}',
        '                placeholder="Uraian ringkas pelaksanaan kegiatan, arahan kepala madrasah, atau hasil koordinasi..."',
        '                className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-xs resize-none text-slate-800 dark:text-slate-200"',
        '              />'
      ],
      [
        '              <textarea',
        '                rows={2}',
        '                value={activities}',
        '                onChange={e => setActivities(e.target.value)}',
        '                placeholder="Uraian ringkas pelaksanaan kegiatan, arahan kepala madrasah, atau hasil koordinasi..."',
        '                className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-[var(--ds-surface)] text-xs resize-none text-[var(--ds-text)] focus:ring-2 focus:ring-amber-500"',
        '              />'
      ]
    ],
    // KBM Normal Fields
    [
      [
        '          /* KBM Normal Fields */',
        '          <>',
        '            <div>',
        '              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">',
        '                Materi Pokok / Bahasan KBM <span className="text-rose-500">*</span>',
        '              </label>',
        '              <input',
        '                type="text"',
        '                required',
        '                value={topic}',
        '                onChange={e => setTopic(e.target.value)}',
        '                placeholder="Contoh: Bab 2 - Teks Prosedur Kompleks & Struktur Kalimat Imperatif"',
        '                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"',
        '              />',
        '            </div>',
        '',
        '            <div>',
        '              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">',
        '                Tujuan Pembelajaran / Capaian Pembelajaran (CP/TP)',
        '              </label>',
        '              <textarea',
        '                rows={2}',
        '                value={learningObjectives}',
        '                onChange={e => setLearningObjectives(e.target.value)}',
        '                placeholder="Peserta didik mampu mengidentifikasi struktur teks dan menyusun teks prosedur secara sistematis..."',
        '                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs resize-none text-slate-800 dark:text-slate-200"',
        '              />',
        '            </div>',
        '',
        '            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">',
        '              <div>',
        '                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">',
        '                  Ringkasan Aktivitas / Kegiatan KBM',
        '                </label>',
        '                <textarea',
        '                  rows={2}',
        '                  value={activities}',
        '                  onChange={e => setActivities(e.target.value)}',
        '                  placeholder="Apersepsi, pemaparan materi, diskusi kelompok, presentasi perwakilan..."',
        '                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs resize-none text-slate-800 dark:text-slate-200"',
        '                />',
        '              </div>',
        '',
        '              <div>',
        '                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">',
        '                  Metode & Media Pembelajaran',
        '                </label>',
        '                <textarea',
        '                  rows={2}',
        '                  value={method}',
        '                  onChange={e => setMethod(e.target.value)}',
        '                  placeholder="Discovery Learning, LKPD, Slide Presentasi, Buku Teks..."',
        '                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs resize-none text-slate-800 dark:text-slate-200"',
        '                />',
        '              </div>',
        '            </div>',
        '          </>'
      ],
      [
        '          /* KBM Normal Fields */',
        '          <>',
        '            <div>',
        '              <label className="block text-xs font-semibold text-[var(--ds-text)] mb-1">',
        '                Materi Pokok / Bahasan KBM <span className="text-rose-500">*</span>',
        '              </label>',
        '              <input',
        '                type="text"',
        '                required',
        '                value={topic}',
        '                onChange={e => setTopic(e.target.value)}',
        '                placeholder="Contoh: Bab 2 - Teks Prosedur Kompleks & Struktur Kalimat Imperatif"',
        '                className="w-full px-3 py-2 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] text-xs font-medium text-[var(--ds-text)] focus:ring-2 focus:ring-[var(--ds-accent)]"',
        '              />',
        '            </div>',
        '',
        '            <div>',
        '              <label className="block text-xs font-semibold text-[var(--ds-text)] mb-1">',
        '                Tujuan Pembelajaran / Capaian Pembelajaran (CP/TP)',
        '              </label>',
        '              <textarea',
        '                rows={2}',
        '                value={learningObjectives}',
        '                onChange={e => setLearningObjectives(e.target.value)}',
        '                placeholder="Peserta didik mampu mengidentifikasi struktur teks dan menyusun teks prosedur secara sistematis..."',
        '                className="w-full px-3 py-2 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] text-xs resize-none text-[var(--ds-text)] focus:ring-2 focus:ring-[var(--ds-accent)]"',
        '              />',
        '            </div>',
        '',
        '            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">',
        '              <div>',
        '                <label className="block text-xs font-semibold text-[var(--ds-text)] mb-1">',
        '                  Ringkasan Aktivitas / Kegiatan KBM',
        '                </label>',
        '                <textarea',
        '                  rows={2}',
        '                  value={activities}',
        '                  onChange={e => setActivities(e.target.value)}',
        '                  placeholder="Apersepsi, pemaparan materi, diskusi kelompok, presentasi perwakilan..."',
        '                  className="w-full px-3 py-2 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] text-xs resize-none text-[var(--ds-text)] focus:ring-2 focus:ring-[var(--ds-accent)]"',
        '                />',
        '              </div>',
        '',
        '              <div>',
        '                <label className="block text-xs font-semibold text-[var(--ds-text)] mb-1">',
        '                  Metode & Media Pembelajaran',
        '                </label>',
        '                <textarea',
        '                  rows={2}',
        '                  value={method}',
        '                  onChange={e => setMethod(e.target.value)}',
        '                  placeholder="Discovery Learning, LKPD, Slide Presentasi, Buku Teks..."',
        '                  className="w-full px-3 py-2 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] text-xs resize-none text-[var(--ds-text)] focus:ring-2 focus:ring-[var(--ds-accent)]"',
        '                />',
        '              </div>',
        '            </div>',
        '          </>'
      ]
    ],
    // Section 5 Notes & Footer
    [
      [
        '        {/* Section 5: Notes / Reflection */}',
        '        <div>',
        '          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">',
        '            Catatan Guru / Tindak Lanjut (Opsional)',
        '          </label>',
        '          <input',
        '            type="text"',
        '            value={notes}',
        '            onChange={e => setNotes(e.target.value)}',
        '            placeholder={meetingType === \'MADRASAH_ACTIVITY\' ? \'Catatan tindak lanjut hasil rapat atau kegiatan...\' : \'Sebagian besar siswa antusias, tugas kelompok 3 perlu bimbingan...\'}',
        '            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200"',
        '          />',
        '        </div>',
        '',
        '        {/* Footer actions */}',
        '        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">',
        '          <button',
        '            type="button"',
        '            onClick={onClose}',
        '            className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer"',
        '          >',
        '            Batal',
        '          </button>'
      ],
      [
        '        {/* Section 5: Notes / Reflection */}',
        '        <div>',
        '          <label className="block text-xs font-semibold text-[var(--ds-text)] mb-1">',
        '            Catatan Guru / Tindak Lanjut (Opsional)',
        '          </label>',
        '          <input',
        '            type="text"',
        '            value={notes}',
        '            onChange={e => setNotes(e.target.value)}',
        '            placeholder={meetingType === \'MADRASAH_ACTIVITY\' ? \'Catatan tindak lanjut hasil rapat atau kegiatan...\' : \'Sebagian besar siswa antusias, tugas kelompok 3 perlu bimbingan...\'}',
        '            className="w-full px-3 py-2 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] text-xs text-[var(--ds-text)] focus:ring-2 focus:ring-[var(--ds-accent)]"',
        '          />',
        '        </div>',
        '',
        '        {/* Footer actions */}',
        '        <div className="flex justify-end gap-2 pt-3 border-t border-[var(--ds-border)]">',
        '          <button',
        '            type="button"',
        '            onClick={onClose}',
        '            className="px-4 py-2 rounded-xl border border-[var(--ds-border)] text-[var(--ds-text)] hover:bg-[var(--ds-surface-muted)] text-xs font-medium cursor-pointer"',
        '          >',
        '            Batal',
        '          </button>'
      ]
    ]
  ];

  replaceLinesInFile(file, replacements);
}
