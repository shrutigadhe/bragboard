import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { FaHome, FaUser, FaUsers, FaBuilding, FaSignOutAlt, FaMoon, FaSun, FaShieldAlt, FaCrown } from 'react-icons/fa';

import NotificationCenter from './NotificationCenter';
import EditProfileModal from './EditProfileModal';

/**
 * Layout Component
 * The shared shell for all protected pages.
 * Renders:
 *   - A floating sidebar (desktop) with navigation links
 *   - A sticky top header with theme toggle, notification bell, and profile button
 *   - <Outlet /> — where the current child page (Dashboard, Profile, etc.) is rendered
 *
 * Also handles:
 *   - Loading and persisting the dark/light theme preference
 *   - Fetching the current logged-in user's info from /api/me
 *   - Logout functionality
 *   - Click-outside detection for the profile dropdown
 */
const Layout = () => {
    const navigate = useNavigate();
    const location = useLocation();  // Used to highlight the active nav item

    // ── STATE ──
    const [theme, setTheme] = useState('light');               // Current theme: 'light' or 'dark'
    const [user, setUser] = useState(null);                    // Logged-in user data (from /api/me)
    const [showProfileDropdown, setShowProfileDropdown] = useState(false); // Profile dropdown visibility
    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);     // Edit profile modal visibility
    const profileRef = useRef(null);  // Ref for click-outside detection on the profile dropdown

    // ── ON MOUNT: Load theme + fetch current user ──
    useEffect(() => {
        // Restore saved theme from localStorage (persists across browser sessions)
        const savedTheme = localStorage.getItem('theme') || 'light';
        setTheme(savedTheme);
        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        // Fetch the currently logged-in user's profile from the backend
        const fetchUser = async () => {
            // Token can be in localStorage (remembered) or sessionStorage (session only)
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            if (token) {
                try {
                    const res = await fetch('/api/me', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) setUser(await res.json());
                } catch (e) { console.error(e); }
            }
        };
        fetchUser();

        // Listen for a custom event dispatched when the user updates their profile
        // This forces the sidebar avatar/name to refresh without a page reload
        window.addEventListener('profileUpdated', fetchUser);

        // Click-outside handler — closes the profile dropdown when clicking elsewhere on the page
        const handleClickOutside = (event) => {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setShowProfileDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        // Cleanup: remove event listeners when the component unmounts
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('profileUpdated', fetchUser);
        };
    }, []);

    /**
     * toggleTheme
     * Switches between light and dark mode.
     * Saves the preference to localStorage so it persists across sessions.
     * Adds/removes the 'dark' class on <html> which activates Tailwind's dark mode styles.
     */
    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);

        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    /**
     * handleLogout
     * Clears both localStorage and sessionStorage tokens and redirects to login.
     */
    const handleLogout = () => {
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        navigate('/login');
    };

    // ── NAVIGATION ITEMS ──
    // Define the sidebar nav links — icon, label, and route path
    const navItems = [
        { path: '/dashboard', label: 'Dashboard', icon: <FaHome /> },
        { path: '/shoutouts', label: 'Shoutouts', icon: <FaUsers /> },
        { path: '/leaderboard', label: 'Leaderboard', icon: <FaCrown className="text-yellow-500" /> },
        { path: '/profile', label: 'My Profile', icon: <FaUser /> },
    ];

    // Dynamically add the Admin Panel link only if the user has admin role
    if (user?.role === 'admin') {
        navItems.push({ path: '/admin', label: 'Admin Panel', icon: <FaShieldAlt className="text-brand-secondary" /> });
    }

    return (
        <div className={`flex h-screen font-sans overflow-hidden transition-colors duration-500 ${theme === 'dark' ? 'bg-brand-dark text-white' : 'bg-slate-50 text-slate-900'}`}>

            {/* ── FLOATING SIDEBAR (desktop only — hidden on mobile) ── */}
            <div className="hidden md:flex flex-col p-6 pr-0">
                <aside className="w-64 lumina-glass flex flex-col z-20 transition-all duration-500 rounded-[2.5rem] relative h-full">

                    {/* Logo Area */}
                    <div className="p-8 pb-4">
                        <div className="flex items-center gap-3 lumina-glow">
                            <div className="w-10 h-10 bg-gradient-to-tr from-brand-primary to-brand-secondary rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-brand-primary/20">
                                BB
                            </div>
                            <span className={`text-2xl font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                BragBoard
                            </span>
                        </div>
                    </div>

                    {/* Navigation Links — renders each item from navItems array */}
                    <nav className="flex-1 overflow-y-auto px-6 py-8 space-y-2 custom-scrollbar">
                        <p className="px-4 text-xs font-black text-slate-500 dark:text-white/90 uppercase tracking-[0.2em] mb-4">Core</p>
                        {navItems.map((item) => {
                            // Highlight the link that matches the current URL path
                            const isActive = location.pathname === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group ${isActive
                                        ? 'bg-gradient-to-r from-brand-primary/20 to-transparent text-brand-primary border-l-2 border-brand-primary font-bold'
                                        : 'text-slate-600 dark:text-white hover:text-slate-900 dark:hover:text-white/80 hover:bg-black/5 dark:hover:bg-white/5'
                                        }`}
                                >
                                    <span className={`text-xl transition-all ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]' : ''}`}>
                                        {item.icon}
                                    </span>
                                    <span className="text-sm tracking-wide">{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Sidebar Footer — Logout button */}
                    <div className="p-6 mt-auto space-y-4">
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 text-slate-500 dark:text-slate-400 hover:bg-red-500/10 hover:text-red-500 group"
                        >
                            <span className="text-xl group-hover:scale-110 transition-transform">
                                <FaSignOutAlt />
                            </span>
                            <span className="text-sm tracking-wide font-bold">Logout</span>
                        </button>
                    </div>
                </aside>
            </div>

            {/* ── MAIN CONTENT AREA ── */}
            <main className="flex-1 relative overflow-y-auto custom-scrollbar">
                {/* Decorative blurred background circles (nebula effect) */}
                <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-primary/5 rounded-full blur-[120px] pointer-events-none" />
                <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-brand-secondary/5 rounded-full blur-[150px] pointer-events-none" />

                <div className="relative p-6 md:p-12 max-w-7xl mx-auto min-h-full">

                    {/* ── STICKY TOP HEADER ── */}
                    {/* Contains theme toggle, notification bell, and profile avatar button */}
                    <header className="flex justify-between items-center mb-8 sticky top-0 z-40 py-4 bg-slate-50/80 dark:bg-brand-dark/80 backdrop-blur-xl -mx-6 px-6 md:-mx-12 md:px-12 transition-all border-b border-black/5 dark:border-white/5">
                        <div className="flex-1" /> {/* Spacer — pushes action buttons to the right */}
                        <div className="flex actions items-center gap-4">
                            {/* Theme toggle button — shows moon (light mode) or sun (dark mode) */}
                            <button
                                onClick={toggleTheme}
                                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all border ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-brand-primary border-white/5' : 'bg-slate-200 hover:bg-slate-300 text-brand-dark border-slate-300'}`}
                                title="Toggle Theme"
                            >
                                {theme === 'light' ? <FaMoon /> : <FaSun />}
                            </button>

                            {/* Notification bell — shows unread count badge */}
                            <NotificationCenter />

                            {/* Profile avatar button — shows profile picture or initials */}
                            {/* Clicking navigates to the /profile page */}
                            <button
                                onClick={() => navigate('/profile')}
                                className={`w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-sm font-bold lumina-glow overflow-hidden hover:scale-105 transition-transform ${theme === 'dark' ? 'bg-gradient-to-br from-brand-primary/20 to-brand-secondary/20 text-white' : 'bg-slate-200 text-slate-700'}`}
                                title="Go to Profile"
                            >
                                {user?.profile_picture ? (
                                    // If profile picture is set, show it as a circular thumbnail
                                    <img src={user.profile_picture} alt={user.name} className="w-full h-full object-cover" />
                                ) : (
                                    // Otherwise, show the first letter of the user's name as a fallback
                                    user?.name ? user.name.charAt(0).toUpperCase() : <FaUser />
                                )}
                            </button>
                        </div>
                    </header>

                    {/* ── PAGE CONTENT ── */}
                    {/* React Router renders the matched child route here */}
                    <Outlet />
                </div>
            </main>

            {/* Edit Profile Modal — controlled by isEditProfileOpen state */}
            <EditProfileModal
                isOpen={isEditProfileOpen}
                onClose={() => setIsEditProfileOpen(false)}
                user={user}
                onUpdate={setUser}
            />
        </div >
    );
};

export default Layout;
