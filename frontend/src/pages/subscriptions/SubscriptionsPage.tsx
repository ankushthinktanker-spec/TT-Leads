import { useEffect, useState } from 'react';
import { CalendarClock, Layers3, Plus, Trash2, Edit } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import {
    fetchSubscriptions,
    createSubscription,
    updateSubscription,
    deleteSubscription,
} from '../../store/slices/subscriptionSlice';
import { fetchCompanies } from '../../store/slices/companySlice';
import { fetchUsers } from '../../store/slices/userSlice';
import { showToast } from '../../utils/toast';
import Modal from '../../components/ui/Modal';
import { FormLabel, TextInput, SelectInput, TextareaInput } from '../../components/ui/Form';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useGlobalSearch } from '../../context/GlobalSearchContext';
import {
    ModulePageShell,
    ModulePageHeader,
    ModuleToolbar,
    ModuleSummaryCards,
    ModuleDataTable,
    ModuleBadge,
    ModuleRowActions,
    type ModuleColumnDef,
    type ActiveFilter,
    type SummaryCardItem,
    type SortOrder
} from '../../components/module-system';

const STATUS_OPTIONS = ['Active', 'Paused', 'Cancelled', 'Expired'] as const;
const TYPE_OPTIONS = ['Software', 'Domain', 'Hosting', 'Email', 'API', 'License', 'Other'] as const;
const BILLING_OPTIONS = ['Monthly', 'Quarterly', 'HalfYearly', 'Yearly', 'Custom'] as const;
const QUICK_WINDOWS = [
    { label: 'All', value: '' },
    { label: 'Next 7 days', value: '7' },
    { label: 'Next 30 days', value: '30' }
];

