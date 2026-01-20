import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchCompanies, deleteCompany } from '../../store/slices/companySlice';
import MainLayout from '../../components/layout/MainLayout';
import { Search, Plus, Building2, Edit, Trash2, Eye } from 'lucide-react';
import PageLayout from '../../components/ui/PageLayout';
import PageHeader from '../../components/ui/PageHeader';
import FilterBar from '../../components/ui/FilterBar';
import SurfaceCard from '../../components/ui/SurfaceCard';
import EmptyState from '../../components/ui/EmptyState';
import { Table, TableHead, TableRow, TableHeadCell, TableBody, TableCell } from '../../components/ui/Table';

const CompaniesPage = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { companies, loading, pagination } = useAppSelector((state) => state.companies);

    const [search, setSearch] = useState('');
    const [industry, setIndustry] = useState('');
    const [companySize, setCompanySize] = useState('');
    const [status, setStatus] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        dispatch(fetchCompanies({
            page: currentPage,
            limit: 10,
            search,
            industry,
            companySize,
            status
        }));
    }, [dispatch, currentPage, search, industry, companySize, status]);

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this company?')) {
            await dispatch(deleteCompany(id));
            dispatch(fetchCompanies({ page: currentPage }));
        }
    };

    const activeFilters = useMemo(() => {
        const filters: string[] = [];
        if (search.trim()) filters.push(`Search: ${search.trim()}`);
        if (industry) filters.push(`Industry: ${industry}`);
        if (companySize) filters.push(`Size: ${companySize}`);
        if (status) filters.push(`Status: ${status}`);
        return filters;
    }, [search, industry, companySize, status]);

    const hasActiveFilters = activeFilters.length > 0;

    const handleClearFilters = () => {
        setSearch('');
        setIndustry('');
        setCompanySize('');
        setStatus('');
    };

    return (
        <MainLayout>
            <PageLayout>
                <PageHeader
                    title="Companies"
                    subtitle="Manage your company database"
                    actions={(
                        <button
                            onClick={() => navigate('/companies/new')}
                            className="btn btn-primary"
                        >
                            <Plus size={20} />
                            Add Company
                        </button>
                    )}
                />

                <FilterBar className="mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-500" size={20} />
                            <input
                                type="text"
                                placeholder="Search companies..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="input pl-10"
                            />
                        </div>

                        <select
                            value={industry}
                            onChange={(e) => setIndustry(e.target.value)}
                            className="input"
                        >
                            <option value="">All Industries</option>
                            <option value="Technology">Technology</option>
                            <option value="Healthcare">Healthcare</option>
                            <option value="Finance">Finance</option>
                            <option value="Manufacturing">Manufacturing</option>
                            <option value="Retail">Retail</option>
                            <option value="Other">Other</option>
                        </select>

                        <select
                            value={companySize}
                            onChange={(e) => setCompanySize(e.target.value)}
                            className="input"
                        >
                            <option value="">All Sizes</option>
                            <option value="1-10">1-10</option>
                            <option value="11-50">11-50</option>
                            <option value="51-200">51-200</option>
                            <option value="201-500">201-500</option>
                            <option value="500+">500+</option>
                        </select>

                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="input"
                        >
                            <option value="">All Status</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </div>
                </FilterBar>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    {activeFilters.map((filter) => (
                        <span key={filter} className="filter-chip">
                            {filter}
                        </span>
                    ))}
                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={handleClearFilters}
                            className="ml-auto text-xs text-primary-400 font-semibold uppercase tracking-widest hover:text-primary-300"
                        >
                            Clear filters
                        </button>
                    )}
                </div>

                <SurfaceCard className="mt-6 overflow-hidden">
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500"></div>
                        </div>
                    ) : companies.length === 0 ? (
                        <EmptyState
                            icon={<Building2 size={48} />}
                            title="No companies found"
                            description="Create your first company to get started."
                            action={(
                                <button
                                    onClick={() => navigate('/companies/new')}
                                    className="btn btn-outline"
                                >
                                    Create company
                                </button>
                            )}
                        />
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableHeadCell>Company</TableHeadCell>
                                            <TableHeadCell>Industry</TableHeadCell>
                                            <TableHeadCell>Size</TableHeadCell>
                                            <TableHeadCell>Contact</TableHeadCell>
                                            <TableHeadCell>Status</TableHeadCell>
                                            <TableHeadCell className="text-right">Actions</TableHeadCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {companies.map((company) => (
                                            <TableRow key={company._id} className="group">
                                                <TableCell>
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-brand-500/10 flex items-center justify-center">
                                                            <Building2 className="text-brand-400" size={20} />
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-secondary-100">{company.name}</div>
                                                            <div className="text-xs text-secondary-500">{company.website || 'No website'}</div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{company.industry || '-'}</TableCell>
                                                <TableCell>{company.companySize || '-'}</TableCell>
                                                <TableCell>
                                                    <div className="text-sm text-secondary-100">{company.email || '-'}</div>
                                                    <div className="text-xs text-secondary-500">{company.phone || '-'}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className={`status-pill ${company.status === 'Active' ? 'status-success' : 'status-neutral'}`}>
                                                        {company.status}
                                                    </span>
                                                </TableCell>
                                            <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => navigate(`/companies/${company._id}`)}
                                                            className="icon-button"
                                                            title="View"
                                                        >
                                                            <Eye size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => navigate(`/companies/${company._id}/edit`)}
                                                            className="icon-button"
                                                            title="Edit"
                                                        >
                                                            <Edit size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(company._id)}
                                                            className="icon-button text-red-400 hover:text-red-300"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            {pagination.pages > 1 && (
                                <div className="px-4 py-3 flex items-center justify-between border-t border-white/5">
                                    <div className="flex-1 flex justify-between sm:hidden">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            className="btn btn-outline py-1.5 px-3 text-xs"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.pages))}
                                            disabled={currentPage === pagination.pages}
                                            className="btn btn-outline py-1.5 px-3 text-xs"
                                        >
                                            Next
                                        </button>
                                    </div>
                                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm text-secondary-400">
                                                Showing <span className="font-medium text-secondary-100">{(currentPage - 1) * pagination.limit + 1}</span> to{' '}
                                                <span className="font-medium text-secondary-100">{Math.min(currentPage * pagination.limit, pagination.total)}</span> of{' '}
                                                <span className="font-medium text-secondary-100">{pagination.total}</span> results
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                disabled={currentPage === 1}
                                                className="btn btn-outline py-1.5 px-3 text-xs"
                                            >
                                                Previous
                                            </button>
                                            <span className="px-3 py-1.5 text-xs rounded-lg border border-white/5 text-secondary-300">
                                                Page {currentPage} of {pagination.pages}
                                            </span>
                                            <button
                                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.pages))}
                                                disabled={currentPage === pagination.pages}
                                                className="btn btn-outline py-1.5 px-3 text-xs"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </SurfaceCard>
            </PageLayout>
        </MainLayout>
    );
};

export default CompaniesPage;
