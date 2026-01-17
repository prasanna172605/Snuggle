import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, MessageCircle, User, Plus, Bell } from 'lucide-react';

interface BottomNavProps {
  unreadCount: number;
}

const BottomNav: React.FC<BottomNavProps> = ({ unreadCount }) => {
  const NavItem = ({ to, icon: Icon }: { to: string; icon: any }) => {
    return (
      <NavLink
        to={to}
        className={({ isActive }) =>
          `flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ${isActive ? 'bg-black text-white shadow-lg scale-110' : 'text-gray-400 hover:bg-gray-100'
          }`
        }
      >
        {({ isActive }) => (
          <div className="relative">
            <Icon className={`w-6 h-6 ${isActive ? 'stroke-2' : 'stroke-[1.5]'}`} />
            {to === '/notifications' && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            )}
          </div>
        )}
      </NavLink>
    );
  };

  return (
    <div className="fixed bottom-6 left-0 right-0 flex justify-center z-30 pointer-events-none">
      <div className="bg-white/90 backdrop-blur-xl border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-full px-2 py-2 flex items-center gap-2 pointer-events-auto max-w-[95%] overflow-x-auto">

        <NavItem to="/" icon={Home} />
        <NavItem to="/messages" icon={MessageCircle} />

        {/* Create Button - Centered & Distinct */}
        <NavLink
          to="/create"
          className="w-14 h-14 bg-snuggle-500 hover:bg-snuggle-600 rounded-full flex items-center justify-center shadow-lg hover:shadow-snuggle-500/40 transition-all transform hover:scale-105 active:scale-95 mx-2 flex-shrink-0"
        >
          <Plus className="w-8 h-8 text-white" />
        </NavLink>

        <NavItem to="/notifications" icon={Bell} />
        <NavItem to="/profile" icon={User} />

      </div>
    </div>
  );
};

export default BottomNav;
