import assert from 'assert';
import express from 'express';
import http from 'http';
import rateLimit from 'express-rate-limit';
import { registerSchema } from '../validators/auth.validator';
import { can } from '../utils/policy.utils';
import { isAllowedFile, sanitizeUploadFileName } from '../utils/fileSecurity.utils';

process.env.DATA_ENCRYPTION_KEY = process.env.DATA_ENCRYPTION_KEY || 'test-data-encryption-key-at-least-32';

const runPasswordPolicyChecks = () => {
    const weak = registerSchema.validate({
        email: 'admin@example.com',
        password: 'weakpass',
        firstName: 'Admin',
        lastName: 'User'
    });
    const strong = registerSchema.validate({
        email: 'admin@example.com',
        password: 'Strong@Pass123',
        firstName: 'Admin',
        lastName: 'User'
    });
    assert(weak.error, 'Register schema should reject weak password');
    assert(!strong.error, 'Register schema should accept strong password');
};

const runRbacChecks = () => {
    const perms = {
        reports: { view: true, export: false }
    } as Record<string, Record<string, boolean>>;
    assert.strictEqual(can(perms, 'reports', 'view'), true, 'reports.view must pass');
    assert.strictEqual(can(perms, 'reports', 'export'), false, 'reports.export must fail');
};

const runFileUploadChecks = () => {
    const safeName = sanitizeUploadFileName('../../../evil file?.png');
    assert(!safeName.includes('..'), 'Sanitized filename must not include parent path');
    assert(
        isAllowedFile('logo.png', 'image/png', ['image/png'], ['.png']),
        'Valid PNG should be accepted'
    );
    assert(
        !isAllowedFile('shell.php', 'application/x-php', ['image/png'], ['.png']),
        'Invalid script upload should be rejected'
    );
};

const runEncryptionChecks = async () => {
    const { decryptValue, encryptValue, isEncryptedValue } = await import('../utils/dataProtection.utils');
    const plain = 'ABCDE1234F';
    const encrypted = encryptValue(plain);
    assert(encrypted, 'Encrypted value should be generated');
    assert(isEncryptedValue(encrypted), 'Encrypted value should include marker');
    const decrypted = decryptValue(encrypted);
    assert.strictEqual(decrypted, plain, 'Decrypted value should match original plaintext');
};

const runRateLimitCheck = async () => {
    const app = express();
    const limiter = rateLimit({
        windowMs: 60 * 1000,
        max: 2,
        standardHeaders: true,
        legacyHeaders: false
    });
    app.post('/login', limiter, (_req, res) => res.status(200).json({ ok: true }));

    const server = await new Promise<http.Server>((resolve) => {
        const listening = app.listen(0, () => resolve(listening));
    });

    try {
        const address = server.address();
        assert(address && typeof address === 'object', 'Server address must be available');
        const baseUrl = `http://127.0.0.1:${address.port}`;

        const first = await fetch(`${baseUrl}/login`, { method: 'POST' });
        const second = await fetch(`${baseUrl}/login`, { method: 'POST' });
        const third = await fetch(`${baseUrl}/login`, { method: 'POST' });

        assert.strictEqual(first.status, 200, 'First request must pass');
        assert.strictEqual(second.status, 200, 'Second request must pass');
        assert.strictEqual(third.status, 429, 'Third request must be rate limited');
    } finally {
        await new Promise<void>((resolve, reject) => {
            server.close((err) => (err ? reject(err) : resolve()));
        });
    }
};

const main = async () => {
    runPasswordPolicyChecks();
    runRbacChecks();
    runFileUploadChecks();
    await runEncryptionChecks();
    await runRateLimitCheck();
    console.log('Security hardening smoke tests passed');
};

main().catch((error) => {
    console.error('Security hardening smoke tests failed');
    console.error(error);
    process.exit(1);
});
