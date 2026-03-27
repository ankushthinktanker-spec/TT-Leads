import { Link } from 'react-router-dom';
import { ROUTES } from '../../routes';

const ForgotPasswordPage = () => {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-8 space-y-4">
                <h1 className="text-2xl font-bold text-slate-900">Forgot Password</h1>
                <p className="text-sm text-slate-600">
                    Please contact your administrator to reset your password.
                </p>
                <Link to={ROUTES.login} className="inline-flex text-sm font-semibold text-primary-500 hover:text-primary-400">
                    Back to login
                </Link>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
