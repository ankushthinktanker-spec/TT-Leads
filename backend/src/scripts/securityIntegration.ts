import assert from 'assert';
import http from 'http';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const ensureTestEnv = () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-at-least-32-characters-long';
    process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-at-least-32-chars';
    process.env.JWT_EXPIRE = process.env.JWT_EXPIRE || '30m';
    process.env.JWT_REFRESH_EXPIRE = process.env.JWT_REFRESH_EXPIRE || '7d';
    process.env.DATA_ENCRYPTION_KEY = process.env.DATA_ENCRYPTION_KEY || 'test-data-encryption-key-at-least-32';
};

const buildTestMongoUri = (): string => {
    const base = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/thinktanker-leads';
    if (base.startsWith('mongodb+srv://')) {
        return base; 
    }
    return `${base}-multi-tenant-security-test`;
};

const asJson = async (res: Response): Promise<Record<string, unknown>> => {
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return {};
    return (await res.json()) as Record<string, unknown>;
};

interface TokenPayload {
    token?: string;
}

interface AuthResponseBody extends Record<string, unknown> {
    token?: string;
    data?: TokenPayload;
}

interface LeadResponseBody extends Record<string, unknown> {
    data?: {
        lead?: {
            _id?: string;
        };
    };
}

interface ProposalResponseBody extends Record<string, unknown> {
    data?: {
        proposal?: {
            _id?: string;
        };
    };
}

const getAuthToken = (body: Record<string, unknown>): string | undefined => {
    const authBody = body as AuthResponseBody;
    return authBody.data?.token || authBody.token;
};

const getLeadId = (body: Record<string, unknown>): string | undefined => {
    return (body as LeadResponseBody).data?.lead?._id;
};

const getProposalId = (body: Record<string, unknown>): string | undefined => {
    return (body as ProposalResponseBody).data?.proposal?._id;
};

