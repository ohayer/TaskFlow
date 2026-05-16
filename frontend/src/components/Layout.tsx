import { Link, Outlet, useLocation } from 'react-router-dom';
import { ArrowRightOnRectangleIcon, FolderIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../auth/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItem = (to: string, label: string, Icon: typeof FolderIcon) => {
    const active = location.pathname === to || location.pathname.startsWith(to + '/');
    return (
      <Link to={to} className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition ${active ? 'bg-brand-100 text-brand-800' : 'text-slate-600 hover:bg-slate-100'}`}>
        <Icon className="h-5 w-5" />
        {label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 border-r border-slate-200 bg-white p-4 flex flex-col">
        <div className="px-4 py-4 mb-2">
          <span className="text-xl font-bold text-brand-700">TaskFlow</span>
        </div>
        <nav className="flex flex-col gap-1">
          {navItem('/', 'Projekty', FolderIcon)}
          {navItem('/profile', 'Profil', UserCircleIcon)}
        </nav>
        <div className="mt-auto pt-4 border-t border-slate-200">
          <div className="px-4 mb-2">
            <p className="text-sm font-medium text-slate-900 truncate">{user?.displayName}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
            Wyloguj
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
