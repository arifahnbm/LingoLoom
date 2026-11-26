import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV sesuai standar NIST untuk GCM
const PREFIX = 'v1';

function deriveAesKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET?.trim();
  if (!secret || secret.length < 16) {
    throw new Error(
      'ENCRYPTION_SECRET belum dikonfigurasi di Backend/.env (minimal 32 karakter/hex).'
    );
  }

  // Jika tepat 64 karakter hex (32 byte), langsung pakai sebagai kunci AES-256
  if (/^[0-9a-fA-F]{64}$/.test(secret)) {
    return Buffer.from(secret, 'hex');
  }

  // Selain itu turunkan tepat 32 byte menggunakan SHA-256
  return crypto.createHash('sha256').update(secret, 'utf8').digest();
}

/**
 * Mengenkripsi plaintext (misal Gemini API Key) menggunakan AES-256-GCM.
 * Format hasil: v1:<iv_base64>:<authTag_base64>:<ciphertext_base64>
 */
export function encrypt(text: string): string {
  const key = deriveAesKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    PREFIX,
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
}

/**
 * Mendekripsi string hasil `encrypt()` menggunakan AES-256-GCM.
 */
export function decrypt(encryptedText: string): string {
  const key = deriveAesKey();
  const parts = encryptedText.split(':');
  if (parts.length !== 4 || parts[0] !== PREFIX) {
    throw new Error('Format data terenkripsi tidak valid.');
  }

  const iv = Buffer.from(parts[1], 'base64');
  const authTag = Buffer.from(parts[2], 'base64');
  const ciphertext = Buffer.from(parts[3], 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Menyamarkan API key agar aman ditampilkan di UI Super Admin (contoh: AIza••••••••9xK2).
 */
export function maskApiKey(key: string | null | undefined): string | null {
  const cleaned = key?.trim();
  if (!cleaned) return null;

  if (cleaned.length <= 8) {
    return '••••••••';
  }

  const start = cleaned.slice(0, 4);
  const end = cleaned.slice(-4);
  return `${start}••••••••${end}`;
}
