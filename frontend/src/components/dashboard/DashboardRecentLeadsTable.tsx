import { format, parseISO } from 'date-fns';
import { cn } from '../../lib/utils';

type TableLead = {
    id: string;
    name: string;
    company: string;
    status: string;
    source: string;
    owner: string;
    priority: 'High' | 'Medium' | 'Low';
    updatedAt: string;
};

interface DashboardRecentLeadsTableProps {
    leads: TableLead[];
    statusStyles: Record<string, string>;
    priorityStyles: Record<TableLead['priority'], string>;
    safeDateLabel: (date?: string) => string;
}

export default function DashboardRecentLeadsTable({
    leads,
    statusStyles,
    priorityStyles,
    safeDateLabel
}: DashboardRecentLeadsTableProps) {
    return (
        <div className="overflow-hidden rounded-2xl border border-slate-100">
            <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                    <thead>
                        <tr className="bg-slate-50/80">
                            {['Lead', 'Status', 'Source', 'Owner', 'Updated'].map((header) => (
                                <th key={header} className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                                    {header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 bg-white">
                        {leads.map((lead) => (
                            <tr key={lead.id} className="group transition-colors hover:bg-slate-50/60">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EFF3FF] text-sm font-bold text-[#335CFF]">
                                            {lead.name.slice(0, 1)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">{lead.name}</p>
                                            <p className="text-xs text-slate-400">{lead.company}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={cn('inline-flex rounded-lg border px-2 py-0.5 text-[11px] font-bold', statusStyles[lead.status] || 'bg-slate-100 text-slate-700 border-slate-200')}>
                                        {lead.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-slate-800">{lead.source}</p>
                                        <span className={cn('inline-flex rounded-md border px-1.5 py-px text-[10px] font-bold', priorityStyles[lead.priority])}>
                                            {lead.priority}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-slate-600">{lead.owner}</td>
                                <td className="px-4 py-3">
                                    <div className="text-sm font-medium text-slate-800">{safeDateLabel(lead.updatedAt)}</div>
                                    <div className="text-[11px] text-slate-400">{format(parseISO(lead.updatedAt), 'dd MMM, hh:mm a')}</div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