const SubscriptionsPage = () => {
    const dispatch = useAppDispatch();
    const { items: subscriptions, loading, error, pagination } = useAppSelector((state) => state.subscriptions);
    const { items: companies } = useAppSelector((state) => state.companies);
    const { users } = useAppSelector((state) => state.users);
    const { user } = useAppSelector((state) => state.auth);

    const { value: search, setValue: setSearch } = useGlobalSearch();
    const [status, setStatus] = useState('');
    const [ownerId, setOwnerId] = useState('');
    const [companyId, setCompanyId] = useState('');
    const [type, setType] = useState('');
    const [quickWindow, setQuickWindow] = useState('');
    const [sortOrder] = useState<SortOrder>('desc');
    const [currentPage, setCurrentPage] = useState(1);

    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '', vendorName: '', type: 'Other', companyId: '', internalOwnerId: '',
        planName: '', billingCycle: 'Monthly', amount: '', currency: 'INR',
        startDate: '', renewDate: '', status: 'Active', notes: '', notifyBeforeDays: '7,1'
    });

    const canViewTeam = user?.role === 'Admin' || user?.role === 'Manager';

    useEffect(() => {
        let dateFrom = undefined;
        let dateTo = undefined;

        if (quickWindow) {
            const now = new Date();
            const until = new Date(now);
            until.setDate(now.getDate() + Number(quickWindow));
            dateFrom = now.toISOString();
            dateTo = until.toISOString();
        }

        dispatch(fetchSubscriptions({
            q: search,
            page: currentPage,
            limit: 20,
            sortBy: 'renewDate',
            sortOrder,
            ownerId: ownerId || undefined,
            status: status || undefined,
            companyId: companyId || undefined,
            type: type || undefined,
            dateFrom,
            dateTo
        }));
    }, [dispatch, search, status, ownerId, companyId, type, sortOrder, currentPage, quickWindow]);

    useEffect(() => {
        if (companies.length === 0) dispatch(fetchCompanies({ limit: 100 }));
    }, [companies.length, dispatch]);

    useEffect(() => {
        if (canViewTeam && users.length === 0) dispatch(fetchUsers({ limit: 200 }));
    }, [canViewTeam, users.length, dispatch]);

    const activeFilters: ActiveFilter[] = [
        ...(search.trim() ? [{ key: 'search', label: `Search: "${search.trim()}"`, onRemove: () => setSearch('') }] : []),
        ...(status ? [{ key: 'status', label: `Status: ${status}`, onRemove: () => setStatus('') }] : []),
        ...(type ? [{ key: 'type', label: `Type: ${type}`, onRemove: () => setType('') }] : []),
        ...(companyId ? [{ key: 'company', label: `Company: ${companies.find((c: { _id: string; name: string }) => c._id === companyId)?.name || 'Selected'}`, onRemove: () => setCompanyId('') }] : []),
        ...(ownerId ? [{ key: 'owner', label: `Owner: ${users.find((u: { _id: string; firstName?: string }) => u._id === ownerId)?.firstName || 'Selected'}`, onRemove: () => setOwnerId('') }] : []),
        ...(quickWindow ? [{ key: 'window', label: `Renewals: ${QUICK_WINDOWS.find(w => w.value === quickWindow)?.label}`, onRemove: () => setQuickWindow('') }] : []),
    ];

    const handleClearFilters = () => {
        setSearch(''); setStatus(''); setOwnerId(''); setCompanyId(''); setType(''); setQuickWindow(''); setCurrentPage(1);
    };

    const handleOpenModal = (subscription?: typeof subscriptions[number]) => {
        if (subscription) {
            setEditingId(subscription._id);
            setFormData({
                name: subscription.name,
                vendorName: subscription.vendorName || '',
                type: subscription.type || 'Other',
                companyId: typeof subscription.companyId === 'string' ? subscription.companyId : subscription.companyId?._id || '',
                internalOwnerId: typeof subscription.internalOwnerId === 'string'
                    ? subscription.internalOwnerId
                    : subscription.internalOwnerId?._id || '',
                planName: subscription.planName || '',
                billingCycle: subscription.billingCycle || 'Monthly',
                amount: subscription.amount ? String(subscription.amount) : '',
                currency: subscription.currency || 'INR',
                startDate: subscription.startDate ? subscription.startDate.slice(0, 10) : '',
                renewDate: subscription.renewDate ? subscription.renewDate.slice(0, 10) : '',
                status: subscription.status || 'Active',
                notes: subscription.notes || '',
                notifyBeforeDays: subscription.notifyBeforeDays?.join(', ') || '7,1'
            });
        } else {
            setEditingId(null);
            setFormData({
                name: '', vendorName: '', type: 'Other', companyId: '', internalOwnerId: '',
                planName: '', billingCycle: 'Monthly', amount: '', currency: 'INR',
                startDate: '', renewDate: '', status: 'Active', notes: '', notifyBeforeDays: '7,1'
            });
        }
        setModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name.trim() || !formData.internalOwnerId || !formData.renewDate) {
            showToast('Name, Owner, and Renew Date are required.', 'error');
            return;
        }
        const payload = {
            name: formData.name.trim(),
            vendorName: formData.vendorName.trim() || undefined,
            type: formData.type,
            companyId: formData.companyId || undefined,
            internalOwnerId: formData.internalOwnerId,
            planName: formData.planName.trim() || undefined,
            billingCycle: formData.billingCycle,
            amount: formData.amount ? Number(formData.amount) : undefined,
            currency: formData.currency || 'INR',
            startDate: formData.startDate || undefined,
            renewDate: formData.renewDate,
            status: formData.status,
            notes: formData.notes || undefined,
            notifyBeforeDays: formData.notifyBeforeDays
                ? formData.notifyBeforeDays.split(',').map((day) => Number(day.trim())).filter((day) => Number.isFinite(day))
                : undefined
        };

        try {
            if (editingId) {
                await dispatch(updateSubscription({ id: editingId, data: payload })).unwrap();
                showToast('Subscription updated.', 'success');
            } else {
                await dispatch(createSubscription(payload)).unwrap();
                showToast('Subscription created.', 'success');
            }
            setModalOpen(false);
            dispatch(fetchSubscriptions({ page: currentPage, limit: 20, sortOrder }));
        } catch {
            showToast('Failed to save subscription.', 'error');
        }
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        await dispatch(deleteSubscription(deleteId));
        setDeleteId(null);
        showToast('Subscription deleted.', 'success');
        dispatch(fetchSubscriptions({ page: currentPage, limit: 20, sortOrder }));
    };

    const activeSubscriptions = subscriptions.filter((s: typeof subscriptions[number]) => s.status === 'Active').length;
    const upcomingRenewals = subscriptions.filter((s) => {
        if (!s.renewDate) return false;
        const diff = new Date(s.renewDate).getTime() - Date.now();
        return diff >= 0 && diff <= 1000 * 60 * 60 * 24 * 30;
    }).length;
    const serviceTypes = new Set(subscriptions.map((s) => s.type).filter(Boolean)).size;

    const summaryCards: SummaryCardItem[] = [
        { label: 'Total Subscriptions', value: pagination.total, icon: <Layers3 size={18} />, variant: 'primary' },
        { label: 'Active', value: activeSubscriptions, icon: <Layers3 size={18} />, variant: 'success' },
        { label: 'Renewals (30d)', value: upcomingRenewals, icon: <CalendarClock size={18} />, variant: 'warning' },
        { label: 'Service Types', value: serviceTypes, icon: <Layers3 size={18} />, variant: 'info' },
    ];

    const columns: ModuleColumnDef<(typeof subscriptions)[number]>[] = [
        {
            id: 'name',
            header: 'Subscription',
            width: '28%',
            cell: (subscription) => (
                <div style={{ minWidth: 0 }}>
                    <div className="mod-table__primary-text">{subscription.name}</div>
                    <div className="mod-table__secondary-text truncate">{subscription.vendorName || subscription.planName || ''}</div>
                </div>
            )
        },
        {
            id: 'company',
            header: 'Company',
            width: '18%',
            cell: (subscription) => (
                <div className="mod-table__primary-text truncate" style={{ fontSize: 13 }}>
                    {typeof subscription.companyId === 'string' ? subscription.companyId : subscription.companyId?.name || '-'}
                </div>
            )
        },
        {
            id: 'owner',
            header: 'Owner',
            width: '16%',
            cell: (subscription) => (
                <div className="mod-table__primary-text truncate" style={{ fontSize: 13 }}>
                    {typeof subscription.internalOwnerId === 'string'
                        ? subscription.internalOwnerId
                        : `${subscription.internalOwnerId?.firstName || ''} ${subscription.internalOwnerId?.lastName || ''}`.trim() || '-'}
                </div>
            )
        },
        {
            id: 'type',
            header: 'Type',
            width: '10%',
            cell: (subscription) => (
                <div className="mod-table__secondary-text font-medium">{subscription.type || '-'}</div>
            )
        },
        {
            id: 'renew',
            header: 'Renewal',
            width: '14%',
            cell: (subscription) => (
                <div>
                    <div className="mod-table__primary-text" style={{ fontSize: 13 }}>
                        {subscription.renewDate ? new Date(subscription.renewDate).toLocaleDateString() : '-'}
                    </div>
                    <div className="mod-table__secondary-text">{subscription.billingCycle || '-'}</div>
                </div>
            )
        },
        {
            id: 'amount',
            header: 'Amount',
            width: '10%',
            cell: (subscription) => (
                <div className="mod-table__primary-text" style={{ fontSize: 13 }}>
                    {subscription.amount ? `${subscription.currency || 'INR'} ${subscription.amount.toLocaleString()}` : '-'}
                </div>
            )
        },
        {
            id: 'status',
            header: 'Status',
            width: '10%',
            cell: (subscription) => {
                let variant: 'success' | 'warning' | 'danger' | 'neutral' = 'neutral';
                if (subscription.status === 'Active') variant = 'success';
                else if (subscription.status === 'Paused') variant = 'warning';
                else if (subscription.status === 'Cancelled' || subscription.status === 'Expired') variant = 'danger';

                return <ModuleBadge variant={variant}>{subscription.status}</ModuleBadge>;
            }
        },
        {
            id: 'actions',
            header: '',
            align: 'right',
            width: '60px',
            cell: (subscription) => (
                <ModuleRowActions
                    actions={[
                        { label: 'Edit', icon: <Edit size={14} />, onClick: () => handleOpenModal(subscription) },
                        { label: 'Delete', icon: <Trash2 size={14} />, onClick: () => setDeleteId(subscription._id), danger: true, divider: true }
                    ]}
                />
            )
        }
    ];

    return (
        <ModulePageShell>
            <ModulePageHeader
                eyebrow="Commercial · Subscriptions"
                title="Subscriptions"
                description="Track recurring services, renewal windows, and ownership in one tighter commercial workspace."
                actions={
                    <button className="mod-btn mod-btn--primary" onClick={() => handleOpenModal()}>
                        <Plus size={14} /> Add Subscription
                    </button>
                }
            />

            <ModuleSummaryCards cards={summaryCards} />

            <ModuleToolbar
                searchValue={search}
                searchPlaceholder="Search subscriptions, vendors..."
                onSearchChange={setSearch}
                activeFilters={activeFilters}
                onClearAllFilters={handleClearFilters}
                totalCount={pagination.total}
                countLabel="subscriptions"
                filterContent={
                    <>
                        <div>
                            <label className="mod-filter-panel__field-label">Type</label>
                            <select className="mod-toolbar__select" style={{ width: '100%' }} value={type} onChange={(e) => setType(e.target.value)}>
                                <option value="">All types</option>
                                {TYPE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="mod-filter-panel__field-label">Company</label>
                            <select className="mod-toolbar__select" style={{ width: '100%' }} value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
                                <option value="">All companies</option>
                                {companies.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                            </select>
                        </div>
                        {canViewTeam && (
                            <div>
                                <label className="mod-filter-panel__field-label">Owner</label>
                                <select className="mod-toolbar__select" style={{ width: '100%' }} value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
                                    <option value="">All owners</option>
                                    {users.map((u: { _id: string; firstName: string; lastName: string }) => <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>)}
                                </select>
                            </div>
                        )}
                    </>
                }
            >
                <select className="mod-toolbar__select" value={quickWindow} onChange={(e) => setQuickWindow(e.target.value)}>
                    {QUICK_WINDOWS.map((o) => <option key={o.label} value={o.value}>{o.label}</option>)}
                </select>
                <select className="mod-toolbar__select" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="">All statuses</option>
                    {STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
            </ModuleToolbar>

            {error && (
                <div style={{
                    padding: '12px 16px', background: 'var(--mod-danger-light)', border: '1px solid #fecaca',
                    borderRadius: 'var(--mod-radius-lg)', color: 'var(--mod-danger-text)', fontSize: 13, fontWeight: 600, marginBottom: 16
                }}>
                    {error}
                </div>
            )}

            <ModuleDataTable
                rows={subscriptions}
                columns={columns}
                rowKey={(sub) => sub._id}
                loading={loading}
                error={null}
                tableTitle="Service Ledger"
                emptyTitle="No subscriptions found"
                emptyDescription="Add your first recurring service to track renewals and costs."
                emptyAction={
                    <button className="mod-btn mod-btn--primary" onClick={() => handleOpenModal()}>
                        <Plus size={14} /> Add Subscription
                    </button>
                }
                page={currentPage}
                totalPages={pagination.totalPages}
                totalItems={pagination.total}
                onPageChange={setCurrentPage}
            />

            <ConfirmDialog
                open={!!deleteId}
                title="Delete subscription"
                message="Are you sure you want to delete this subscription? This action cannot be undone."
                confirmLabel="Delete subscription"
                onConfirm={confirmDelete}
                onCancel={() => setDeleteId(null)}
            />

            {modalOpen && (
                <Modal
                    title={editingId ? 'Edit Subscription' : 'Add Subscription'}
                    onClose={() => setModalOpen(false)}
                    footer={(
                        <div className="flex justify-end gap-2">
                            <button className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave}>{editingId ? 'Update Subscription' : 'Create Subscription'}</button>
                        </div>
                    )}
                >
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4 text-sm text-slate-600">
                            Track recurring services with renewal context, internal ownership, and reminder timing in one CRM-friendly form.
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <FormLabel>Name</FormLabel>
                                <TextInput value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} />
                            </div>
                            <div>
                                <FormLabel>Vendor</FormLabel>
                                <TextInput value={formData.vendorName} onChange={(e) => setFormData((prev) => ({ ...prev, vendorName: e.target.value }))} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <FormLabel>Type</FormLabel>
                                <SelectInput value={formData.type} onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))}>
                                    {TYPE_OPTIONS.map((option) => (
                                        <option key={option} value={option}>{option}</option>
                                    ))}
                                </SelectInput>
                            </div>
                            <div>
                                <FormLabel>Billing Cycle</FormLabel>
                                <SelectInput value={formData.billingCycle} onChange={(e) => setFormData((prev) => ({ ...prev, billingCycle: e.target.value }))}>
                                    {BILLING_OPTIONS.map((option) => (
                                        <option key={option} value={option}>{option}</option>
                                    ))}
                                </SelectInput>
                            </div>
                        </div>
                        <div>
                            <FormLabel>Company</FormLabel>
                            <SelectInput value={formData.companyId} onChange={(e) => setFormData((prev) => ({ ...prev, companyId: e.target.value }))}>
                                <option value="">Select Company</option>
                                {companies.map((company: { _id: string; name: string }) => (
                                    <option key={company._id} value={company._id}>{company.name}</option>
                                ))}
                            </SelectInput>
                        </div>
                        <div>
                            <FormLabel>Owner</FormLabel>
                            <SelectInput value={formData.internalOwnerId} onChange={(e) => setFormData((prev) => ({ ...prev, internalOwnerId: e.target.value }))}>
                                <option value="">Select Owner</option>
                                {users.map((owner: { _id: string; firstName: string; lastName: string }) => (
                                    <option key={owner._id} value={owner._id}>
                                        {owner.firstName} {owner.lastName}
                                    </option>
                                ))}
                            </SelectInput>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <FormLabel>Start Date</FormLabel>
                                <TextInput type="date" value={formData.startDate} onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))} />
                            </div>
                            <div>
                                <FormLabel>Renew Date</FormLabel>
                                <TextInput type="date" value={formData.renewDate} onChange={(e) => setFormData((prev) => ({ ...prev, renewDate: e.target.value }))} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <FormLabel>Amount</FormLabel>
                                <TextInput value={formData.amount} onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))} />
                            </div>
                            <div>
                                <FormLabel>Currency</FormLabel>
                                <TextInput value={formData.currency} onChange={(e) => setFormData((prev) => ({ ...prev, currency: e.target.value }))} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <FormLabel>Status</FormLabel>
                                <SelectInput value={formData.status} onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}>
                                    {STATUS_OPTIONS.map((option) => (
                                        <option key={option} value={option}>{option}</option>
                                    ))}
                                </SelectInput>
                            </div>
                            <div>
                                <FormLabel>Notify Before Days</FormLabel>
                                <TextInput
                                    value={formData.notifyBeforeDays}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, notifyBeforeDays: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div>
                            <FormLabel>Notes</FormLabel>
                            <TextareaInput value={formData.notes} onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))} rows={3} />
                        </div>
                    </div>
                </Modal>
            )}
        </ModulePageShell>
    );
};

export default SubscriptionsPage;



