import { pbkdf2, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import bcrypt from 'bcryptjs';

const deriveKey = promisify(pbkdf2);
const workerHash = /^pbkdf2:([0-9a-f]{32}):([0-9a-f]{64})$/;

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash.startsWith('pbkdf2:')) return bcrypt.compare(password, storedHash);

  const match = workerHash.exec(storedHash);
  if (!match) return false;
  const [, saltHex, hashHex] = match;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = await deriveKey(password, Buffer.from(saltHex, 'hex'), 100_000, 32, 'sha256');
  return timingSafeEqual(actual, expected);
}
