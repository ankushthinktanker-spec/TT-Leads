import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ChevronRight, Clock3, Filter, User2 } from 'lucide-react';
import Card from '../ui/Card';
import Skeleton from '../ui/Skeleton';
import InlineAlert from '../ui/InlineAlert';
import { SelectInput } from '../ui/Form';
import api from '../../api/axios';
import { getErrorMessage } from '../../utils/error';
import { StuckLead } from '../../types/dashboard';

interface DashboardStuckLeadsProps {
  canViewTeam: boolean;
  teamUsers: { _id: string; firstName: string; lastName: string }[];
}

const DashboardStuckLeads = ({ canViewTeam, teamUsers }: DashboardStuckLeadsProps) => {
  const [stuckLeads, setStuckLeads] = useState<StuckLead[]>([]);
  const [stuckLoading, setStuckLoading] = useState(false);
  const [stuckError, setStuckError] = useState<string | null>(null);
  const [stuckDays, setStuckDays] = useState('14');
  const [stuckOwnerId, setStuckOwnerId] = useState('');

  const stuckViewAllLink = `/leads?view=stuck&days=${encodeURIComponent(stuckDays || '14')}&owner=${encodeURIComponent(stuckOwnerId || 'all')}`;

  const loadStuckLeads = useCallback(async () => {
    setStuckLoading(true);
    setStuckError(null);

    try {
      const params: Record<string, string | number> = { days: Number(stuckDays) || 14, limit: 5 };
      if (stuckOwnerId) {
        params.ownerId = stuckOwnerId;
      }

      const response = await api.get('/leads/stuck', { params });
      setStuckLeads(response.data?.data || []);
    } catch (error) {
      setStuckError(getErrorMessage(error, 'Failed to load stuck leads.'));
    } finally {
      setStuckLoading(false);
    }
  }, [stuckDays, stuckOwnerId]);

  useEffect(() => {
    loadStuckLeads();
  }, [loadStuckLeads]);

  return (
    <Card variant="panel" className="overflow-hidden rounded-[24px] border border-rose-100/90 p-0 shadow-[0_14px_30px_rgba(15,23,42,0.04)]">
      <div className="border-b border-rose-100/70 bg-[linear-gradient(180deg,#fff9f9_0%,#fff5f5_100%)] px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-rose-700">
              <AlertCircle size={12} />
              Risk watch
            </div>
            <h3 className="mt-3 text-[18px] font-black tracking-tight text-slate-950">Stalled Leads</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">High-risk leads that have stopped moving and need intervention.</p>
          </div>
          <Link to={stuckViewAllLink} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700">
            View all
            <ChevronRight size={14} />
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-xl border border-rose-100 bg-white px-3 py-2">
            <Filter size={13} className="text-slate-400" />
            <SelectInput value={stuckDays} onChange={(e) => setStuckDays(e.target.value)} className="h-auto min-w-[92px] border-0 bg-transparent px-0 py-0 text-xs font-semibold shadow-none focus:ring-0">
              <option value="7">7+ Days</option>
              <option value="14">14+ Days</option>
              <option value="21">21+ Days</option>
              <option value="30">30+ Days</option>
            </SelectInput>
          </div>

          {canViewTeam && (
            <div className="inline-flex items-center gap-2 rounded-xl border border-rose-100 bg-white px-3 py-2">
              <User2 size={13} className="text-slate-400" />
              <SelectInput value={stuckOwnerId} onChange={(e) => setStuckOwnerId(e.target.value)} className="h-auto min-w-[120px] border-0 bg-transparent px-0 py-0 text-xs font-semibold shadow-none focus:ring-0">
                <option value="">Everyone</option>
                {teamUsers.map((owner) => (
                  <option key={owner._id} value={owner._id}>
                    {owner.firstName} {owner.lastName}
                  </option>
                ))}
              </SelectInput>
            </div>
          )}
        </div>
      </div>

      <div className="px-5 py-5">
        {stuckLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Skeleton key={`stuck-skeleton-${idx}`} className="h-[86px] w-full rounded-[18px]" />
            ))}
          </div>
        ) : stuckError ? (
          <InlineAlert message="Failed to load stalled leads." onRetry={loadStuckLeads} />
        ) : stuckLeads.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-emerald-200 bg-emerald-50/60 px-5 py-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-emerald-500 shadow-sm">
              <Clock3 size={20} />
            </div>
            <div className="mt-4 text-sm font-semibold text-slate-900">No stalled leads</div>
            <div className="mt-1 text-xs leading-5 text-slate-500">Momentum looks healthy. Use this panel to catch future slowdowns early.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {stuckLeads.slice(0, 5).map((lead) => (
              <Link key={lead.leadId} to={`/leads/${lead.leadId}`} className="group block rounded-[18px] border border-slate-200 bg-white px-4 py-4 transition hover:border-rose-200 hover:bg-rose-50/40 hover:shadow-[0_10px_22px_rgba(15,23,42,0.05)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 transition group-hover:bg-rose-100">
                        <AlertCircle size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-slate-950">{lead.name}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-rose-700">{lead.stage}</span>
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                            <Clock3 size={11} />
                            {lead.daysStuck} days stalled
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pl-[52px] text-xs font-medium text-slate-500">
                      {lead.owner?.firstName ? `${lead.owner.firstName} ${lead.owner.lastName}` : 'Unassigned owner'}
                    </div>
                  </div>
                  <ChevronRight size={18} className="shrink-0 text-slate-300 transition group-hover:text-rose-500" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

export default DashboardStuckLeads;
