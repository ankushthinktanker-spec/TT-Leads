import { Activity, MessageSquare, Terminal, User } from 'lucide-react';
import Card from '../ui/Card';
import { DashboardData } from '../../types/dashboard';

interface DashboardActivityFeedProps {
  data: DashboardData | null;
  loading?: boolean;
}

const DashboardActivityFeed = ({ data }: DashboardActivityFeedProps) => {
  const items = (data?.recentActivity || []).slice(0, 6);

  return (
    <Card variant="panel" className="overflow-hidden rounded-[24px] p-0 shadow-[0_14px_30px_rgba(15,23,42,0.04)]">
      <div className="border-b border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-5 py-5">
        <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-brand-700">
          <Activity size={12} />
          Live feed
        </div>
        <h3 className="mt-3 text-[18px] font-black tracking-tight text-slate-950">Recent Activity</h3>
        <p className="mt-1 text-sm leading-6 text-slate-500">Latest customer and team updates, trimmed into a readable operational timeline.</p>
      </div>

      <div className="px-5 py-5">
        {items.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50/60 px-5 py-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
              <Terminal size={20} />
            </div>
            <div className="mt-4 text-sm font-semibold text-slate-900">No recent activity</div>
            <div className="mt-1 text-xs leading-5 text-slate-500">New notes, calls, and lead updates will appear here automatically.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((activity) => (
              <div key={activity._id} className="rounded-[18px] border border-slate-100 bg-slate-50/70 px-4 py-3.5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm">
                    {activity.type === 'note' ? <MessageSquare size={16} /> : <User size={16} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-950">{activity.subject}</div>
                        <div className="mt-1 text-xs font-medium capitalize text-slate-500">{activity.type || 'Event'}</div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-xs font-semibold text-slate-600">
                          {activity.activityDate ? new Date(activity.activityDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '00:00'}
                        </div>
                        <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                          {activity.activityDate ? new Date(activity.activityDate).toLocaleDateString() : 'Log'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3.5 text-center">
          <button className="text-xs font-bold text-brand-600 transition hover:text-brand-700">View full activity log</button>
        </div>
      )}
    </Card>
  );
};

export default DashboardActivityFeed;
