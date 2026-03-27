import crypto from 'crypto';
import { env } from '../config/env';

const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;
const PREFIX = 'enc::';

const getKey = (): Buffer => {
    const keyMaterial = env.DATA_ENCRYPTION_KEY;
    return crypto.createHash('sha256').update(keyMaterial).digest();
};

export const isEncryptedValue = (value?: string | null): boolean => {
    if (!value || typeof value !== 'string') return false;
    return value.startsWith(PREFIX);
};

export const encryptValue = (plainText?: string | null): string | undefined => {
    if (!plainText) return undefined;
    if (isEncryptedValue(plainText)) return plainText;

    const iv = crypto.randomBytes(IV_BYTES);
    const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${PREFIX}${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
};

export const decryptValue = (encryptedValue?: string | null): string | undefined => {
    if (!encryptedValue) return undefined;
    if (!isEncryptedValue(encryptedValue)) return encryptedValue;

    const payload = encryptedValue.slice(PREFIX.length);
    const [ivB64, tagB64, dataB64] = payload.split(':');
    if (!ivB64 || !tagB64 || !dataB64) {
        throw new Error('Invalid encrypted payload format');
    }

    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(tagB64, 'base64');
    const encrypted = Buffer.from(dataB64, 'base64');
    const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
};

export const maskSensitive = (value?: string | null): string => {
    if (!value) return '';
    if (value.length <= 4) return '*'.repeat(value.length);
    return `${'*'.repeat(Math.max(value.length - 4, 0))}${value.slice(-4)}`;
};
