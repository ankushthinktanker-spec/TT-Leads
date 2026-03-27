import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ROUTES } from '../../routes';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { login, clearError } from '../../store/slices/authSlice';

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
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute top-0 -left-20 w-96 h-96 bg-primary-500/10 rounded-full blur-[120px] animate-float"></div>
            <div className="absolute bottom-0 -right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] animate-float" style={{ animationDelay: '2s' }}></div>

            <div className="w-full max-w-[440px] relative z-10">
                <div className="text-center mb-10 group cursor-default">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl mb-6 shadow-2xl shadow-primary-500/20 group-hover:rotate-6 transition-transform duration-500">
                        <svg
                            className="w-9 h-9 text-slate-950"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.5}
                                d="M13 10V3L4 14h7v7l9-11h-7z"
                            />
                        </svg>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">
                        THINK<span className="text-primary-500">TANKER</span>
                    </h1>
                    <p className="text-slate-500 font-semibold uppercase tracking-[0.2em] text-[10px]">Intelligence OS v1.0</p>
                </div>

                <div className="glass-card p-8 sm:p-10 border-white/10 shadow-2xl">
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h2>
                        <p className="text-sm text-slate-500 font-medium">Sign in to continue.</p>
                    </div>

                    {(formError || error) && (
                        <div className="alert-error mb-6">
                            {formError || error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-xs font-semibold uppercase tracking-widest text-slate-500 ml-1">
                                Email
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                className="input py-3.5"
                                placeholder="name@company.com"
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center ml-1">
                                <label htmlFor="password" className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                                    Password
                                </label>
                                <Link
                                    to={ROUTES.forgotPassword}
                                    className="text-[10px] text-primary-500 hover:text-primary-400 font-semibold uppercase tracking-widest"
                                >
                                    Forgot password
                                </Link>
                            </div>
                            <div className="relative">
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    className="input py-3.5 pr-12"
                                    placeholder="Enter your password"
                                    value={formData.password}
                                    onChange={handleChange}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-widest text-slate-500 hover:text-primary-400 font-bold"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? 'Hide' : 'Show'}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 ml-1">
                            <input
                                type="checkbox"
                                className="w-4 h-4 rounded border-slate-300 bg-white text-primary-500 focus:ring-primary-500/30"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                            />
                            <span className="text-xs text-slate-600 font-medium">Remember this device</span>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn btn-primary py-3.5 text-sm font-semibold tracking-wide group shadow-2xl shadow-primary-500/30"
                            aria-busy={loading}
                        >
                            {loading ? (
                                <span className="flex items-center gap-3">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                    </svg>
                                    Validating...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    Sign in <span className="group-hover:translate-x-1 transition-transform">-&gt;</span>
                                </span>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-slate-200 text-center">
                        <p className="text-xs text-slate-500 font-medium">
                            First time here?{' '}
                            <Link
                                to={ROUTES.contactAdmin}
                                className="text-primary-500 hover:text-primary-400 font-bold underline decoration-primary-500/30 underline-offset-4"
                            >
                                Contact Ops
                            </Link>
                        </p>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.3em]">
                        (c) 2025 ThinkTanker // Advanced Analytics System
                    </p>
                </div>
            </div>
        </div>
    );
};


