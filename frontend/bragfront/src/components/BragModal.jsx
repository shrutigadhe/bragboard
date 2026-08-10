import React, { useState, useEffect } from 'react';
import { FaTrash, FaTimes, FaEdit, FaSave, FaPlus, FaFlag } from 'react-icons/fa';
import ReactionButtons from './ReactionButtons';
import CommentSection from './CommentSection';
import { getApiUrl } from '../utils/apiConfig';

const BragModal = ({ brag, onClose, currentUserId, isAdmin, onDelete, onUpdate, onReact }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ title: '', content: '', tags: '' });
    const [loading, setLoading] = useState(false);

    const [mediaItems, setMediaItems] = useState([]); // Array of { type: 'image'|'video', source: 'upload'|'url'|'existing', data: File|string, preview: string }
    const [lightboxImage, setLightboxImage] = useState(null);

    const readFileAsBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    useEffect(() => {
        if (brag) {
            setEditForm({
                title: brag.title,
                content: brag.content,
                tags: brag.tags || ''
            });

            // initialize media items
            const initialMedia = [];

            const images = Array.isArray(brag.image_url) ? brag.image_url : (brag.image_url ? [brag.image_url] : []);
            images.forEach(url => initialMedia.push({ type: 'image', source: 'existing', data: url, preview: url }));

            const videos = Array.isArray(brag.video_url) ? brag.video_url : (brag.video_url ? [brag.video_url] : []);
            videos.forEach(url => initialMedia.push({ type: 'video', source: 'existing', data: url, preview: url }));

            setMediaItems(initialMedia);
            setIsEditing(false);
        }
    }, [brag]);

    const addMediaItem = (type, source, fileOrUrl) => {
        let preview = '';
        if (source === 'upload' && fileOrUrl) {
            preview = URL.createObjectURL(fileOrUrl);
        } else if (source === 'url') {
            preview = fileOrUrl;
        } else if (source === 'existing') {
            preview = fileOrUrl;
        }

        setMediaItems([...mediaItems, { type, source, data: fileOrUrl, preview }]);
    };

    const removeMediaItem = (index) => {
        const newItems = [...mediaItems];
        newItems.splice(index, 1);
        setMediaItems(newItems);
    };

    if (!brag) return null;

    const isOwner = currentUserId === brag.user_id;
    const canDelete = isOwner || isAdmin;

    const handleSave = async () => {
        setLoading(true);
        try {
            // Process Media Items
            const processedImages = [];
            const processedVideos = [];

            for (const item of mediaItems) {
                if (item.type === 'image') {
                    if (item.source === 'upload') {
                        processedImages.push(await readFileAsBase64(item.data));
                    } else {
                        // existing or url
                        processedImages.push(item.data);
                    }
                } else if (item.type === 'video') {
                    if (item.source === 'upload') {
                        processedVideos.push(await readFileAsBase64(item.data));
                    } else {
                        processedVideos.push(item.data);
                    }
                }
            }

            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const res = await fetch(getApiUrl(`/api/brags/${brag.id}`), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...editForm,
                    image_url: processedImages,
                    video_url: processedVideos
                })
            });

            if (res.ok) {
                const updatedBrag = await res.json();
                if (onUpdate) onUpdate(updatedBrag);
                setIsEditing(false);
            } else {
                alert("Failed to update post");
            }
        } catch (error) {
            console.error("Error updating post", error);
        } finally {
            setLoading(false);
        }
    };

    const handleReport = async () => {
        const reason = window.prompt("Why are you reporting this brag?");
        if (!reason) return;
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        try {
            const res = await fetch(getApiUrl(`/api/brags/${brag.id}/report`), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ target_id: brag.id, target_type: 'brag', reason })
            });
            if (res.ok) alert('Brag reported');
            else alert('Failed to report');
        } catch (e) { console.error(e); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-brand-dark/60 backdrop-blur-xl animate-fade-in" onClick={onClose}>
            {/* Lightbox Overlay */}
            {lightboxImage && (
                <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4" onClick={(e) => { e.stopPropagation(); setLightboxImage(null); }}>
                    <button
                        onClick={() => setLightboxImage(null)}
                        className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors z-[70]"
                    >
                        <FaTimes size={32} />
                    </button>
                    <img src={lightboxImage} alt="Full view" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
                </div>
            )}

            <div className="lumina-card w-full max-w-2xl overflow-hidden relative border border-black/5 dark:border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.1)] dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] max-h-[90vh] overflow-y-auto flex flex-col" onClick={e => e.stopPropagation()}>

                {/* Media Section - Top */}
                {!isEditing && (brag.image_url?.length > 0 || brag.video_url?.length > 0) && (
                    <div className="bg-black text-center relative group">
                        <div className="flex overflow-x-auto snap-x snap-mandatory custom-scrollbar">
                            {/* Handle Images */}
                            {Array.isArray(brag.image_url) && brag.image_url.map((url, idx) => (
                                <div key={`img-${idx}`} className="flex-none w-full snap-center relative aspect-video bg-black/5 dark:bg-white/5 flex items-center justify-center cursor-zoom-in" onClick={() => setLightboxImage(url)}>
                                    <img
                                        src={url}
                                        alt={`Attachment ${idx + 1}`}
                                        className="max-h-[400px] w-full object-contain"
                                    />
                                </div>
                            ))}
                            {/* Handle Videos */}
                            {Array.isArray(brag.video_url) && brag.video_url.map((url, idx) => (
                                <div key={`vid-${idx}`} className="flex-none w-full snap-center relative aspect-video bg-black/5 dark:bg-white/5 flex items-center justify-center">
                                    <video
                                        src={url}
                                        controls
                                        className="max-h-[400px] w-full"
                                    />
                                </div>
                            ))}
                        </div>
                        {(brag.image_url?.length + (brag.video_url?.length || 0)) > 1 && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                                {/* Simple indicators could go here */}
                                <div className="px-3 py-1 bg-black/50 backdrop-blur rounded-full text-[10px] font-bold text-white uppercase tracking-widest border border-white/10">
                                    Slide to view more
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-1">
                    {/* Content Section */}
                    <div className="p-8 md:p-10 flex flex-col">
                        <div className="flex justify-between items-start mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-primary/20 to-brand-secondary/20 border border-black/5 dark:border-white/10 flex items-center justify-center text-white font-black text-xl">
                                    {brag.author_name?.charAt(0) || 'C'}
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 dark:text-white text-lg tracking-tight">{currentUserId === brag.user_id ? 'You' : (brag.author_name || 'Colleague')}</h3>
                                    <p className="text-slate-500 text-xs font-black uppercase tracking-widest">{new Date(brag.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {isOwner && !isEditing && (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:text-brand-primary transition-all border border-white/5"
                                        title="Edit Post"
                                    >
                                        <FaEdit />
                                    </button>
                                )}
                                {canDelete && !isEditing && (
                                    <button
                                        onClick={() => {
                                            if (window.confirm("Vanish this spark?")) {
                                                onDelete(brag.id);
                                                onClose();
                                            }
                                        }}
                                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:text-red-500 transition-all border border-white/5"
                                        title="Delete Post"
                                    >
                                        <FaTrash size={12} />
                                    </button>
                                )}
                                {!isOwner && !isEditing && (
                                    <button
                                        onClick={handleReport}
                                        disabled={brag.has_reported}
                                        className={`w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 transition-all border border-white/5 ${brag.has_reported ? 'text-green-500 cursor-default' : 'text-slate-400 hover:text-yellow-500'}`}
                                        title={brag.has_reported ? "Already Reported" : "Report Post"}
                                    >
                                        <FaFlag size={12} />
                                    </button>
                                )}
                                <button
                                    onClick={onClose}
                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:text-white transition-all border border-white/5"
                                >
                                    <FaTimes />
                                </button>
                            </div>
                        </div>

                        {isEditing ? (
                            <div className="flex-1 space-y-6">
                                <div>
                                    <label className="block text-xs font-black text-slate-500 mb-2 uppercase tracking-widest">Illuminate Title</label>
                                    <input
                                        type="text"
                                        value={editForm.title}
                                        onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                                        className="w-full bg-black/5 dark:bg-white/[0.03] border border-black/5 dark:border-white/5 rounded-2xl px-6 py-4 focus:ring-2 focus:ring-brand-primary outline-none text-slate-900 dark:text-white font-black text-xl"
                                        placeholder="Headline..."
                                    />
                                </div>

                                {/* Media Manager in Edit Mode */}
                                <div>
                                    <label className="block text-xs font-black text-slate-500 mb-2 uppercase tracking-widest">Visual Evidence</label>
                                    <div className="grid grid-cols-3 gap-2 mb-4">
                                        {mediaItems.map((item, idx) => (
                                            <div key={idx} className="relative group rounded-xl overflow-hidden aspect-square border border-white/10 bg-black/5">
                                                {item.type === 'image' ? (
                                                    <img src={item.preview} alt="preview" className="w-full h-full object-cover" />
                                                ) : (
                                                    <video src={item.preview} className="w-full h-full object-cover" />
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => removeMediaItem(idx)}
                                                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full shadow-lg opacity-100 transition-opacity"
                                                >
                                                    <FaTimes size={10} />
                                                </button>
                                                <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/50 backdrop-blur rounded text-[8px] font-black text-white uppercase">
                                                    {item.type}
                                                </div>
                                            </div>
                                        ))}

                                        {/* Add Buttons */}
                                        <label className="flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-white/10 hover:bg-white/5 cursor-pointer transition-colors group">
                                            <FaPlus className="mb-1 text-slate-400 group-hover:text-brand-primary" />
                                            <span className="text-[9px] font-bold text-slate-400 group-hover:text-brand-primary uppercase">Photo</span>
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    if (e.target.files[0]) addMediaItem('image', 'upload', e.target.files[0]);
                                                    e.target.value = null;
                                                }}
                                            />
                                        </label>
                                        <label className="flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-white/10 hover:bg-white/5 cursor-pointer transition-colors group">
                                            <FaPlus className="mb-1 text-slate-400 group-hover:text-brand-secondary" />
                                            <span className="text-[9px] font-bold text-slate-400 group-hover:text-brand-secondary uppercase">Video</span>
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="video/*"
                                                onChange={(e) => {
                                                    if (e.target.files[0]) addMediaItem('video', 'upload', e.target.files[0]);
                                                    e.target.value = null;
                                                }}
                                            />
                                        </label>
                                    </div>

                                </div>
                                <textarea
                                    value={editForm.content}
                                    onChange={e => setEditForm({ ...editForm, content: e.target.value })}
                                    rows="8"
                                    className="w-full bg-black/5 dark:bg-white/[0.03] border border-black/5 dark:border-white/5 rounded-2xl px-6 py-4 outline-none text-slate-700 dark:text-slate-300 resize-none focus:ring-2 focus:ring-brand-primary/50 text-base leading-relaxed"
                                    placeholder="The story..."
                                />
                                <div className="flex justify-end gap-4 pt-4">
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="px-6 py-3 text-slate-500 font-black text-xs uppercase tracking-widest hover:text-white transition-colors"
                                        disabled={loading}
                                    >
                                        Abort
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={loading}
                                        className="px-8 py-3 bg-white text-brand-dark font-black rounded-xl text-xs uppercase tracking-[0.2em] shadow-2xl transition-all lumina-glow hover:scale-105"
                                    >
                                        {loading ? 'Transmitting...' : 'Save Evolution'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col h-full">
                                <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4 leading-tight tracking-tight">{brag.title}</h2>

                                {brag.tagged_users && brag.tagged_users.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-4 items-center">
                                        <span className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">Tied Sparks:</span>
                                        {brag.tagged_users.map(u => (
                                            <span key={u.id} className="px-3 py-1 rounded-lg text-xs font-black bg-brand-primary/10 text-brand-primary uppercase border border-brand-primary/10">
                                                @{u.name.split(' ')[0]}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <div className="text-slate-700 dark:text-slate-300 leading-relaxed overflow-y-auto flex-1 font-medium text-base space-y-4 mb-8">
                                    <p className="whitespace-pre-wrap">{brag.content}</p>
                                </div>

                                <div className="pt-6 border-t border-white/5">
                                    <ReactionButtons
                                        key={`brag-reactions-${brag.id}`}
                                        targetId={brag.id}
                                        targetType="brag"
                                        initialReactions={brag.reactions}
                                        onReact={(newReactions) => onReact && onReact(newReactions)}
                                    />
                                    <CommentSection
                                        targetId={brag.id}
                                        targetType="brag"
                                    />
                                </div>


                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BragModal;
