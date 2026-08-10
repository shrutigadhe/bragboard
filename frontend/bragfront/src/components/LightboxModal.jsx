import React, { useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';

const LightboxModal = ({ isOpen, onClose, imageSrc, title }) => {
    // Prevent background scrolling when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in p-4"
            onClick={onClose}
        >
            <button 
                onClick={onClose}
                className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center rounded-2xl bg-white/10 hover:bg-white/20 text-white text-lg transition-all border border-white/10"
                title="Close"
            >
                <FaTimes />
            </button>

            <div 
                className="relative max-w-2xl w-full flex flex-col items-center justify-center"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the content area
            >
                <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/10 max-h-[80vh] flex items-center justify-center bg-black/40">
                    <img 
                        src={imageSrc} 
                        alt={title || "Profile Picture"} 
                        className="max-w-full max-h-[70vh] object-contain block animate-scale-up"
                    />
                </div>
                {title && (
                    <div className="mt-4 text-center">
                        <h4 className="text-white font-black text-lg tracking-tight capitalize">{title}</h4>
                        <p className="text-slate-400 text-xs">Profile Picture</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LightboxModal;
