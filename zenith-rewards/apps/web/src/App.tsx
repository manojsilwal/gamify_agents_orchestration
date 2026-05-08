import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { Dashboard } from './pages/Dashboard'
import { Optimization } from './pages/Optimization'
import { Portfolio } from './pages/Portfolio'
import { TransactionHistory } from './pages/TransactionHistory'
import { ShopCompare } from './pages/ShopCompare'
import { NotFound } from './pages/NotFound'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="portfolio" element={<Portfolio />} />
          <Route path="optimization" element={<Optimization />} />
          <Route path="history" element={<TransactionHistory />} />
          <Route path="shopping" element={<ShopCompare />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
