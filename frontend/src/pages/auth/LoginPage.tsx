import { FormEvent, useState } from 'react';
import { Eye, EyeOff, KeyRound, LogIn, ServerCrash } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell from '../../components/auth/AuthShell';
import InlineAlert from '../../components/ui/InlineAlert';
import Button from '../../components/ui/Button';
import { ROUTES } from '../../routes';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { clearError, login } from '../../store/slices/authSlice';

export const LoginPage = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { loading, error } = useAppSelector((state) => state.auth);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [rememberMe, setRememberMe] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const isServerError = Boolean(error && /workspace server|try again/i.test(error));

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        dispatch(clearError());
        setFormError(null);

        if (!formData.email.trim() || !formData.password.trim()) {
            setFormError('Please enter both email and password.');
            return;
        }

        const result = await dispatch(login({ ...formData, remember: rememberMe }));
        if (login.fulfilled.match(result)) {
            navigate(ROUTES.dashboard);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
        setFormError(null);
    };

    return (
        <AuthShell
            eyebrow="Workspace Access"
            title="Welcome back"
            description="Use your assigned workspace credentials to access pipeline, account, proposal, and renewal operations."
            footer={(
                <p className="text-center text-sm font-medium text-slate-500">
                    Need access?{' '}
                    <Link
                        to={ROUTES.contactAdmin}
                        className="font-semibold text-brand-600 transition-colors hover:text-brand-700"
                    >
                        Contact your operations team
                    </Link>
                </p>
            )}
        >
            {(formError || error) && (
                <div className="tt-animate-fade-up mb-6" style={{ animationDelay: '280ms' }}>
                    <InlineAlert
                        tone={isServerError ? 'danger' : 'warning'}
                        title={isServerError ? 'Workspace server unavailable' : 'Access check required'}
                    >
                        <div className="space-y-2">
                            <div>{formError || error}</div>
                            {isServerError ? (
                                <div className="flex items-start gap-2 text-xs font-medium text-slate-600">
                                    <ServerCrash size={14} className="mt-0.5 shrink-0" />
                                    <span>Confirm the backend server is running and the local Vite proxy can reach `http://127.0.0.1:5000`.</span>
                                </div>
                            ) : (
                                <div className="flex items-start gap-2 text-xs font-medium text-slate-600">
                                    <KeyRound size={14} className="mt-0.5 shrink-0" />
                                    <span>If you are using the local bootstrap account, reset or create the admin user from the backend before retrying.</span>
                                </div>
                            )}
                        </div>
                    </InlineAlert>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5 tt-animate-fade-up" style={{ animationDelay: '320ms' }}>
                <div className="space-y-2 tt-animate-fade-up" style={{ animationDelay: '360ms' }}>
                    <label htmlFor="email" className="form-label">Work Email</label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        className="input h-12 rounded-2xl"
                        placeholder="name@company.com"
                        value={formData.email}
                        onChange={handleChange}
                    />
                </div>

                <div className="space-y-2 tt-animate-fade-up" style={{ animationDelay: '420ms' }}>
                    <div className="flex items-center justify-between gap-3">
                        <label htmlFor="password" className="form-label mb-0">Password</label>
                        <Link
                            to={ROUTES.forgotPassword}
                            className="text-[12px] font-semibold text-brand-600 transition-colors hover:text-brand-700"
                        >
                            Forgot password?
                        </Link>
                    </div>
                    <div className="relative">
                        <input
                            id="password"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            required
                            className="input h-12 rounded-2xl pr-12"
                            placeholder="Enter your password"
                            value={formData.password}
                            onChange={handleChange}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-400 transition-colors hover:bg-brand-50 hover:text-brand-600"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                <label
                    className="tt-animate-fade-up flex items-center gap-3 rounded-2xl border border-brand-100 bg-brand-50/50 px-4 py-3 text-sm font-medium text-slate-600"
                    style={{ animationDelay: '500ms' }}
                >
                    <input
                        id="remember"
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500/20"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    Remember this device for 30 days
                </label>

                <Button
                    type="submit"
                    disabled={loading}
                    size="lg"
                    className="tt-animate-fade-up w-full rounded-2xl"
                    style={{ animationDelay: '560ms' }}
                >
                    {loading ? 'Verifying access...' : (
                        <>
                            <LogIn size={16} />
                            Sign In
                        </>
                    )}
                </Button>
            </form>
        </AuthShell>
    );
};

export default LoginPage;
