import type { IUser } from '../models/user.model';

declare module 'express-serve-static-core' {
    interface Request {
        user?: IUser;
        tenantId?: string;
        getTenantScope?: () => { tenantId: string };
    }
}
