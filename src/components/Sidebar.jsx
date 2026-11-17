import { NavLink } from 'react-router-dom';
import Icon from './Icon';
import { NAV_ITEMS } from './navItems';
import { useAuth } from '../context/AuthContext';

const linkClass = ({ isActive }) =>
  `flex items-center px-3 h-11 rounded-lg transition-colors max-md:justify-center ${
    isActive ? 'bg-primary-soft text-primary font-semibold' : 'text-muted hover:bg-surface hover:text-ink font-medium'
  }`;

const Sidebar = () => {
  const { user, logout } = useAuth();
  const initials = (user?.name || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

  return (
    <aside className="w-[250px] sticky top-0 h-screen bg-sidebar-bg border-r border-line flex flex-col shrink-0 max-md:w-[72px] max-sm:hidden">
      <div className="h-20 flex items-center px-6 max-md:justify-center max-md:px-0">
        <div className="bg-primary text-white w-8 h-8 rounded-lg flex items-center justify-center font-display font-bold text-lg shrink-0">
          S
        </div>
        <span className="ml-3 font-display font-bold text-xl tracking-tight text-ink max-md:hidden">StudyFlow</span>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto max-md:px-2" aria-label="Main">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} className={linkClass} title={item.label}>
            <Icon name={item.icon} size={20} className="shrink-0" />
            <span className="ml-3 max-md:hidden">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-line max-md:p-2 flex flex-col gap-1">
        <NavLink to="/settings" className={linkClass} title="Settings">
          <Icon name="settings" size={20} className="shrink-0" />
          <span className="ml-3 max-md:hidden">Settings</span>
        </NavLink>

        <button
          onClick={logout}
          title="Log out"
          className="flex items-center px-3 h-11 rounded-lg transition-colors text-muted hover:bg-danger/10 hover:text-danger font-medium max-md:justify-center w-full border-0 bg-transparent"
        >
          <Icon name="logout" size={20} className="shrink-0" />
          <span className="ml-3 max-md:hidden text-left flex-1">Log out</span>
        </button>

        {user && (
          <div className="flex items-center px-2 py-3 mt-2 max-md:justify-center">
            <div className="w-10 h-10 rounded-full bg-accent-soft text-accent flex items-center justify-center font-bold text-sm shrink-0">
              {initials}
            </div>
            <div className="ml-3 overflow-hidden max-md:hidden">
              <div className="font-semibold text-sm text-ink truncate">{user.name}</div>
              <div className="text-xs text-muted truncate">{user.field_of_study || 'Student'}</div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
