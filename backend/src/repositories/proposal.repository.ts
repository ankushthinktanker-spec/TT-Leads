import { BaseRepository } from './base.repository';
import Proposal, { IProposal } from '../models/proposal.model';

/**
 * ProposalRepository
 * Extends BaseRepository to handle Proposal-specific database queries.
 * Inherits the mandatory tenantId injection for all read/write/update methods.
 */
export class ProposalRepository extends BaseRepository<IProposal> {
    constructor() {
        super(Proposal);
    }

    /**
     * Find a proposal by its organization-specific proposal number.
     */
    async findByProposalNumber(tenantId: string, proposalNumber: string) {
        return this.findOne(tenantId, { proposalNumber });
    }

    /**
     * Calculate the total pipeline value for a tenant.
     */
    async getPipelineTotal(tenantId: string) {
        return this.model.aggregate([
            { $match: this.enforceTenantScope(tenantId, { status: { $in: ['Sent', 'Under Review'] } }) },
            {
                $group: {
                    _id: null,
                    totalValue: { $sum: '$totalAmount' },
                    avgValue: { $avg: '$totalAmount' },
                    count: { $sum: 1 }
                }
            }
        ]).exec();
    }
}

export const proposalRepository = new ProposalRepository();
