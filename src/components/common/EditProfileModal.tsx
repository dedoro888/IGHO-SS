import React, { useState, useRef } from 'react';
import { X, Upload, Check, Eye, EyeOff, User, Mail, Lock, Image as ImageIcon } from 'lucide-react';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentName: string;
  currentEmail: string;
  currentPicture: string;
  onSave: (data: { name: string; email: string; password?: string; picture: string }) => void;
  title?: string;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&h=150&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&h=150&q=80',
];

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  currentName,
  currentEmail,
  currentPicture,
  onSave,
  title = 'Edit Your Profile',
}) => {
  const [name, setName] = useState(currentName);
  const [email, setEmail] = useState(currentEmail);
  const [password, setPassword] = useState('');
  const [picture, setPicture] = useState(currentPicture);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Image must be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setPicture(reader.result);
          setError('');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    onSave({
      name,
      email,
      picture,
      ...(password ? { password } : {}),
    });

    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div 
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-neutral-100 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-900 text-white shrink-0">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-400" />
            <h3 className="font-extrabold text-sm sm:text-base tracking-tight">{title}</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Profile updated successfully!</span>
            </div>
          )}

          {/* Profile Picture Section */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
              Profile Picture
            </label>
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-neutral-50 p-4 rounded-2xl border border-neutral-200/80">
              {/* Picture Preview */}
              <div className="relative group shrink-0">
                {picture ? (
                  <img 
                    src={picture} 
                    alt="Preview" 
                    className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-neutral-900 text-white font-extrabold flex items-center justify-center text-lg border-2 border-white shadow-md">
                    {name ? name.slice(0, 2).toUpperCase() : 'U'}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                </button>
              </div>

              {/* Upload Actions & Input URL */}
              <div className="flex-1 w-full space-y-2">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={picture} 
                    onChange={(e) => setPicture(e.target.value)}
                    placeholder="Paste Image URL or choose preset"
                    className="flex-1 bg-white border border-neutral-250 rounded-xl px-3 py-1.5 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white hover:bg-neutral-50 border border-neutral-250 text-neutral-700 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">Upload</span>
                  </button>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                <p className="text-[10px] text-neutral-400 font-medium">
                  Accepted formats: PNG, JPG, JPEG (Max 2MB)
                </p>
              </div>
            </div>

            {/* Presets Grid */}
            <div className="space-y-1.5">
              <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">Or select a premium preset avatar:</span>
              <div className="flex flex-wrap gap-2">
                {PRESET_AVATARS.map((avatar, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPicture(avatar)}
                    className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-all hover:scale-105 cursor-pointer relative shrink-0 ${
                      picture === avatar ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-transparent'
                    }`}
                  >
                    <img src={avatar} alt="Preset Avatar" className="w-full h-full object-cover" />
                    {picture === avatar && (
                      <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                <User className="w-3 h-3 text-neutral-400" />
                <span>Full Name</span>
              </label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Rume Obire"
                className="w-full bg-white border border-neutral-250 rounded-xl px-3.5 py-2.5 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 font-semibold"
              />
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                <Mail className="w-3 h-3 text-neutral-400" />
                <span>Email Address</span>
              </label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@igho.com"
                className="w-full bg-white border border-neutral-250 rounded-xl px-3.5 py-2.5 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 font-semibold"
              />
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                <Lock className="w-3 h-3 text-neutral-400" />
                <span>Change Password (Optional)</span>
              </label>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password to change"
                  className="w-full bg-white border border-neutral-250 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 font-semibold"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 p-1 text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[9px] text-neutral-400">Leave blank to keep your current password.</p>
            </div>
          </div>

          {/* Footer Save & Cancel Actions */}
          <div className="pt-4 border-t border-neutral-100 flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="bg-white hover:bg-neutral-50 border border-neutral-250 text-neutral-700 font-bold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-black hover:bg-neutral-900 border border-black text-white font-bold px-5 py-2 rounded-xl text-xs transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3px]" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
