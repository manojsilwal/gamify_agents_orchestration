import { NavLink } from 'react-router-dom';

const navItems = [
    { icon: 'dashboard', label: 'Dashboard', to: '/' },
    { icon: 'account_balance_wallet', label: 'Portfolio', to: '/portfolio' },
    { icon: 'auto_graph', label: 'Optimization', to: '/optimization' },
    { icon: 'receipt_long', label: 'History', to: '/history' },
];

export function Sidebar() {
    return (
        <nav className="bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 hidden lg:flex flex-col h-full p-4 gap-2 w-64 z-50 flex-shrink-0 sticky top-0 h-screen">
            <div className="flex items-center gap-3 px-3 py-4 mb-4">
                <div aria-label="Zenith Logo" className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-on-primary shadow-sm">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>insights</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-2xl font-black text-slate-900 dark:text-slate-50 font-headline-md tracking-tight">Zenith</span>
                    <span className="text-slate-500 dark:text-slate-400 font-label-caps text-label-caps">Elite Tier</span>
                </div>
            </div>

            <div className="px-2 mb-6">
                <button className="w-full bg-secondary text-on-secondary font-body-md text-body-md py-2 rounded-DEFAULT flex items-center justify-center gap-2 hover:bg-secondary-container hover:text-on-secondary-container transition-colors shadow-[0_2px_8px_rgba(0,108,73,0.2)]">
                    <span className="material-symbols-outlined text-[18px]">bolt</span>
                    Optimize Now
                </button>
            </div>

            <div className="flex flex-col gap-1 flex-1">
                {navItems.map((item) => (
                    <NavLink
                        key={item.label}
                        to={item.to}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 font-manrope text-sm font-semibold rounded-lg transition-all ${
                                isActive
                                    ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-50 scale-95 duration-150"
                                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100"
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <span className={`material-symbols-outlined text-[20px] ${isActive ? 'fill' : ''}`}>{item.icon}</span>
                                {item.label}
                            </>
                        )}
                    </NavLink>
                ))}
            </div>

            <div className="flex flex-col gap-1 mt-auto pt-4 border-t border-slate-200 dark:border-slate-800">
                <a className="text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 px-3 py-2.5 font-manrope text-sm font-semibold hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer">
                    <span className="material-symbols-outlined text-[20px]">help</span>
                    Help Center
                </a>
                <a className="text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 px-3 py-2.5 font-manrope text-sm font-semibold hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer">
                    <span className="material-symbols-outlined text-[20px]">logout</span>
                    Sign Out
                </a>
            </div>
        </nav>
    );
}
