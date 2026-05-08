import { NavLink, Outlet } from 'react-router-dom'
import { MaterialIcon } from '../MaterialIcon'

const navInactive =
  'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 px-3 py-2.5 font-manrope text-sm font-semibold hover:text-slate-900 dark:hover:text-slate-100 transition-colors rounded-lg'

const navActive =
  'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-50 rounded-lg flex items-center gap-3 px-3 py-2.5 font-manrope text-sm font-semibold'

function SideNav() {
  return (
    <nav className="hidden lg:flex flex-col h-screen w-64 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 gap-2 z-50">
      <div className="flex items-center gap-3 px-3 py-4 mb-4">
        <div
          aria-label="Zenith Logo"
          className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-on-primary shadow-sm"
        >
          <MaterialIcon name="insights" fill size={22} className="!text-[22px]" />
        </div>
        <div className="flex flex-col">
          <span className="text-2xl font-black text-slate-900 dark:text-slate-50 font-headline-md tracking-tight">
            Zenith
          </span>
          <span className="text-slate-500 dark:text-slate-400 font-label-caps text-label-caps">
            Elite Tier
          </span>
        </div>
      </div>

      <div className="px-2 mb-6">
        <button
          type="button"
          data-testid="sidebar-optimize-cta"
          className="w-full bg-secondary text-on-secondary font-body-md py-2 rounded-sm flex items-center justify-center gap-2 hover:bg-secondary-container hover:text-on-secondary-container transition-colors shadow-[0_2px_8px_rgba(0,108,73,0.2)] text-sm"
        >
          <MaterialIcon name="bolt" size={18} />
          Optimize Now
        </button>
      </div>

        <div className="flex flex-col gap-1 flex-1">
        <NavLink
          to="/"
          end
          data-testid="nav-dashboard"
          className={({ isActive }) => (isActive ? navActive : navInactive)}
        >
          <MaterialIcon name="dashboard" size={20} />
          Dashboard
        </NavLink>
        <NavLink
          to="/portfolio"
          data-testid="nav-portfolio"
          className={({ isActive }) => (isActive ? navActive : navInactive)}
        >
          <MaterialIcon name="account_balance_wallet" size={20} />
          Portfolio
        </NavLink>
        <NavLink
          to="/optimization"
          data-testid="nav-optimization"
          className={({ isActive }) => (isActive ? navActive : navInactive)}
        >
          <MaterialIcon name="auto_graph" size={20} />
          Optimization
        </NavLink>
        <NavLink
          to="/history"
          data-testid="nav-history"
          className={({ isActive }) => (isActive ? navActive : navInactive)}
        >
          <MaterialIcon name="receipt_long" size={20} />
          History
        </NavLink>
        <NavLink
          to="/shopping"
          data-testid="nav-shopping"
          className={({ isActive }) => (isActive ? navActive : navInactive)}
        >
          <MaterialIcon name="shopping_cart" size={20} />
          Shop smarter
        </NavLink>
      </div>

      <div className="flex flex-col gap-1 mt-auto pt-4 border-t border-slate-200 dark:border-slate-800">
        <a href="#help" className={navInactive}>
          <MaterialIcon name="help" size={20} />
          Help Center
        </a>
        <a href="#signout" className={navInactive}>
          <MaterialIcon name="logout" size={20} />
          Sign Out
        </a>
      </div>
    </nav>
  )
}

function TopBar() {
  return (
    <header className="sticky top-0 z-40 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="flex justify-between items-center w-full px-6 py-3 max-w-full mx-auto">
        <div className="flex items-center gap-4 flex-1">
          <span className="lg:hidden text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Zenith Rewards
          </span>
          <div className="hidden md:flex items-center bg-surface-container-lowest border border-outline-variant rounded-full px-4 py-1.5 focus-within:border-tertiary-container focus-within:shadow-[0_0_0_2px_rgba(0,26,66,0.1)] transition-all max-w-md w-full">
            <MaterialIcon name="search" size={20} className="text-on-surface-variant mr-2" />
            <input
              type="search"
              data-testid="global-search"
              aria-label="Search airlines, hotels, or categories"
              placeholder="Search airlines, hotels, or categories..."
              className="bg-transparent border-none focus:ring-0 text-body-sm w-full text-on-surface placeholder:text-on-surface-variant/50 p-0 outline-none"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors opacity-80 hover:opacity-100 relative"
            aria-label="Notifications"
          >
            <MaterialIcon name="notifications" />
            <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-error rounded-full" />
          </button>
          <button
            type="button"
            className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors opacity-80 hover:opacity-100"
            aria-label="Settings"
          >
            <MaterialIcon name="settings" />
          </button>
          <div className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant ml-2 bg-surface-container-high flex items-center justify-center text-on-surface text-xs font-bold">
            Z
          </div>
        </div>
      </div>
    </header>
  )
}

export function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-on-background font-body-md text-body-md">
      <SideNav />
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-background relative hide-scroll">
        <TopBar />
        <Outlet />
      </main>
    </div>
  )
}
