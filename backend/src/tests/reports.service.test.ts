import assert from 'node:assert/strict';
import { createSuite } from './framework';
import {
    buildOpenLeadMatch,
    applyCompanyReportQueryFilters,
    formatReportUserName,
    mapActivityAggregateRows,
    mapCompanyAggregateRows,
    mapDuplicateLeadRows,
    mapLeadSourceRows,
    mapLeadStatusRows,
    mapTaskStatusRows,
    normalizeWeightedPipelineResult,
} from '../services/reports.service';

export const reportsServiceSuite = createSuite('reports.service', [
    {
        name: 'formats report user names without extra whitespace',
        run: () => {
            assert.equal(formatReportUserName({ firstName: 'Asha', lastName: 'Admin' }), 'Asha Admin');
            assert.equal(formatReportUserName({ firstName: 'Asha' }), 'Asha');
            assert.equal(formatReportUserName(undefined), '');
        },
    },
    {
        name: 'applies company report query filters including created range',
        run: () => {
            const baseFilter = {};
            const result = applyCompanyReportQueryFilters(baseFilter, {
                status: 'Active',
                industry: 'Technology',
                companySize: '11-50',
                startDate: '2026-05-01T00:00:00.000Z',
                endDate: '2026-05-31T00:00:00.000Z',
            }) as {
                status?: string;
                industry?: string;
                companySize?: string;
                createdAt?: { $gte?: Date; $lte?: Date };
            };

            assert.equal(result.status, 'Active');
            assert.equal(result.industry, 'Technology');
            assert.equal(result.companySize, '11-50');
            assert.equal(result.createdAt?.$gte?.toISOString(), '2026-05-01T00:00:00.000Z');
            assert.equal(result.createdAt?.$lte?.toISOString(), '2026-05-31T00:00:00.000Z');
        },
    },
    {
        name: 'maps lead source rows with a stable unknown fallback and conversion rate',
        run: () => {
            const result = mapLeadSourceRows([
                { _id: 'LinkedIn', leads: 8, qualified: 3, won: 2 },
                { _id: null, leads: 0, qualified: 0, won: 0 },
            ]);

            assert.deepEqual(result, [
                { source: 'LinkedIn', leads: 8, qualified: 3, won: 2, conversionRate: 0.25 },
                { source: 'Unknown', leads: 0, qualified: 0, won: 0, conversionRate: 0 },
            ]);
        },
    },
    {
        name: 'maps lead status aggregate rows without changing totals',
        run: () => {
            const result = mapLeadStatusRows([
                { _id: 'Qualified', count: 4, value: 120000 },
            ]);

            assert.deepEqual(result, [
                { status: 'Qualified', count: 4, value: 120000 },
            ]);
        },
    },
    {
        name: 'maps duplicate lead rows into export-friendly strings',
        run: () => {
            const result = mapDuplicateLeadRows([
                {
                    _id: 'ops@example.com',
                    count: 2,
                    leadIds: [{ toString: () => 'lead-1' }, { toString: () => 'lead-2' }],
                },
            ]);

            assert.deepEqual(result, [
                { email: 'ops@example.com', count: 2, leadIds: 'lead-1,lead-2' },
            ]);
        },
    },
    {
        name: 'maps company aggregate rows with unknown fallback and configurable key',
        run: () => {
            const result = mapCompanyAggregateRows([
                { _id: 'Technology', count: 5 },
                { _id: null, count: 1 },
            ], 'industry');

            assert.deepEqual(result, [
                { industry: 'Technology', count: 5 },
                { industry: 'Unknown', count: 1 },
            ]);
        },
    },
    {
        name: 'maps task status rows with unknown fallback',
        run: () => {
            const result = mapTaskStatusRows([
                { _id: 'Completed', count: 7 },
                { _id: null, count: 1 },
            ]);

            assert.deepEqual(result, [
                { status: 'Completed', count: 7 },
                { status: 'Unknown', count: 1 },
            ]);
        },
    },
    {
        name: 'maps activity aggregate rows into report friendly fields',
        run: () => {
            const result = mapActivityAggregateRows([
                { _id: { owner: 'user-1', type: 'Call' }, count: 5 },
                { _id: null, count: 2 },
            ]);

            assert.deepEqual(result, [
                { owner: 'user-1', activityType: 'Call', count: 5 },
                { owner: 'Unknown', activityType: 'Unknown', count: 2 },
            ]);
        },
    },
    {
        name: 'builds open lead match without dropping existing filters',
        run: () => {
            const result = buildOpenLeadMatch({ tenantId: 'tenant-1', assignedTo: 'user-1' }) as {
                tenantId?: string;
                assignedTo?: string;
                status?: { $in?: string[] };
            };

            assert.equal(result.tenantId, 'tenant-1');
            assert.equal(result.assignedTo, 'user-1');
            assert.deepEqual(result.status?.$in, [
                'New',
                'Contacted',
                'Qualified',
                'Needs Analysis',
                'Proposal Sent',
                'Negotiation',
                'Nurture',
            ]);
        },
    },
    {
        name: 'normalizes empty weighted pipeline aggregation to zero',
        run: () => {
            assert.deepEqual(normalizeWeightedPipelineResult([]), { weightedValue: 0 });
            assert.deepEqual(
                normalizeWeightedPipelineResult([{ weightedValue: 12500 }]),
                { weightedValue: 12500 }
            );
        },
    },
]);
