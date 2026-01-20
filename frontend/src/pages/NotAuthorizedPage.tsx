import MainLayout from '../components/layout/MainLayout';
import SurfaceCard from '../components/ui/SurfaceCard';

const NotAuthorizedPage = () => {
    return (
        <MainLayout>
            <div className="max-w-3xl mx-auto px-6 py-12">
                <SurfaceCard className="p-8 text-center">
                    <h1 className="text-2xl font-semibold text-white">Not authorized</h1>
                    <p className="text-secondary-400 mt-3">
                        You do not have permission to access this page. Please contact an admin if you need access.
                    </p>
                </SurfaceCard>
            </div>
        </MainLayout>
    );
};

export default NotAuthorizedPage;
