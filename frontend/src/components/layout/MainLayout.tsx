import { ReactNode, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { GlobalSearchProvider } from '../../context/GlobalSearchContext';

interface MainLayoutProps {
    children?: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    return (
        <GlobalSearchProvider>
            <div className="flex h-screen bg-[linear-gradient(180deg,#fffaf4_0%,#f6ede1_100%)] text-slate-950">
                <a
                    href="#main-content"
                    className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-[#fffdf9] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-brand-700 focus:shadow-[0_8px_24px_rgba(120,74,24,0.12)]"
                >
                    Skip to main content
                </a>
                <Sidebar mobileOpen={mobileSidebarOpen} onCloseMobile={() => setMobileSidebarOpen(false)} />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Navbar onOpenNavigation={() => setMobileSidebarOpen(true)} />
                    <main id="main-content" className="flex-1 overflow-x-hidden overflow-y-auto bg-[linear-gradient(180deg,#fff8f1_0%,#f5ecdf_100%)]">
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

