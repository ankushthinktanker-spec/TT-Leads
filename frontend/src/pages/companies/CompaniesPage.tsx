import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Building2,
    Edit,
    Eye,
    Globe2,
    Trash2,
    Plus,
    LayoutGrid,
    Inbox
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { deleteCompany, fetchCompanies } from '../../store/slices/companySlice';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { ROUTES } from '../../routes';
import { showToast } from '../../utils/toast';
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
} from '../../components/module-system';

const CompaniesPage = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { companies, loading, pagination, error } = useAppSelector((state) => state.companies);

    const [search, setSearch] = useState('');
    const [industry, setIndustry] = useState('');
    const [companySize, setCompanySize] = useState('');
    const [status, setStatus] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    useEffect(() => {
        dispatch(fetchCompanies({
            page: currentPage,
            limit: 20,
            search,
            industry,
            companySize,
            status
        }));
    }, [dispatch, currentPage, search, industry, companySize, status]);

    const activeFilters: ActiveFilter[] = [
        ...(search.trim() ? [{ key: 'search', label: `Search: "${search.trim()}"`, onRemove: () => setSearch('') }] : []),
        ...(industry ? [{ key: 'industry', label: `Industry: ${industry}`, onRemove: () => setIndustry('') }] : []),
        ...(companySize ? [{ key: 'companySize', label: `Size: ${companySize}`, onRemove: () => setCompanySize('') }] : []),
        ...(status ? [{ key: 'status', label: `Status: ${status}`, onRemove: () => setStatus('') }] : []),
    ];

    const clearFilters = () => {
        setSearch('');
        setIndustry('');
        setCompanySize('');
        setStatus('');
        setCurrentPage(1);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        await dispatch(deleteCompany(deleteId));
        setDeleteId(null);
        dispatch(fetchCompanies({ page: currentPage, limit: 20, search, industry, companySize, status }));
        showToast('Company deleted successfully.', 'success');
    };

    const activeCompanies = companies.filter((company) => company.status === 'Active').length;
    const companiesWithWebsite = companies.filter((company) => company.website).length;
    const industryMix = useMemo(() => new Set(companies.map((company) => company.industry).filter(Boolean)).size, [companies]);

    const summaryCards: SummaryCardItem[] = [
        { label: 'Total Companies', value: pagination.total, icon: <Building2 size={18} />, variant: 'primary' },
        { label: 'Active', value: activeCompanies, icon: <Building2 size={18} />, variant: 'success' },
        { label: 'Websites Tracked', value: companiesWithWebsite, icon: <Globe2 size={18} />, variant: 'info' },
        { label: 'Industries', value: industryMix, icon: <LayoutGrid size={18} />, variant: 'purple' },
    ];

    const columns: ModuleColumnDef<(typeof companies)[number]>[] = [
        {
            id: 'company',
            header: 'Company',
            width: '32%',
            cell: (company) => (
                <button
                    type="button"
                    className="mod-table__lead-cell"
                    onClick={() => navigate(`${ROUTES.companies}/${company._id}`)}
                >
                    <div className="mod-table__avatar mod-table__avatar--blue">
                        <Building2 size={16} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <div className="mod-table__primary-text">
                            {company.name}
                        </div>
                        <div className="mod-table__secondary-text">
                            {company.website || 'No website'}
                        </div>
                    </div>
                </button>
            )
        },
        {
            id: 'industry',
            header: 'Industry',
            width: '16%',
            cell: (company) => (
                <div className="mod-table__primary-text" style={{ fontSize: 13 }}>
                    {company.industry || '-'}
                </div>
            )
        },
        {
            id: 'size',
            header: 'Size',
            width: '12%',
            cell: (company) => (
                <div className="mod-table__primary-text" style={{ fontSize: 13 }}>
                    {company.companySize || '-'}
                </div>
            )
        },
        {
            id: 'contact',
            header: 'Contact',
            width: '24%',
            cell: (company) => (
                <div>
                    <div className="mod-table__primary-text" style={{ fontSize: 13 }}>{company.email || '-'}</div>
                    <div className="mod-table__secondary-text">{company.phone || '-'}</div>
                </div>
            )
        },
        {
            id: 'status',
            header: 'Status',
            width: '10%',
            cell: (company) => (
                <ModuleBadge variant={company.status === 'Active' ? 'success' : 'neutral'}>
                    {company.status}
                </ModuleBadge>
            )
        },
        {
            id: 'actions',
            header: '',
            align: 'right',
            width: '80px',
            cell: (company) => (
                <ModuleRowActions
                    actions={[
                        {
                            label: 'View company',
                            icon: <Eye size={14} />,
                            onClick: () => navigate(`${ROUTES.companies}/${company._id}`)
                        },
                        {
                            label: 'Edit company',
                            icon: <Edit size={14} />,
                            onClick: () => navigate(`${ROUTES.companies}/${company._id}/edit`)
                        },
                        {
                            label: 'Website',
                            icon: <Globe2 size={14} />,
                            onClick: () => {
                                if (company.website) {
                                    window.open(company.website.startsWith('http') ? company.website : `https://${company.website}`, '_blank');
                                } else {
                                    showToast('No website available for this company.', 'info');
                                }
                            }
                        },
                        {
                            label: 'Delete',
                            icon: <Trash2 size={14} />,
                            onClick: () => setDeleteId(company._id),
                            danger: true,
                            divider: true
                        }
                    ]}
                />
            )
        }
    ];

    return (
        <ModulePageShell>
            <ModulePageHeader
                eyebrow="CRM · Companies"
                title="Companies"
                description="Organize account records, industry coverage, and account health in one structured revenue workspace."
                actions={
                    <button
                        className="mod-btn mod-btn--primary"
                        onClick={() => navigate(`${ROUTES.companies}/new`)}
                    >
                        <Plus size={14} /> Add Company
                    </button>
                }
            />

            <ModuleSummaryCards cards={summaryCards} />

            <ModuleToolbar
                searchValue={search}
                searchPlaceholder="Search companies, websites, contacts..."
                onSearchChange={setSearch}
                activeFilters={activeFilters}
                onClearAllFilters={clearFilters}
                totalCount={pagination.total}
                countLabel="companies"
                filterContent={
                    <>
                        <div>
                            <label className="mod-filter-panel__field-label">Industry</label>
                            <select
                                className="mod-toolbar__select"
                                style={{ width: '100%' }}
                                value={industry}
                                onChange={(e) => setIndustry(e.target.value)}
                            >
                                <option value="">All industries</option>
                                <option value="Technology">Technology</option>
                                <option value="Healthcare">Healthcare</option>
                                <option value="Finance">Finance</option>
                                <option value="Manufacturing">Manufacturing</option>
                                <option value="Retail">Retail</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="mod-filter-panel__field-label">Company Size</label>
                            <select
                                className="mod-toolbar__select"
                                style={{ width: '100%' }}
                                value={companySize}
                                onChange={(e) => setCompanySize(e.target.value)}
                            >
                                <option value="">All sizes</option>
                                <option value="1-10">1-10</option>
                                <option value="11-50">11-50</option>
                                <option value="51-200">51-200</option>
                                <option value="201-500">201-500</option>
                                <option value="500+">500+</option>
                            </select>
                        </div>
                        <div>
                            <label className="mod-filter-panel__field-label">Status</label>
                            <select
                                className="mod-toolbar__select"
                                style={{ width: '100%' }}
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                            >
                                <option value="">All statuses</option>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>
                    </>
                }
            >
                <select
                    className="mod-toolbar__select"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                >
                    <option value="">All industries</option>
                    <option value="Technology">Technology</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Finance">Finance</option>
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="Retail">Retail</option>
                    <option value="Other">Other</option>
                </select>

                <select
                    className="mod-toolbar__select"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                >
                    <option value="">All statuses</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                </select>
            </ModuleToolbar>

            {error && (
                <div style={{
                    padding: '12px 16px',
                    background: 'var(--mod-danger-light)',
                    border: '1px solid #fecaca',
                    borderRadius: 'var(--mod-radius-lg)',
                    color: 'var(--mod-danger-text)',
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 16
                }}>
                    {error}
                </div>
            )}

            <ModuleDataTable
                rows={companies}
                columns={columns}
                rowKey={(company) => company._id}
                loading={loading}
                error={null}
                tableTitle="Account Registry"
                tableBadge={`${companies.length} visible`}
                emptyTitle="No companies yet"
                emptyDescription="Create your first company to start building the account registry."
                emptyIcon={<Inbox size={28} />}
                emptyAction={
                    <button
                        className="mod-btn mod-btn--primary"
                        onClick={() => navigate(`${ROUTES.companies}/new`)}
                    >
                        <Plus size={14} /> Add Company
                    </button>
                }
                page={currentPage}
                totalPages={pagination.pages}
                totalItems={pagination.total}
                onPageChange={setCurrentPage}
                onRowClick={(company) => navigate(`${ROUTES.companies}/${company._id}`)}
            />

            <ConfirmDialog
                open={!!deleteId}
                title="Delete company"
                message="Are you sure you want to delete this company? This action cannot be undone."
                confirmLabel="Delete company"
                onConfirm={confirmDelete}
                onCancel={() => setDeleteId(null)}
            />
        </ModulePageShell>
    );
};

export default CompaniesPage;
