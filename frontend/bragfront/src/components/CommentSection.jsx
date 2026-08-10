import React, { useState, useEffect } from 'react';
import { FaPaperPlane, FaComment, FaTrash, FaEdit, FaReply, FaUserCircle, FaFlag } from 'react-icons/fa';
import { useToast } from '../context/ToastContext';
import { getApiUrl } from '../utils/apiConfig';

const timeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return "Just now";
};

const CommentSection = ({ targetId, targetType }) => {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null); // comment ID being replied to
    const [replyContent, setReplyContent] = useState('');

    const { addToast } = useToast();
    const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

    useEffect(() => {
        fetchComments();
        fetchCurrentUser();
    }, [targetId, targetType]);

    const fetchCurrentUser = async () => {
        const token = getToken();
        if (!token) return;
        try {
            const res = await fetch(getApiUrl('/api/me'), {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setCurrentUserId(data.id);
                setIsAdmin(data.role === 'admin');
            } else {
                console.error("Failed to fetch current user:", res.status);
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
        }
    };

    const fetchComments = async () => {
        try {
            const token = getToken();
            const headers = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const url = getApiUrl(`/api/comments/${targetType}/${targetId}`);
            console.log("Fetching comments from:", url);

            const res = await fetch(url, { headers });
            if (res.ok) {
                const data = await res.json();
                console.log("Comments received:", data);
                const organized = organizeComments(data);
                console.log("Organized comments:", organized);
                setComments(organized);
            } else {
                console.error("Fetch comments failed:", res.status);
            }
        } catch (error) {
            console.error("Error fetching comments:", error);
        }
    };

    // Organize flat list into tree
    const organizeComments = (flatComments) => {
        const map = {};
        const roots = [];

        // First pass: Initialize map and add children array
        flatComments.forEach(c => {
            map[c.id] = { ...c, children: [] };
        });

        // Second pass: Link children to parents
        flatComments.forEach(c => {
            if (c.parent_id && map[c.parent_id]) {
                map[c.parent_id].children.push(map[c.id]);
            } else {
                roots.push(map[c.id]);
            }
        });

        return roots;
    };

    const handleSubmit = async (e, parentId = null) => {
        e.preventDefault();
        const content = parentId ? replyContent : newComment;
        if (!content.trim()) return;

        const token = getToken();
        if (!token) {
            addToast("Please login to comment", "error");
            return;
        }

        setLoading(true);
        try {
            const url = getApiUrl('/api/comments');
            console.log("Posting comment to:", url, { target_id: Number(targetId), target_type: targetType });

            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    target_id: Number(targetId),
                    target_type: targetType,
                    content: content,
                    parent_id: parentId ? Number(parentId) : null
                })
            });

            if (res.ok) {
                setNewComment('');
                setReplyContent('');
                setReplyingTo(null);
                fetchComments(); // Refresh to get proper tree structure
                addToast("Comment posted!", "success");
            } else {
                const errorData = await res.json().catch(() => ({ detail: "Unknown error" }));
                console.error("Failed to post comment:", res.status, errorData);
                addToast(`Failed: ${errorData.detail || 'Server error'}`, "error");
            }
        } catch (error) {
            console.error("Error posting comment:", error);
            addToast("Error posting comment", "error");
        } finally {
            setLoading(false);
        }
    };

    const deleteComment = async (commentId) => {
        if (!window.confirm("Delete this comment?")) return;
        const token = getToken();
        if (!token) {
            addToast("Please login to delete comments", "error");
            return;
        }
        try {
            const res = await fetch(getApiUrl(`/api/comments/${commentId}`), {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                fetchComments();
                addToast("Comment deleted", "success");
            } else {
                console.error("Failed to delete comment:", res.status);
                addToast("Failed to delete comment", "error");
            }
        } catch (error) {
            console.error("Error deleting comment:", error);
            addToast("Error deleting comment", "error");
        }
    };

    const handleReportComment = async (commentId) => {
        const reason = window.prompt("Why are you reporting this comment?");
        if (!reason) return;
        const token = getToken();
        if (!token) {
            addToast("Please login to report comments", "error");
            return;
        }
        try {
            const res = await fetch(getApiUrl(`/api/comments/${commentId}/report`), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ target_id: commentId, target_type: 'comment', reason })
            });
            if (res.ok) addToast('Comment reported', 'success');
            else {
                console.error("Failed to report comment:", res.status);
                addToast('Failed to report', 'error');
            }
        } catch (e) {
            console.error("Error reporting comment:", e);
            addToast('Error reporting', 'error');
        }
    };

    const CommentItem = ({ comment, depth = 0 }) => {
        if (!comment.user) return null;

        return (
            <div className={`mt-3 ${depth > 0 ? 'ml-6 pl-4 border-l border-white/10' : ''}`}>
                <div className="flex gap-3 items-start group">
                    {comment.user.profile_picture ? (
                        <img
                            src={comment.user.profile_picture.startsWith('data:') ? comment.user.profile_picture : `data:image/jpeg;base64,${comment.user.profile_picture}`}
                            alt="avatar"
                            className="w-8 h-8 rounded-full object-cover border border-white/10"
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
                            {comment.user.name?.charAt(0) || '?'}
                        </div>
                    )}

                    <div className="flex-1 min-w-0">
                        <div className="bg-white/5 rounded-2xl p-3 border border-white/5 relative">
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-xs font-black text-brand-primary uppercase tracking-wide">
                                    {comment.user.name}
                                </span>
                                <span className="text-[10px] text-slate-500 font-bold" title={new Date(comment.created_at).toLocaleString()}>
                                    {timeAgo(comment.created_at)}
                                </span>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{comment.content}</p>

                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                {(currentUserId === comment.user_id || isAdmin) && (
                                    <button
                                        onClick={() => deleteComment(comment.id)}
                                        className="text-slate-500 hover:text-red-500 transition-colors"
                                        title="Delete Comment"
                                    >
                                        <FaTrash size={10} />
                                    </button>
                                )}
                                {currentUserId !== comment.user_id && (
                                    <button
                                        onClick={() => handleReportComment(comment.id)}
                                        disabled={comment.has_reported}
                                        className={`transition-colors ${comment.has_reported ? 'text-green-500 cursor-default' : 'text-slate-500 hover:text-yellow-500'}`}
                                        title={comment.has_reported ? "Already Reported" : "Report Comment"}
                                    >
                                        <FaFlag size={10} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-4 mt-1 ml-2">
                            <button
                                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                                className="text-[10px] font-bold text-slate-500 hover:text-brand-primary uppercase tracking-wider flex items-center gap-1 transition-colors"
                            >
                                <FaReply /> Reply
                            </button>
                        </div>

                        {replyingTo === comment.id && (
                            <form onSubmit={(e) => handleSubmit(e, comment.id)} className="mt-2 flex gap-2 animate-fade-in">
                                <input
                                    autoFocus
                                    type="text"
                                    value={replyContent}
                                    onChange={(e) => setReplyContent(e.target.value)}
                                    placeholder={`Reply to ${comment.user.name}...`}
                                    className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:ring-1 focus:ring-brand-primary outline-none"
                                />
                                <button
                                    type="submit"
                                    disabled={!replyContent.trim() || loading}
                                    className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 transition-colors"
                                >
                                    <FaPaperPlane size={12} />
                                </button>
                            </form>
                        )}

                        {comment.children && comment.children.length > 0 && (
                            <div className="mt-2">
                                {comment.children.map(child => (
                                    <CommentItem key={child.id} comment={child} depth={depth + 1} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* New Comment Input */}
            <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                    <FaComment className="text-brand-primary text-xs" />
                </div>
                <form onSubmit={(e) => handleSubmit(e)} className="flex-1 relative">
                    <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write a comment..."
                        className="w-full px-4 py-3 pr-12 rounded-2xl bg-white/5 border border-white/10 text-xs text-white focus:ring-1 focus:ring-brand-primary outline-none transition-all placeholder:text-slate-600"
                    />
                    <button
                        type="submit"
                        disabled={loading || !newComment.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-brand-primary hover:scale-110 active:scale-95 disabled:opacity-30 transition-all"
                    >
                        <FaPaperPlane />
                    </button>
                </form>
            </div>

            {/* Comments List */}
            <div className="space-y-4">
                {comments.length === 0 ? (
                    <p className="text-xs text-slate-600 italic text-center py-4">No comments yet. Start the conversation!</p>
                ) : (
                    comments.map(comment => (
                        <CommentItem key={comment.id} comment={comment} />
                    ))
                )}
            </div>
        </div>
    );
};

export default CommentSection;
