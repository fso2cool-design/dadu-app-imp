import { SharedReportPayload } from '../types';

/**
 * Utility for Zero-Knowledge Client-Side Encryption of Shared Reports.
 * Protects student and institutional privacy using AES-GCM 256-bit encryption
 * and PBKDF2 with 100,000 SHA-256 iterations.
 * 
 * Plaintext student data is never sent to or stored in Firestore when passcode protection is enabled.
 */

function bufferToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuffer(hex: string): Uint8Array {
  const cleanHex = hex.trim();
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
  }
  return bytes;
}

function bufferToBase64(buffer: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buffer.byteLength; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return window.btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveAesKey(passcode: string, saltBytes: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const rawKey = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(passcode.trim()),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256',
    },
    rawKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a SharedReportPayload with AES-GCM using a user-specified passcode.
 */
export async function encryptReportPayload(
  payload: SharedReportPayload,
  passcode: string
): Promise<{ encryptedPayload: string; salt: string; iv: string }> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(passcode, salt);

  const encoder = new TextEncoder();
  const plaintext = encoder.encode(JSON.stringify(payload));

  const ciphertextBuf = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintext
  );

  return {
    encryptedPayload: bufferToBase64(new Uint8Array(ciphertextBuf)),
    salt: bufferToHex(salt),
    iv: bufferToHex(iv),
  };
}

/**
 * Decrypts a previously encrypted SharedReportPayload using the provided passcode.
 * Throws an error if the passcode is incorrect or the ciphertext was tampered with.
 */
export async function decryptReportPayload(
  encryptedPayload: string,
  saltHex: string,
  ivHex: string,
  passcode: string
): Promise<SharedReportPayload> {
  const salt = hexToBuffer(saltHex);
  const iv = hexToBuffer(ivHex);
  const key = await deriveAesKey(passcode, salt);

  const ciphertext = base64ToBuffer(encryptedPayload);

  const decryptedBuf = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  const decoder = new TextDecoder();
  const jsonString = decoder.decode(decryptedBuf);
  return JSON.parse(jsonString) as SharedReportPayload;
}
