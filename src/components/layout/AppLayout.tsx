import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Home, PlusCircle, Activity, User, ShieldAlert, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, orderBy, onSnapshot, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { handleFirestoreError } from '../../lib/firestoreError';
import { OperationType } from '../../lib/firestoreError';
import { UserAvatar } from '../UserAvatar';

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, user, userData, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    const q = query(
      collection(db, 'users', user.uid, 'notifications'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs: any[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        let timeString = 'Just now';
        if (data.createdAt) {
          const date = data.createdAt.toDate();
          const now = new Date();
          const diffStr = Math.round((now.getTime() - date.getTime()) / 60000);
          if (diffStr < 60) timeString = `${diffStr}m ago`;
          else if (diffStr < 1440) timeString = `${Math.round(diffStr / 60)}h ago`;
          else timeString = `${Math.round(diffStr / 1440)}d ago`;
        }
        notifs.push({
          id: doc.id,
          title: data.title,
          message: data.message,
          isNew: data.isNew,
          time: timeString
        });
      });
      setNotifications(notifs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/notifications`);
    });
    return () => unsubscribe();
  }, [user]);

  const unreadCount = notifications.filter(n => n.isNew).length;

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      notifications.filter(n => n.isNew).forEach(n => {
        const ref = doc(db, 'users', user.uid, 'notifications', n.id);
        batch.update(ref, { isNew: false });
      });
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/notifications`);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-100 mx-auto max-w-md shadow-2xl relative overflow-hidden">
      {/* Sidebar Menu Overlay */}
      {isMenuOpen && (
        <div className="absolute inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/20" onClick={() => setIsMenuOpen(false)} />
          <div className="relative w-64 bg-white h-full flex flex-col shadow-xl animate-in slide-in-from-left duration-200">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Menu</h2>
              <button onClick={() => setIsMenuOpen(false)} className="p-1 text-gray-500 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-col flex-1 gap-2 p-4">
              <SidebarItem to="/" icon={<Home className="w-5 h-5" />} label="Home" onClick={() => setIsMenuOpen(false)} />
              <SidebarItem to="/report" icon={<PlusCircle className="w-5 h-5" />} label="Report Issue" onClick={() => setIsMenuOpen(false)} />
              {role === 'admin' && (
                <SidebarItem to="/admin" icon={<ShieldAlert className="w-5 h-5" />} label="Admin Dashboard" onClick={() => setIsMenuOpen(false)} />
              )}
              <SidebarItem to="/track" icon={<Activity className="w-5 h-5" />} label="Track Complaints" onClick={() => setIsMenuOpen(false)} />
              <SidebarItem to="/profile" icon={<User className="w-5 h-5" />} label="Profile" onClick={() => setIsMenuOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Top Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 z-10 sticky top-0">
        <div className="flex items-center gap-2">
          <button onClick={() => setIsMenuOpen(true)} className="p-1 -ml-1 text-gray-700 rounded-lg hover:bg-gray-100">
            <MenuIcon className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-lg text-gray-900 tracking-tight">
            SmartNagar AI
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <div className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 font-medium border border-blue-100 flex items-center gap-1">
                {role === 'admin' ? <ShieldAlert className="w-3 h-3"/> : <User className="w-3 h-3"/>}
                {role === 'admin' ? 'Admin' : 'Citizen'}
              </div>
              <div className="relative">
                <Bell 
                  className="h-5 w-5 text-gray-600 cursor-pointer" 
                  onClick={() => setIsNotificationOpen(true)}
                />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border border-white flex items-center justify-center text-[10px] text-white font-bold">
                    {unreadCount}
                  </span>
                )}
              </div>
              <UserAvatar 
                photoURL={userData?.photoURL || user?.photoURL}
                name={userData?.name || user?.displayName}
                email={user?.email}
                onClick={() => navigate('/profile')}
                className="h-8 w-8 text-xs ring-2 ring-transparent hover:ring-blue-500 cursor-pointer transition-all"
                title="Go to profile"
              />
            </>
          ) : (
            <button 
              onClick={() => navigate('/auth')}
              className="text-xs bg-blue-600 text-white font-medium px-4 py-1.5 rounded-full hover:bg-blue-700 transition active:scale-95"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-20 no-scrollbar">
        <Outlet />
      </main>

      {/* Notifications Overlay */}
      {isNotificationOpen && (
        <div className="absolute inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20" onClick={() => setIsNotificationOpen(false)} />
          <div className="relative w-80 bg-white h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200 z-50 rounded-l-2xl">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-blue-600 text-white rounded-tl-2xl">
              <div>
                <h2 className="font-bold flex items-center gap-2">
                  Notifications
                  {unreadCount > 0 && <span className="bg-white text-blue-600 text-xs px-2 py-0.5 rounded-full">{unreadCount}</span>}
                </h2>
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="text-xs hover:text-blue-100 transition mr-2 font-medium">
                    Mark all read
                  </button>
                )}
                <button onClick={() => setIsNotificationOpen(false)} className="p-1 hover:bg-white/20 rounded-lg transition">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-slate-50/50">
              {notifications.length === 0 ? (
                <div className="text-center text-gray-500 my-10 text-sm">No notifications yet.</div>
              ) : (
                notifications.map(n => (
                  <NotificationItem 
                    key={n.id} 
                    title={n.title} 
                    message={n.message} 
                    time={n.time} 
                    isNew={n.isNew} 
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-2 flex justify-between items-center rounded-t-2xl z-20 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
        <NavItem to="/" icon={<Home className="h-5 w-5" />} label="Home" active={location.pathname === '/'} />
        <NavItem to="/report" icon={<PlusCircle className="h-5 w-5" />} label="Report" active={location.pathname === '/report'} />
        {role === 'admin' && (
          <NavItem to="/admin" icon={<ShieldAlert className="h-5 w-5" />} label="Admin" active={location.pathname === '/admin'} />
        )}
        <NavItem to="/track" icon={<Activity className="h-5 w-5" />} label="Track" active={location.pathname === '/track'} />
        <NavItem to="/profile" icon={<User className="h-5 w-5" />} label="Profile" active={location.pathname === '/profile'} />
      </nav>
    </div>
  );
}

function NavItem({ to, icon, label, active }: { to: string, icon: React.ReactNode, label: string, active: boolean }) {
  return (
    <NavLink 
      to={to} 
      className={cn(
        "flex flex-col items-center gap-1 p-2 transition-colors",
        active ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
      )}
    >
      <div className={cn(
        "p-1.5 rounded-full transition-all",
        active ? "bg-blue-50" : "bg-transparent"
      )}>
        {icon}
      </div>
      <span className="text-[10px] font-medium">{label}</span>
    </NavLink>
  );
}

function SidebarItem({ to, icon, label, onClick }: { to: string, icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) => cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-colors",
        isActive ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      )}
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

const NotificationItem: React.FC<{ title: string, message: string, time: string, isNew: boolean }> = ({ title, message, time, isNew }) => {
  return (
    <div className={cn("p-3 rounded-xl border", isNew ? "bg-blue-50/50 border-blue-100" : "bg-white border-gray-100")}>
      <div className="flex justify-between items-start gap-2 mb-1">
        <h4 className={cn("text-sm font-semibold", isNew ? "text-blue-900" : "text-gray-900")}>{title}</h4>
        {isNew && <span className="w-2 h-2 rounded-full bg-blue-500 mt-1 flex-shrink-0" />}
      </div>
      <p className="text-xs text-gray-600 line-clamp-2">{message}</p>
      <span className="text-[10px] text-gray-400 mt-2 block font-medium">{time}</span>
    </div>
  );
};
