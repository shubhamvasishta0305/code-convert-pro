import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

type NavItem = 'dash' | 'create' | 'att' | 'users' | 'reviews' | 'add_trainer';

interface SidebarProps {
  activeNav: NavItem;
  onNavigate: (nav: NavItem) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeNav, onNavigate }) => {
  const { user, logout } = useAuth();

  const navItems: Array<{ id: NavItem; icon: string; label: string; ownerOnly?: boolean }> = [
    { id: 'dash', icon: '🏠', label: 'Dashboard' },
    { id: 'create', icon: '📚', label: 'Create Batch' },
    { id: 'att', icon: '📅', label: 'Attendance' },
    { id: 'users', icon: '👥', label: 'Trainees' },
    { id: 'reviews', icon: '📝', label: 'Grading' },
    { id: 'add_trainer', icon: '👤', label: 'Add Trainer', ownerOnly: true },
  ];

  return (
    <aside className="w-[280px] bg-lms-primary text-white flex flex-col p-6 shrink-0 shadow-xl z-10">
      {/* Logo */}
      <div className="text-2xl font-extrabold mb-10 flex items-center gap-2">
        🦉 Einstein<span className="text-lms-accent">360</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1">
        {navItems.map((item) => {
          if (item.ownerOnly && user?.role !== 'Owner') return null;
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3.5 mb-2 rounded-xl transition-all duration-200 font-medium border-l-4",
                activeNav === item.id
                  ? "bg-lms-accent/10 text-lms-accent border-lms-accent"
                  : "text-slate-400 border-transparent hover:bg-lms-primary-light hover:text-white hover:pl-5"
              )}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="pt-5 border-t border-white/10">
        <div className="font-semibold">{user?.name || 'User Name'}</div>
        <div className="text-sm opacity-60">{user?.role || 'Role'}</div>
        <button
          onClick={logout}
          className="mt-4 w-full text-left bg-red-500/10 text-red-300 border-none py-2 px-3 rounded-lg text-sm cursor-pointer hover:bg-red-500/20 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
