import { useState } from 'react';
import { useZenithData } from '../hooks/useZenithData';

export function Portfolio() {
    const { portfolioData, linkAccount } = useZenithData();
    const [isLinking, setIsLinking] = useState(false);
    const [showModal, setShowModal] = useState(false);

    if (!portfolioData) {
        return <div className="p-xl text-center text-on-surface-variant font-body-lg">Loading Portfolio Data...</div>;
    }

    const handleLinkAccount = () => {
        setIsLinking(true);
        // Simulate a secure API call delay
        setTimeout(() => {
            linkAccount("Air Canada (Aeroplan)", { token: "secure_token_123" });
            setIsLinking(false);
            setShowModal(false);
        }, 1500);
    };

    return (
        <div className="p-lg md:p-xl space-y-lg max-w-[1280px] mx-auto w-full relative">

            {showModal && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-surface-container-lowest rounded-xl p-xl max-w-md w-full shadow-2xl border border-outline-variant">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="material-symbols-outlined text-3xl text-primary">security</span>
                            <h2 className="text-xl font-headline-md font-bold text-primary">Secure Connection</h2>
                        </div>
                        <p className="text-body-md text-on-surface-variant mb-6">
                            You are about to securely connect your <strong>Air Canada (Aeroplan)</strong> account to Zenith Rewards to automatically fetch your live point balances and status.
                        </p>

                        <div className="flex gap-4 justify-end">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 font-body-sm font-semibold text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleLinkAccount}
                                disabled={isLinking}
                                className="px-4 py-2 font-body-sm font-semibold bg-primary text-on-primary rounded-lg hover:bg-inverse-surface transition-colors flex items-center gap-2 disabled:opacity-70"
                            >
                                {isLinking ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                        Connecting...
                                    </>
                                ) : "Connect Account"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-xl">
                <div>
                    <h1 className="font-headline-xl text-headline-xl text-on-surface mb-2">Points Portfolio</h1>
                    <p className="font-body-md text-body-md text-on-surface-variant">Manage and optimize your connected loyalty programs.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
                        <input className="pl-10 pr-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg font-body-sm text-body-sm focus:border-tertiary-container focus:ring-1 focus:ring-tertiary-container transition-all outline-none w-full md:w-64" placeholder="Search programs..." type="text" />
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-primary text-on-primary font-body-sm text-body-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-tertiary-container transition-colors"
                    >
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
                        <div className="font-headline-xl text-headline-xl text-primary">${portfolioData.total_valuation.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
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
                            <div className="font-headline-md text-headline-md text-on-surface">{portfolioData.programs}</div>
                        </div>
                        <div>
                            <div className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-1">Expiring Soon</div>
                            <div className="font-headline-md text-headline-md text-error flex items-center gap-2">
                                {portfolioData.expiring_soon}
                                <span className="material-symbols-outlined text-error" style={{ fontSize: "20px" }}>warning</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Portfolio Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
                {portfolioData.accounts.map((acc: any) => (
                    <div key={acc.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg relative overflow-hidden group hover:shadow-[0_4px_24px_rgba(33,49,69,0.06)] transition-all">
                        {acc.status_color === 'error' && (
                            <div className="absolute top-0 right-0 bg-error-container text-on-error-container font-label-caps text-label-caps px-3 py-1 rounded-bl-lg flex items-center gap-1">
                                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>schedule</span>
                                Expiring Soon
                            </div>
                        )}
                        {acc.status_color === 'warning' && (
                            <div className="absolute top-0 right-0 bg-error-container text-on-error-container font-label-caps text-label-caps px-3 py-1 rounded-bl-lg flex items-center gap-1">
                                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>warning</span>
                                Status Drop Risk
                            </div>
                        )}
                        {acc.status_color === 'success' && (
                            <div className="absolute top-0 right-0 bg-[#D1FAE5] text-[#065F46] font-label-caps text-label-caps px-3 py-1 rounded-bl-lg flex items-center gap-1">
                                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>check_circle</span>
                                Newly Synced
                            </div>
                        )}
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-primary-container rounded-lg flex items-center justify-center text-on-primary-container">
                                    <span className="material-symbols-outlined" style={{ fontSize: "28px" }}>{acc.icon}</span>
                                </div>
                                <div>
                                    <h3 className="font-headline-md text-headline-md text-on-surface text-xl">{acc.name}</h3>
                                    <div className="font-body-sm text-body-sm text-on-surface-variant">{acc.type}</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="font-data-mono text-data-mono text-primary text-xl">{acc.balance}</div>
                                <div className="font-body-sm text-body-sm text-on-surface-variant mt-1">~{acc.value} value</div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-surface p-3 rounded-lg border border-outline-variant/50">
                                <div className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-1">Status Level</div>
                                <div className="font-body-md text-body-md text-on-surface font-semibold flex items-center gap-1">
                                    {acc.level}
                                </div>
                            </div>
                            <div className={`p-3 rounded-lg border ${acc.status_color === 'error' ? 'bg-error-container/30 border-error-container' : 'bg-surface border-outline-variant/50'}`}>
                                <div className={`font-label-caps text-label-caps uppercase mb-1 ${acc.status_color === 'error' ? 'text-error' : 'text-on-surface-variant'}`}>Next Expiration</div>
                                <div className={`font-data-mono text-data-mono font-semibold ${acc.status_color === 'error' ? 'text-error' : 'text-on-surface'}`}>{acc.expiration}</div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-outline-variant">
                            <button className="font-body-sm text-body-sm text-secondary font-semibold hover:text-secondary-fixed-dim transition-colors flex items-center gap-1 ml-auto">
                                View Details
                                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>arrow_forward</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
