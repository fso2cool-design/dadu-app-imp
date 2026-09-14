import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc,
  addDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { StudentCustomFieldDefinition } from '../../types';

const DEFAULT_FIELDS: Omit<StudentCustomFieldDefinition, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Nomor KIP / PIP',
    key: 'kip',
    type: 'TEXT',
    description: 'Kartu Indonesia Pintar / Program Indonesia Pintar',
    showInTable: false,
    isActive: true,
  },
  {
    name: 'Golongan Darah',
    key: 'bloodType',
    type: 'SELECT',
    options: ['A', 'B', 'AB', 'O', '-'],
    description: 'Golongan darah siswa untuk data UKS',
    showInTable: false,
    isActive: true,
  },
  {
    name: 'Asal Sekolah',
    key: 'previousSchool',
    type: 'TEXT',
    description: 'Sekolah asal (SMP/MTs/SD)',
    showInTable: false,
    isActive: true,
  },
  {
    name: 'Hobi / Minat',
    key: 'hobby',
    type: 'TEXT',
    description: 'Minat, bakat, atau kegiatan ekstrakurikuler',
    showInTable: false,
    isActive: true,
  },
  {
    name: 'Cita-Cita',
    key: 'aspiration',
    type: 'TEXT',
    description: 'Cita-cita siswa untuk bimbingan konseling',
    showInTable: false,
    isActive: true,
  },
];

/**
 * Mengambil daftar definisi kolom kustom siswa milik pengguna.
 * Jika belum ada, lakukan inisialisasi default otomatis.
 */
export async function getStudentCustomFields(uid: string): Promise<StudentCustomFieldDefinition[]> {
  const colRef = collection(db, 'users', uid, 'studentCustomFields');
  const snap = await getDocs(colRef);

  if (snap.empty) {
    // Inisialisasi default fields jika koleksi masih kosong
    const created: StudentCustomFieldDefinition[] = [];
    const now = serverTimestamp();
    for (const def of DEFAULT_FIELDS) {
      const docRef = await addDoc(colRef, {
        ...def,
        createdAt: now,
        updatedAt: now,
      });
      created.push({ id: docRef.id, ...def } as StudentCustomFieldDefinition);
    }
    return created;
  }

  return snap.docs
    .map(d => ({ id: d.id, ...(d.data() as any) } as StudentCustomFieldDefinition))
    .filter(f => f.isActive !== false);
}

/**
 * Menambahkan definisi kolom kustom baru.
 */
export async function createStudentCustomField(
  uid: string,
  field: Omit<StudentCustomFieldDefinition, 'id' | 'createdAt' | 'updatedAt'>
): Promise<StudentCustomFieldDefinition> {
  const colRef = collection(db, 'users', uid, 'studentCustomFields');
  const now = serverTimestamp();

  // Bersihkan key agar ramah JSON / property name (alfanumerik + underscore)
  const cleanKey = field.key
    ? field.key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
    : field.name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

  const data = {
    name: field.name.trim(),
    key: cleanKey,
    type: field.type,
    options: field.options || [],
    description: field.description?.trim() || '',
    showInTable: field.showInTable ?? false,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(colRef, data);
  return { id: docRef.id, ...data } as StudentCustomFieldDefinition;
}

/**
 * Memperbarui definisi kolom kustom.
 */
export async function updateStudentCustomField(
  uid: string,
  fieldId: string,
  data: Partial<StudentCustomFieldDefinition>
): Promise<void> {
  const docRef = doc(db, 'users', uid, 'studentCustomFields', fieldId);
  const cleanData: any = { ...data, updatedAt: serverTimestamp() };
  if (cleanData.name) cleanData.name = cleanData.name.trim();
  if (cleanData.description !== undefined) cleanData.description = cleanData.description.trim();

  await updateDoc(docRef, cleanData);
}

/**
 * Menghapus (atau menonaktifkan) definisi kolom kustom.
 */
export async function deleteStudentCustomField(
  uid: string,
  fieldId: string
): Promise<void> {
  const docRef = doc(db, 'users', uid, 'studentCustomFields', fieldId);
  await deleteDoc(docRef);
}
