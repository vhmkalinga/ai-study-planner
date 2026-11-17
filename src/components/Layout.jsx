import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import Toast from './Toast';
import { useStudy } from '../context/StudyContext';

const Layout = () => {
  const { toast } = useStudy();

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <div className="max-w-[1220px] mx-auto p-8 max-md:p-6 max-sm:p-4 max-sm:pb-24">
          <Outlet />
        </div>
      </main>
      <MobileNav />
      <Toast toast={toast} />
    </div>
  );
};

export default Layout;
