import { createDealSchema } from '../validators/deal.validator';
import { createPipelineSchema } from '../validators/pipeline.validator';
import { createContractSchema } from '../validators/contract.validator';
import { createInvoiceSchema } from '../validators/invoice.validator';
import { createSubscriptionSchema } from '../validators/subscription.validator';

const runValidation = (label: string, schema: { validate: (data: unknown) => { error?: { message: string } } }, payload: unknown) => {
    const { error } = schema.validate(payload);
    if (error) {
        throw new Error(`[${label}] ${error.message}`);
    }
};

try {
    runValidation('deal', createDealSchema, {
        name: 'New Deal',
        companyId: '507f191e810c19729de860ea',
        pipelineId: '507f191e810c19729de860ea',
        stageId: '507f191e810c19729de860ea',
        status: 'Open'
    });
    runValidation('pipeline', createPipelineSchema, {
        name: 'Default Pipeline',
        status: 'Active',
        stages: [{ name: 'New', order: 1 }]
    });
    runValidation('contract', createContractSchema, {
        contractNumber: 'CONT-001',
        companyId: '507f191e810c19729de860ea',
        status: 'Draft'
    });
    runValidation('invoice', createInvoiceSchema, {
        invoiceNumber: 'INV-001',
        companyId: '507f191e810c19729de860ea',
        status: 'Draft'
    });
    runValidation('subscription', createSubscriptionSchema, {
        name: 'Hosting Plan',
        internalOwnerId: '507f191e810c19729de860ea',
        renewDate: new Date().toISOString(),
        status: 'Active'
    });
    // eslint-disable-next-line no-console
    console.log('[module-validators-smoke] Passed');
} catch (error) {
    // eslint-disable-next-line no-console
    console.error('[module-validators-smoke] Failed', error);
    process.exit(1);
}