const postJson = async (url: string, body: Record<string, unknown>, token?: string): Promise<Response> => {
    return fetch(url, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            ...(token ? { authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(body)
    });
};

const getJson = async (url: string, token: string): Promise<Response> => {
    return fetch(url, {
        method: 'GET',
        headers: { authorization: `Bearer ${token}` }
    });
};

const main = async () => {
    ensureTestEnv();
    const mongoUri = buildTestMongoUri();
    process.env.MONGODB_URI = mongoUri;

    const { default: app } = await import('../app');
    const { default: connectDB } = await import('../config/database');
    const { default: Tenant } = await import('../models/tenant.model');
    const { default: User } = await import('../models/user.model');
    const { default: AuditLog } = await import('../models/audit-log.model');
    const { ensureDefaultRoles } = await import('../utils/role.utils');

    console.log('Connecting to Test MongoDB...');
    await connectDB();
    await ensureDefaultRoles();
    
    if (mongoose.connection.name.includes('test') || process.env.NODE_ENV === 'test') {
        console.log(`Dropping test database: ${mongoose.connection.name}`);
        await mongoose.connection.dropDatabase();
    } else {
        console.warn('Skipping database drop: Not in test environment');
    }

    const server = await new Promise<http.Server>((resolve) => {
        const listening = app.listen(0, () => resolve(listening));
    });

    try {
        const address = server.address();
        assert(address && typeof address === 'object', 'Failed to get test server address');
        const baseUrl = `http://127.0.0.1:${address.port}`;

        console.log('--- Phase 1: Tenant & User Initialization ---');
        
        const tenantA = await Tenant.create({ 
            name: 'Tenant A', 
            slug: `tenant-a-${Date.now()}`, 
            status: 'Active',
            contactEmail: 'admin@tenant-a.com' 
        });
        const adminA = await User.create({
            firstName: 'Admin',
            lastName: 'A',
            email: `admin.a.${Date.now()}@example.com`,
            password: 'SecurePassword123!',
            role: 'Admin',
            tenantId: tenantA._id,
            status: 'Active'
        });

        const tenantB = await Tenant.create({ 
            name: 'Tenant B', 
            slug: `tenant-b-${Date.now()}`, 
            status: 'Active',
            contactEmail: 'admin@tenant-b.com'
        });
        const adminB = await User.create({
            firstName: 'Admin',
            lastName: 'B',
            email: `admin.b.${Date.now()}@example.com`,
            password: 'SecurePassword123!',
            role: 'Admin',
            tenantId: tenantB._id,
            status: 'Active'
        });

        console.log('--- Phase 2: Authentication ---');
        
        const loginA = await postJson(`${baseUrl}/api/auth/login`, {
            email: adminA.email,
            password: 'SecurePassword123!'
        });
        const bodyA = await asJson(loginA);
        const tokenA = getAuthToken(bodyA);

        const loginB = await postJson(`${baseUrl}/api/auth/login`, {
            email: adminB.email,
            password: 'SecurePassword123!'
        });
        const bodyB = await asJson(loginB);
        const tokenB = getAuthToken(bodyB);

        assert(tokenA && tokenB, 'Tokens must be issued');

        console.log('--- Phase 3: Cross-Tenant Data Leakage Test (Leads) ---');

        const createLeadA = await postJson(`${baseUrl}/api/leads`, {
            firstName: 'Private',
            lastName: 'Lead',
            email: `private.lead.${Date.now()}@tenant-a.com`,
            phone: `123456${Math.floor(Math.random() * 9000) + 1000}`,
            company: 'Private Co',
            status: 'New',
            priority: 'Hot',
            source: 'Website',
            nextFollowUpAt: new Date(Date.now() + 86400000),
            ownerId: adminA._id.toString()
        }, tokenA);
        
        if (createLeadA.status !== 201) {
            const err = await asJson(createLeadA);
            console.error('Lead A Creation Error:', JSON.stringify(err, null, 2));
        }
        assert.strictEqual(createLeadA.status, 201, 'Lead creation in Tenant A should succeed');
        
        const resLeadA = await asJson(createLeadA);
        const leadAId = getLeadId(resLeadA);
        assert(leadAId, 'Lead A identifier must be returned');

        const readLeadAFromB = await getJson(`${baseUrl}/api/leads/${leadAId}`, tokenB);
        assert.strictEqual(readLeadAFromB.status, 404, 'Tenant B should receive 404 for Tenant A lead');

        console.log('--- Phase 4: Cross-Tenant Data Leakage Test (Proposals) ---');

        const Company = mongoose.model('Company');
        const companyA = await Company.create({
            name: 'Company A',
            tenantId: tenantA._id,
            createdBy: adminA._id,
            status: 'Active'
        });

        const createProposalA = await postJson(`${baseUrl}/api/proposals`, {
            title: 'Sensitive Proposal A',
            companyId: companyA._id,
            status: 'Draft',
            proposalDate: new Date(),
            validTill: new Date(Date.now() + 86400000),
            preparedBy: { 
                name: 'Admin A',
                company: 'Tenant A Co',
                email: 'admin@tenant-a.com'
            },
            clientDetails: { 
                companyName: 'Client A',
                contactPerson: 'Contact A',
                email: 'contact@client-a.com'
            }
        }, tokenA);

        if (createProposalA.status !== 201) {
            const err = await asJson(createProposalA);
            console.error('Proposal A Creation Error:', JSON.stringify(err, null, 2));
        }
        assert.strictEqual(createProposalA.status, 201, 'Proposal creation in Tenant A should succeed');
        
        const resProposalA = await asJson(createProposalA);
        const proposalAId = getProposalId(resProposalA);
        assert(proposalAId, 'Proposal A identifier must be returned');

        const readProposalAFromB = await getJson(`${baseUrl}/api/proposals/${proposalAId}`, tokenB);
        assert.strictEqual(readProposalAFromB.status, 404, 'Tenant B should receive 404 for Tenant A proposal');

        console.log('--- Phase 5: Audit Log Verification ---');
        
        const countA = await AuditLog.countDocuments({ tenantId: tenantA._id });
        assert(countA > 0, 'Tenant A should have audit logs');
        
        const countB = await AuditLog.countDocuments({ tenantId: tenantB._id });
        console.log(`Tenant B Audit Log count: ${countB}`);
        
        const crossLogs = await AuditLog.countDocuments({ 
            tenantId: tenantB._id, 
            entityId: { $in: [leadAId, proposalAId] } 
        });
        assert.strictEqual(crossLogs, 0, 'Tenant B should have NO audit logs for Tenant A actions');

        console.log('--- Phase 6: Rate Limiting Enforcement ---');
        
        console.log('Testing authLimiter...');
        let reachedLimit = false;
        for (let i = 0; i < 15; i++) {
            const hit = await postJson(`${baseUrl}/api/auth/login`, {
                email: 'nonexistent@example.com',
                password: 'wrong'
            });
            if (hit.status === 429) {
                reachedLimit = true;
                break;
            }
        }
        assert(reachedLimit, 'authLimiter should trigger 429');

        console.log('\x1b[32m%s\x1b[0m', '✅ ALL MULTI-TENANT SECURITY INTEGRATION TESTS PASSED');

    } catch (error) {
        console.error('\x1b[31m%s\x1b[0m', '❌ SECURITY INTEGRATION TESTS FAILED');
        console.error(error);
        process.exit(1);
    } finally {
        server.close();
        await mongoose.connection.close();
    }
};

main();
