import React, { useState, useEffect } from 'react';
import { FaFilter, FaSortAmountDown, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { getApiUrl } from '../utils/apiConfig';

const ShoutoutFilters = ({ filters, onFilterChange, sortOrder, onSortChange }) => {
    const [departments, setDepartments] = useState([]);
    const [users, setUsers] = useState([]);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        const fetchFilters = async () => {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };

            try {
                const deptRes = await fetch(getApiUrl('/api/departments/'), { headers });
                if (deptRes.ok) setDepartments(await deptRes.json());

                // Fetch all users for global filtering
                const usersRes = await fetch(getApiUrl('/api/users'), { headers });
                if (usersRes.ok) setUsers(await usersRes.json());
            } catch (err) {
                console.error("Failed to fetch filter options", err);
            }
        };
        fetchFilters();
    }, []);

    return (
        <div className="mb-8 space-y-4">
            <div className="flex items-center justify-between">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${isExpanded ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' : 'bg-white/5 text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                >
                    <FaFilter />
                    <span>Filters</span>
                    {isExpanded ? <FaChevronUp className="text-[10px]" /> : <FaChevronDown className="text-[10px]" />}
                </button>

                <div className="flex items-center gap-2">
                    <FaSortAmountDown className="text-slate-400" />
                    <select
                        value={sortOrder}
                        onChange={(e) => onSortChange(e.target.value)}
                        className="bg-transparent text-xs font-black uppercase tracking-widest text-slate-500 outline-none cursor-pointer hover:text-brand-primary transition-colors appearance-none text-right pr-2"
                    >
                        <option value="default">Default</option>
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                    </select>
                </div>
            </div>

            {isExpanded && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 rounded-3xl bg-white/[0.02] border border-white/5 animate-fade-in-down">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Department</label>
                        <div className="relative">
                            <select
                                value={filters.department_id || ''}
                                onChange={(e) => onFilterChange('department_id', e.target.value)}
                                className="w-full bg-slate-50 dark:bg-black/20 border border-black/5 dark:border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-primary/50 transition-all appearance-none"
                            >
                                <option value="">All Departments</option>
                                {departments.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                            <FaChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Sender</label>
                        <div className="relative">
                            <select
                                value={filters.user_id || ''}
                                onChange={(e) => onFilterChange('user_id', e.target.value)}
                                className="w-full bg-slate-50 dark:bg-black/20 border border-black/5 dark:border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-primary/50 transition-all appearance-none"
                            >
                                <option value="">All Senders</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                            <FaChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Date</label>
                        <input
                            type="date"
                            value={filters.date || ''}
                            onChange={(e) => onFilterChange('date', e.target.value)}
                            className="w-full bg-slate-50 dark:bg-black/20 border border-black/5 dark:border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-primary/50 transition-all"
                        />
                    </div>

                    {(filters.department_id || filters.user_id || filters.date) && (
                        <div className="md:col-span-3 flex justify-end pt-2">
                            <button
                                onClick={() => {
                                    onFilterChange('department_id', '');
                                    onFilterChange('user_id', '');
                                    onFilterChange('date', '');
                                }}
                                className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-all"
                            >
                                Clear All Filters
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ShoutoutFilters;
