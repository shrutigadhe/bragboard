import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaBullhorn } from 'react-icons/fa';
import ShoutoutFeed from '../components/ShoutoutFeed';
import ShoutoutFilters from '../components/ShoutoutFilters';
import ShoutoutForm from '../components/ShoutoutForm';
import { useToast } from '../context/ToastContext';
import { getApiUrl } from '../utils/apiConfig';

const ShoutoutPage = () => {
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [shoutouts, setShoutouts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [colleagues, setColleagues] = useState([]);
    const [showShoutoutModal, setShowShoutoutModal] = useState(false);
    const [filters, setFilters] = useState({
        department_id: '',
        user_id: '',
        date: ''
    });
    const [sortOrder, setSortOrder] = useState('default');

    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    const fetchData = React.useCallback(async () => {
        if (!token) { navigate('/login'); return; }
        setLoading(true);
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            const userRes = await fetch(getApiUrl('/api/me'), { headers });
            if (userRes.ok) {
                const userData = await userRes.json();
                setCurrentUserId(userData.id);
                setIsAdmin(userData.role === 'admin');
            }

            const colRes = await fetch(getApiUrl('/api/departments/colleagues'), { headers });
            if (colRes.ok) setColleagues(await colRes.json());

            const queryParams = new URLSearchParams();
            if (filters.department_id) queryParams.append('department_id', filters.department_id);
            if (filters.user_id) queryParams.append('user_id', filters.user_id);
            if (filters.date) queryParams.append('date', filters.date);

            const res = await fetch(`/api/shoutouts/?${queryParams.toString()}`, { headers });
            if (res.ok) setShoutouts(await res.json());

        } catch (err) { console.error(err); } finally { setLoading(false); }
    }, [token, navigate, filters]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleDeleteShoutout = async (id) => {
        if (!window.confirm("Delete this shoutout?")) return;
        try {
            const res = await fetch(`/api/shoutouts/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                addToast("Shoutout deleted", "success");
                setShoutouts(shoutouts.filter(s => s.id !== id));
            }
        } catch (error) { console.error(error); }
    };

    const sortedShoutouts = React.useMemo(() => {
        if (sortOrder === 'default') return shoutouts;
        return [...shoutouts].sort((a, b) => {
            const dateA = new Date(a.created_at);
            const dateB = new Date(b.created_at);
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });
    }, [shoutouts, sortOrder]);

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-brand-dark">
            <div className="w-16 h-16 rounded-full border-4 border-brand-primary/20 border-t-brand-primary animate-spin shadow-[0_0_20px_rgba(34,211,238,0.2)]" />
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20 px-4">
            {/* Header */}
            <div className="flex items-center justify-between p-8 lumina-card relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent" />
                <div className="flex items-center gap-6 relative z-10">
                    <button onClick={() => navigate('/dashboard')} className="w-12 h-12 flex items-center justify-center rounded-2xl lumina-glass text-slate-400 hover:text-brand-primary transition-all border border-white/5">
                        <FaArrowLeft />
                    </button>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <FaBullhorn className="text-purple-500 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Shoutouts</h1>
                        </div>
                        <p className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-[0.3em]">Recognize your peers</p>
                    </div>
                </div>
                <div className="hidden md:flex items-center gap-4 relative z-10">
                    <button
                        onClick={() => setShowShoutoutModal(true)}
                        className="px-6 py-3 bg-brand-primary text-brand-dark font-black text-xs uppercase tracking-widest rounded-xl hover:scale-105 transition-transform shadow-lg shadow-brand-primary/20"
                    >
                        New Shoutout
                    </button>
                </div>
            </div>

            <div className="space-y-6">
                <ShoutoutFilters
                    filters={filters}
                    onFilterChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
                    sortOrder={sortOrder}
                    onSortChange={setSortOrder}
                />

                <ShoutoutFeed
                    shoutouts={sortedShoutouts}
                    currentUserId={currentUserId}
                    isAdmin={isAdmin}
                    onDelete={handleDeleteShoutout}
                    colleagues={colleagues}
                    onUpdate={fetchData}
                    onReact={(shoutoutId, newReactions) => {
                        setShoutouts(prev => prev.map(s => {
                            if (s.id === shoutoutId) return { ...s, reactions: newReactions };
                            return s;
                        }));
                    }}
                />
            </div>

            {showShoutoutModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-dark/50 backdrop-blur-xl animate-fade-in">
                    <div className="lumina-card w-full max-w-lg overflow-hidden relative border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Give a Shout-out</h3>
                            <button onClick={() => setShowShoutoutModal(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 text-slate-900 dark:text-white hover:bg-white/10 transition-all">
                                X
                            </button>
                        </div>
                        <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <ShoutoutForm
                                colleagues={colleagues}
                                onShoutoutCreated={() => {
                                    fetchData();
                                    setShowShoutoutModal(false);
                                }}
                                compact={true}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShoutoutPage;
