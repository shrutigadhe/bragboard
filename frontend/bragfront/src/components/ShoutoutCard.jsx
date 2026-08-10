import React, { useState } from 'react';
import { FaBullhorn, FaQuoteLeft, FaTrash, FaEdit, FaCheck, FaTimes, FaComment, FaFlag } from 'react-icons/fa';
import ReactionButtons from './ReactionButtons';
import CommentSection from './CommentSection';
import { useToast } from '../context/ToastContext';
import { getApiUrl } from '../utils/apiConfig';

const ShoutoutCard = ({ shoutout, currentUserId, isAdmin, onDelete, colleagues = [], onUpdate, onReact }) => {
    const isOwner = Number(currentUserId) === Number(shoutout.sender_id);
    const canDelete = isOwner || isAdmin;
    const [isEditing, setIsEditing] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [message, setMessage] = useState(shoutout.message);
    const [selectedRecipients, setSelectedRecipients] = useState(shoutout.recipients.map(r => r.id));
    const [editImage, setEditImage] = useState(shoutout.image_url); // For preview/sending

    const [loading, setLoading] = useState(false);
    const { addToast } = useToast();

    const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setEditImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        if (selectedRecipients.length === 0) {
            addToast("Please select at least one recipient.", 'error');
            return;
        }
        const token = getToken();
        if (!token) {
            addToast("Please login to update shout-outs", "error");
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(getApiUrl(`/api/shoutouts/${shoutout.id}`), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    message,
                    recipient_ids: selectedRecipients,
                    image_url: editImage // Send the base64 string or url
                })
            });
            if (res.ok) {
                addToast('Shout-out updated successfully', 'success');
                setIsEditing(false);
                if (onUpdate) onUpdate();
            } else {
                const errorData = await res.json();
                addToast(`Error: ${errorData.detail || 'Failed to update'}`, 'error');
            }
        } catch (error) {
            console.error("Error updating shout-out", error);
            addToast('Error updating shout-out', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleReport = async () => {
        const reason = window.prompt("Why are you reporting this shout-out?");
        if (!reason) return;
        const token = getToken();
        if (!token) {
            addToast("Please login to report shout-outs", "error");
            return;
        }
        try {
            const res = await fetch(getApiUrl(`/api/shoutouts/${shoutout.id}/report`), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ target_id: shoutout.id, target_type: 'shoutout', reason })
            });
            if (res.ok) addToast('Shout-out reported', 'success');
            else addToast('Failed to report', 'error');
        } catch (e) { addToast('Error reporting', 'error'); }
    };

    const toggleRecipient = (userId) => {
        if (selectedRecipients.includes(userId)) {
            setSelectedRecipients(selectedRecipients.filter(id => id !== userId));
        } else {
            setSelectedRecipients([...selectedRecipients, userId]);
        }
    };

    if (isEditing) {
        return (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border-2 border-brand-primary shadow-lg relative animate-fade-in h-full flex flex-col justify-between">
                <div className="space-y-4">
                    <textarea
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary outline-none transition-all resize-none text-sm italic"
                        rows="3"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Edit your message..."
                    />

                    {/* Image Editing */}
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider">Image</p>
                        {editImage ? (
                            <div className="relative rounded-xl overflow-hidden mb-2 border border-gray-200 dark:border-gray-600 group/img">
                                <img src={editImage} alt="preview" className="w-full h-32 object-cover" />
                                <button
                                    onClick={() => setEditImage('')}
                                    className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-lg shadow-lg opacity-0 group-hover/img:opacity-100 transition-opacity"
                                    title="Remove Image"
                                >
                                    <FaTrash size={12} />
                                </button>
                            </div>
                        ) : (
                            <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <div className="text-center text-gray-400 text-xs font-bold uppercase tracking-wider">
                                    + Add Photo
                                </div>
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                            </label>
                        )}
                    </div>

                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider">Recipients</p>
                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1 custom-scrollbar">
                            {colleagues.map(col => (
                                <button
                                    key={col.id}
                                    type="button"
                                    onClick={() => toggleRecipient(col.id)}
                                    className={`px-2 py-0.5 rounded-full text-xs font-medium transition-all ${selectedRecipients.includes(col.id)
                                        ? 'bg-brand-primary text-white shadow-sm'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                        }`}
                                >
                                    {col.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700 mt-4">
                    <button
                        onClick={() => {
                            setIsEditing(false);
                            setIsEditing(false);
                            setMessage(shoutout.message);
                            setSelectedRecipients(shoutout.recipients.map(r => r.id));
                            setEditImage(shoutout.image_url);
                        }}
                        className="flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    >
                        <FaTimes /> Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading || !message.trim() || selectedRecipients.length === 0}
                        className="flex items-center gap-1 text-xs font-bold text-brand-primary hover:text-brand-700 disabled:opacity-50 transition-colors"
                    >
                        {loading ? 'Saving...' : <><FaCheck /> Save</>}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            id={`shoutout-${shoutout.id}`}
            className="group relative"
        >
            <div className={`
                relative p-6 rounded-3xl border border-white/5 transition-all flex flex-col gap-4 overflow-hidden
                bg-white/[0.02] dark:bg-white/[0.05] hover:shadow-2xl hover:shadow-brand-primary/10 hover:border-brand-primary/20
                ${showComments ? 'ring-1 ring-brand-primary/20' : ''}
            `}>
                <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/0 via-brand-primary/5 to-brand-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />

                {/* Main Row Content */}
                <div className="flex gap-6 items-start relative z-10">

                    {/* Icon / Avatar */}
                    <div className="relative shrink-0">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center text-slate-900 dark:text-white font-black text-xl shadow-inner border border-white/10 group-hover:scale-110 transition-transform">
                            <FaBullhorn size={20} />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-purple-500 rounded-full border-2 border-brand-dark" />
                    </div>

                    {/* Middle Content */}
                    <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-slate-900 dark:text-white font-bold text-sm">
                                {isOwner ? 'You' : shoutout.sender_name} <span className="text-slate-500 dark:text-gray-400 font-medium lowercase">gave a shoutout</span>
                            </p>

                            {/* Action Buttons (Edit/Delete) */}
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {isOwner && (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="text-slate-400 hover:text-brand-primary transition-colors"
                                        title="Edit"
                                    >
                                        <FaEdit />
                                    </button>
                                )}
                                {canDelete && (
                                    <button
                                        onClick={() => onDelete(shoutout.id)}
                                        className="text-slate-400 hover:text-red-400 transition-colors"
                                        title="Delete"
                                    >
                                        <FaTrash />
                                    </button>
                                )}
                                {!isOwner && (
                                    <button
                                        onClick={handleReport}
                                        disabled={shoutout.has_reported}
                                        className={`transition-colors ${shoutout.has_reported ? 'text-green-500 cursor-default' : 'text-slate-400 hover:text-yellow-500'}`}
                                        title={shoutout.has_reported ? "Already Reported" : "Report"}
                                    >
                                        <FaFlag size={12} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                            "{shoutout.message}"
                        </h3>

                        <div className="flex flex-wrap gap-2 mt-2">
                            {shoutout.recipients.map(user => (
                                <span key={user.id} className="px-2 py-0.5 rounded-md text-[10px] font-black bg-brand-primary/10 text-brand-primary uppercase tracking-wider border border-brand-primary/10">
                                    @{user.name}
                                </span>
                            ))}
                        </div>

                        {/* Inline Reactions & Actions */}
                        <div className="flex items-center gap-6 pt-2">
                            <ReactionButtons
                                key={`shoutout-reactions-${shoutout.id}`}
                                targetId={shoutout.id}
                                targetType="shoutout"
                                initialReactions={shoutout.reactions}
                                onReact={(newReactions) => onReact && onReact(newReactions)}
                            />

                            <button
                                onClick={() => setShowComments(!showComments)}
                                className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors ${showComments ? 'text-brand-primary' : 'text-slate-500 hover:text-brand-primary'}`}
                            >
                                <FaComment />
                                <span>Comments {shoutout.comment_count > 0 && `(${shoutout.comment_count})`}</span>
                            </button>
                        </div>
                    </div>

                    {/* Right Side: Date & Thumbnail */}
                    <div className="flex flex-col items-end gap-3 shrink-0">
                        <div className="text-xs font-black text-slate-900 dark:text-white/90 uppercase tracking-widest bg-black/5 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-black/5 dark:border-white/5 whitespace-nowrap">
                            {new Date(shoutout.created_at).toLocaleDateString()}
                        </div>

                        {shoutout.image_url && (
                            <div className="w-16 h-16 rounded-xl overflow-hidden border border-white/10 bg-black/20 group/img cursor-pointer relative">
                                <img src={shoutout.image_url} alt="thumbnail" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                                    View
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Expanded Comment Section */}
                {showComments && (
                    <div className="mt-2 pt-4 border-t border-white/5 animate-fade-in pl-[5rem]">
                        <CommentSection
                            targetId={shoutout.id}
                            targetType="shoutout"
                        />
                    </div>
                )}
            </div>
        </div >
    );
};

export default ShoutoutCard;
