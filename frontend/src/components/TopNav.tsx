export function TopNav() {
    return (
        <header className="bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 docked full-width top-0 sticky z-40">
            <div className="flex justify-between items-center w-full px-6 py-3 max-w-full mx-auto">
                <div className="flex items-center gap-4 flex-1">
                    <span className="lg:hidden text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Zenith Rewards</span>
                    <div className="hidden md:flex items-center bg-surface-container-lowest border border-outline-variant rounded-full px-4 py-1.5 focus-within:border-tertiary-container focus-within:shadow-[0_0_0_2px_rgba(0,26,66,0.1)] transition-all max-w-md w-full">
                        <span className="material-symbols-outlined text-on-surface-variant text-[20px] mr-2">search</span>
                        <input className="bg-transparent border-none focus:ring-0 text-body-sm font-body-sm w-full text-on-surface placeholder-on-surface-variant/50 p-0 outline-none" placeholder="Search airlines, hotels, or categories..." type="text"/>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors opacity-80 hover:opacity-100 duration-200 relative">
                        <span className="material-symbols-outlined">notifications</span>
                        <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-error rounded-full"></span>
                    </button>
                    <button className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors opacity-80 hover:opacity-100 duration-200">
                        <span className="material-symbols-outlined">settings</span>
                    </button>
                    <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden border border-outline-variant ml-2 flex items-center justify-center">
                        <span className="material-symbols-outlined text-slate-500">person</span>
                    </div>
                </div>
            </div>
        </header>
    );
}
