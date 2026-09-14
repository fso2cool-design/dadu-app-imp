import * as XLSX from 'xlsx';
import { ClassItem, StudentCustomFieldDefinition } from '../types';

export function downloadStudentExcelTemplate(
  availableClasses: ClassItem[] = [],
  customFields: StudentCustomFieldDefinition[] = []
) {
  const activeClasses = availableClasses.filter(c => !c.isArchived);
  const sampleClass1 = activeClasses[0]?.name || 'X-A';
  const sampleClass2 = activeClasses[1]?.name || (activeClasses[0]?.name ? `${activeClasses[0].name}-B` : 'X-B');

  // Siapkan data custom field contoh
  const activeCustomFields = customFields.filter(f => f.isActive !== false);

  const templateData = [
    {
      'No Absen': 1,
      'Nama Lengkap': 'Ahmad Fauzi',
      'Kelas': sampleClass1,
      'NIS': '20261001',
      'NISN': '0081234567',
      'Jenis Kelamin (L/P)': 'L',
      'Tempat Lahir': 'Bukittinggi',
      'Tanggal Lahir (YYYY-MM-DD)': '2009-05-14',
      'No HP Siswa': '081234567890',
      'Nama Orang Tua / Wali': 'H. Syahril',
      'No HP Ortu': '081398765432',
      'Alamat': 'Jl. Sudirman No. 12',
      'NIK SISWA': '8105014481210001',
      'NIK IBU': '8105135511840001',
      'NKK': '8105142312140001',
      ...activeCustomFields.reduce((acc, field) => {
        acc[field.name] = field.type === 'SELECT' ? (field.options?.[0] || '') : (field.key === 'kip' ? 'KIP-2026-001' : field.key === 'previousSchool' ? 'SMPN 1' : 'Contoh');
        return acc;
      }, {} as Record<string, string>),
    },
    {
      'No Absen': 2,
      'Nama Lengkap': 'Aisyah Putri Rahma',
      'Kelas': sampleClass1,
      'NIS': '20261002',
      'NISN': '0087654321',
      'Jenis Kelamin (L/P)': 'P',
      'Tempat Lahir': 'Padang',
      'Tanggal Lahir (YYYY-MM-DD)': '2009-08-20',
      'No HP Siswa': '081298765432',
      'Nama Orang Tua / Wali': 'Drs. Ridwan',
      'No HP Ortu': '081234123412',
      'Alamat': 'Jl. M. Yamin No. 5',
      'NIK SISWA': '8105066303110001',
      'NIK IBU': '8105064402830001',
      'NKK': '8105060704080984',
      ...activeCustomFields.reduce((acc, field) => {
        acc[field.name] = field.type === 'SELECT' ? (field.options?.[1] || field.options?.[0] || '') : (field.key === 'kip' ? '' : field.key === 'previousSchool' ? 'MTsN 2' : '');
        return acc;
      }, {} as Record<string, string>),
    },
    {
      'No Absen': 1,
      'Nama Lengkap': 'Budi Santoso',
      'Kelas': sampleClass2,
      'NIS': '20261003',
      'NISN': '0089988776',
      'Jenis Kelamin (L/P)': 'L',
      'Tempat Lahir': 'Jakarta',
      'Tanggal Lahir (YYYY-MM-DD)': '2009-02-10',
      'No HP Siswa': '',
      'Nama Orang Tua / Wali': 'Bambang',
      'No HP Ortu': '085211223344',
      'Alamat': 'Kompleks Asri Blok C-3',
      'NIK SISWA': '',
      'NIK IBU': '',
      'NKK': '',
      ...activeCustomFields.reduce((acc, field) => {
        acc[field.name] = '';
        return acc;
      }, {} as Record<string, string>),
    },
  ];

  const ws = XLSX.utils.json_to_sheet(templateData);

  // Set friendly column widths
  const baseCols = [
    { wch: 10 }, // No Absen
    { wch: 28 }, // Nama Lengkap
    { wch: 14 }, // Kelas
    { wch: 14 }, // NIS
    { wch: 16 }, // NISN
    { wch: 20 }, // Jenis Kelamin
    { wch: 18 }, // Tempat Lahir
    { wch: 25 }, // Tanggal Lahir
    { wch: 16 }, // No HP Siswa
    { wch: 24 }, // Nama Orang Tua
    { wch: 16 }, // No HP Ortu
    { wch: 30 }, // Alamat
    { wch: 20 }, // NIK SISWA
    { wch: 20 }, // NIK IBU
    { wch: 20 }, // NKK
  ];

  const customCols = activeCustomFields.map(f => ({ wch: Math.max(16, f.name.length + 4) }));
  ws['!cols'] = [...baseCols, ...customCols];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template Siswa');

  // Panduan Tambahan Sheet
  const guideData = [
    { 'Panduan Impor Siswa Multi-Kelas': '1. Kolom "Kelas": Masukkan nama kelas (misal: ' + sampleClass1 + ', ' + sampleClass2 + '). Dalam 1 file bisa memuat banyak kelas sekaligus.' },
    { 'Panduan Impor Siswa Multi-Kelas': '2. Deteksi Otomatis: Sistem akan otomatis mencocokkan nama kelas dengan kelas aktif yang ada di sistem.' },
    { 'Panduan Impor Siswa Multi-Kelas': '3. Kelas Tidak Cocok / Kosong: Jika nama kelas tidak ditemukan, di aplikasi akan muncul pilihan dropdown untuk memetakan kelas tujuan.' },
    { 'Panduan Impor Siswa Multi-Kelas': '4. Pengurutan Alfabetis (A-Z): Jika No Absen dikosongkan, sistem otomatis memberikan nomor urut 1, 2, 3... berurutan per-kelas sesuai urutan baris data.' },
    { 'Panduan Impor Siswa Multi-Kelas': '5. Kolom Wajib: Hanya kolom "Nama Lengkap" yang wajib diisi. Kolom lainnya bebas diisi, dikosongkan, atau dihapus.' },
    { 'Panduan Impor Siswa Multi-Kelas': '6. Kolom Kelamin: Gunakan huruf "L" untuk Laki-laki dan "P" untuk Perempuan.' },
    { 'Panduan Impor Siswa Multi-Kelas': '7. Data Kependudukan (NIK Siswa, NIK Ibu, NKK): Bersifat opsional untuk sinkronisasi EMIS/Buku Induk. Tuliskan dalam format angka 16 digit.' },
    { 'Panduan Impor Siswa Multi-Kelas': '8. Kolom Kustom Dinamis: Anda dapat menambahkan atau mengisi kolom kustom tambahan (misal: Nomor KIP, Asal Sekolah, Golongan Darah). Header Excel akan dipetakan otomatis!' },
  ];
  const guideWs = XLSX.utils.json_to_sheet(guideData);
  guideWs['!cols'] = [{ wch: 110 }];
  XLSX.utils.book_append_sheet(wb, guideWs, 'Petunjuk Pengisian');

  XLSX.writeFile(wb, 'Template_Import_Siswa_TeacherWorkspace.xlsx');
}
