import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBell, FaCheckDouble, FaCircle, FaHeart, FaCommentDots, FaBullhorn } from 'react-icons/fa';
import { getApiUrl } from '../utils/apiConfig';

const NotificationCenter = () => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef(null);
    const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

    const fetchNotifications = async () => {
        const currentToken = getToken();
        if (!currentToken) return;
        try {
            const res = await fetch(getApiUrl('/api/notifications/'), {
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
                setUnreadCount(data.filter(n => n.is_read === 0).length);
            }
        } catch (error) {
            console.error("Error fetching notifications", error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, [getToken()]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAsRead = async (id) => {
        try {
            const res = await fetch(getApiUrl(`/api/notifications/${id}/read`), {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            if (res.ok) {
                fetchNotifications();
            }
        } catch (error) {
            console.error("Error marking as read", error);
        }
    };

    const markAllRead = async () => {
        try {
            const res = await fetch(getApiUrl('/api/notifications/read-all'), {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            if (res.ok) {
                fetchNotifications();
            }
        } catch (error) {
            console.error("Error marking all read", error);
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'reaction': return <FaHeart className="text-pink-500" />;
            case 'comment': return <FaCommentDots className="text-blue-500" />;
            default: return <FaBullhorn className="text-brand-primary" />;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative w-12 h-12 flex items-center justify-center lumina-glass text-slate-400 hover:text-brand-primary transition-all rounded-xl border border-white/5 active:scale-95 shadow-2xl"
            >
                <FaBell className="text-xl" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-lg bg-brand-primary text-[10px] font-black text-white dark:text-brand-dark shadow-[0_0_10px_rgba(34,211,238,0.6)] border border-white dark:border-brand-dark">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-4 w-96 lumina-card overflow-hidden z-[9999] animate-fade-in border border-black/5 dark:border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] bg-slate-900/95 backdrop-blur-3xl">
                    <div className="p-6 border-b border-black/5 dark:border-white/5 flex justify-between items-center text-white">
                        <h3 className="font-black text-white tracking-tight">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllRead}
                                className="text-[10px] uppercase tracking-[0.2em] font-black text-brand-primary hover:text-white flex items-center gap-2 transition-colors"
                            >
                                <FaCheckDouble /> Mark All Read
                            </button>
                        )}
                    </div>
                    <div className="max-h-[500px] overflow-y-auto custom-scrollbar divide-y divide-white/[0.03]">
                        {notifications.length === 0 ? (
                            <div className="p-16 text-center space-y-4">
                                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto border border-white/5">
                                    <FaBell className="text-2xl text-slate-700" />
                                </div>
                                <p className="text-xs font-black text-slate-600 uppercase tracking-widest italic">No notifications yet.</p>
                            </div>
                        ) : (
                            notifications.map(notif => (
                                <div
                                    key={notif.id}
                                    onClick={() => {
                                        markAsRead(notif.id);
                                        setIsOpen(false);
                                        if (notif.source_id) {
                                            if (notif.message.includes('shoutout')) {
                                                navigate(`/dashboard?shoutoutId=${notif.source_id}`);
                                            } else {
                                                navigate(`/dashboard?bragId=${notif.source_id}`);
                                            }
                                        } else {
                                            navigate('/dashboard');
                                        }
                                    }}
                                    className={`p-6 hover:bg-white/[0.05] transition-all cursor-pointer flex gap-5 group relative ${notif.is_read === 0 ? 'bg-white/[0.02]' : ''}`}
                                >
                                    <div className="mt-1 flex-shrink-0 text-xl">
                                        {getIcon(notif.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm leading-relaxed ${notif.is_read === 0 ? 'text-white font-black' : 'text-slate-500 font-medium'}`}>
                                            {notif.message}
                                        </p>
                                        <div className="flex items-center gap-3 mt-2">
                                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded">
                                                {new Date(notif.created_at).toLocaleDateString()}
                                            </span>
                                            <span className="text-[9px] font-black text-brand-primary/40 uppercase tracking-widest">
                                                {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                    {notif.is_read === 0 && (
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                            <FaCircle className="text-[6px] text-brand-primary animate-pulse" />
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                    <div className="p-4 bg-white/[0.02] border-t border-white/5 text-center">
                        <button onClick={() => setIsOpen(false)} className="text-[9px] font-black text-slate-600 hover:text-slate-400 uppercase tracking-[0.3em] transition-colors">
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationCenter;
