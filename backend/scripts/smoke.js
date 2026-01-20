const getEnv = (key, fallback) => {
    const value = process.env[key];
    return value && value.trim().length > 0 ? value.trim() : fallback;
};

const BASE_URL = getEnv('SMOKE_BASE_URL', 'http://localhost:5000/api');
const EMAIL = getEnv('SMOKE_EMAIL', '');
const PASSWORD = getEnv('SMOKE_PASSWORD', '');

const log = (message) => {
    process.stdout.write(`${message}\n`);
};

const request = async (path, options = {}) => {
    const url = `${BASE_URL}${path}`;
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        }
    });
    const text = await response.text();
    let payload = null;
    try {
        payload = text ? JSON.parse(text) : null;
    } catch {
        payload = text;
    }
    return { ok: response.ok, status: response.status, payload };
};

const run = async () => {
    log(`Smoke test: ${BASE_URL}`);

    const health = await request('/health');
    if (!health.ok) {
        log(`Health check failed (${health.status}).`);
        process.exit(1);
    }
    log('Health check OK.');

    if (!EMAIL || !PASSWORD) {
        log('Skipping auth/lead/proposal checks. Set SMOKE_EMAIL and SMOKE_PASSWORD to enable.');
        return;
    }

    const login = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: EMAIL, password: PASSWORD })
    });
    if (!login.ok) {
        log(`Login failed (${login.status}).`);
        process.exit(1);
    }

    const token = login.payload?.data?.token;
    if (!token) {
        log('Login did not return a token.');
        process.exit(1);
    }

    const authHeaders = { Authorization: `Bearer ${token}` };
    const leads = await request('/leads?limit=1', { headers: authHeaders });
    if (!leads.ok) {
        log(`Leads check failed (${leads.status}).`);
        process.exit(1);
    }
    log('Leads check OK.');

    const proposals = await request('/proposals?limit=1', { headers: authHeaders });
    if (!proposals.ok) {
        log(`Proposals check failed (${proposals.status}).`);
        process.exit(1);
    }
    log('Proposals check OK.');
    log('Smoke test passed.');
};

run().catch((error) => {
    log(`Smoke test failed: ${error.message || String(error)}`);
    process.exit(1);
});
