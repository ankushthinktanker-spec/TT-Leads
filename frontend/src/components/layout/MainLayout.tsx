import { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { GlobalSearchProvider } from '../../context/GlobalSearchContext';

interface MainLayoutProps {
    children?: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
    return (
        <GlobalSearchProvider>
            <div className="flex h-screen bg-[linear-gradient(180deg,#f7faff_0%,#edf3f8_100%)] text-slate-950">
                <Sidebar />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Navbar />
                    <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[linear-gradient(180deg,#f4f8fc_0%,#edf3f8_100%)]">
                        <div className="mx-auto w-full max-w-[1480px] px-5 py-5 md:px-6 md:py-6">
                            {children ?? <Outlet />}
                        </div>
                    </main>
                </div>
            </div>
        </GlobalSearchProvider>
    );
};

export default MainLayout;
