import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { FaMoon, FaSun, FaArrowLeft, FaEye, FaEyeSlash } from 'react-icons/fa';
import { getApiUrl } from '../utils/apiConfig';

function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [message, setMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [theme, setTheme] = useState('light');
    const navigate = useNavigate();
    const { addToast } = useToast();

    // Load theme from localStorage on mount
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') || 'light';
        setTheme(savedTheme);
        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, []);

    // Toggle theme
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

    const handleReset = async (e) => {
        e.preventDefault();
        setMessage('');

        if (newPassword.length < 6) {
            addToast('Password must be at least 6 characters', 'error');
            return;
        }

        try {
            const response = await fetch(getApiUrl('/api/reset-password'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, new_password: newPassword }),
            });

            const data = await response.json();

            if (response.ok) {
                addToast('Password reset successful! Redirecting...', 'success');
                setTimeout(() => navigate('/login'), 2000);
            } else {
                setMessage(data.detail || 'Reset failed.');
                addToast(data.detail || 'Reset failed.', 'error');
            }
        } catch (error) {
            setMessage('Network error. Please try again.');
            addToast('Network error. Please try again.', 'error');
        }
    };

    return (
        <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-500 ${theme === 'dark' ? 'bg-brand-dark text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
            {/* Theme Toggle Button */}
            <button
                onClick={toggleTheme}
                className={`fixed top-8 right-8 z-50 flex items-center gap-2 px-6 py-3 rounded-2xl transition-all text-xs font-black uppercase tracking-widest border lumina-glass ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-brand-primary border-white/5' : 'bg-white/80 hover:bg-slate-100 text-brand-dark border-slate-200'}`}
            >
                {theme === 'light' ? <FaMoon /> : <FaSun />}
                {theme === 'light' ? 'Dark' : 'Light'}
            </button>
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-full opacity-40">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-primary/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-secondary/10 rounded-full blur-[120px]" />
            </div>

            <div className="w-full max-w-md lumina-card p-12 relative z-10 border border-black/5 dark:border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.05)] dark:shadow-[0_0_50px_rgba(34,211,238,0.1)]">
                <div className="text-center mb-12">
                    <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter mb-2 uppercase">Reset Password</h2>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Recover your account access</p>
                </div>

                <form onSubmit={handleReset} className="space-y-6">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email</label>
                        <input
                            type="email"
                            placeholder="your@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-6 py-4 bg-black/5 dark:bg-white/[0.03] border border-black/5 dark:border-white/5 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 transition-all font-medium"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">New Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Min 6 characters"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                minLength="6"
                                className="w-full pl-6 pr-12 py-4 bg-black/5 dark:bg-white/[0.03] border border-black/5 dark:border-white/5 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 transition-all font-medium"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 flex items-center pr-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            >
                                {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-4 mt-4 bg-brand-dark text-white dark:bg-white dark:text-brand-dark font-black rounded-2xl text-[10px] uppercase tracking-[0.2em] shadow-2xl transition-all lumina-glow hover:scale-[1.02] active:scale-95"
                    >
                        Reset Password
                    </button>
                </form>

                {message && (
                    <div className={`mt-8 text-center text-[10px] font-black uppercase tracking-widest ${message.includes('successful') ? 'text-brand-primary' : 'text-red-400'}`}>
                        {message}
                    </div>
                )}

                <div className="mt-12 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <Link to="/login" className="flex items-center justify-center gap-2 hover:text-slate-900 dark:hover:text-white transition-colors">
                        <FaArrowLeft /> Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default ForgotPassword;
