import React, { useState, useEffect } from 'react';
import { FaBullhorn, FaTimes, FaUserPlus } from 'react-icons/fa';
import { useToast } from '../context/ToastContext';

import { getApiUrl } from '../utils/apiConfig';

const ShoutoutForm = ({ onShoutoutCreated, colleagues, compact = false }) => {
  const [message, setMessage] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        addToast('Please select an image file', 'error');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        addToast('Image size should be less than 5MB', 'error');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedRecipients.length === 0) {
      addToast("Please select at least one recipient.", 'error');
      return;
    }

    setLoading(true);
    try {
      const readFileAsBase64 = (file) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      };

      const imageData = imageFile ? await readFileAsBase64(imageFile) : null;

      const res = await fetch(getApiUrl('/api/shoutouts/'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          message,
          recipient_ids: selectedRecipients,
          image_url: imageData
        })
      });

      if (res.ok) {
        addToast('Shout-out sent successfully!', 'success');
        setMessage('');
        setSelectedRecipients([]);
        setImageFile(null);
        setImagePreview(null);
        if (onShoutoutCreated) onShoutoutCreated();
      } else {
        const errorData = await res.json();
        addToast(`Error: ${errorData.detail || 'Failed to send shout-out'}`, 'error');
      }
    } catch (error) {
      console.error("Error sending shout-out", error);
      addToast('Error sending shout-out', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleRecipient = (userId) => {
    if (selectedRecipients.includes(userId)) {
      setSelectedRecipients(selectedRecipients.filter(id => id !== userId));
    } else {
      setSelectedRecipients([...selectedRecipients, userId]);
    }
  };

  return (
    <div className={`${compact ? 'p-1 space-y-4' : 'lumina-glass rounded-[2rem] p-10 space-y-8 border border-white/10 shadow-2xl relative overflow-hidden'}`}>
      {!compact && <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-full blur-3xl pointer-events-none" />}

      <div className="flex items-center gap-4 mb-2">
        <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary border border-brand-primary/20 lumina-glow">
          <FaBullhorn className="text-xl" />
        </div>
        <h2 className={`${compact ? 'text-xl' : 'text-3xl'} font-black text-slate-900 dark:text-white tracking-tight`}>Give a Shout-out</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <textarea
            required
            rows="3"
            maxLength="280"
            className="w-full px-6 py-4 rounded-[1.5rem] border border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/[0.03] text-slate-900 dark:text-white placeholder:text-slate-500 focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none transition-all resize-none font-medium leading-relaxed"
            placeholder="Celebrate a colleague's brilliance..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        {/* Image Upload */}
        <div>
          <div className="flex items-center gap-4">
            <label className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-brand-primary hover:border-brand-primary/30 transition-all">
              <FaUserPlus className="text-sm" />
              <span>{imageFile ? 'Change Image' : 'Add Image'}</span>
              <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
            </label>
            {imageFile && (
              <div className="relative group">
                <img src={imagePreview} alt="Preview" className="w-10 h-10 rounded-lg object-cover border border-white/10" />
                <button
                  onClick={removeImage}
                  type="button"
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <FaTimes />
                </button>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black text-slate-500 mb-4 uppercase tracking-[0.25em]">
            Illuminate Colleagues
          </label>
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1 custom-scrollbar">
            {colleagues.length === 0 ? (
              <p className="text-slate-500 text-xs italic">No explorers found.</p>
            ) : (
              colleagues.map(col => (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => toggleRecipient(col.id)}
                  className={`flex items-center gap-3 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${selectedRecipients.includes(col.id)
                    ? 'bg-brand-primary/20 border-brand-primary text-brand-primary shadow-[0_0_15px_rgba(34,211,238,0.2)]'
                    : 'bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/5 text-slate-400 dark:text-slate-400 hover:border-brand-primary/30 hover:text-slate-600 dark:hover:text-slate-200'
                    }`}
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black uppercase ${selectedRecipients.includes(col.id) ? 'bg-brand-primary text-white dark:text-brand-dark' : 'bg-black/10 dark:bg-white/10 text-slate-500'}`}>
                    {col.name.charAt(0)}
                  </div>
                  {col.name}
                  {selectedRecipients.includes(col.id) && <FaTimes className="text-[10px]" />}
                </button>
              ))
            )}
          </div>
          {selectedRecipients.length > 0 && (
            <p className="text-[10px] font-black text-brand-primary mt-4 uppercase tracking-widest">
              {selectedRecipients.length} Sparking
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !message.trim() || selectedRecipients.length === 0}
          className="w-full py-5 bg-brand-dark text-white dark:bg-white dark:text-brand-dark hover:scale-[1.02] active:scale-[0.98] disabled:opacity-20 disabled:grayscale disabled:scale-100 text-xs uppercase tracking-[0.2em] font-black rounded-2xl shadow-2xl transition-all lumina-glow"
        >
          {loading ? 'Transmitting...' : 'Ignite Shout-out'}
        </button>
      </form>
    </div>
  );
};

export default ShoutoutForm;
