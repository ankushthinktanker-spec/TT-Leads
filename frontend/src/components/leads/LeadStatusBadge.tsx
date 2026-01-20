import { getLeadStatusClasses } from '../../lib/utils';

interface LeadStatusBadgeProps {
    status: string;
    className?: string;
}

const LeadStatusBadge = ({ status, className = '' }: LeadStatusBadgeProps) => {
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLeadStatusClasses(status)} ${className}`}>
            {status}
        </span>
    );
};

export default LeadStatusBadge;
