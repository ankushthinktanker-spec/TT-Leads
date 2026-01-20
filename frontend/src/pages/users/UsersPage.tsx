import { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchUsers, deleteUser, User } from '../../store/slices/userSlice';
import MainLayout from '../../components/layout/MainLayout';
import UserFormModal from './UserFormModal';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import PageLayout from '../../components/ui/PageLayout';
import PageHeader from '../../components/ui/PageHeader';
import FilterBar from '../../components/ui/FilterBar';
import SurfaceCard from '../../components/ui/SurfaceCard';
import EmptyState from '../../components/ui/EmptyState';
import { Table, TableHead, TableRow, TableHeadCell, TableBody, TableCell } from '../../components/ui/Table';
import api from '../../api/axios';

const UsersPage = () => {
    const dispatch = useAppDispatch();
    const { users, loading, pagination } = useAppSelector((state) => state.users);
    const { user: currentUser } = useAppSelector((state) => state.auth);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [roles, setRoles] = useState<Array<{ _id: string; name: string }>>([]);

    useEffect(() => {
        dispatch(fetchUsers({ page: 1, limit: 10 }));
    }, [dispatch]);

    useEffect(() => {
        const loadRoles = async () => {
            try {
                const response = await api.get('/roles');
                setRoles(response.data.data.roles || []);
            } catch (error) {
                setRoles([
                    { _id: 'admin', name: 'Admin' },
                    { _id: 'manager', name: 'Manager' },
                    { _id: 'bdm', name: 'BDM' },
                    { _id: 'marketing', name: 'Marketing' }
                ]);
            }
        };
        loadRoles();
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        dispatch(fetchUsers({
            page: 1,
            limit: 10,
            search: searchQuery,
            role: roleFilter
        }));
    };

    const handleEdit = (user: User) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    const handleDelete = async (userId: string) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            await dispatch(deleteUser(userId));
        }
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setSelectedUser(null);
    };

    const handleSuccess = () => {
        dispatch(fetchUsers({
            page: pagination.page,
            limit: pagination.limit,
            search: searchQuery,
            role: roleFilter
        }));
    };

    const activeFilters = useMemo(() => {
        const filters: string[] = [];
        if (searchQuery.trim()) filters.push(`Search: ${searchQuery.trim()}`);
        if (roleFilter) filters.push(`Role: ${roleFilter}`);
        return filters;
    }, [searchQuery, roleFilter]);

    const hasActiveFilters = activeFilters.length > 0;

    const handleClearFilters = () => {
        setSearchQuery('');
        setRoleFilter('');
        dispatch(fetchUsers({ page: 1, limit: 10 }));
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'Admin': return 'bg-brand-500/20 text-brand-200';
            case 'Manager': return 'bg-blue-500/15 text-blue-300';
            case 'BDM': return 'status-success';
            case 'Marketing': return 'status-warning';
            default: return 'status-neutral';
        }
    };

    return (
        <MainLayout>
            <PageLayout>
                <PageHeader
                    title="User Management"
                    subtitle="Manage system users, roles, and permissions"
                    actions={(
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="btn btn-primary"
                        >
                            <Plus size={20} />
                            Add User
                        </button>
                    )}
                />

                <FilterBar className="mt-6">
                    <form onSubmit={handleSearch} className="flex flex-col lg:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-500" size={20} />
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="input pl-10"
                            />
                        </div>
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="input lg:w-48"
                        >
                            <option value="">All Roles</option>
                            {roles.map((role) => (
                                <option key={role._id} value={role.name}>
                                    {role.name}
                                </option>
                            ))}
                        </select>
                        <button type="submit" className="btn btn-outline">
                            Filter
                        </button>
                    </form>
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
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableHeadCell>User</TableHeadCell>
                                    <TableHeadCell>Role</TableHeadCell>
                                    <TableHeadCell>Status</TableHeadCell>
                                    <TableHeadCell>Contact</TableHeadCell>
                                    <TableHeadCell>Joined</TableHeadCell>
                                    <TableHeadCell className="text-right">Actions</TableHeadCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center">
                                            <div className="flex justify-center py-6">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : !users || users.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6}>
                                            <EmptyState title="No users found" description="Try adjusting your filters or add a new user." />
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    users.map((user) => (
                                        <TableRow key={user._id} className="group">
                                            <TableCell>
                                                <div className="flex items-center">
                                                    <div className="h-10 w-10 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-300 font-semibold">
                                                        {user.firstName ? user.firstName[0] : 'U'}{user.lastName ? user.lastName[0] : ''}
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-secondary-100">
                                                            {user.firstName || 'Unknown'} {user.lastName || ''}
                                                        </div>
                                                        <div className="text-xs text-secondary-500">{user.email}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className={`status-pill ${getRoleBadgeColor(user.role)}`}>
                                                    {user.role}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className={`status-pill ${user.status === 'Active' ? 'status-success' : 'status-danger'}`}>
                                                    {user.status}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-secondary-400">{user.phone || '-'}</TableCell>
                                            <TableCell className="text-secondary-400">
                                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleEdit(user)}
                                                        className="icon-button"
                                                        title="Edit"
                                                    >
                                                        <Edit size={18} />
                                                    </button>
                                                    {currentUser?.id !== user._id && (
                                                        <button
                                                            onClick={() => handleDelete(user._id)}
                                                            className="icon-button text-red-400 hover:text-red-300"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {pagination && pagination.pages > 1 && (
                        <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
                            <div className="text-sm text-secondary-400">
                                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => dispatch(fetchUsers({ page: pagination.page - 1, limit: 10 }))}
                                    disabled={pagination.page === 1}
                                    className="btn btn-outline py-1.5 px-3 text-xs"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => dispatch(fetchUsers({ page: pagination.page + 1, limit: 10 }))}
                                    disabled={pagination.page === pagination.pages}
                                    className="btn btn-outline py-1.5 px-3 text-xs"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </SurfaceCard>
            </PageLayout>

            <UserFormModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                user={selectedUser}
                onSuccess={handleSuccess}
            />
        </MainLayout>
    );
};

export default UsersPage;
