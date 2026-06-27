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
import { useGlobalSearch } from '../../context/GlobalSearchContext';
import { ROUTES } from '../../routes';
import { showToast } from '../../utils/toast';
import {
    ModulePageShell,
    ModulePageHeader,
    ModuleToolbar,
    ModuleFilterDropdown,
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
    const { items: companies, loading, pagination, error } = useAppSelector((state) => state.companies);
    const { value: search, setValue: setSearch } = useGlobalSearch();

    const [industry, setIndustry] = useState('');
    const [companySize, setCompanySize] = useState('');
    const [status, setStatus] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            dispatch(fetchCompanies({
                page: currentPage,
                limit: 20,
                search,
                industry,
                companySize,
                status
            }));
        }, 300);
        return () => clearTimeout(timer);
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
        try {
            await dispatch(deleteCompany(deleteId)).unwrap();
            setDeleteId(null);
            dispatch(fetchCompanies({ page: currentPage, limit: 20, search, industry, companySize, status }));
            showToast('Company deleted successfully.', 'success');
        } catch {
            showToast('Failed to delete company.', 'error');
        }
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

    const industryOptions = [
        { value: '', label: 'All industries' },
        { value: 'Technology', label: 'Technology' },
        { value: 'Healthcare', label: 'Healthcare' },
        { value: 'Finance', label: 'Finance' },
        { value: 'Manufacturing', label: 'Manufacturing' },
        { value: 'Retail', label: 'Retail' },
        { value: 'Other', label: 'Other' },
    ];

    const companySizeOptions = [
        { value: '', label: 'All sizes' },
        { value: '1-10', label: '1-10' },
        { value: '11-50', label: '11-50' },
        { value: '51-200', label: '51-200' },
        { value: '201-500', label: '201-500' },
        { value: '500+', label: '500+' },
    ];

    const statusOptions = [
        { value: '', label: 'All statuses' },
        { value: 'Active', label: 'Active' },
        { value: 'Inactive', label: 'Inactive' },
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
                eyebrow="CRM / Companies"
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
                            <ModuleFilterDropdown
                                ariaLabel="Filter companies by industry"
                                fullWidth
                                value={industry}
                                options={industryOptions}
                                onChange={setIndustry}
                            />
                        </div>
                        <div>
                            <label className="mod-filter-panel__field-label">Company Size</label>
                            <ModuleFilterDropdown
                                ariaLabel="Filter companies by size"
                                fullWidth
                                value={companySize}
                                options={companySizeOptions}
                                onChange={setCompanySize}
                            />
                        </div>
                        <div>
                            <label className="mod-filter-panel__field-label">Status</label>
                            <ModuleFilterDropdown
                                ariaLabel="Filter companies by status"
                                fullWidth
                                value={status}
                                options={statusOptions}
                                onChange={setStatus}
                            />
                        </div>
                    </>
                }
            >
                <ModuleFilterDropdown
                    ariaLabel="Quick industry filter"
                    value={industry}
                    options={industryOptions}
                    onChange={setIndustry}
                />

                <ModuleFilterDropdown
                    ariaLabel="Quick status filter"
                    value={status}
                    options={statusOptions}
                    onChange={setStatus}
                />
            </ModuleToolbar>

            <ModuleDataTable
                rows={companies}
                columns={columns}
                rowKey={(company) => company._id}
                loading={loading}
                error={error}
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
                totalPages={pagination.totalPages}
                totalItems={pagination.total}
                onPageChange={setCurrentPage}
                onRetry={() => dispatch(fetchCompanies({
                    page: currentPage,
                    limit: 20,
                    search,
                    industry,
                    companySize,
                    status
                }))}
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
