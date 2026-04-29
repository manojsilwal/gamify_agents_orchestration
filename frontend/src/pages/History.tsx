export function History() {
    return (
        <div className="p-4 md:p-margin max-w-[1280px] mx-auto w-full flex flex-col gap-lg">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
                <div>
                    <h1 className="font-headline-lg text-headline-lg text-on-background mb-2">Transaction History</h1>
                    <p className="font-body-md text-body-md text-on-surface-variant">Review and analyze your point accumulation and redemptions.</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-DEFAULT text-on-surface hover:bg-surface-container-low transition-colors font-body-sm text-body-sm">
                        <span className="material-symbols-outlined text-[18px]">download</span>
                        Export CSV
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-DEFAULT hover:bg-primary/90 transition-colors font-body-sm text-body-sm">
                        <span className="material-symbols-outlined text-[18px]">filter_list</span>
                        Filters
                    </button>
                </div>
            </div>

            {/* Summary Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
                <div className="bg-surface-container-lowest border border-outline-variant p-xl rounded-lg shadow-[0_4px_6px_-1px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center gap-2 mb-2 text-on-surface-variant">
                        <span className="material-symbols-outlined text-[20px]">arrow_upward</span>
                        <span className="font-label-caps text-label-caps uppercase tracking-wider">Points Earned</span>
                    </div>
                    <div className="font-headline-xl text-headline-xl text-primary">+124,500</div>
                    <div className="text-secondary text-sm mt-2 font-data-mono">↑ 15% vs last period</div>
                </div>
                <div className="bg-surface-container-lowest border border-outline-variant p-xl rounded-lg shadow-[0_4px_6px_-1px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center gap-2 mb-2 text-on-surface-variant">
                        <span className="material-symbols-outlined text-[20px]">arrow_downward</span>
                        <span className="font-label-caps text-label-caps uppercase tracking-wider">Points Redeemed</span>
                    </div>
                    <div className="font-headline-xl text-headline-xl text-primary">-45,200</div>
                    <div className="text-outline text-sm mt-2 font-data-mono">↓ 5% vs last period</div>
                </div>
                <div className="bg-surface-container-lowest border border-outline-variant p-xl rounded-lg shadow-[0_4px_6px_-1px_rgba(0,0,0,0.02)] relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent to-surface-variant/20"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2 text-on-surface-variant">
                            <span className="material-symbols-outlined text-[20px]">account_balance</span>
                            <span className="font-label-caps text-label-caps uppercase tracking-wider">Net Gain</span>
                        </div>
                        <div className="font-headline-xl text-headline-xl text-secondary">+79,300</div>
                        <div className="text-on-surface-variant text-sm mt-2 font-body-sm">Oct 1 - Oct 31, 2023</div>
                    </div>
                </div>
            </div>

            {/* Table Controls */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 items-center bg-surface-container-lowest border border-outline-variant p-4 rounded-lg mt-4">
                <div className="relative w-full sm:w-96">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
                    <input className="w-full pl-10 pr-4 py-2 bg-surface border border-outline-variant rounded-DEFAULT focus:border-tertiary-container focus:ring-1 focus:ring-tertiary-container outline-none transition-all font-body-md text-body-md text-on-surface" placeholder="Search transactions..." type="text"/>
                </div>
                <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
                    <button className="px-3 py-1.5 rounded-full bg-secondary-container text-on-secondary-container font-label-caps text-label-caps whitespace-nowrap">All</button>
                    <button className="px-3 py-1.5 rounded-full border border-outline-variant text-on-surface-variant hover:bg-surface transition-colors font-label-caps text-label-caps whitespace-nowrap">Earned</button>
                    <button className="px-3 py-1.5 rounded-full border border-outline-variant text-on-surface-variant hover:bg-surface transition-colors font-label-caps text-label-caps whitespace-nowrap">Redeemed</button>
                    <button className="px-3 py-1.5 rounded-full border border-outline-variant text-on-surface-variant hover:bg-surface transition-colors font-label-caps text-label-caps whitespace-nowrap">Transfers</button>
                </div>
            </div>

            {/* Transaction Table */}
            <div className="bg-surface-container-lowest rounded-lg border border-outline-variant overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-surface-container-high bg-surface/50">
                                <th className="p-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Date</th>
                                <th className="p-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Program</th>
                                <th className="p-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Description</th>
                                <th className="p-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Type</th>
                                <th className="p-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider text-right">Points</th>
                            </tr>
                        </thead>
                        <tbody className="font-body-md text-body-md divide-y divide-surface-container-high">
                            <tr className="hover:bg-surface/50 transition-colors">
                                <td className="p-4 text-on-surface-variant whitespace-nowrap">Oct 28, 2023</td>
                                <td className="p-4 text-on-surface font-semibold">Chase Sapphire</td>
                                <td className="p-4 text-on-surface">Dining Bonus - multiplier 3x</td>
                                <td className="p-4">
                                    <span className="inline-flex items-center px-2 py-1 rounded-DEFAULT bg-[#D1FAE5] text-[#065F46] font-label-caps text-label-caps">Earn</span>
                                </td>
                                <td className="p-4 text-right font-data-mono text-secondary font-semibold">+1,250</td>
                            </tr>
                            <tr className="hover:bg-surface/50 transition-colors">
                                <td className="p-4 text-on-surface-variant whitespace-nowrap">Oct 25, 2023</td>
                                <td className="p-4 text-on-surface font-semibold">Amex Platinum</td>
                                <td className="p-4 text-on-surface">Flight Booking - Delta Airlines</td>
                                <td className="p-4">
                                    <span className="inline-flex items-center px-2 py-1 rounded-DEFAULT bg-surface-container text-on-surface-variant font-label-caps text-label-caps">Redeem</span>
                                </td>
                                <td className="p-4 text-right font-data-mono text-on-surface font-semibold">-45,000</td>
                            </tr>
                            <tr className="hover:bg-surface/50 transition-colors">
                                <td className="p-4 text-on-surface-variant whitespace-nowrap">Oct 22, 2023</td>
                                <td className="p-4 text-on-surface font-semibold">Citi ThankYou</td>
                                <td className="p-4 text-on-surface">Sign-up Bonus Processing</td>
                                <td className="p-4">
                                    <span className="inline-flex items-center px-2 py-1 rounded-DEFAULT bg-[#D1FAE5] text-[#065F46] font-label-caps text-label-caps">Earn</span>
                                </td>
                                <td className="p-4 text-right font-data-mono text-secondary font-semibold">+80,000</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                {/* Pagination */}
                <div className="border-t border-surface-container-high p-4 flex items-center justify-between">
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Showing 1 to 3 of 124 entries</span>
                    <div className="flex gap-2">
                        <button className="p-2 border border-outline-variant rounded-DEFAULT text-on-surface-variant hover:bg-surface transition-colors disabled:opacity-50">
                            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                        </button>
                        <button className="p-2 border border-outline-variant rounded-DEFAULT text-on-surface-variant hover:bg-surface transition-colors">
                            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
