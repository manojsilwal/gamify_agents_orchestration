export function Portfolio() {
    return (
        <div className="p-lg md:p-xl space-y-lg max-w-[1280px] mx-auto w-full">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-xl">
                <div>
                    <h1 className="font-headline-xl text-headline-xl text-on-surface mb-2">Points Portfolio</h1>
                    <p className="font-body-md text-body-md text-on-surface-variant">Manage and optimize your connected loyalty programs.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
                        <input className="pl-10 pr-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg font-body-sm text-body-sm focus:border-tertiary-container focus:ring-1 focus:ring-tertiary-container transition-all outline-none w-full md:w-64" placeholder="Search programs..." type="text"/>
                    </div>
                    <button className="bg-primary text-on-primary font-body-sm text-body-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-tertiary-container transition-colors">
                        <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>add</span>
                        Link Account
                    </button>
                </div>
            </div>

            {/* Total Valuation Summary */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-xl shadow-[0_4px_24px_rgba(33,49,69,0.04)] mb-xl">
                <div className="flex flex-col md:flex-row justify-between gap-8">
                    <div>
                        <div className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-2">Total Estimated Valuation</div>
                        <div className="font-headline-xl text-headline-xl text-primary">$42,850.00</div>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="bg-[#D1FAE5] text-[#065F46] font-data-mono text-data-mono px-2 py-0.5 rounded-full flex items-center gap-1">
                                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>trending_up</span>
                                +12.4%
                            </span>
                            <span className="font-body-sm text-body-sm text-on-surface-variant">vs last month</span>
                        </div>
                    </div>
                    <div className="hidden md:block w-px bg-outline-variant"></div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 flex-1">
                        <div>
                            <div className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-1">Total Points</div>
                            <div className="font-headline-md text-headline-md text-on-surface">2.4M</div>
                        </div>
                        <div>
                            <div className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-1">Programs Linked</div>
                            <div className="font-headline-md text-headline-md text-on-surface">8</div>
                        </div>
                        <div>
                            <div className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-1">Expiring Soon</div>
                            <div className="font-headline-md text-headline-md text-error flex items-center gap-2">
                                45k
                                <span className="material-symbols-outlined text-error" style={{ fontSize: "20px" }}>warning</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Portfolio Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
                {/* Airline Card 1 */}
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg relative overflow-hidden group hover:shadow-[0_4px_24px_rgba(33,49,69,0.06)] transition-all">
                    <div className="absolute top-0 right-0 bg-error-container text-on-error-container font-label-caps text-label-caps px-3 py-1 rounded-bl-lg flex items-center gap-1">
                        <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>schedule</span>
                        Expiring Soon
                    </div>
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-primary-container rounded-lg flex items-center justify-center text-on-primary-container">
                                <span className="material-symbols-outlined" style={{ fontSize: "28px" }}>flight_takeoff</span>
                            </div>
                            <div>
                                <h3 className="font-headline-md text-headline-md text-on-surface text-xl">Delta SkyMiles</h3>
                                <div className="font-body-sm text-body-sm text-on-surface-variant">Airline</div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="font-data-mono text-data-mono text-primary text-xl">452,000</div>
                            <div className="font-body-sm text-body-sm text-on-surface-variant mt-1">~$5,424 value</div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-surface p-3 rounded-lg border border-outline-variant/50">
                            <div className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-1">Status Level</div>
                            <div className="font-body-md text-body-md text-on-surface font-semibold flex items-center gap-1">
                                Platinum Medallion
                                <span className="material-symbols-outlined text-secondary" style={{ fontSize: "16px" }}>verified</span>
                            </div>
                        </div>
                        <div className="bg-error-container/30 p-3 rounded-lg border border-error-container">
                            <div className="font-label-caps text-label-caps text-error uppercase mb-1">Next Expiration</div>
                            <div className="font-data-mono text-data-mono text-error font-semibold">15,000 pts · 30 Days</div>
                        </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-outline-variant">
                        <div className="flex items-center gap-2">
                            <span className="bg-[#D1FAE5] text-[#065F46] font-label-caps text-label-caps px-2 py-1 rounded-full">High Value</span>
                        </div>
                        <button className="font-body-sm text-body-sm text-secondary font-semibold hover:text-secondary-fixed-dim transition-colors flex items-center gap-1">
                            Optimize Usage
                            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>arrow_forward</span>
                        </button>
                    </div>
                </div>

                {/* Hotel Card 1 */}
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg relative overflow-hidden group hover:shadow-[0_4px_24px_rgba(33,49,69,0.06)] transition-all">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-tertiary-container rounded-lg flex items-center justify-center text-on-tertiary-container">
                                <span className="material-symbols-outlined" style={{ fontSize: "28px" }}>hotel</span>
                            </div>
                            <div>
                                <h3 className="font-headline-md text-headline-md text-on-surface text-xl">Marriott Bonvoy</h3>
                                <div className="font-body-sm text-body-sm text-on-surface-variant">Hotel</div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="font-data-mono text-data-mono text-primary text-xl">850,500</div>
                            <div className="font-body-sm text-body-sm text-on-surface-variant mt-1">~$6,804 value</div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-surface p-3 rounded-lg border border-outline-variant/50">
                            <div className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-1">Status Level</div>
                            <div className="font-body-md text-body-md text-on-surface font-semibold flex items-center gap-1">
                                Titanium Elite
                            </div>
                        </div>
                        <div className="bg-surface p-3 rounded-lg border border-outline-variant/50">
                            <div className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-1">Next Expiration</div>
                            <div className="font-data-mono text-data-mono text-on-surface font-semibold">None (Active)</div>
                        </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-outline-variant">
                        <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-[#F1F5F9] rounded-full overflow-hidden flex items-center">
                                <div className="h-full bg-gradient-to-r from-tertiary-container to-secondary w-[85%] rounded-full"></div>
                            </div>
                            <span className="font-label-caps text-label-caps text-on-surface-variant">To Ambassador</span>
                        </div>
                        <button className="font-body-sm text-body-sm text-on-surface-variant font-semibold hover:text-primary transition-colors flex items-center gap-1">
                            View Details
                            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>arrow_forward</span>
                        </button>
                    </div>
                </div>

                {/* Credit Card 1 */}
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg relative overflow-hidden group hover:shadow-[0_4px_24px_rgba(33,49,69,0.06)] transition-all">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-surface-dim rounded-lg flex items-center justify-center text-on-surface">
                                <span className="material-symbols-outlined" style={{ fontSize: "28px" }}>credit_card</span>
                            </div>
                            <div>
                                <h3 className="font-headline-md text-headline-md text-on-surface text-xl">Chase Ultimate Rewards</h3>
                                <div className="font-body-sm text-body-sm text-on-surface-variant">Credit Card Transferable</div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="font-data-mono text-data-mono text-primary text-xl">1,200,000</div>
                            <div className="font-body-sm text-body-sm text-on-surface-variant mt-1">~$24,000 value</div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-surface p-3 rounded-lg border border-outline-variant/50">
                            <div className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-1">Status Level</div>
                            <div className="font-body-md text-body-md text-on-surface font-semibold flex items-center gap-1">
                                Sapphire Reserve
                            </div>
                        </div>
                        <div className="bg-surface p-3 rounded-lg border border-outline-variant/50">
                            <div className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-1">Next Expiration</div>
                            <div className="font-data-mono text-data-mono text-on-surface font-semibold">Points never expire</div>
                        </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-outline-variant">
                        <div className="flex items-center gap-2">
                            <span className="bg-surface-container-high text-on-surface font-label-caps text-label-caps px-2 py-1 rounded-full">Transfer Partner Bonus Active</span>
                        </div>
                        <button className="bg-secondary text-on-secondary font-body-sm text-body-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-secondary-fixed-dim transition-colors flex items-center gap-1">
                            Transfer
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
