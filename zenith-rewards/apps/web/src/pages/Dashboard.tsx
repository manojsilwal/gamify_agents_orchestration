export const Dashboard = () => {
  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="bg-[#111827] border border-[rgba(245,200,66,0.12)] rounded-xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
        <h2 className="font-instrument text-xl mb-4 text-[#F5C842]">Portfolio Summary</h2>
        <div className="font-mono text-3xl text-[#22C55E]">$12,450.00</div>
      </div>

      <div className="mt-8 bg-[#111827] border border-[rgba(245,200,66,0.12)] rounded-xl p-6">
        <h3 className="font-instrument text-lg mb-2">Provider Connect</h3>
        <div className="flex items-center gap-2">
          <span className="bg-[#EAB308]/20 text-[#EAB308] px-2 py-1 rounded text-xs font-bold uppercase">Sandbox / Stub Mode</span>
          <span className="text-sm text-[#8B8A87]">AwardWallet</span>
        </div>
      </div>
    </div>
  );
};
