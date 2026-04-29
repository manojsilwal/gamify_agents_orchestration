import { useAgent } from '../hooks/useAgent';

export function Dashboard() {
    const { valuations, status } = useAgent();

    // Calculate a mock liquid value based on live valuations to make it dynamic
    const mockTotalPts = 1248500;
    // Assume average is roughly 1.5 cpp if no data
    let avgCpp = 1.5;
    if (valuations.length > 0) {
        // try to parse '1.5 cents'
        const cppValues = valuations.filter(v => v.value.includes('cents')).map(v => parseFloat(v.value.split(' ')[0]) || 0);
        if (cppValues.length > 0) {
            avgCpp = cppValues.reduce((a, b) => a + b, 0) / cppValues.length;
        }
    }
    const estimatedCash = (mockTotalPts * (avgCpp / 100)).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

    return (
        <div className="p-md lg:p-lg max-w-[1280px] mx-auto w-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">

                {/* Hero Card: Total Points Overview (Span 8) */}
                <div className="lg:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-xl p-xl flex flex-col justify-between shadow-[0_4px_24px_-4px_rgba(33,49,69,0.04)] relative">
                    <div className="absolute top-4 right-4 flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-secondary' : 'bg-error'}`}></span>
                        <span className="text-xs font-data-mono text-on-surface-variant uppercase">{status}</span>
                    </div>
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h2 className="font-body-md text-body-md text-on-surface-variant mb-1">Total Liquid Value</h2>
                            <div className="flex items-baseline gap-3">
                                <span className="font-headline-xl text-headline-xl text-primary tracking-tight">{mockTotalPts.toLocaleString()}</span>
                                <span className="font-body-lg text-body-lg text-on-surface-variant font-medium">pts</span>
                            </div>
                        </div>
                        <div className="flex flex-col items-end mt-6">
                            <div className="flex items-center gap-1 bg-secondary-container/30 px-3 py-1 rounded-full border border-secondary-container">
                                <span className="material-symbols-outlined text-[16px] text-secondary">trending_up</span>
                                <span className="font-data-mono text-data-mono text-secondary">+{avgCpp.toFixed(2)} cpp Avg</span>
                            </div>
                            <span className="font-body-sm text-body-sm text-on-surface-variant mt-2 text-right">Estimated Cash Equivalent: <br/><strong className="text-primary font-semibold">{estimatedCash}</strong></span>
                        </div>
                    </div>
                    {/* Sparkline / Mini Chart area */}
                    <div className="h-16 w-full flex items-end gap-1 mt-auto">
                        <div className="flex-1 bg-surface-container-high rounded-t-sm h-[30%] hover:bg-secondary/20 transition-colors"></div>
                        <div className="flex-1 bg-surface-container-high rounded-t-sm h-[45%] hover:bg-secondary/20 transition-colors"></div>
                        <div className="flex-1 bg-surface-container-high rounded-t-sm h-[35%] hover:bg-secondary/20 transition-colors"></div>
                        <div className="flex-1 bg-surface-container-high rounded-t-sm h-[60%] hover:bg-secondary/20 transition-colors"></div>
                        <div className="flex-1 bg-surface-container-high rounded-t-sm h-[55%] hover:bg-secondary/20 transition-colors"></div>
                        <div className="flex-1 bg-surface-container-high rounded-t-sm h-[80%] hover:bg-secondary/20 transition-colors"></div>
                        <div className="flex-1 bg-secondary rounded-t-sm h-[100%] shadow-[0_0_12px_rgba(0,108,73,0.3)]"></div>
                    </div>
                </div>

                {/* Top Opportunity Alert (Span 4) */}
                <div className="lg:col-span-4 bg-tertiary-container text-on-tertiary-container rounded-xl p-lg flex flex-col relative overflow-hidden border border-primary-fixed">
                    <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary-fixed-dim/20 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="flex items-center gap-2 mb-4">
                        <span className="material-symbols-outlined text-secondary-fixed">lightbulb</span>
                        <span className="font-label-caps text-label-caps text-secondary-fixed">Live Valuations</span>
                    </div>
                    {valuations.length > 0 ? (
                        <div className="flex flex-col gap-2 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            {valuations.slice(0, 4).map((v, i) => (
                                <div key={i} className="flex justify-between items-center bg-surface-container-lowest/10 rounded-lg p-3 backdrop-blur-sm border border-surface-container-lowest/20">
                                    <span className="font-body-sm text-body-sm text-primary-fixed truncate mr-2" title={v.program}>{v.program}</span>
                                    <span className="font-data-mono text-data-mono text-secondary-fixed whitespace-nowrap">{v.value}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-primary-fixed/50 font-body-sm italic">
                            Waiting for Agent Swarm...
                        </div>
                    )}
                </div>

                {/* Category Breakdown (Span 4) */}
                <div className="lg:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-xl p-lg flex flex-col h-full shadow-[0_4px_24px_-4px_rgba(33,49,69,0.02)] mt-4 lg:mt-0">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-headline-md text-body-lg font-semibold text-primary">Category Allocation</h3>
                        <button className="text-on-surface-variant hover:text-primary transition-colors">
                            <span className="material-symbols-outlined text-[20px]">more_horiz</span>
                        </button>
                    </div>
                    <div className="flex flex-col gap-6 flex-1 justify-center">
                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-primary">
                                        <span className="material-symbols-outlined text-[16px]">flight_takeoff</span>
                                    </div>
                                    <span className="font-body-sm text-body-sm font-medium text-primary">Travel</span>
                                </div>
                                <span className="font-data-mono text-data-mono text-on-surface-variant">65%</span>
                            </div>
                            <div className="w-full bg-surface-container-high rounded-full h-2 overflow-hidden">
                                <div className="bg-primary h-full w-[65%] rounded-full"></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-primary">
                                        <span className="material-symbols-outlined text-[16px]">restaurant</span>
                                    </div>
                                    <span className="font-body-sm text-body-sm font-medium text-primary">Dining</span>
                                </div>
                                <span className="font-data-mono text-data-mono text-on-surface-variant">22%</span>
                            </div>
                            <div className="w-full bg-surface-container-high rounded-full h-2 overflow-hidden">
                                <div className="bg-primary/70 h-full w-[22%] rounded-full"></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-primary">
                                        <span className="material-symbols-outlined text-[16px]">shopping_bag</span>
                                    </div>
                                    <span className="font-body-sm text-body-sm font-medium text-primary">Shopping</span>
                                </div>
                                <span className="font-data-mono text-data-mono text-on-surface-variant">13%</span>
                            </div>
                            <div className="w-full bg-surface-container-high rounded-full h-2 overflow-hidden">
                                <div className="bg-primary/40 h-full w-[13%] rounded-full"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Visual Summary Chart (Span 8) */}
                <div className="lg:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-xl p-lg flex flex-col h-full shadow-[0_4px_24px_-4px_rgba(33,49,69,0.02)] mt-4 lg:mt-0">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-headline-md text-body-lg font-semibold text-primary">Point Growth Velocity</h3>
                        <div className="flex gap-2 bg-surface-container-low p-1 rounded-md">
                            <button className="px-3 py-1 rounded text-xs font-semibold text-on-surface-variant hover:bg-surface-container transition-colors">1M</button>
                            <button className="px-3 py-1 rounded text-xs font-semibold text-on-surface-variant hover:bg-surface-container transition-colors">3M</button>
                            <button className="px-3 py-1 rounded bg-white shadow-sm text-xs font-semibold text-primary">YTD</button>
                            <button className="px-3 py-1 rounded text-xs font-semibold text-on-surface-variant hover:bg-surface-container transition-colors">ALL</button>
                        </div>
                    </div>
                    <div className="flex-1 relative min-h-[200px] flex items-end pt-4">
                        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[10px] text-on-surface-variant font-data-mono pb-6 pr-4 border-r border-surface-container-high w-12 text-right">
                            <span>1.5M</span><span>1.0M</span><span>500K</span><span>0</span>
                        </div>
                        <div className="absolute left-12 right-0 top-0 bottom-6 flex flex-col justify-between pointer-events-none">
                            <div className="border-b border-surface-container border-dashed w-full h-0"></div>
                            <div className="border-b border-surface-container border-dashed w-full h-0"></div>
                            <div className="border-b border-surface-container border-dashed w-full h-0"></div>
                            <div className="border-b border-surface-container-high w-full h-0"></div>
                        </div>
                        <div className="absolute left-12 right-0 top-0 bottom-6 z-10 overflow-hidden">
                            <svg className="w-full h-full drop-shadow-md" preserveAspectRatio="none" viewBox="0 0 800 200">
                                <path className="text-primary" d="M0,180 C100,170 200,120 300,130 C400,140 500,60 600,70 C700,80 750,30 800,20" fill="none" stroke="currentColor" strokeWidth="3"></path>
                                <path d="M0,180 C100,170 200,120 300,130 C400,140 500,60 600,70 C700,80 750,30 800,20 L800,200 L0,200 Z" fill="url(#gradient)" opacity="0.1"></path>
                                <defs>
                                    <linearGradient id="gradient" x1="0%" x2="0%" y1="0%" y2="100%">
                                        <stop offset="0%" stopColor="#000000" stopOpacity="0.8"></stop>
                                        <stop offset="100%" stopColor="#000000" stopOpacity="0"></stop>
                                    </linearGradient>
                                </defs>
                                <circle cx="300" cy="130" fill="#ffffff" r="4" stroke="#000000" strokeWidth="2"></circle>
                                <circle cx="600" cy="70" fill="#ffffff" r="4" stroke="#000000" strokeWidth="2"></circle>
                                <circle cx="800" cy="20" fill="#006c49" r="6" stroke="#ffffff" strokeWidth="2"></circle>
                            </svg>
                        </div>
                        <div className="absolute left-12 right-0 bottom-0 flex justify-between text-[10px] text-on-surface-variant font-data-mono pt-2 px-2">
                            <span>Jan</span><span>Mar</span><span>May</span><span>Jul</span><span>Sep</span><span>Nov</span>
                        </div>
                    </div>
                </div>

                {/* Recent Activity Widget (Span 12) */}
                <div className="lg:col-span-12 bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-[0_4px_24px_-4px_rgba(33,49,69,0.02)] overflow-x-auto mt-4 lg:mt-0">
                    <div className="flex justify-between items-center mb-4 min-w-[600px]">
                        <h3 className="font-headline-md text-body-lg font-semibold text-primary">Recent Transaction Stream</h3>
                        <a className="font-body-sm text-body-sm text-primary font-medium hover:underline flex items-center gap-1" href="#">
                            View All <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                        </a>
                    </div>
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                            <tr className="border-b border-surface-container-high">
                                <th className="py-3 px-2 font-label-caps text-label-caps text-on-surface-variant font-semibold">DATE</th>
                                <th className="py-3 px-2 font-label-caps text-label-caps text-on-surface-variant font-semibold">MERCHANT / SOURCE</th>
                                <th className="py-3 px-2 font-label-caps text-label-caps text-on-surface-variant font-semibold">CATEGORY</th>
                                <th className="py-3 px-2 font-label-caps text-label-caps text-on-surface-variant font-semibold text-right">AMOUNT</th>
                                <th className="py-3 px-2 font-label-caps text-label-caps text-on-surface-variant font-semibold text-right">REWARD YIELD</th>
                            </tr>
                        </thead>
                        <tbody className="font-body-sm text-body-sm">
                            <tr className="border-b border-surface-container border-dashed hover:bg-surface-container-low/50 transition-colors">
                                <td className="py-3 px-2 text-on-surface-variant font-data-mono">Oct 24, 2023</td>
                                <td className="py-3 px-2 font-medium text-primary flex items-center gap-2">
                                    <span className="w-6 h-6 rounded bg-primary text-white flex items-center justify-center text-[12px] font-bold">M</span>
                                    Marriott Bonvoy Boundless
                                </td>
                                <td className="py-3 px-2 text-on-surface-variant">Sign-up Bonus</td>
                                <td className="py-3 px-2 text-right font-data-mono text-primary">$4,000.00</td>
                                <td className="py-3 px-2 text-right">
                                    <span className="inline-flex items-center gap-1 bg-[#D1FAE5] text-[#065F46] px-2 py-0.5 rounded-full font-data-mono text-[12px] font-bold">
                                        +100,000
                                    </span>
                                </td>
                            </tr>
                            <tr className="border-b border-surface-container border-dashed hover:bg-surface-container-low/50 transition-colors">
                                <td className="py-3 px-2 text-on-surface-variant font-data-mono">Oct 22, 2023</td>
                                <td className="py-3 px-2 font-medium text-primary flex items-center gap-2">
                                    <span className="w-6 h-6 rounded bg-surface-container-high text-primary flex items-center justify-center text-[12px] font-bold">
                                        <span className="material-symbols-outlined text-[14px]">flight</span>
                                    </span>
                                    Delta Airlines Flight 482
                                </td>
                                <td className="py-3 px-2 text-on-surface-variant">Travel (3x)</td>
                                <td className="py-3 px-2 text-right font-data-mono text-primary">$450.00</td>
                                <td className="py-3 px-2 text-right font-data-mono text-primary font-medium">+1,350</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
