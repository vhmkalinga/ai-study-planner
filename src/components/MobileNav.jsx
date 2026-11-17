import { NavLink } from 'react-router-dom';
import Icon from './Icon';
import { NAV_ITEMS } from './navItems';

// Bottom tab bar for phones, where the sidebar is hidden.
const MobileNav = () => (
  <nav
    aria-label="Mobile navigation"
    className="hidden max-sm:flex fixed bottom-0 inset-x-0 z-40 bg-paper/95 backdrop-blur border-t border-line pb-[env(safe-area-inset-bottom)]"
  >
    {[...NAV_ITEMS, { to: '/settings', label: 'Settings', icon: 'settings' }].map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        className={({ isActive }) =>
          `flex-1 flex flex-col items-center justify-center gap-1 h-16 text-[10px] font-semibold ${
            isActive ? 'text-primary' : 'text-muted'
          }`
        }
      >
        <Icon name={item.icon} size={20} />
        {item.label}
      </NavLink>
    ))}
  </nav>
);

export default MobileNav;
