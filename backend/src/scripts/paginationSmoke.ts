import { strict as assert } from 'assert';
import { buildPaginationMeta, getPaginationParams } from '../utils/pagination';

const run = () => {
    const params = getPaginationParams({ page: '2', limit: '25' });
    assert.equal(params.page, 2);
    assert.equal(params.limit, 25);
    assert.equal(params.skip, 25);

    const meta = buildPaginationMeta(2, 25, 260);
    assert.equal(meta.page, 2);
    assert.equal(meta.limit, 25);
    assert.equal(meta.total, 260);
    assert.equal(meta.totalPages, 11);

    const emptyMeta = buildPaginationMeta(1, 10, 0);
    assert.equal(emptyMeta.totalPages, 0);
};

try {
    run();
    // eslint-disable-next-line no-console
    console.log('[pagination-smoke] Passed');
} catch (error) {
    // eslint-disable-next-line no-console
    console.error('[pagination-smoke] Failed', error);
    process.exit(1);
}
