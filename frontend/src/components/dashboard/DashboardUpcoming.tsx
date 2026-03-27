import { useCallback, useEffect, useState } from 'react';
import { Calendar, RefreshCw, ShieldCheck, TrendingUp } from 'lucide-react';
import Card from '../ui/Card';
import Skeleton from '../ui/Skeleton';
import InlineAlert from '../ui/InlineAlert';
import api from '../../api/axios';
import { getErrorMessage } from '../../utils/error';
import { UpcomingSubscription } from '../../types/dashboard';

const DashboardUpcoming = () => {
  const [upcomingSubscriptions, setUpcomingSubscriptions] = useState<UpcomingSubscription[]>([]);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false);
  const [subscriptionsError, setSubscriptionsError] = useState<string | null>(null);

  const loadUpcoming = useCallback(async () => {
    setSubscriptionsLoading(true);
    setSubscriptionsError(null);

    try {
      const response = await api.get('/subscriptions/upcoming', { params: { days: 30, limit: 5 } });
      setUpcomingSubscriptions(response.data?.data?.items || []);
    } catch (error) {
      setSubscriptionsError(getErrorMessage(error, 'Failed to load upcoming renewals.'));
    } finally {
      setSubscriptionsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUpcoming();
  }, [loadUpcoming]);

  return (
    <Card variant="panel" className="overflow-hidden rounded-[24px] p-0 shadow-[0_14px_30px_rgba(15,23,42,0.04)]">
      <div className="border-b border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-700">
              <TrendingUp size={12} />
              Commercial watchlist
            </div>
            <h3 className="mt-3 text-[18px] font-black tracking-tight text-slate-950">Upcoming Renewals</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">Subscriptions and vendors that need proactive follow-up before renewal dates land.</p>
          </div>
          <button onClick={loadUpcoming} className={`icon-button rounded-xl border border-slate-200 bg-white ${subscriptionsLoading ? 'animate-spin' : ''}`} title="Refresh data">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="px-5 py-5">
        {subscriptionsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Skeleton key={`renewal-skeleton-${idx}`} className="h-[74px] w-full rounded-[18px]" />
            ))}
          </div>
        ) : subscriptionsError ? (
          <InlineAlert message="Failed to load upcoming renewals." onRetry={loadUpcoming} />
        ) : upcomingSubscriptions.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50/60 px-5 py-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
              <ShieldCheck size={20} />
            </div>
            <div className="mt-4 text-sm font-semibold text-slate-900">No imminent renewals</div>
            <div className="mt-1 text-xs leading-5 text-slate-500">No subscription renewals are due in the next 30 days.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingSubscriptions.map((subscription) => (
              <div key={subscription._id} className="rounded-[18px] border border-slate-100 bg-slate-50/80 px-4 py-3.5 transition hover:border-emerald-200 hover:bg-emerald-50/40">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                      <Calendar size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-950">{subscription.name}</div>
                      <div className="mt-1 text-xs font-medium text-slate-500">{subscription.vendorName || 'General provider'}</div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-bold text-slate-950">
                      {new Date(subscription.renewDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}
                    </div>
                    <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">Due date</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

export default DashboardUpcoming;
