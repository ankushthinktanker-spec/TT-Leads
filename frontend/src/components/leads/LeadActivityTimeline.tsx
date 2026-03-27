import { useCallback, useEffect, useState } from 'react';
import api from '../../api/axios';
import { showToast } from '../../utils/toast';
import Button from '../ui/Button';
import { TextareaInput, FormLabel } from '../ui/Form';

interface LeadActivity {
    _id: string;
    type: 'NOTE' | 'STAGE_CHANGE' | 'FOLLOWUP_SCHEDULED' | 'FOLLOWUP_COMPLETED';
    message: string;
    meta?: {
        oldStage?: string;
        newStage?: string;
        followUpType?: string;
        followUpAt?: string;
        previousFollowUpAt?: string;
    };
    createdBy?: {
        firstName?: string;
        lastName?: string;
        email?: string;
    };
    createdAt: string;
}

const getTypeBadge = (type: LeadActivity['type']) => {
    switch (type) {
        case 'STAGE_CHANGE':
            return 'bg-brand-500/10 text-brand-600 border-brand-500/30';
        case 'FOLLOWUP_SCHEDULED':
            return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
        case 'FOLLOWUP_COMPLETED':
            return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
        default:
            return 'bg-slate-100 text-slate-700 border-slate-200';
    }
};

const LeadActivityTimeline = ({ leadId }: { leadId: string }) => {
    const [activities, setActivities] = useState<LeadActivity[]>([]);
    const [cursor, setCursor] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [note, setNote] = useState('');

    const loadActivities = useCallback(async (options?: { reset?: boolean; cursor?: string | null }) => {
        const reset = options?.reset ?? false;
        const nextCursor = reset ? undefined : (options?.cursor ?? cursor);
        setLoading(true);
        try {
            const response = await api.get(`/leads/${leadId}/activities`, {
                params: {
                    limit: 20,
                    cursor: nextCursor || undefined
                }
            });
            const next = response.data?.data?.activities || [];
            const responseCursor = response.data?.data?.nextCursor || null;
            setActivities((prev) => reset ? next : [...prev, ...next]);
            setCursor(responseCursor);
        } catch (error) {
            showToast('Failed to load activity timeline.', 'error');
        } finally {
            setLoading(false);
        }
    }, [cursor, leadId]);

    useEffect(() => {
        loadActivities({ reset: true });
    }, [leadId, loadActivities]);

    const handleAddNote = async () => {
        if (!note.trim()) {
            showToast('Please enter a note.', 'error');
            return;
        }
        try {
            await api.post(`/leads/${leadId}/activities`, { note: note.trim() });
            setNote('');
            await loadActivities({ reset: true });
            showToast('Note added.', 'success');
        } catch (error) {
            showToast('Failed to add note.', 'error');
        }
    };

    return (
        <div className="space-y-4">
            <div className="surface-card-muted p-4">
                <FormLabel>Add Note</FormLabel>
                <TextareaInput
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    placeholder="Add a quick note..."
                />
                <div className="mt-3 flex justify-end">
                    <Button type="button" variant="primary" onClick={handleAddNote}>
                        Save Note
                    </Button>
                </div>
            </div>

            <div className="space-y-3">
                {activities.map((activity) => (
                    <div key={activity._id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className={`px-2 py-0.5 rounded-full border text-xs font-semibold ${getTypeBadge(activity.type)}`}>
                                        {activity.type.replace('_', ' ')}
                                    </span>
                                    <span className="text-slate-500 text-xs">
                                        {new Date(activity.createdAt).toLocaleString()}
                                    </span>
                                </div>
                                <div className="mt-2 text-slate-700 text-sm">
                                    {activity.message}
                                </div>
                                {activity.meta && (
                                    <div className="mt-2 text-xs text-slate-500 space-y-1">
                                        {activity.meta?.oldStage && activity.meta?.newStage && (
                                            <div>Stage: {activity.meta.oldStage} {'->'} {activity.meta.newStage}</div>
                                        )}
                                        {activity.meta?.followUpType && (
                                            <div>Follow-up Type: {activity.meta.followUpType}</div>
                                        )}
                                        {activity.meta?.followUpAt && (
                                            <div>Follow-up At: {new Date(activity.meta.followUpAt).toLocaleString()}</div>
                                        )}
                                        {activity.meta?.previousFollowUpAt && (
                                            <div>Previous Follow-up: {new Date(activity.meta.previousFollowUpAt).toLocaleString()}</div>
                                        )}
                                    </div>
                                )}
                                <div className="mt-2 text-xs text-slate-500">
                                    By{' '}
                                    {activity.createdBy
                                        ? `${activity.createdBy.firstName || ''} ${activity.createdBy.lastName || ''}`.trim()
                                        : 'System'}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {loading && activities.length === 0 && (
                    <div className="text-sm text-slate-500">Loading activity...</div>
                )}

                {activities.length === 0 && !loading && (
                    <div className="text-sm text-slate-500">No activity yet.</div>
                )}
            </div>

            {cursor && (
                <div className="flex justify-center">
                    <Button type="button" variant="outline" onClick={() => loadActivities({ reset: false, cursor })} disabled={loading}>
                        {loading ? 'Loading...' : 'Load More'}
                    </Button>
                </div>
            )}
        </div>
    );
};

export default LeadActivityTimeline;


