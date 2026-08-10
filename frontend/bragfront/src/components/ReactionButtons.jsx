import React, { useState, useRef, useEffect } from 'react';
import { FaThumbsUp, FaHandsClapping, FaStar } from 'react-icons/fa6';
import { getApiUrl } from '../utils/apiConfig';

const ReactionButtons = ({ targetId, targetType, initialReactions, onReact }) => {
    const [reactions, setReactions] = useState(initialReactions || { like_count: 0, clap_count: 0, star_count: 0, user_reactions: [], reactors: [] });
    const [loading, setLoading] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showReactors, setShowReactors] = useState(false);
    const menuTimeoutRef = useRef(null);

    const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

    useEffect(() => {
        if (initialReactions) setReactions(initialReactions);
    }, [initialReactions]);

    const handleMouseEnter = () => {
        if (menuTimeoutRef.current) clearTimeout(menuTimeoutRef.current);
        setShowMenu(true);
    };

    const handleMouseLeave = () => {
        // Add a slight delay before closing to make it easier to move mouse to the menu
        menuTimeoutRef.current = setTimeout(() => {
            setShowMenu(false);
        }, 300);
    };

    const handleToggle = async (e, reactionType) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (loading) return;
        if (!getToken()) {
            alert("Please login to react!");
            return;
        }

        const previousReactions = { ...reactions };
        const currentActiveType = reactions.user_reactions?.[0];
        const newReactions = { ...reactions };
        newReactions.user_reactions = [];

        if (currentActiveType === reactionType) {
            newReactions[`${reactionType}_count`] = Math.max(0, (newReactions[`${reactionType}_count`] || 0) - 1);
        } else {
            if (currentActiveType) {
                newReactions[`${currentActiveType}_count`] = Math.max(0, (newReactions[`${currentActiveType}_count`] || 0) - 1);
            }
            newReactions.user_reactions = [reactionType];
            newReactions[`${reactionType}_count`] = (newReactions[`${reactionType}_count`] || 0) + 1;
        }
        setReactions(newReactions);
        setShowMenu(false);

        setLoading(true);
        try {
            const res = await fetch(getApiUrl('/api/reactions/toggle'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
                body: JSON.stringify({ target_id: targetId, target_type: targetType, reaction_type: reactionType })
            });
            if (res.ok) {
                const newSummary = await res.json();
                setReactions(newSummary);
                if (onReact) onReact(newSummary);
            } else {
                setReactions(previousReactions);
            }
        } catch (error) {
            setReactions(previousReactions);
        } finally {
            setTimeout(() => setLoading(false), 200);
        }
    };

    const reactionConfig = [
        { type: 'like', icon: <FaThumbsUp />, activeColor: 'text-blue-500', bgColor: 'bg-blue-500/10', label: 'Like' },
        { type: 'clap', icon: <FaHandsClapping />, activeColor: 'text-orange-500', bgColor: 'bg-orange-500/10', label: 'Celebrate' },
        { type: 'star', icon: <FaStar />, activeColor: 'text-yellow-400', bgColor: 'bg-yellow-400/10', label: 'Star' },
    ];

    const currentActive = reactionConfig.find(r => reactions.user_reactions?.[0] === r.type) || reactionConfig[0];
    const totalCount = (reactions.like_count || 0) + (reactions.clap_count || 0) + (reactions.star_count || 0);

    return (
        <div className="flex flex-col gap-3 w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-4">
                {/* Main Action Button Container */}
                <div
                    className="relative group/main"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    {/* Floating Reaction Menu */}
                    {showMenu && (
                        <div className="absolute bottom-full left-0 pb-4 z-[9999] animate-slide-up">
                            <div className="flex gap-2 p-2 bg-brand-dark/95 border border-white/10 backdrop-blur-2xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                                {reactionConfig.map(reac => (
                                    <button
                                        key={reac.type}
                                        onClick={(e) => handleToggle(e, reac.type)}
                                        className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all hover:scale-125 active:scale-95 ${reac.type === reactions.user_reactions?.[0] ? reac.bgColor : 'hover:bg-white/10 text-slate-400'}`}
                                        title={reac.label}
                                    >
                                        <span className={`text-xl ${reac.type === reactions.user_reactions?.[0] ? reac.activeColor : ''}`}>{reac.icon}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <button
                        onClick={(e) => handleToggle(e, reactions.user_reactions?.[0] || 'like')}
                        disabled={loading}
                        className={`flex items-center gap-2.5 px-6 py-2.5 rounded-2xl transition-all duration-300 font-extrabold text-xs uppercase tracking-widest border border-brand-primary/10 shadow-inner group ${reactions.user_reactions?.length > 0
                            ? `${currentActive.activeColor} ${currentActive.bgColor} border-current shadow-lg scale-[1.02]`
                            : 'text-slate-400 border-white/5 hover:bg-white/5'
                            }`}
                    >
                        <span className={`text-lg transition-transform group-hover:scale-125 ${reactions.user_reactions?.length > 0 ? 'animate-bounce-subtle' : ''}`}>
                            {currentActive.icon}
                        </span>
                        {reactions.user_reactions?.length > 0 ? currentActive.label : 'Like'}
                    </button>
                </div>

                {/* Counter / Reactors List Toggle */}
                {totalCount > 0 && (
                    <button
                        onClick={() => setShowReactors(!showReactors)}
                        className="flex -space-x-1.5 items-center group/reactors hover:opacity-80 transition-opacity"
                    >
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/5 rounded-full">
                            <div className="flex -space-x-1 mr-1">
                                {reactions.like_count > 0 && <span className="text-blue-500 scale-75"><FaThumbsUp /></span>}
                                {reactions.clap_count > 0 && <span className="text-orange-500 scale-75"><FaHandsClapping /></span>}
                                {reactions.star_count > 0 && <span className="text-yellow-400 scale-75"><FaStar /></span>}
                            </div>
                            <span className="text-xs font-black text-slate-400 group-hover/reactors:text-white transition-colors">{totalCount}</span>
                        </div>
                    </button>
                )}
            </div>

            {/* Expansible Reactors List */}
            {showReactors && reactions.reactors?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-3 rounded-2xl bg-black/20 border border-white/5 animate-fade-in max-h-32 overflow-y-auto custom-scrollbar">
                    {reactions.reactors.map((r, i) => (
                        <div key={i} className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-lg border border-white/5 group/react">
                            <span className={`text-[10px] ${r.reaction_type === 'like' ? 'text-blue-500' :
                                r.reaction_type === 'clap' ? 'text-orange-500' : 'text-yellow-400'
                                }`}>
                                {r.reaction_type === 'like' ? <FaThumbsUp /> : r.reaction_type === 'clap' ? <FaHandsClapping /> : <FaStar />}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">{r.name}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ReactionButtons;
