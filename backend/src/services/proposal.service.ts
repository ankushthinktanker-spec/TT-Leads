import { proposalRepository } from '../repositories/proposal.repository';
import { IProposal } from '../models/proposal.model';
import { AppError } from '../middleware/errorHandler';
import mongoose from 'mongoose';

type ProposalCreateInput = Omit<IProposal, 'tenantId' | 'createdBy' | 'createdAt' | 'updatedAt'>;
type ProposalStatusUpdate = Pick<IProposal, 'status' | 'approvalStatus' | 'approvedBy' | 'approvedAt'>;

/**
 * ProposalService
 * Manages the core business logic for the Proposal module.
 * Securely interacts with the database via the Multi-Tenant ProposalRepository.
 */
export class ProposalService {

    /**
     * Create a new proposal securely within the tenant sandbox.
     */
    async createProposal(tenantId: string, payload: Partial<ProposalCreateInput>, createdById: string): Promise<IProposal> {
        return await proposalRepository.create(tenantId, {
            ...payload,
            createdBy: new mongoose.Types.ObjectId(createdById)
        });
    }

    /**
     * Retrieve a proposal by ID with guaranteed multi-tenant isolation.
     */
    async getProposalById(tenantId: string, proposalId: string): Promise<IProposal> {
        const proposal = await proposalRepository.findById(tenantId, proposalId, {
            populate: [
                { path: 'leadId', select: 'firstName lastName email' },
                { path: 'companyId', select: 'name email phone' },
                { path: 'createdBy', select: 'firstName lastName email' }
            ]
        });

        if (!proposal) {
            throw new AppError('Proposal not found or unauthorized access', 404);
        }

        return proposal;
    }

    /**
     * Update proposal status (Sent, Accepted, Rejected) with lifecycle management.
     */
    async updateStatus(tenantId: string, proposalId: string, status: string, approvedById?: string): Promise<IProposal> {
        const updatePayload: ProposalStatusUpdate = { status: status as IProposal['status'] };

        if (status === 'Accepted') {
            updatePayload.approvalStatus = 'Approved';
            updatePayload.approvedBy = approvedById as IProposal['approvedBy'];
            updatePayload.approvedAt = new Date();
        }

        const proposal = await proposalRepository.updateById(tenantId, proposalId, updatePayload);
        if (!proposal) {
            throw new AppError('Proposal not found for update', 404);
        }

        return proposal as IProposal;
    }
}

export const proposalService = new ProposalService();
