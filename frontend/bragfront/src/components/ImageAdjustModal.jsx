import React, { useState, useEffect, useRef } from 'react';
import { FaTimes, FaUndo, FaSearchPlus, FaSearchMinus, FaCheck } from 'react-icons/fa';

const ImageAdjustModal = ({ isOpen, onClose, imageSrc, onSave }) => {
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    
    // Image dimensions inside the viewport
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const imageRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setZoom(1);
            setPan({ x: 0, y: 0 });
            setIsDragging(false);
            
            // Calculate base scale so image covers the circular viewport (250x250)
            const img = new Image();
            img.src = imageSrc;
            img.onload = () => {
                const baseScale = Math.max(250 / img.width, 250 / img.height);
                setDimensions({
                    width: img.width * baseScale,
                    height: img.height * baseScale
                });
            };
        }
    }, [isOpen, imageSrc]);

    if (!isOpen) return null;

    // Mouse handlers
    const handleMouseDown = (e) => {
        e.preventDefault();
        setIsDragging(true);
        setDragStart({
            x: e.clientX - pan.x,
            y: e.clientY - pan.y
        });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        setPan({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Touch handlers
    const handleTouchStart = (e) => {
        if (e.touches.length === 1) {
            setIsDragging(true);
            setDragStart({
                x: e.touches[0].clientX - pan.x,
                y: e.touches[0].clientY - pan.y
            });
        }
    };

    const handleTouchMove = (e) => {
        if (!isDragging || e.touches.length !== 1) return;
        setPan({
            x: e.touches[0].clientX - dragStart.x,
            y: e.touches[0].clientY - dragStart.y
        });
    };

    const handleCrop = () => {
        const image = new Image();
        image.src = imageSrc;
        image.onload = () => {
            const canvas = document.createElement('canvas');
            const size = 300; // Final size of saved profile picture
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');

            // Draw background (white)
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, size, size);

            // Compute scaling and panning ratios
            const ratio = size / 250;

            ctx.save();
            // Translate origin to canvas center
            ctx.translate(size / 2, size / 2);
            // Translate by current pans (adjusted for ratio)
            ctx.translate(pan.x * ratio, pan.y * ratio);
            // Apply zoom factor
            ctx.scale(zoom, zoom);

            // Draw image centered at origin
            const drawWidth = dimensions.width * ratio;
            const drawHeight = dimensions.height * ratio;
            ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
            
            ctx.restore();

            const croppedBase64 = canvas.toDataURL('image/jpeg', 0.9);
            onSave(croppedBase64);
        };
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/80 backdrop-blur-xl animate-fade-in p-4"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
        >
            <div className="lumina-card w-full max-w-md overflow-hidden relative border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Adjust Image</h3>
                        <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Drag to position, slider to zoom</p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors"
                    >
                        <FaTimes />
                    </button>
                </div>

                {/* Cropping Viewport */}
                <div className="relative h-80 bg-black/60 flex items-center justify-center overflow-hidden selective-none">
                    {/* Viewport circular cutout */}
                    <div 
                        className="relative w-[250px] h-[250px] rounded-full border-4 border-brand-primary shadow-[0_0_0_9999px_rgba(15,23,42,0.75)] overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing z-10"
                        onMouseDown={handleMouseDown}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleMouseUp}
                    >
                        {dimensions.width > 0 && (
                            <img
                                ref={imageRef}
                                src={imageSrc}
                                alt="crop-source"
                                draggable="false"
                                className="max-w-none origin-center select-none"
                                style={{
                                    width: `${dimensions.width}px`,
                                    height: `${dimensions.height}px`,
                                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                                    transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                                }}
                            />
                        )}
                    </div>
                </div>

                {/* Adjust Control Tools */}
                <div className="p-6 space-y-6 bg-slate-900/50">
                    {/* Zoom Slider */}
                    <div className="flex items-center gap-4">
                        <FaSearchMinus className="text-slate-500 text-sm" />
                        <input
                            type="range"
                            min="1"
                            max="3"
                            step="0.01"
                            value={zoom}
                            onChange={(e) => setZoom(parseFloat(e.target.value))}
                            className="flex-1 accent-brand-primary bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                        />
                        <FaSearchPlus className="text-brand-primary text-sm" />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={() => {
                                setZoom(1);
                                setPan({ x: 0, y: 0 });
                            }}
                            className="flex-1 py-3 px-4 rounded-xl border border-white/10 text-xs font-bold text-slate-350 hover:bg-white/5 transition-all flex items-center justify-center gap-2"
                        >
                            <FaUndo size={10} /> Reset
                        </button>
                        <button
                            type="button"
                            onClick={handleCrop}
                            className="flex-[2] py-3 px-4 rounded-xl bg-brand-primary text-slate-900 text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/20"
                        >
                            <FaCheck size={10} /> Apply & Set
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageAdjustModal;
