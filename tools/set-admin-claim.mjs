/**
 * Set custom claim { admin: true } untuk akun superadmin DADU.
 *
 * Cara pakai (satu kali saja):
 *  1. Firebase Console > Project Settings (ikon gerigi) > tab "Service accounts"
 *     > klik "Generate new private key" > simpan sebagai
 *     tools/serviceAccountKey.json (JANGAN di-commit — sudah di-gitignore).
 *  2. npm install --no-save firebase-admin   (sekali saja di mesin ini)
 *  3. node tools/set-admin-claim.mjs <email> [--remove]
 *     Contoh: node tools/set-admin-claim.mjs johanrovian90@gmail.com
 *
 * Setelah sukses: user tersebut LOGOUT lalu LOGIN ulang agar token baru
 * (beserta claim admin) diterbitkan. Rules firestore sudah membaca
 * request.auth.token.admin == true (lihat firestore.rules isSuperAdmin()).
 */
import admin from 'firebase-admin';
import { readFileSync } from 'node:fs';

const serviceAccountPath = new URL('./serviceAccountKey.json', import.meta.url);

const email = process.argv[2];
const remove = process.argv.includes('--remove');

if (!email || email.startsWith('--')) {
  console.error('Pakai: node tools/set-admin-claim.mjs <email> [--remove]');
  process.exit(1);
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
} catch {
  console.error(
    'File tools/serviceAccountKey.json tidak ditemukan.\n' +
      'Download dari: Firebase Console > Project Settings > Service accounts > Generate new private key.'
  );
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const user = await admin.auth().getUserByEmail(email);
const current = user.customClaims ?? {};

if (remove) {
  const { admin: _dropped, ...rest } = current;
  await admin.auth().setCustomUserClaims(user.uid, rest);
  console.log(`Claim admin DIHAPUS untuk ${email} (uid: ${user.uid})`);
} else {
  await admin.auth().setCustomUserClaims(user.uid, { ...current, admin: true });
  console.log(`Claim admin:true DIPASANG untuk ${email} (uid: ${user.uid})`);
}

const check = await admin.auth().getUser(user.uid);
console.log('Claims sekarang:', JSON.stringify(check.customClaims ?? {}));
console.log('SELESAI. User harus LOGOUT lalu LOGIN ulang agar claim aktif.');
process.exit(0);
