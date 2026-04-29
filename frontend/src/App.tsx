import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { Dashboard } from './pages/Dashboard';
import { Portfolio } from './pages/Portfolio';
import { Optimization } from './pages/Optimization';
import { History } from './pages/History';

function App() {
  return (
    <Router>
      <div className="flex h-screen overflow-hidden bg-background text-on-background font-body-md">
        <Sidebar />

        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-background relative hide-scroll">
          <TopNav />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/optimization" element={<Optimization />} />
            <Route path="/history" element={<History />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
