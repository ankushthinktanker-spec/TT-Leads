import { useAppDispatch } from '../../hooks/redux';
import { logout } from '../../store/slices/authSlice';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await dispatch(logout());
        navigate('/login');
    };

    return (
        <div className="bg-secondary-950/60 backdrop-blur-xl h-20 flex items-center justify-between px-8 border-b border-white/5 z-10 font-sans">
            <div className="flex items-center md:hidden">
                    <button type="button" className="p-2.5 rounded-xl bg-white/5 text-secondary-400 hover:text-primary-400 transition-all">
                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
            </div>

            <div className="flex-1 flex justify-between items-center max-w-[1600px] mx-auto w-full">
                <div className="flex-1 flex items-center max-w-md">
                    <div className="relative w-full group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <svg className="h-4 w-4 text-secondary-500 group-focus-within:text-primary-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Universal Search Intelligence..."
                            className="w-full bg-white/5 border border-white/5 rounded-2xl py-2.5 pl-11 pr-4 text-xs font-semibold text-secondary-100 placeholder-secondary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all font-sans"
                        />
                    </div>
                </div>

                <div className="ml-8 flex items-center gap-4">
                    <button className="p-2.5 rounded-xl bg-white/5 text-secondary-400 hover:text-primary-400 transition-all relative">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        <span className="absolute top-2 right-2 w-2 h-2 bg-primary-500 rounded-full border-2 border-secondary-900 shadow-lg shadow-primary-500/50"></span>
                    </button>

                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/10 text-red-400 hover:bg-red-500/20 transition-all text-xs font-black uppercase tracking-widest"
                    >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>Eject</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Navbar;
