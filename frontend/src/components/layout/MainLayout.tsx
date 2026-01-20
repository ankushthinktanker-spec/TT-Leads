import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

interface MainLayoutProps {
    children: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
    return (
        <div className="flex h-screen bg-secondary-950">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Navbar />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-secondary-950">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
