import { useState } from 'react';
import { useZenithData } from '../hooks/useZenithData';

export function Optimization() {
    const { optimizationResult, calculateOptimization } = useZenithData();
    const [amount, setAmount] = useState<number>(50000);
    const [source, setSource] = useState<string>("Zenith Ultimate Rewards");
    const [destination, setDestination] = useState<string>("Global Airlines Alliance");

    const handleCalculate = () => {
        calculateOptimization(amount, source, destination);
    };

    return (
        <div className="max-w-max-width mx-auto p-md lg:p-xl w-full">
            {/* Page Header */}
            <header className="mb-lg">
                <h1 className="font-headline-xl text-headline-xl text-primary">Optimization Engine</h1>
                <p className="font-body-lg text-body-lg text-on-surface-variant mt-xs">Maximize your reward yield across all categories and redemptions.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
                {/* Earn More Section */}
                <section className="lg:col-span-12 flex flex-col gap-md">
                    <div className="flex justify-between items-end border-b border-outline-variant pb-xs">
                        <h2 className="font-headline-lg text-headline-lg text-primary">Earn More</h2>
                        <span className="font-body-sm text-body-sm text-on-surface-variant">Active Multipliers</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
                        {/* Category Card 1 */}
                        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex flex-col gap-sm shadow-sm relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-surface-variant opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="flex justify-between items-start relative z-10">
                                <div className="flex items-center gap-sm">
                                    <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                                        <span className="material-symbols-outlined">restaurant</span>
                                    </div>
                                    <span className="font-headline-md text-headline-md text-primary">Dining</span>
                                </div>
                                <div className="bg-secondary-container text-on-secondary-container px-2 py-1 rounded-full font-label-caps text-label-caps uppercase tracking-wider">
                                    4x Yield
                                </div>
                            </div>
                            <div className="mt-md relative z-10">
                                <div className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-1">Optimal Card</div>
                                <div className="font-data-mono text-data-mono text-primary">Zenith Sapphire Reserve</div>
                            </div>
                        </div>

                        {/* Category Card 2 */}
                        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex flex-col gap-sm shadow-sm relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-surface-variant opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="flex justify-between items-start relative z-10">
                                <div className="flex items-center gap-sm">
                                    <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                                        <span className="material-symbols-outlined">flight</span>
                                    </div>
                                    <span className="font-headline-md text-headline-md text-primary">Travel</span>
                                </div>
                                <div className="bg-secondary-container text-on-secondary-container px-2 py-1 rounded-full font-label-caps text-label-caps uppercase tracking-wider">
                                    5x Yield
                                </div>
                            </div>
                            <div className="mt-md relative z-10">
                                <div className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-1">Optimal Card</div>
                                <div className="font-data-mono text-data-mono text-primary">Zenith Platinum Elite</div>
                            </div>
                        </div>

                        {/* Category Card 3 */}
                        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex flex-col gap-sm shadow-sm relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-surface-variant opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="flex justify-between items-start relative z-10">
                                <div className="flex items-center gap-sm">
                                    <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                                        <span className="material-symbols-outlined">local_grocery_store</span>
                                    </div>
                                    <span className="font-headline-md text-headline-md text-primary">Groceries</span>
                                </div>
                                <div className="bg-secondary-container text-on-secondary-container px-2 py-1 rounded-full font-label-caps text-label-caps uppercase tracking-wider">
                                    3x Yield
                                </div>
                            </div>
                            <div className="mt-md relative z-10">
                                <div className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-1">Optimal Card</div>
                                <div className="font-data-mono text-data-mono text-primary">Everyday Preferred</div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Redeem Better Section */}
                <section className="lg:col-span-12 mt-xl flex flex-col gap-md">
                    <div className="flex justify-between items-end border-b border-outline-variant pb-xs">
                        <h2 className="font-headline-lg text-headline-lg text-primary">Redeem Better</h2>
                        <span className="font-body-sm text-body-sm text-on-surface-variant">Transfer Partner Calculator</span>
                    </div>

                    {/* Calculator Interface */}
                    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
                        <div className="flex flex-col md:flex-row gap-lg items-end">
                            <div className="flex-1 w-full">
                                <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-2">Points Source</label>
                                <select value={source} onChange={e => setSource(e.target.value)} className="w-full border border-outline-variant rounded-lg px-4 py-3 bg-surface text-primary font-body-md text-body-md focus:border-on-tertiary-container focus:ring-1 focus:ring-on-tertiary-container outline-none transition-shadow appearance-none">
                                    <option>Zenith Ultimate Rewards</option>
                                    <option>Membership Milestones</option>
                                    <option>Air Canada (Aeroplan)</option>
                                </select>
                            </div>
                            <div className="flex items-center justify-center w-12 h-12 mb-1 shrink-0 text-outline">
                                <span className="material-symbols-outlined text-2xl">arrow_forward</span>
                            </div>
                            <div className="flex-1 w-full">
                                <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-2">Destination Goal</label>
                                <select value={destination} onChange={e => setDestination(e.target.value)} className="w-full border border-outline-variant rounded-lg px-4 py-3 bg-surface text-primary font-body-md text-body-md focus:border-on-tertiary-container focus:ring-1 focus:ring-on-tertiary-container outline-none transition-shadow appearance-none">
                                    <option>Global Airlines Alliance</option>
                                    <option>Pacific Airways</option>
                                    <option>Luxury Hotel Group</option>
                                    <option>Star Alliance (ANA / EVA)</option>
                                </select>
                            </div>
                            <div className="w-full md:w-48">
                                <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-2">Amount</label>
                                <input value={amount} onChange={e => setAmount(parseInt(e.target.value) || 0)} className="w-full border border-outline-variant rounded-lg px-4 py-3 bg-surface text-primary font-data-mono text-data-mono focus:border-on-tertiary-container focus:ring-1 focus:ring-on-tertiary-container outline-none transition-shadow text-right" type="number" />
                            </div>
                            <button onClick={handleCalculate} className="w-full md:w-auto bg-primary text-on-primary rounded-lg px-6 py-3 font-data-mono text-data-mono whitespace-nowrap hover:bg-inverse-surface transition-colors">
                                Calculate
                            </button>
                        </div>

                        {/* Results Table */}
                        <div className="mt-xl overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-surface-dim">
                                        <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant uppercase font-normal">Transfer Path</th>
                                        <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant uppercase font-normal text-right">Ratio</th>
                                        <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant uppercase font-normal text-right">Bonus</th>
                                        <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant uppercase font-normal text-right">Yield Value</th>
                                        <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant uppercase font-normal text-right">Estimated Return</th>
                                    </tr>
                                </thead>
                                <tbody className="font-body-sm text-body-sm">
                                    {optimizationResult ? (
                                        <tr className="border-b border-surface-dim hover:bg-surface-bright transition-colors group">
                                            <td className="py-4 px-4 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-primary">
                                                    <span className="material-symbols-outlined text-sm">
                                                        {optimizationResult.path.includes("Airlines") || optimizationResult.path.includes("Star Alliance") ? "flight_takeoff" : "bed"}
                                                    </span>
                                                </div>
                                                <span className="font-data-mono text-data-mono text-primary group-hover:text-on-tertiary-container transition-colors">{optimizationResult.path}</span>
                                            </td>
                                            <td className="py-4 px-4 font-data-mono text-data-mono text-primary text-right">{optimizationResult.ratio}</td>
                                            <td className="py-4 px-4 text-right">
                                                {optimizationResult.bonus !== "-" ? (
                                                     <span className="inline-block bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded font-label-caps text-label-caps">{optimizationResult.bonus}</span>
                                                ) : (
                                                     <span className="text-on-surface-variant">-</span>
                                                )}
                                            </td>
                                            <td className="py-4 px-4 font-data-mono text-data-mono text-primary text-right">{optimizationResult.yieldValue}</td>
                                            <td className="py-4 px-4 text-right">
                                                <div className="font-data-mono text-data-mono text-secondary font-bold">{optimizationResult.calculatedPoints} pts</div>
                                                <div className="text-xs text-on-surface-variant font-medium mt-0.5">~{optimizationResult.calculatedValue}</div>
                                            </td>
                                        </tr>
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-on-surface-variant">Click calculate to see optimization paths.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
