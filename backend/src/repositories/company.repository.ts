import { BaseRepository } from './base.repository';
import Company, { ICompany } from '../models/company.model';

/**
 * CompanyRepository
 * Extends BaseRepository to handle Company-specific database queries.
 * Inherits the mandatory tenantId injection for all read/write/update methods.
 */
export class CompanyRepository extends BaseRepository<ICompany> {
    constructor() {
        super(Company);
    }

    /**
     * Find a company by its name within the specific tenant's organizational sandbox.
     */
    async findByName(tenantId: string, name: string) {
        return this.findOne(tenantId, { 
            name: { $regex: new RegExp(`^${name}$`, 'i') } 
        });
    }

    /**
     * Get a breakdown of company status (Active vs Inactive) across the tenant.
     */
    async getStatusBreakdown(tenantId: string) {
        return this.model.aggregate([
            { $match: this.enforceTenantScope(tenantId, {}) },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]).exec();
    }
}

export const companyRepository = new CompanyRepository();
