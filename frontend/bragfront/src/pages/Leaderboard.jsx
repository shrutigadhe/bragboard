import React, { useState, useEffect } from 'react';
import { FaCrown, FaStar, FaFire } from 'react-icons/fa';

const Leaderboard = () => {
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchLeaderboard = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch('/api/admin/leaderboard', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setLeaderboard(await res.json());
            }
        } catch (err) {
            console.error('Error fetching leaderboard', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaderboard();
    }, []);

    if (loading) return <div className="flex justify-center items-center h-64 text-brand-primary">Calculating rankings...</div>;

    const topThree = leaderboard.slice(0, 3);
    const others = leaderboard.slice(3);

    return (
        <div className="space-y-12 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="text-center space-y-4">
                <div className="inline-flex items-center gap-3 px-6 py-2 bg-yellow-500/10 text-yellow-500 rounded-full border border-yellow-500/20 font-black text-xs uppercase tracking-[0.2em] animate-pulse">
                    <FaCrown /> Hall of Fame
                </div>
                <h1 className="text-5xl font-black tracking-tighter bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
                    Appreciation Leaderboard
                </h1>
                <p className="text-slate-500 font-medium text-lg">Celebrating our most impactful spark-sharers</p>
            </header>

            {/* Top 3 Podium */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end max-w-4xl mx-auto px-4">
                {/* 2nd Place */}
                {topThree[1] && (
                    <div className="order-2 md:order-1 flex flex-col items-center group">
                        <div className="relative mb-4">
                            <div className="w-24 h-24 rounded-[2rem] bg-slate-300 dark:bg-slate-700 border-4 border-slate-200 dark:border-slate-600 flex items-center justify-center text-3xl font-black group-hover:scale-110 transition-transform">
                                {topThree[1].name.charAt(0)}
                                <div className="absolute -top-2 -right-2 w-8 h-8 bg-slate-400 rounded-full border-2 border-white dark:border-brand-dark flex items-center justify-center text-white text-xs">2</div>
                            </div>
                        </div>
                        <div className="lumina-glass p-6 rounded-[2rem] w-full text-center space-y-1 border-b-4 border-slate-400">
                            <h3 className="font-black text-lg truncate px-2">{topThree[1].name}</h3>
                            <p className="text-brand-primary font-black text-2xl">{topThree[1].points}</p>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Points earned</p>
                        </div>
                    </div>
                )}

                {/* 1st Place */}
                {topThree[0] && (
                    <div className="order-1 md:order-2 flex flex-col items-center group scale-110 z-10">
                        <div className="relative mb-6">
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-5xl text-yellow-500 animate-bounce">
                                <FaCrown />
                            </div>
                            <div className="w-32 h-32 rounded-[2.5rem] bg-yellow-500 border-4 border-yellow-300 flex items-center justify-center text-4xl font-black text-white shadow-[0_20px_40px_rgba(234,179,8,0.3)] group-hover:scale-110 transition-transform">
                                {topThree[0].name.charAt(0)}
                                <div className="absolute -top-2 -right-2 w-10 h-10 bg-yellow-600 rounded-full border-4 border-white dark:border-brand-dark flex items-center justify-center text-white text-sm">1</div>
                            </div>
                        </div>
                        <div className="lumina-glass p-8 rounded-[2.5rem] w-full text-center space-y-1 border-b-8 border-yellow-500 bg-yellow-500/5 backdrop-blur-3xl">
                            <h3 className="font-black text-xl truncate px-2">{topThree[0].name}</h3>
                            <p className="text-yellow-500 font-black text-4xl">{topThree[0].points}</p>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ultimate Champion</p>
                        </div>
                    </div>
                )}

                {/* 3rd Place */}
                {topThree[2] && (
                    <div className="order-3 flex flex-col items-center group">
                        <div className="relative mb-4">
                            <div className="w-24 h-24 rounded-[2rem] bg-amber-700/20 dark:bg-amber-700/30 border-4 border-amber-800/30 dark:border-amber-800/50 flex items-center justify-center text-3xl font-black text-amber-800 dark:text-amber-600 group-hover:scale-110 transition-transform">
                                {topThree[2].name.charAt(0)}
                                <div className="absolute -top-2 -right-2 w-8 h-8 bg-amber-700 rounded-full border-2 border-white dark:border-brand-dark flex items-center justify-center text-white text-xs">3</div>
                            </div>
                        </div>
                        <div className="lumina-glass p-6 rounded-[2rem] w-full text-center space-y-1 border-b-4 border-amber-700">
                            <h3 className="font-black text-lg truncate px-2">{topThree[2].name}</h3>
                            <p className="text-brand-primary font-black text-2xl">{topThree[2].points}</p>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Points earned</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Others List */}
            <div className="max-w-2xl mx-auto space-y-4">
                <div className="flex items-center justify-between px-8 py-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                    <span>Rank</span>
                    <span>Colleague</span>
                    <span>Points</span>
                </div>
                {others.map((user, idx) => (
                    <div key={user.user_id} className="lumina-glass group flex items-center p-4 rounded-2xl border border-white/5 hover:border-brand-primary/20 hover:bg-white/5 transition-all">
                        <div className="w-10 h-10 flex items-center justify-center font-black text-slate-500 group-hover:text-brand-primary transition-colors">
                            #{idx + 4}
                        </div>
                        <div className="flex-1 px-4 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-400">
                                {user.name.charAt(0)}
                            </div>
                            <span className="font-bold text-slate-900 dark:text-slate-200">{user.name}</span>
                        </div>
                        <div className="text-right px-4">
                            <span className="font-black text-brand-primary text-xl">{user.points}</span>
                            <div className="flex items-center justify-end gap-1 text-[8px] font-black text-slate-500 uppercase">
                                <FaFire /> {user.count} actions
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div className="max-w-md mx-auto p-6 rounded-3xl border border-dashed border-slate-200 dark:border-white/10 text-center">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">How points work</h4>
                <div className="grid grid-cols-2 gap-4 text-[10px] font-bold text-slate-500">
                    <div className="flex items-center gap-2 justify-center"><FaStar className="text-yellow-500" /> Brag: 10pts</div>
                    <div className="flex items-center gap-2 justify-center"><FaStar className="text-purple-500" /> Shoutout Sent: 5pts</div>
                    <div className="flex items-center gap-2 justify-center"><FaStar className="text-pink-500" /> Shoutout Received: 15pts</div>
                    <div className="flex items-center gap-2 justify-center"><FaStar className="text-blue-500" /> Reaction: 2pts</div>
                </div>
            </div>
        </div>
    );
};

export default Leaderboard;
