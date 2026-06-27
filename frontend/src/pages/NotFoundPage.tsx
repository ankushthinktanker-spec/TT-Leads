import { Link } from 'react-router-dom';

const NotFoundPage = () => (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
        <h1 className="text-6xl font-bold text-slate-300">404</h1>
        <p className="mt-4 text-lg text-slate-600">Page not found</p>
        <p className="mt-1 text-sm text-slate-400">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
        <Link
            to="/"
            className="mt-6 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
            Back to Dashboard
        </Link>
    </div>
);

export default NotFoundPage;
