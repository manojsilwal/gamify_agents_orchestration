import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#0A0F1E] text-[#E8E6E1] font-geist">
        <header className="p-4 border-b border-[rgba(245,200,66,0.12)] flex justify-between items-center">
          <h1 className="font-instrument text-2xl text-[#F5C842]">Zenith Rewards</h1>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
