import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaUsers, FaTrash, FaQuoteLeft, FaStar } from 'react-icons/fa';
import BragModal from '../components/BragModal';

const DepartmentFeed = () => {
    const navigate = useNavigate();
    const [brags, setBrags] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [selectedBrag, setSelectedBrag] = useState(null);

    useEffect(() => {
        const fetchBrags = async () => {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            if (!token) { navigate('/login'); return; }
            try {
                const headers = { 'Authorization': `Bearer ${token}` };
                const userRes = await fetch('/api/me', { headers });
                if (userRes.ok) {
                    const userData = await userRes.json();
                    setCurrentUserId(userData.id);
                    setIsAdmin(userData.role === 'admin');
                }
                const res = await fetch('/api/brags/department', { headers });
                if (res.ok) setBrags(await res.json());
            } catch (err) { console.error(err); } finally { setLoading(false); }
        };
        fetchBrags();
    }, [navigate]);

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this brag?")) return;
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const res = await fetch(`/api/brags/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setBrags(brags.filter(b => b.id !== id));
        } catch (error) { console.error(error); }
    };

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-brand-dark">
            <div className="w-16 h-16 rounded-full border-4 border-brand-primary/20 border-t-brand-primary animate-spin shadow-[0_0_20px_rgba(34,211,238,0.2)]" />
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto space-y-10 animate-fade-in pb-20 px-4">

            {/* Header Fragment */}
            <div className="flex items-center justify-between p-8 lumina-card relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/5 to-transparent" />
                <div className="flex items-center gap-6 relative z-10">
                    <button onClick={() => navigate('/dashboard')} className="w-12 h-12 flex items-center justify-center rounded-2xl lumina-glass text-slate-400 hover:text-brand-primary transition-all border border-white/5">
                        <FaArrowLeft />
                    </button>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <FaUsers className="text-brand-primary drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Department Feed</h1>
                        </div>
                        <p className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-[0.3em]">Latest updates from your team</p>
                    </div>
                </div>
                <div className="hidden md:flex items-center gap-4 relative z-10">
                    <div className="px-5 py-2 lumina-glass rounded-xl border border-white/5 text-brand-primary text-[10px] font-black uppercase tracking-widest">
                        {brags.length} Brags
                    </div>
                </div>
            </div>

            {/* The Stream */}
            <div className="space-y-8">
                {brags.length === 0 ? (
                    <div className="text-center p-20 lumina-card flex flex-col items-center italic text-slate-500">
                        <FaStar className="text-4xl mb-6 opacity-10 animate-pulse" />
                        <p className="text-xl font-bold tracking-tight">No brags to show yet.</p>
                        <p className="text-sm mt-2 opacity-60">Be the first to post something!</p>
                    </div>
                ) : (
                    brags.map((brag, idx) => (
                        <div
                            key={brag.id}
                            onClick={() => setSelectedBrag(brag)}
                            className="lumina-card group relative p-1 transform transition-all hover:scale-[1.01] cursor-pointer animate-slide-up"
                            style={{ animationDelay: `${idx * 150}ms` }}
                        >
                            <div className="bg-black/[0.01] dark:bg-white/[0.02] rounded-[1.8rem] p-8 relative overflow-hidden border border-black/5 dark:border-white/5">
                                {/* Depth Interaction Card */}
                                <div className="absolute right-0 top-0 w-64 h-64 bg-brand-primary/5 rounded-full blur-[100px] pointer-events-none group-hover:scale-150 transition-transform duration-1000" />

                                <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">

                                    <div className="relative flex-shrink-0">
                                        <div className="w-12 h-12 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary font-black text-lg">
                                            {brag.author_name ? brag.author_name.charAt(0).toUpperCase() : '?'}
                                        </div>
                                    </div>

                                    <div className="flex-1 min-w-0 flex flex-col">
                                        <div className="flex justify-between items-start mb-6 w-full">
                                            <div>
                                                <h3 className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-brand-primary transition-colors tracking-tight leading-none mb-1">
                                                    {brag.title}
                                                </h3>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{currentUserId === brag.user_id ? 'You' : brag.author_name}</span>
                                                    <span className="w-1 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
                                                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest italic">{new Date(brag.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                            {currentUserId === brag.user_id && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(brag.id); }}
                                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all border border-white/5"
                                                    title="Delete"
                                                >
                                                    <FaTrash className="text-sm" />
                                                </button>
                                            )}
                                        </div>

                                        <div className="relative">
                                            <FaQuoteLeft className="absolute -left-6 -top-2 text-black/5 dark:text-white/5 text-6xl" />
                                            <p className="text-slate-700 dark:text-slate-300 relative z-10 text-lg leading-relaxed font-medium line-clamp-4">
                                                "{brag.content}"
                                            </p>
                                        </div>

                                        {brag.image_url && (
                                            <div className="mt-8 relative group/img overflow-hidden rounded-2xl border border-white/5 shadow-2xl">
                                                <div className="absolute inset-0 bg-brand-primary/10 opacity-0 group-hover/img:opacity-100 transition-opacity z-10" />
                                                <img src={brag.image_url} alt="Brag attachment" className="max-h-60 w-full object-cover group-hover/img:scale-105 transition-transform duration-1000" />
                                            </div>
                                        )}

                                        {brag.tags && (
                                            <div className="flex flex-wrap gap-3 mt-8">
                                                {brag.tags.split(',').map((tag, idx) => (
                                                    <div key={idx} className="px-4 py-1.5 rounded-xl bg-white/5 border border-white/5 text-[9px] font-black text-brand-primary uppercase tracking-[0.15em] hover:border-brand-primary/30 transition-colors">
                                                        #{tag.trim()}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {/* Decorative Aurora Line */}
                            <div className="absolute bottom-0 left-10 right-10 h-[2px] bg-gradient-to-r from-transparent via-brand-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    ))
                )}
            </div>

            <BragModal
                brag={selectedBrag}
                onClose={() => setSelectedBrag(null)}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                onDelete={handleDelete}
                onUpdate={(u) => setBrags(brags.map(b => b.id === u.id ? u : b))}
            />
        </div>
    );
};

export default DepartmentFeed;
