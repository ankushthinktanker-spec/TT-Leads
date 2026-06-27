import assert from 'node:assert/strict';
import { createSuite } from './framework';
import {
    applySearchFilter,
    getDateRangeParam,
    getSearchTerm,
    getStringParam,
    getTagsParam,
} from '../utils/queryFilters';

export const queryFiltersSuite = createSuite('queryFilters', [
    {
        name: 'prefers q over legacy search when both exist',
        run: () => {
            const result = getSearchTerm({ q: 'alpha', search: 'beta' });
            assert.equal(result, 'alpha');
        },
    },
    {
        name: 'returns undefined for blank string params',
        run: () => {
            const result = getStringParam({ ownerId: '   ' }, 'ownerId');
            assert.equal(result, undefined);
        },
    },
    {
        name: 'splits and trims tags correctly',
        run: () => {
            const result = getTagsParam({ tags: ' hot, warm ,cold ' });
            assert.deepEqual(result, ['hot', 'warm', 'cold']);
        },
    },
    {
        name: 'builds date range from dateFrom and dateTo',
        run: () => {
            const range = getDateRangeParam({
                dateFrom: '2026-05-01T00:00:00.000Z',
                dateTo: '2026-05-31T00:00:00.000Z',
            });

            assert.ok(range);
            assert.equal(range?.$gte?.toISOString(), '2026-05-01T00:00:00.000Z');
            assert.equal(range?.$lte?.toISOString(), '2026-05-31T00:00:00.000Z');
        },
    },
    {
        name: 'adds escaped regex search clause to a fresh filter',
        run: () => {
            const filter = applySearchFilter({}, 'north.wind', ['company', 'email']);

            assert.deepEqual(filter, {
                $or: [
                    { company: { $regex: 'north\\.wind', $options: 'i' } },
                    { email: { $regex: 'north\\.wind', $options: 'i' } },
                ],
            });
        },
    },
    {
        name: 'converts existing $or clause into $and composition',
        run: () => {
            const filter = applySearchFilter(
                { $or: [{ status: 'New' }] },
                'ava',
                ['firstName', 'lastName']
            ) as { $and?: unknown[]; $or?: unknown[] };

            assert.equal(filter.$or, undefined);
            assert.ok(Array.isArray(filter.$and));
            assert.deepEqual(filter.$and, [
                { $or: [{ status: 'New' }] },
                {
                    $or: [
                        { firstName: { $regex: 'ava', $options: 'i' } },
                        { lastName: { $regex: 'ava', $options: 'i' } },
                    ],
                },
            ]);
        },
    },
]);
