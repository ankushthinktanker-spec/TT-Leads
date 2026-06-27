import http from 'node:http';
import assert from 'node:assert/strict';

const TEST_DB_URI = process.env.TEST_MONGODB_URI;

const run = async () => {
    if (!TEST_DB_URI) {
        console.log('Skipping backend integration tests: TEST_MONGODB_URI is not configured.');
        return;
    }

    if (!/test|integration/i.test(TEST_DB_URI)) {
        throw new Error('Refusing to run integration tests against a non-test database URI.');
    }

    const mongoose = (await import('mongoose')).default;
    const { Types } = await import('mongoose');
    const { default: app } = await import('../app');
    const { default: User } = await import('../models/user.model');
    const { default: RolePermission } = await import('../models/role-permission.model');
    const { default: RevokedToken } = await import('../models/revoked-token.model');
    const { default: Lead } = await import('../models/lead.model');
    const { default: Company } = await import('../models/company.model');
    const { generateToken } = await import('../utils/jwt.utils');

    await mongoose.connect(TEST_DB_URI);
    await mongoose.connection.dropDatabase();

    const server = app.listen(0);
    const address = server.address();
    if (!address || typeof address === 'string') {
        throw new Error('Failed to resolve integration test server port.');
    }

    const baseUrl = `http://127.0.0.1:${address.port}`;

    const requestJson = async (
        path: string,
        options: {
            method?: string;
            token?: string;
        } = {}
    ): Promise<{ status: number; body: unknown }> => new Promise((resolve, reject) => {
        const req = http.request(
            `${baseUrl}${path}`,
            {
                method: options.method || 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
                },
            },
            (res) => {
                let raw = '';
                res.setEncoding('utf8');
                res.on('data', (chunk) => {
                    raw += chunk;
                });
                res.on('end', () => {
                    try {
                        resolve({
                            status: res.statusCode || 0,
                            body: raw ? JSON.parse(raw) : {},
                        });
                    } catch (error) {
                        reject(error);
                    }
                });
            }
        );

        req.on('error', reject);
        req.end();
    });

    const requestRaw = async (
        path: string,
        options: {
            method?: string;
            token?: string;
        } = {}
    ): Promise<{ status: number; body: string; headers: http.IncomingHttpHeaders }> => new Promise((resolve, reject) => {
        const req = http.request(
            `${baseUrl}${path}`,
            {
                method: options.method || 'GET',
                headers: {
                    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
                },
            },
            (res) => {
                let raw = '';
                res.setEncoding('utf8');
                res.on('data', (chunk) => {
                    raw += chunk;
                });
                res.on('end', () => {
                    resolve({
                        status: res.statusCode || 0,
                        body: raw,
                        headers: res.headers,
                    });
                });
            }
        );

        req.on('error', reject);
        req.end();
    });

    try {
        const tenantA = new Types.ObjectId();
        const tenantB = new Types.ObjectId();

        const adminUser = await User.create({
            email: 'admin.integration@example.com',
            password: 'Integration@123',
            firstName: 'Asha',
            lastName: 'Admin',
            role: 'Admin',
            tenantId: tenantA,
            status: 'Active',
        });

        const managerUser = await User.create({
            email: 'manager.integration@example.com',
            password: 'Integration@123',
            firstName: 'Manav',
            lastName: 'Manager',
            role: 'Manager',
            tenantId: tenantA,
            status: 'Active',
        });

        await User.create({
            email: 'tenantb.integration@example.com',
            password: 'Integration@123',
            firstName: 'Tina',
            lastName: 'TenantB',
            role: 'Admin',
            tenantId: tenantB,
            status: 'Active',
        });

        const adminToken = generateToken(adminUser._id.toString());
        const managerToken = generateToken(managerUser._id.toString());

        const unauthenticated = await requestJson('/api/v1/users');
        assert.strictEqual(unauthenticated.status, 401);

        const managerDenied = await requestJson('/api/v1/users', { token: managerToken });
        assert.strictEqual(managerDenied.status, 403);

        const adminList = await requestJson('/api/v1/users', { token: adminToken });
        assert.strictEqual(adminList.status, 200);

        const adminBody = adminList.body as {
            success?: boolean;
            data?: {
                data?: Array<{ email?: string; tenantId?: string }>;
                meta?: { total?: number };
            };
        };

        assert.strictEqual(adminBody.success, true);
        assert.strictEqual(adminBody.data?.meta?.total, 2);
        assert.deepStrictEqual(
            (adminBody.data?.data || []).map((user) => user.email).sort(),
            ['admin.integration@example.com', 'manager.integration@example.com']
        );

        await Lead.create([
            {
                tenantId: tenantA,
                firstName: 'Riya',
                lastName: 'Revenue',
                email: 'riya.revenue@example.com',
                phone: '+910000000001',
                company: 'Northwind Labs',
                source: 'LinkedIn',
                status: 'Qualified',
                lifecycleStage: 'Qualified',
                priority: 'Hot',
                location: { country: 'India' },
                serviceInterest: ['Web Development'],
                dealValue: 50000,
                probability: 60,
                createdBy: adminUser._id,
                assignedTo: adminUser._id,
                ownerId: adminUser._id,
                tags: [],
            },
            {
                tenantId: tenantA,
                firstName: 'Nikhil',
                lastName: 'Negotiation',
                email: 'nikhil.negotiation@example.com',
                phone: '+910000000002',
                company: 'Northwind Labs',
                source: 'LinkedIn',
                status: 'Negotiation',
                lifecycleStage: 'Opportunity',
                priority: 'Warm',
                location: { country: 'India' },
                serviceInterest: ['Consulting'],
                dealValue: 30000,
                createdBy: adminUser._id,
                assignedTo: managerUser._id,
                ownerId: managerUser._id,
                tags: [],
            },
            {
                tenantId: tenantA,
                firstName: 'Wina',
                lastName: 'Winner',
                email: 'wina.winner@example.com',
                phone: '+910000000003',
                company: 'Closed Loop Co',
                source: 'Referral',
                status: 'Won',
                lifecycleStage: 'Customer',
                priority: 'Hot',
                location: { country: 'India' },
                serviceInterest: ['AI/ML'],
                dealValue: 20000,
                createdBy: adminUser._id,
                assignedTo: adminUser._id,
                ownerId: adminUser._id,
                tags: [],
            },
            {
                tenantId: tenantB,
                firstName: 'Tara',
                lastName: 'TenantBLead',
                email: 'tara.tenantb@example.com',
                phone: '+910000000004',
                company: 'Other Tenant Co',
                source: 'Website',
                status: 'Qualified',
                lifecycleStage: 'Qualified',
                priority: 'Warm',
                location: { country: 'India' },
                serviceInterest: ['Cloud Services'],
                dealValue: 99999,
                createdBy: adminUser._id,
                assignedTo: adminUser._id,
                ownerId: adminUser._id,
                tags: [],
            },
        ]);

        await Company.create([
            {
                tenantId: tenantA,
                name: 'Northwind Labs',
                industry: 'Technology',
                companySize: '11-50',
                address: { country: 'India' },
                status: 'Active',
                createdBy: adminUser._id,
                tags: [],
            },
            {
                tenantId: tenantA,
                name: 'Closed Loop Co',
                industry: 'Finance',
                companySize: '1-10',
                address: { country: 'India' },
                status: 'Inactive',
                createdBy: adminUser._id,
                tags: [],
            },
            {
                tenantId: tenantB,
                name: 'Other Tenant Co',
                industry: 'Technology',
                companySize: '500+',
                address: { country: 'India' },
                status: 'Active',
                createdBy: adminUser._id,
                tags: [],
            },
        ]);

        const leadSourceReport = await requestJson('/api/v1/reports/leads/source', { token: adminToken });
        assert.strictEqual(leadSourceReport.status, 200);
        const leadSourceBody = leadSourceReport.body as {
            success?: boolean;
            data?: Array<{ source?: string; leads?: number; won?: number }>;
        };
        assert.strictEqual(leadSourceBody.success, true);
        assert.deepStrictEqual(leadSourceBody.data, [
            { source: 'LinkedIn', leads: 2, qualified: 1, won: 0, conversionRate: 0 },
            { source: 'Referral', leads: 1, qualified: 0, won: 1, conversionRate: 1 },
        ]);

        const weightedPipelineReport = await requestJson('/api/v1/reports/pipeline/weighted', { token: adminToken });
        assert.strictEqual(weightedPipelineReport.status, 200);
        const weightedBody = weightedPipelineReport.body as {
            success?: boolean;
            data?: { weightedValue?: number };
        };
        assert.strictEqual(weightedBody.success, true);
        assert.strictEqual(weightedBody.data?.weightedValue, 42000);

        const companyStatusReport = await requestJson('/api/v1/reports/companies/status', { token: adminToken });
        assert.strictEqual(companyStatusReport.status, 200);
        const companyStatusBody = companyStatusReport.body as {
            success?: boolean;
            data?: Array<{ status?: string; count?: number }>;
        };
        assert.strictEqual(companyStatusBody.success, true);
        assert.deepStrictEqual(companyStatusBody.data, [
            { status: 'Active', count: 1 },
            { status: 'Inactive', count: 1 },
        ]);

        const leadSourceExport = await requestRaw('/api/v1/reports/leads/source?format=csv', { token: adminToken });
        assert.strictEqual(leadSourceExport.status, 200);
        assert.match(String(leadSourceExport.headers['content-type']), /text\/csv/i);
        assert.match(String(leadSourceExport.headers['content-disposition']), /lead-source\.csv/i);
        assert.match(leadSourceExport.body, /source,leads,qualified,won,conversionRate/i);

        console.log('Backend integration tests: 7 passed, 0 failed');
    } finally {
        await Promise.all([
            RolePermission.deleteMany({}),
            RevokedToken.deleteMany({}),
            Lead.deleteMany({}),
            Company.deleteMany({}),
            User.deleteMany({}),
        ]);
        await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
        await new Promise<void>((resolve, reject) => {
            server.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });
    }
};

void run().catch((error) => {
    console.error('Backend integration tests failed');
    console.error(error);
    process.exit(1);
});
