import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Check, Eye, EyeOff, User, Mail, Lock, Image as ImageIcon } from 'lucide-react';
import { uploadOrganizationFile, validateImageOrDocumentFile } from '../../utils/storageUpload';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentName: string;
  currentEmail: string;
  currentPicture: string;
  onSave: (data: { name: string; email: string; password?: string; picture: string }) => void | Promise<void>;
  title?: string;
}

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
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(currentName);
      setEmail(currentEmail);
      setPicture(currentPicture);
      setPassword('');
      setError('');
      setSuccess(false);
    }
  }, [isOpen, currentName, currentEmail, currentPicture]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    setError('');
    const err = validateImageOrDocumentFile(file, { allowPdf: false });
    if (err) {
      setError(err);
      input.value = '';
      return;
    }
    setIsUploading(true);
    try {
      const uploaded = await uploadOrganizationFile(
        'platform-profiles',
        file,
        'guest_portal_media',
        email || name || 'Profile User',
        { allowPdf: false }
      );
      setPicture(uploaded.url);
    } catch (uploadErr: any) {
      setError(uploadErr?.message || 'Failed to upload profile photo.');
    } finally {
      setIsUploading(false);
      input.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setError('');
    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        email: email.trim(),
        picture: picture.trim(),
        ...(password ? { password } : {}),
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 900);
    } catch (err: any) {
      setError(err?.message || 'Failed to save profile changes to server.');
    } finally {
      setIsSaving(false);
    }
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
                    placeholder="Paste Image URL or upload photo"
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
                  accept="image/*,.heic,.heif,.avif,.jfif"
                  className="hidden"
                />
                <p className="text-[10px] text-neutral-400 font-medium">
                  {isUploading ? 'Uploading photo...' : 'Accepted: PNG, JPG, WebP, HEIC (Max 10MB)'}
                </p>
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
                placeholder="Platform Super Admin"
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
