import React, { useState, useEffect } from 'react';
import { FaUser, FaEnvelope, FaBuilding, FaSave, FaTimes, FaCamera } from 'react-icons/fa';
import { getApiUrl } from '../utils/apiConfig';

const EditProfileModal = ({ isOpen, onClose, user, onUpdate }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        department_id: ''
    });
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                email: user.email || '',
                department_id: user.department?.id || '',
                profile_picture: user.profile_picture || null
            });
        }

        // Fetch departments
        const fetchDepts = async () => {
            const token = localStorage.getItem('token');
            try {
                const res = await fetch(getApiUrl('/api/departments/'), {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) setDepartments(await res.json());
            } catch (err) {
                console.error(err);
            }
        };
        if (isOpen) fetchDepts();

    }, [user, isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(getApiUrl('/api/me'), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                const updatedUser = await res.json();
                onUpdate(updatedUser);
                onClose();
            } else {
                alert('Failed to update profile');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-brand-dark w-full max-w-md rounded-3xl p-8 shadow-2xl relative border border-white/10" onClick={e => e.stopPropagation()}>
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                >
                    <FaTimes size={12} />
                </button>

                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8 tracking-tight">Edit Profile</h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-500">Profile Picture</label>
                        <div className="flex justify-center mb-6">
                            <div className="relative group/avatar">
                                <label className={`relative block w-32 h-32 rounded-full ring-4 ring-slate-100 dark:ring-white/10 shadow-xl overflow-hidden cursor-pointer hover:ring-brand-primary/50 transition-all bg-gradient-to-br from-brand-primary to-brand-secondary`}>
                                    {(formData.profile_picture) ? (
                                        <img
                                            src={formData.profile_picture}
                                            alt="Profile"
                                            className="w-full h-full object-cover animate-fade-in group-hover/avatar:opacity-50 transition-opacity"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-white text-5xl font-black group-hover/avatar:opacity-50 transition-opacity">
                                            {formData.name?.charAt(0) || '?'}
                                        </div>
                                    )}

                                    {/* Camera Overlay */}
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm">
                                        <FaCamera className="text-white text-2xl drop-shadow-lg" />
                                    </div>

                                    {/* Hidden Input */}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onloadend = () => {
                                                    setFormData({ ...formData, profile_picture: reader.result });
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                    />
                                </label>

                                {/* Remove Button */}
                                {formData.profile_picture && (
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, profile_picture: "" })}
                                        className="absolute top-0 right-0 p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-all z-10"
                                        title="Remove Photo"
                                    >
                                        <FaTimes size={10} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-500">Full Name</label>
                        <div className="relative">
                            <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-black/20 rounded-xl border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-brand-primary outline-none font-bold text-slate-900 dark:text-white"
                                placeholder="Your Name"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-500">Email Address</label>
                        <div className="relative">
                            <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="email"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-black/20 rounded-xl border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-brand-primary outline-none font-bold text-slate-900 dark:text-white"
                                placeholder="name@company.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-500">Department</label>
                        <div className="relative">
                            <FaBuilding className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <select
                                value={formData.department_id}
                                onChange={e => setFormData({ ...formData, department_id: parseInt(e.target.value) })}
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-black/20 rounded-xl border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-brand-primary outline-none font-bold text-slate-900 dark:text-white appearance-none"
                            >
                                <option value="">Select Department</option>
                                {departments.map(dept => (
                                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-brand-primary text-white font-black rounded-xl text-xs uppercase tracking-[0.2em] hover:bg-brand-600 transition-all shadow-lg shadow-brand-primary/20 flex items-center justify-center gap-2 mt-4"
                    >
                        {loading ? 'Saving...' : <><FaSave /> Save Changes</>}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default EditProfileModal;
