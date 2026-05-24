import { scrypt, randomBytes, timingSafeEqual, type BinaryLike, type ScryptOptions } from 'crypto';

// Node default scrypt parameters: N=16384, r=8, p=1 → ~64 MB memory,
// ~50-100 ms per hash on modest hardware. If the deployment hardware
// is severely constrained (Raspberry Pi etc.), tune N down to 8192
// and accept the weaker work-factor.
const SCRYPT_OPTIONS: ScryptOptions = { N: 16384, r: 8, p: 1 };

// promisify(scrypt) collapses to the 3-arg overload and loses the
// options parameter. Wrap manually so we can pass cost/r/p explicitly.
function scryptAsync(password: BinaryLike, salt: BinaryLike, keylen: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, SCRYPT_OPTIONS, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}
const SALT_BYTES = 16; // 32-char hex
const KEY_BYTES = 64;  // 128-char hex

export interface HashedPassword {
  hash: string; // 128-char lowercase hex
  salt: string; // 32-char lowercase hex
}

export async function hashTeamPassword(plain: string): Promise<HashedPassword> {
  const salt = randomBytes(SALT_BYTES);
  const key = await scryptAsync(plain, salt, KEY_BYTES);
  return { hash: key.toString('hex'), salt: salt.toString('hex') };
}

export async function verifyTeamPassword(
  plain: string,
  hash: string,
  salt: string,
): Promise<boolean> {
  // Reject malformed inputs early — timingSafeEqual throws on length
  // mismatch, which would crash callers. We treat malformed input as
  // a verification failure.
  if (typeof plain !== 'string' || typeof hash !== 'string' || typeof salt !== 'string') {
    return false;
  }
  if (hash.length !== KEY_BYTES * 2 || salt.length !== SALT_BYTES * 2) {
    return false;
  }
  let saltBuf: Buffer;
  let expected: Buffer;
  try {
    saltBuf = Buffer.from(salt, 'hex');
    expected = Buffer.from(hash, 'hex');
  } catch {
    return false;
  }
  const candidate = await scryptAsync(plain, saltBuf, KEY_BYTES);
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}
