import React, { useState, useEffect } from 'react';
import { FaTrophy, FaUsers, FaBullhorn, FaPlus, FaArrowRight, FaTimes } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import BragModal from '../components/BragModal';
import ShoutoutForm from '../components/ShoutoutForm';
import ShoutoutCard from '../components/ShoutoutCard';
import ShoutoutFilters from '../components/ShoutoutFilters';
import ShoutoutFeed from '../components/ShoutoutFeed';
import { getApiUrl } from '../utils/apiConfig';

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();
  const [stats, setStats] = useState([
    { label: 'My Brags', value: '0', icon: <FaTrophy /> },
    { label: 'Dept Brags', value: '0', icon: <FaUsers /> },
  ]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [colleagues, setColleagues] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showShoutoutModal, setShowShoutoutModal] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [newBrag, setNewBrag] = useState({ title: '', content: '', image_url: '', video_url: '', tags: '' });
  const [mediaItems, setMediaItems] = useState([]); // Array of { type: 'image'|'video', source: 'upload'|'url', data: File|string, preview: string }
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [selectedBrag, setSelectedBrag] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [shoutouts, setShoutouts] = useState([]);
  const [filters, setFilters] = useState({
    department_id: '',
    user_id: '',
    date: ''
  });
  const [sortOrder, setSortOrder] = useState('default');

  // Mentions State
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const textareaRef = React.useRef(null);

  const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

  const filteredColleagues = colleagues.filter(col =>
    col.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const sortedShoutouts = React.useMemo(() => {
    if (sortOrder === 'default') return shoutouts;
    return [...shoutouts].sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
  }, [shoutouts, sortOrder]);

  const fetchData = React.useCallback(async () => {
    try {
      const currentToken = getToken();
      if (!currentToken) {
        navigate('/login');
        return;
      }
      const headers = { 'Authorization': `Bearer ${currentToken}` };
      const deptRes = await fetch(getApiUrl('/api/brags/department'), { headers });
      if (deptRes.status === 401) {
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        navigate('/login');
        return;
      }
      const deptBrags = await deptRes.json();
      const myRes = await fetch(getApiUrl('/api/brags/my-brags'), { headers });
      const myBrags = await myRes.json();
      const userRes = await fetch(getApiUrl('/api/me'), { headers });
      if (userRes.ok) {
        const userData = await userRes.json();
        setCurrentUserId(userData.id);
        setIsAdmin(userData.role === 'admin');
      }
      const colRes = await fetch(getApiUrl('/api/departments/colleagues'), { headers });
      const colleagues = await colRes.json();
      setColleagues(colleagues);

      setStats([
        { label: 'My Brags', value: myBrags.length || 0, icon: <FaTrophy /> },
        { label: 'Dept Brags', value: deptBrags.length || 0, icon: <FaUsers /> },
      ]);

      if (Array.isArray(deptBrags)) {
        const bragCounts = {};
        deptBrags.forEach(brag => {
          const userId = brag.user_id;
          bragCounts[userId] = (bragCounts[userId] || 0) + 1;
        });

        const leaderboard = colleagues.map(col => ({
          ...col,
          bragCount: bragCounts[col.id] || 0
        })).sort((a, b) => b.bragCount - a.bragCount);
        setLeaderboardData(leaderboard);
      }

      const feed = [];
      if (Array.isArray(deptBrags)) {
        deptBrags.forEach(brag => {
          feed.push({
            id: `brag-${brag.id}`,
            user: brag.author_name || `User #${brag.user_id}`,
            item: brag.title,
            time: new Date(brag.created_at),
            timeStr: new Date(brag.created_at).toLocaleDateString(),
            fullBrag: brag,
            type: 'brag'
          });
        });
      }

      let fetchedShoutouts = [];
      try {
        const shoutoutRes = await fetch(getApiUrl('/api/shoutouts/'), { headers });
        if (shoutoutRes.ok) fetchedShoutouts = await shoutoutRes.json();
      } catch (e) { console.error(e); }

      // Shoutouts are now in their own section, not mixed in feed.


      feed.sort((a, b) => b.time - a.time);
      setRecentActivity(feed.slice(0, 20));

      // Shoutouts state for other components
      const queryParams = new URLSearchParams();
      if (filters.department_id) queryParams.append('department_id', filters.department_id);
      if (filters.user_id) queryParams.append('user_id', filters.user_id);
      if (filters.date) queryParams.append('date', filters.date);
      const shoutoutRes = await fetch(getApiUrl(`/api/shoutouts/?${queryParams.toString()}`), { headers });
      if (shoutoutRes.ok) {
        const shoutoutData = await shoutoutRes.json();
        setShoutouts(shoutoutData);
      }

      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
      setLoading(false);
    }
  }, [navigate, filters]);

  useEffect(() => {
    if (!getToken()) {
      navigate('/login');
      return;
    }
    fetchData();
  }, [navigate, fetchData]);

  useEffect(() => {
    if (!loading && shoutouts.length > 0) {
      const params = new URLSearchParams(location.search);
      const shoutoutId = params.get('shoutoutId');
      if (shoutoutId) {
        setTimeout(() => {
          const element = document.getElementById(`shoutout-${shoutoutId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('lumina-glow');
          }
        }, 500);
      }
    }
  }, [loading, shoutouts, location.search]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const bragId = params.get('bragId');
    if (bragId) {
      fetch(getApiUrl(`/api/brags/${bragId}`), {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data && data.id) {
            setSelectedBrag(data);
            setShowModal(true);
          }
        })
        .catch(err => console.error("Error fetching brag from notification:", err));
    }
  }, [location.search, navigate]);

  // Helper to add media item
  const addMediaItem = (type, source, fileOrUrl) => {
    let preview = '';
    if (source === 'upload' && fileOrUrl) {
      preview = URL.createObjectURL(fileOrUrl);
    } else if (source === 'url') {
      preview = fileOrUrl;
    }

    setMediaItems([...mediaItems, { type, source, data: fileOrUrl, preview }]);
  };

  const removeMediaItem = (index) => {
    setMediaItems(mediaItems.filter((_, i) => i !== index));
  };

  const handleContentChange = (e) => {
    const value = e.target.value;
    setNewBrag({ ...newBrag, content: value });

    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPosition);
    const lastAtSymbolIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtSymbolIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtSymbolIndex + 1);
      if (!textAfterAt.includes(' ')) {
        setMentionQuery(textAfterAt);
        setShowMentions(true);
        return;
      }
    }
    setShowMentions(false);
  };

  const handleMentionSelect = (name) => {
    const cursorPosition = textareaRef.current.selectionStart;
    const textBeforeCursor = newBrag.content.slice(0, cursorPosition);
    const lastAtSymbolIndex = textBeforeCursor.lastIndexOf('@');

    const newContent =
      newBrag.content.slice(0, lastAtSymbolIndex) +
      `@${name} ` +
      newBrag.content.slice(cursorPosition);

    setNewBrag({ ...newBrag, content: newContent });
    setShowMentions(false);
    textareaRef.current.focus();
  };

  const handleCreateBrag = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const readFileAsBase64 = (file) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      };

      const processedImages = [];
      const processedVideos = [];

      for (const item of mediaItems) {
        if (item.type === 'image') {
          if (item.source === 'upload') {
            processedImages.push(await readFileAsBase64(item.data));
          } else {
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

      const res = await fetch(getApiUrl('/api/brags/'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          ...newBrag,
          image_url: processedImages,
          video_url: processedVideos
        })
      });
      if (res.ok) {
        addToast('Brag posted successfully!', 'success');
        setShowModal(false);
        setNewBrag({ title: '', content: '', image_url: '', video_url: '', tags: '' });
        setMediaItems([]);
        fetchData();
      } else {
        const errorData = await res.json();
        addToast(`Failed to create brag: ${errorData.detail || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error("Error creating brag", error);
      addToast("An error occurred while uploading. Please check file sizes.", 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBrag = async (bragId) => {
    try {
      const res = await fetch(getApiUrl(`/api/brags/${bragId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      });

      if (res.ok) {
        addToast('Brag deleted successfully', 'success');
        fetchData();
        setSelectedBrag(null); // Close modal
      } else {
        const errorData = await res.json();
        addToast(`Failed to delete brag: ${errorData.detail || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error("Error deleting brag", error);
      addToast("Failed to delete brag", 'error');
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-brand-dark">
      <div className="w-20 h-20 rounded-full border-4 border-brand-primary/20 border-t-brand-primary animate-spin shadow-[0_0_20px_rgba(34,211,238,0.2)]" />
    </div>
  );

  return (
    <div className="space-y-12 animate-fade-in relative">

      {/* Hero Section */}
      <div className="relative lumina-card p-12 overflow-hidden group animate-slide-up">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/20 via-brand-dark to-brand-secondary/20 opacity-50" />
        <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-brand-primary/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-[-20%] left-[-10%] w-96 h-96 bg-brand-secondary/10 rounded-full blur-[100px] animate-pulse delay-700" />

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-12">
          <div className="max-w-xl space-y-6">
            <h1 className="text-5xl md:text-6xl font-black text-slate-900 dark:text-white leading-[1.1] tracking-tighter">
              Welcome to Your <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-secondary">Dashboard</span>
            </h1>
            <div className="pt-4">
              <div className="flex gap-4">
                <button
                  onClick={() => setShowModal(true)}
                  className="group relative px-10 py-5 bg-brand-dark text-white dark:bg-white dark:text-brand-dark rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl transition-all hover:scale-105 active:scale-95 lumina-glow overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-brand-primary to-brand-secondary opacity-0 group-hover:opacity-10 dark:group-hover:opacity-10 transition-opacity" />
                  <span className="relative flex items-center gap-3">
                    <FaPlus /> Post a Brag
                  </span>
                </button>


              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full lg:w-auto">
            {stats.map((stat, idx) => (
              <div
                key={idx}
                onClick={() => {
                  if (stat.label === 'My Brags') {
                    navigate('/profile', { state: { scrollTo: 'my-posts' } });
                  } else if (stat.label === 'Dept Brags') {
                    navigate('/department-feed');
                  }
                }}
                className={`lumina-card p-8 flex flex-col items-center justify-center text-center relative overflow-hidden group/metric cursor-pointer ${idx === 0 ? 'animate-slide-up delay-100' : 'animate-slide-up delay-150'}`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/metric:opacity-100 transition-opacity" />
                <div className="w-16 h-16 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-brand-primary text-2xl mb-4 border border-black/5 dark:border-white/5 shadow-inner">
                  {stat.icon}
                </div>
                <div className="text-4xl font-black text-slate-900 dark:text-white mb-1 tracking-tighter">{stat.value}</div>
                <div className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-12 lumina-card flex flex-col h-[800px] animate-slide-up delay-200">
          <div className="p-8 border-b border-white/5 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-1 h-8 bg-brand-primary rounded-full shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Recent Activity</h2>
                <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-widest">Latest Updates</p>
              </div>
            </div>
            <button onClick={() => navigate('/department-feed')} className="px-5 py-2.5 lumina-glass rounded-xl text-xs font-black uppercase tracking-widest text-brand-primary border border-brand-primary/20 hover:bg-brand-primary/10 transition-all">
              View All
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
            {recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-900 dark:text-white italic space-y-4">
                <FaBullhorn className="text-4xl opacity-20" />
                <p>No activity yet.</p>
              </div>
            ) : (
              recentActivity.map((activity, idx) => (
                <div
                  key={activity.id}
                  onClick={() => {
                    if (activity.type === 'brag') {
                      setSelectedBrag(activity.fullBrag || null);
                    } else if (activity.type === 'shoutout') {
                      const element = document.getElementById(`shoutout-${activity.id.replace('shoutout-', '')}`);
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        element.classList.add('lumina-glow');
                        setTimeout(() => element.classList.remove('lumina-glow'), 2000);
                      }
                    }
                  }}
                  className={`relative p-6 rounded-3xl border border-white/5 transition-all cursor-pointer group flex gap-6 items-center animate-slide-up overflow-hidden hover:shadow-2xl hover:shadow-brand-primary/10 hover:border-brand-primary/20 bg-white/[0.02] dark:bg-white/[0.05]`}
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/0 via-brand-primary/5 to-brand-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />
                  <div className="relative">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${activity.type === 'shoutout' ? 'from-purple-500/20 to-pink-500/20' : 'from-brand-primary/20 to-brand-secondary/20'} flex items-center justify-center text-slate-900 dark:text-white font-black text-xl shadow-inner border border-white/10 group-hover:scale-110 transition-transform`}>
                      {activity.type === 'shoutout' ? <FaBullhorn size={20} /> : activity.user.charAt(0)}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${activity.type === 'shoutout' ? 'bg-purple-500' : 'bg-brand-primary'} rounded-full border-2 border-brand-dark`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-900 dark:text-white font-bold mb-1 text-sm">
                      {activity.user} <span className="text-slate-900 dark:text-white font-medium lowercase">
                        {activity.type === 'shoutout' ? 'gave a shoutout' : 'posted a brag'}
                      </span>
                    </p>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-brand-primary transition-colors truncate">
                      "{activity.item}"
                    </h3>
                  </div>

                  {/* Image Thumbnail */}
                  {(() => {
                    let displayImg = null;
                    if (activity.type === 'brag') {
                      const imgUrl = activity.fullBrag?.image_url;
                      displayImg = Array.isArray(imgUrl) ? imgUrl[0] : imgUrl;
                    } else if (activity.type === 'shoutout' && activity.image_url) {
                      displayImg = activity.image_url;
                    }

                    if (displayImg) {
                      return (
                        <div className="w-16 h-16 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-black/20">
                          <img src={displayImg} alt="thumbnail" className="w-full h-full object-cover" />
                        </div>
                      );
                    }
                    return null;
                  })()}
                  <div className="text-xs font-black text-slate-900 dark:text-white dark:text-slate-900 dark:text-white/90 uppercase tracking-widest bg-black/5 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-black/5 dark:border-white/5">
                    {activity.timeStr}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>


      </div>





      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-dark/50 backdrop-blur-xl animate-fade-in">
          <div className="lumina-card w-full max-w-md overflow-hidden relative border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Post a Brag</h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 text-slate-900 dark:text-white hover:text-slate-900 dark:text-white transition-colors">
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleCreateBrag} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-xs font-black text-slate-900 dark:text-white mb-2 uppercase tracking-widest">Title</label>
                <input
                  type="text"
                  className="w-full px-6 py-4 rounded-2xl border border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/20 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary outline-none transition-all placeholder:text-slate-500 dark:placeholder:text-white/50"
                  placeholder="What did you achieve?"
                  value={newBrag.title}
                  onChange={(e) => setNewBrag({ ...newBrag, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-900 dark:text-white mb-2 uppercase tracking-widest">Description</label>
                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    rows="3"
                    className="w-full px-6 py-4 rounded-2xl border border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/20 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary outline-none transition-all resize-none placeholder:text-slate-500 dark:placeholder:text-white/50"
                    placeholder="Share the details of your success... (Type '@' to tag someone)"
                    value={newBrag.content}
                    onChange={handleContentChange}
                  />
                  {showMentions && filteredColleagues.length > 0 && (
                    <div className="absolute left-0 bottom-full mb-2 w-64 bg-white dark:bg-brand-dark rounded-xl shadow-2xl border border-black/10 dark:border-white/10 overflow-hidden z-50">
                      <div className="p-2bg-brand-primary/10 text-xs font-bold px-4 py-2 text-slate-500 uppercase tracking-wider">
                        Mention Colleague
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {filteredColleagues.map(col => (
                          <button
                            key={col.id}
                            type="button"
                            onClick={() => handleMentionSelect(col.name)}
                            className="w-full text-left px-4 py-3 hover:bg-brand-primary/10 flex items-center gap-3 transition-colors text-slate-900 dark:text-white"
                          >
                            <div className="w-6 h-6 rounded-full bg-brand-primary/20 flex items-center justify-center text-xs font-black">
                              {col.name.charAt(0)}
                            </div>
                            <span className="font-bold text-sm">{col.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-xs font-black text-slate-900 dark:text-white mb-2 uppercase tracking-widest">Media (Photos & Videos)</label>

                {/* Media List */}
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
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
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

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-5 bg-white text-brand-dark font-black rounded-2xl text-xs uppercase tracking-widest shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98] lumina-glow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Transmitting Spark...' : 'Submit Brag'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showLeaderboard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-dark/50 backdrop-blur-xl animate-fade-in">
          <div className="lumina-card w-full max-w-2xl overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-brand-primary/20 to-brand-secondary/20">
              <div className="flex items-center gap-4">
                <FaTrophy className="text-brand-primary text-3xl drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Leaderboard</h3>
              </div>
              <button onClick={() => setShowLeaderboard(false)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/5 text-slate-900 dark:text-white hover:bg-white/10 transition-all">
                <FaTimes />
              </button>
            </div>
            <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar space-y-4">
              {leaderboardData.map((member, index) => (
                <div key={member.id} className="flex items-center gap-6 p-6 lumina-glass rounded-3xl border border-white/5 hover:border-brand-primary/10 transition-all group">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl border-2 ${index === 0 ? 'border-brand-primary shadow-[0_0_15px_rgba(34,211,238,0.3)] bg-brand-primary/10' : 'border-white/5 bg-white/5 text-slate-900 dark:text-white'}`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-slate-900 dark:text-white text-lg truncate mb-1">{member.name}</h4>
                    <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">{member.email}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black text-brand-primary">{member.bragCount}</div>
                    <div className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Brags</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <BragModal
        brag={selectedBrag}
        onClose={() => setSelectedBrag(null)}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        onUpdate={() => fetchData()}
        onDelete={handleDeleteBrag}
        onReact={(newReactions) => {
          setSelectedBrag(prev => ({ ...prev, reactions: newReactions }));
          // Also update the brag in recentActivity so the count stays in sync
          setRecentActivity(prev => prev.map(act => {
            if (act.id === `brag-${selectedBrag.id}`) {
              return { ...act, fullBrag: { ...act.fullBrag, reactions: newReactions } };
            }
            return act;
          }));
        }}
      />

      {showShoutoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-dark/50 backdrop-blur-xl animate-fade-in">
          <div className="lumina-card w-full max-w-lg overflow-hidden relative border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Give a Shout-out</h3>
              <button onClick={() => setShowShoutoutModal(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 text-slate-900 dark:text-white hover:bg-white/10 transition-all">
                <FaTimes />
              </button>
            </div>
            <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <ShoutoutForm
                colleagues={colleagues}
                onShoutoutCreated={() => {
                  fetchData();
                  setShowShoutoutModal(false);
                }}
                compact={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
