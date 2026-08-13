import React, { useState, useEffect } from 'react';
import { FaChartLine, FaFlag, FaTrash, FaCheckCircle, FaUserTag, FaAward, FaFileCsv, FaFilePdf } from 'react-icons/fa';
import { getApiUrl } from '../utils/apiConfig';

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = async () => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        try {
            const [statsRes, reportsRes] = await Promise.all([
                fetch(getApiUrl('/api/admin/stats'), {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(getApiUrl('/api/admin/reports'), {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (statsRes.ok) setStats(await statsRes.json());
            if (reportsRes.ok) setReports(await reportsRes.json());
        } catch (err) {
            setError('Failed to fetch admin data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleResolveReport = async (reportId) => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        try {
            const res = await fetch(getApiUrl(`/api/admin/reports/${reportId}?status=resolved`), {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setReports(reports.map(r => r.id === reportId ? { ...r, status: 'resolved' } : r));
            }
        } catch (err) {
            console.error('Error resolving report', err);
        }
    };

    const handleDeleteContent = async (report) => {
        if (!window.confirm(`Are you sure you want to delete this ${report.target_type}?`)) return;

        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        let url = '';
        if (report.target_type === 'shoutout') url = `/api/shoutouts/${report.target_id}`;
        else if (report.target_type === 'brag') url = `/api/brags/${report.target_id}`;
        else if (report.target_type === 'comment') url = `/api/comments/${report.target_id}`;

        try {
            const res = await fetch(url, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                // Also mark report as resolved
                handleResolveReport(report.id);
                alert('Content deleted successfully');
            }
        } catch (err) {
            console.error('Error deleting content', err);
        }
    };

    const handleExportCSV = () => {
        if (reports.length === 0) return;

        const headers = ["ID", "Target Type", "Reporter", "Reason", "Status", "Created At"];
        const rows = reports.map(r => [
            r.id,
            r.target_type,
            r.reporter.name,
            `"${r.reason.replace(/"/g, '""')}"`,
            r.status,
            new Date(r.created_at).toLocaleString()
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `bragboard_reports_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportPDF = () => {
        window.print();
    };

    if (loading) return <div className="flex justify-center items-center h-64 text-brand-primary">Loading Admin Data...</div>;
    if (error) return <div className="text-red-500">{error}</div>;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="flex items-center gap-4">
                <div className="p-3 bg-brand-primary/10 rounded-2xl text-brand-primary text-2xl">
                    <FaChartLine />
                </div>
                <div>
                    <h1 className="text-3xl font-black tracking-tight">Admin Dashboard</h1>
                    <p className="text-slate-500 font-medium">Platform insights and moderation</p>
                </div>
                <div className="ml-auto flex gap-3 no-print">
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-xl font-bold text-xs uppercase tracking-widest border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                    >
                        <FaFileCsv /> Export CSV
                    </button>
                    <button
                        onClick={handleExportPDF}
                        className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-500 rounded-xl font-bold text-xs uppercase tracking-widest border border-rose-500/20 hover:bg-rose-500/20 transition-all"
                    >
                        <FaFilePdf /> Export PDF
                    </button>
                </div>
            </header>

            {/* Stats Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Top Contributors */}
                <div className="lumina-glass p-8 rounded-[2rem] space-y-6">
                    <div className="flex items-center gap-3">
                        <FaAward className="text-yellow-500 text-xl" />
                        <h2 className="text-xl font-bold">Top Contributors</h2>
                    </div>
                    <div className="space-y-4">
                        {stats?.top_contributors.map((user, idx) => (
                            <div key={user.user_id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                                <div className="flex items-center gap-4">
                                    <span className="w-8 h-8 flex items-center justify-center bg-brand-primary/20 text-brand-primary rounded-lg font-bold text-sm">
                                        #{idx + 1}
                                    </span>
                                    <span className="font-bold">{user.name}</span>
                                </div>
                                <span className="text-brand-primary font-black">{user.count} posts</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Most Tagged */}
                <div className="lumina-glass p-8 rounded-[2rem] space-y-6">
                    <div className="flex items-center gap-3">
                        <FaUserTag className="text-brand-secondary text-xl" />
                        <h2 className="text-xl font-bold">Most Tagged Individuals</h2>
                    </div>
                    <div className="space-y-4">
                        {stats?.most_tagged.map((user, idx) => (
                            <div key={user.user_id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                                <div className="flex items-center gap-4">
                                    <span className="w-8 h-8 flex items-center justify-center bg-brand-secondary/20 text-brand-secondary rounded-lg font-bold text-sm">
                                        #{idx + 1}
                                    </span>
                                    <span className="font-bold">{user.name}</span>
                                </div>
                                <span className="text-brand-secondary font-black">{user.count} tags</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Reports Section */}
            <div className="lumina-glass p-8 rounded-[2rem] space-y-6">
                <div className="flex items-center gap-3">
                    <FaFlag className="text-red-500 text-xl" />
                    <h2 className="text-xl font-bold">Reported Shout-outs & Content</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-slate-500 text-xs uppercase tracking-widest border-b border-white/10">
                                <th className="pb-4 pt-2 px-4">Type</th>
                                <th className="pb-4 pt-2 px-4">Reporter</th>
                                <th className="pb-4 pt-2 px-4">Reason</th>
                                <th className="pb-4 pt-2 px-4">Status</th>
                                <th className="pb-4 pt-2 px-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {reports.map((report) => (
                                <tr key={report.id} className="group hover:bg-white/5 transition-colors">
                                    <td className="py-4 px-4 font-bold capitalize">{report.target_type}</td>
                                    <td className="py-4 px-4">{report.reporter.name}</td>
                                    <td className="py-4 px-4 text-sm text-slate-400 max-w-xs truncate">{report.reason}</td>
                                    <td className="py-4 px-4">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${report.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-green-500/20 text-green-500'}`}>
                                            {report.status}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {report.status === 'pending' && (
                                                <>
                                                    <button
                                                        onClick={() => handleResolveReport(report.id)}
                                                        className="p-2 text-green-500 hover:bg-green-500/10 rounded-lg transition-colors"
                                                        title="Dismiss/Resolve"
                                                    >
                                                        <FaCheckCircle />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteContent(report)}
                                                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                        title="Delete Content"
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {reports.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="py-12 text-center text-slate-500 italic">No reports found. Good job!</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
