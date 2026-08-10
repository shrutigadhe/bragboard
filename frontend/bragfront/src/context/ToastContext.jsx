import React, { createContext, useContext, useState, useCallback } from 'react';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimes } from 'react-icons/fa';

// ─────────────────────────────────────────────
// TOAST NOTIFICATION CONTEXT
// Provides a global toast/snackbar notification system for the entire app.
// Any component can trigger a toast by calling `addToast(message, type, duration)`.
// Types: 'success' (green), 'error' (red), 'info' (blue)
// ─────────────────────────────────────────────

// Create the context object — this is what other components consume via useToast()
const ToastContext = createContext();

/**
 * useToast
 * Custom hook to access the toast context from any child component.
 * Usage: const { addToast } = useToast();
 *        addToast('Saved!', 'success');
 */
export const useToast = () => useContext(ToastContext);

/**
 * ToastProvider
 * Wraps the entire app (in App.jsx) to provide toast functionality globally.
 * Renders the floating toast container in the bottom-right corner of the screen.
 */
export const ToastProvider = ({ children }) => {
    // List of currently active toasts — each has a unique id, message, and type
    const [toasts, setToasts] = useState([]);

    /**
     * addToast
     * Adds a new toast notification and automatically removes it after `duration` ms.
     * useCallback prevents unnecessary re-renders in consumer components.
     *
     * @param {string} message  - The text to display in the toast
     * @param {string} type     - 'success' | 'error' | 'info' (controls color/icon)
     * @param {number} duration - How long (ms) before the toast disappears (default: 3000)
     */
    const addToast = useCallback((message, type = 'success', duration = 3000) => {
        const id = Date.now(); // Use current timestamp as a unique ID
        setToasts(prev => [...prev, { id, message, type }]);

        // Auto-dismiss the toast after the given duration
        setTimeout(() => {
            removeToast(id);
        }, duration);
    }, []);

    /**
     * removeToast
     * Removes a toast from the list by its ID (called after timeout or on manual close).
     */
    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    return (
        // Expose only addToast to consumers (removeToast is used internally)
        <ToastContext.Provider value={{ addToast }}>
            {children}

            {/* Floating toast container — fixed to bottom-right corner, stacks toasts vertically */}
            <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-3 pointer-events-none">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`pointer-events-auto min-w-[300px] max-w-sm p-4 rounded-2xl shadow-2xl border backdrop-blur-md animate-slide-up flex items-start gap-3 transition-all ${toast.type === 'success'
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                : toast.type === 'error'
                                    ? 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
                                    : 'bg-blue-500/10 border-blue-500/20 text-brand-primary'
                            }`}
                    >
                        {/* Icon based on toast type */}
                        <div className="mt-0.5 text-lg">
                            {toast.type === 'success' && <FaCheckCircle />}
                            {toast.type === 'error' && <FaExclamationCircle />}
                            {toast.type === 'info' && <FaInfoCircle />}
                        </div>

                        {/* Toast message text */}
                        <div className="flex-1 text-sm font-bold leading-relaxed">
                            {toast.message}
                        </div>

                        {/* Manual close button */}
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="opacity-50 hover:opacity-100 transition-opacity"
                        >
                            <FaTimes />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
