import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchUsers, deleteUser, User } from '../../store/slices/userSlice';
import UserFormModal from './UserFormModal';
import { Edit, Trash2, Shield, Users } from 'lucide-react';
import InlineError from '../../components/ui/InlineError';
import Badge from '../../components/ui/Badge';
import api from '../../api/axios';
import { useGlobalSearch } from '../../context/GlobalSearchContext';
import ListPageShell from '../../components/crm/ListPageShell';
import DataTable, { ColumnDef } from '../../components/crm/DataTable';

export const UsersPage = () => {
    const dispatch = useAppDispatch();
    const { users, loading, error, pagination } = useAppSelector((state) => state.users);
    const { user: currentUser } = useAppSelector((state) => state.auth);
    const safePagination = pagination ?? { page: 1, limit: 10, total: 0, pages: 0 };

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const { value: searchQuery, setValue: setSearchQuery } = useGlobalSearch();
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
            } catch {
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

    const runFetch = (nextPage = 1) => {
        dispatch(fetchUsers({
            page: nextPage,
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
        runFetch(safePagination.page);
    };

    const handleClearFilters = () => {
        setSearchQuery('');
        setRoleFilter('');
        dispatch(fetchUsers({ page: 1, limit: 10 }));
    };

    const getRoleBadgeVariant = (role: string): 'neutral' | 'success' | 'warning' | 'danger' => {
        switch (role) {
            case 'Admin': return 'danger';
            case 'Manager': return 'warning';
            case 'BDM': return 'success';
            default: return 'neutral';
        }
    };

    const columns: ColumnDef<User>[] = [
        {
            id: 'user',
            header: 'User',
            className: 'w-[34%]',
            cell: (user) => (
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-black text-slate-900 shadow-[0_4px_12px_rgba(15,23,42,0.03)]">
                        {user.firstName ? user.firstName[0] : 'U'}{user.lastName ? user.lastName[0] : ''}
                    </div>
                    <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-950">
                            {user.firstName || 'Unknown'} {user.lastName || ''}
                        </div>
                        <div className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                            {user.email}
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'role',
            header: 'Role',
            className: 'w-[14%]',
            cell: (user) => (
                <Badge
                    variant={getRoleBadgeVariant(user.role)}
                    className="px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] shadow-none"
                >
                    {user.role}
                </Badge>
            )
        },
        {
            id: 'status',
            header: 'Status',
            className: 'w-[12%]',
            cell: (user) => (
                <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${user.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span className="text-xs font-semibold uppercase tracking-tight text-slate-700">{user.status}</span>
                </div>
            )
        },
        {
            id: 'contact',
            header: 'Contact',
            className: 'w-[18%]',
            cell: (user) => <span className="text-sm font-medium text-slate-600">{user.phone || '-'}</span>
        },
        {
            id: 'created',
            header: 'Created',
            className: 'w-[14%]',
            cell: (user) => (
                <span className="text-sm font-medium text-slate-600">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '-'}
                </span>
            )
        },
        {
            id: 'actions',
            header: 'Actions',
            align: 'right',
            cell: (user) => (
                <div className="flex items-center justify-end gap-2">
                    <button
                        onClick={() => handleEdit(user)}
                        className="icon-button"
                        title="Edit"
                    >
                        <Edit size={15} />
                    </button>
                    {currentUser?.id !== user._id && (
                        <button
                            onClick={() => handleDelete(user._id)}
                            className="icon-button text-rose-500 hover:text-rose-600"
                            title="Delete"
                        >
                            <Trash2 size={15} />
                        </button>
                    )}
                </div>
            )
        }
    ];

    return (
        <>
            {error && (
                <InlineError
                    message={error}
                    onRetry={() => runFetch(safePagination.page)}
                />
            )}

            <ListPageShell
                title="Users"
                subtitle="Manage team access, role assignment, and account activity from one tighter permission workspace."
                searchValue={searchQuery}
                searchPlaceholder="Search users..."
                onSearchChange={setSearchQuery}
                onAdd={() => setIsModalOpen(true)}
                addLabel="Add User"
                actions={(
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                        {safePagination.total || users.length} users
                    </span>
                )}
            >
                <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Active users</div>
                        <div className="mt-2 text-xl font-extrabold tracking-tight text-slate-950">
                            {users.filter((user) => user.status === 'Active').length}
                        </div>
                    </div>
                    <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Admin accounts</div>
                        <div className="mt-2 flex items-center gap-1.5 text-xl font-extrabold tracking-tight text-slate-950">
                            <Shield size={15} className="text-amber-600" />
                            {users.filter((user) => user.role === 'Admin').length}
                        </div>
                    </div>
                    <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Visible results</div>
                        <div className="mt-2 flex items-center gap-1.5 text-xl font-extrabold tracking-tight text-slate-950">
                            <Users size={15} className="text-[#335CFF]" />
                            {users.length}
                        </div>
                    </div>
                </div>

                <div className="rounded-[20px] border border-slate-200 bg-white px-4 py-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                    <div className="flex flex-wrap items-center gap-2">
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="ds-select min-w-[160px]"
                        >
                            <option value="">All roles</option>
                            {roles.map((role) => (
                                <option key={role._id} value={role.name}>{role.name}</option>
                            ))}
                        </select>

                        <button
                            type="button"
                            onClick={() => runFetch(1)}
                            className="btn btn-secondary h-10 px-4"
                        >
                            Search
                        </button>

                        <span className="ml-auto rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                            {users.length} visible
                        </span>

                        {(searchQuery || roleFilter) && (
                            <button
                                type="button"
                                onClick={handleClearFilters}
                                className="text-[11px] font-semibold text-slate-500 transition-colors hover:text-[#335CFF]"
                            >
                                Reset
                            </button>
                        )}
                    </div>
                </div>

                <DataTable
                    rows={users}
                    columns={columns}
                    rowKey={(user) => user._id}
                    loading={loading}
                    error={null}
                    emptyMessage="Add the first team member to start managing CRM access and role assignments."
                    page={safePagination.page}
                    totalPages={safePagination.pages}
                    totalItems={safePagination.total || users.length}
                    onPageChange={(nextPage) => dispatch(fetchUsers({ page: nextPage, limit: 10, search: searchQuery, role: roleFilter }))}
                />
            </ListPageShell>

            <UserFormModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                user={selectedUser}
                onSuccess={handleSuccess}
            />
        </>
    );
};

export default UsersPage;
