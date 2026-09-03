import React, { useState, useEffect, useContext, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from './AuthContext';
import API from './api';
import { 
  Compass, 
  Award, 
  Users, 
  LayoutDashboard, 
  LogOut, 
  User, 
  FileCode, 
  Bell, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Trash2 
} from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 12000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await API.get('/user/notifications');
      setNotifications(res.data || []);
    } catch (err) {}
  };

  const handleDismiss = async (e, id) => {
    e.stopPropagation();
    try {
      await API.delete(`/user/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (err) {}
  };

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'StudyPath', path: '/studypath', icon: Compass },
    { name: 'SkillProof', path: '/skillproof', icon: Award },
    { name: 'StudySwap', path: '/studyswap', icon: Users },
    { name: 'Studio', path: '/studio', icon: FileCode }
  ];

  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-white text-lg shadow-lg group-hover:scale-105 transition">
            S
          </div>
          <span className="font-black text-xl tracking-wider text-white">
            SEEKER
          </span>
        </Link>

        {/* Center Links (Logged In) */}
        {user && (
          <nav className="hidden md:flex items-center gap-1.5">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    isActive 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {link.name}
                </Link>
              );
            })}
          </nav>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {/* Notification Bell with Badge */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 relative transition"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {notifications.length > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in">
                    <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs">
                      <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5 text-indigo-400" /> Notifications ({notifications.length})
                      </span>
                      <button 
                        onClick={() => { setShowDropdown(false); navigate('/studyswap'); }}
                        className="text-[11px] text-indigo-400 hover:underline"
                      >
                        View in StudySwap
                      </button>
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
                      {notifications.length === 0 ? (
                        <p className="text-xs text-slate-500 py-8 text-center">No new notifications</p>
                      ) : (
                        notifications.map((n) => (
                          <div 
                            key={n._id}
                            onClick={() => { setShowDropdown(false); navigate('/studyswap'); }}
                            className="p-3.5 hover:bg-slate-800/60 transition cursor-pointer flex items-start justify-between gap-3"
                          >
                            <div className="space-y-1 text-left">
                              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                                {n.type === 'HOST_CANCELLATION' ? (
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                )}
                                {n.title}
                              </h4>
                              <p className="text-[11px] text-slate-300 leading-snug">{n.message}</p>
                              <span className="text-[9px] font-mono text-slate-500 block">
                                {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            <button
                              onClick={(e) => handleDismiss(e, n._id)}
                              className="text-slate-500 hover:text-slate-300 p-1 shrink-0"
                              title="Dismiss"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Profile Pill */}
              <Link
                to="/profile"
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition border border-slate-700"
              >
                <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[11px] font-black uppercase">
                  {user.name?.charAt(0) || 'U'}
                </div>
                <span>Profile</span>
              </Link>

              {/* Logout */}
              <button
                onClick={logout}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-xl transition"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="text-xs font-bold text-slate-300 hover:text-white px-3 py-2 rounded-xl transition"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}