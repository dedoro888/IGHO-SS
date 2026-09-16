import React, { useState } from 'react';
import {
  Sliders,
  Shield,
  CreditCard,
  Building2,
  CheckCircle2,
  Save,
  Flag,
  Share2,
  Trash2,
  Plus,
  ExternalLink,
  Globe,
} from 'lucide-react';
import { PlatformSettings, PlatformSocialHandle } from '../../types';
import { BackButton } from '../BackButton';

interface ConsoleSettingsViewProps {
  settings: PlatformSettings;
  onSaveSettings: (newSettings: PlatformSettings) => void;
  onNavigateBreadcrumb?: () => void;
}

export const ConsoleSettingsView: React.FC<ConsoleSettingsViewProps> = ({
  settings,
  onSaveSettings,
  onNavigateBreadcrumb,
}) => {
  const [formState, setFormState] = useState<PlatformSettings>(settings);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Social Handles State
  const [newPlatform, setNewPlatform] = useState<PlatformSocialHandle['platform']>('instagram');
  const [newHandle, setNewHandle] = useState('');
  const [newUrl, setNewUrl] = useState('');

  const currentSocialHandles: PlatformSocialHandle[] = formState.socialHandles || [
    { id: 'soc-1', platform: 'instagram', platformName: 'Instagram', handle: '@ighostay', url: 'https://instagram.com/ighostay' },
    { id: 'soc-2', platform: 'x', platformName: 'X (Twitter)', handle: '@ighostay', url: 'https://x.com/ighostay' },
    { id: 'soc-3', platform: 'linkedin', platformName: 'LinkedIn', handle: 'igho-stay', url: 'https://linkedin.com/company/igho-stay' },
  ];

  const handleAddSocial = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newHandle.trim()) return;

    const platformNames: Record<string, string> = {
      instagram: 'Instagram',
      x: 'X (Twitter)',
      linkedin: 'LinkedIn',
      facebook: 'Facebook',
      youtube: 'YouTube',
      tiktok: 'TikTok',
      other: 'Website / Other',
    };

    const newEntry: PlatformSocialHandle = {
      id: `social-${Date.now()}`,
      platform: newPlatform,
      platformName: platformNames[newPlatform] || newPlatform,
      handle: newHandle.startsWith('@') ? newHandle : `@${newHandle}`,
      url: newUrl.trim() || `https://${newPlatform}.com/${newHandle.replace('@', '')}`,
    };

    setFormState((prev) => ({
      ...prev,
      socialHandles: [...currentSocialHandles, newEntry],
    }));

    setNewHandle('');
    setNewUrl('');
  };

  const handleRemoveSocial = (id: string) => {
    setFormState((prev) => ({
      ...prev,
      socialHandles: currentSocialHandles.filter((h) => h.id !== id),
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formState);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 text-neutral-900">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 text-xs text-neutral-500">
        <BackButton onClick={onNavigateBreadcrumb} />
        <span className="text-neutral-900 font-bold text-sm">Platform Settings</span>
      </div>

      {/* Header */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-900 flex items-center justify-center font-bold">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-black">
              Platform Settings & Policies
            </h1>
            <p className="text-xs text-neutral-500">
              System-wide defaults, security requirements, billing parameters, and vertical feature flags.
            </p>
          </div>
        </div>

        <button
          type="submit"
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-black hover:bg-neutral-800 text-white font-bold text-xs transition-colors shadow-sm self-start sm:self-auto active:scale-95"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save Configuration</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Platform configuration updated and permanently logged to audit ledger.</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 1. General Platform Information */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="border-b border-neutral-100 pb-2">
            <h3 className="font-bold text-sm text-black flex items-center gap-2">
              <Sliders className="w-4 h-4 text-neutral-600" />
              <span>General Platform Information</span>
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-neutral-600 uppercase mb-1">
                Platform Name:
              </label>
              <input
                type="text"
                value={formState.general.platformName}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    general: { ...formState.general, platformName: e.target.value },
                  })
                }
                className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 focus:outline-none focus:border-black focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-600 uppercase mb-1">
                Platform Support Email:
              </label>
              <input
                type="email"
                value={formState.general.supportEmail}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    general: { ...formState.general, supportEmail: e.target.value },
                  })
                }
                className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 font-mono focus:outline-none focus:border-black focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-600 uppercase mb-1">
                Support Phone Hotline:
              </label>
              <input
                type="text"
                value={formState.general.supportPhone}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    general: { ...formState.general, supportPhone: e.target.value },
                  })
                }
                className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 font-mono focus:outline-none focus:border-black focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-600 uppercase mb-1">
                Corporate Registration & Legal Address:
              </label>
              <input
                type="text"
                value={formState.general.companyInfo}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    general: { ...formState.general, companyInfo: e.target.value },
                  })
                }
                className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 focus:outline-none focus:border-black focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* 2. Subscription & Billing Defaults */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="border-b border-neutral-100 pb-2">
            <h3 className="font-bold text-sm text-black flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-neutral-600" />
              <span>Subscription & Billing Defaults</span>
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-neutral-600 uppercase mb-1">
                  Default Trial (Days):
                </label>
                <input
                  type="number"
                  value={formState.subscription.defaultTrialDays}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      subscription: {
                        ...formState.subscription,
                        defaultTrialDays: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 font-mono focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-600 uppercase mb-1">
                  Grace Period (Days):
                </label>
                <input
                  type="number"
                  value={formState.subscription.gracePeriodDays}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      subscription: {
                        ...formState.subscription,
                        gracePeriodDays: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 font-mono focus:outline-none focus:border-black"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-600 uppercase mb-1">
                Platform Billing Currency:
              </label>
              <input
                type="text"
                value={formState.subscription.currency}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    subscription: { ...formState.subscription, currency: e.target.value },
                  })
                }
                className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 font-mono focus:outline-none focus:border-black"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="autorenew"
                checked={formState.subscription.autoRenewalDefault}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    subscription: {
                      ...formState.subscription,
                      autoRenewalDefault: e.target.checked,
                    },
                  })
                }
                className="rounded border-neutral-300 text-black focus:ring-0"
              />
              <label htmlFor="autorenew" className="text-neutral-700 text-xs">
                Auto-Renewal Enabled by Default on Subscriptions
              </label>
            </div>
          </div>
        </div>

        {/* 3. Registration & Onboarding Policies */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="border-b border-neutral-100 pb-2">
            <h3 className="font-bold text-sm text-black flex items-center gap-2">
              <Building2 className="w-4 h-4 text-neutral-600" />
              <span>Registration & Compliance Policies</span>
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="regEnabled"
                checked={formState.registration.registrationEnabled}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    registration: {
                      ...formState.registration,
                      registrationEnabled: e.target.checked,
                    },
                  })
                }
                className="rounded border-neutral-300 text-black focus:ring-0"
              />
              <label htmlFor="regEnabled" className="text-neutral-700">
                Public Hotel Self-Registration Enabled
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoApprove"
                checked={formState.registration.autoApproveHotels}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    registration: {
                      ...formState.registration,
                      autoApproveHotels: e.target.checked,
                    },
                  })
                }
                className="rounded border-neutral-300 text-black focus:ring-0"
              />
              <label htmlFor="autoApprove" className="text-neutral-700">
                Auto-Approve Hotel Registrations (Caution: bypasses Super Admin review)
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="reqCac"
                checked={formState.registration.requireCacVerification}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    registration: {
                      ...formState.registration,
                      requireCacVerification: e.target.checked,
                    },
                  })
                }
                className="rounded border-neutral-300 text-black focus:ring-0"
              />
              <label htmlFor="reqCac" className="text-neutral-700">
                Mandatory CAC Certificate & Number Verification
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="reqBank"
                checked={formState.registration.requireBankVerification}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    registration: {
                      ...formState.registration,
                      requireBankVerification: e.target.checked,
                    },
                  })
                }
                className="rounded border-neutral-300 text-black focus:ring-0"
              />
              <label htmlFor="reqBank" className="text-neutral-700">
                Mandatory Corporate Bank Account Details for Payouts
              </label>
            </div>
          </div>
        </div>

        {/* 4. Security & Identity Safeguards */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="border-b border-neutral-100 pb-2">
            <h3 className="font-bold text-sm text-black flex items-center gap-2">
              <Shield className="w-4 h-4 text-neutral-600" />
              <span>Security & Identity Safeguards</span>
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-neutral-600 uppercase mb-1">
                Admin Inactive Session Timeout (Hours):
              </label>
              <input
                type="number"
                value={formState.security.sessionTimeoutHours}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    security: {
                      ...formState.security,
                      sessionTimeoutHours: Number(e.target.value),
                    },
                  })
                }
                className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 font-mono focus:outline-none focus:border-black"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="super2fa"
                checked={formState.security.enforceSuperAdmin2FA}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    security: {
                      ...formState.security,
                      enforceSuperAdmin2FA: e.target.checked,
                    },
                  })
                }
                className="rounded border-neutral-300 text-black focus:ring-0"
              />
              <label htmlFor="super2fa" className="text-neutral-700">
                Enforce 2-Factor Authentication (2FA) for Super Admin (rumeobire@gmail.com)
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="confirmsensitive"
                checked={formState.security.requireSensitiveActionConfirmation}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    security: {
                      ...formState.security,
                      requireSensitiveActionConfirmation: e.target.checked,
                    },
                  })
                }
                className="rounded border-neutral-300 text-black focus:ring-0"
              />
              <label htmlFor="confirmsensitive" className="text-neutral-700">
                Require Typed Name Confirmation for Suspensions & Deletions
              </label>
            </div>
          </div>
        </div>

        {/* 5. Feature Flags */}
        <div className="md:col-span-2 bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="border-b border-neutral-100 pb-2">
            <h3 className="font-bold text-sm text-black flex items-center gap-2">
              <Flag className="w-4 h-4 text-neutral-600" />
              <span>Platform Feature Flags</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between">
              <span className="text-neutral-800 font-medium">Multi-Branch Hotel Engine</span>
              <input
                type="checkbox"
                checked={formState.featureFlags.enableMultiBranch}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    featureFlags: {
                      ...formState.featureFlags,
                      enableMultiBranch: e.target.checked,
                    },
                  })
                }
                className="rounded border-neutral-300 text-black focus:ring-0"
              />
            </div>

            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between">
              <span className="text-neutral-800 font-medium">AI Dynamic Room Pricing</span>
              <input
                type="checkbox"
                checked={formState.featureFlags.enableAiRoomPricing}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    featureFlags: {
                      ...formState.featureFlags,
                      enableAiRoomPricing: e.target.checked,
                    },
                  })
                }
                className="rounded border-neutral-300 text-black focus:ring-0"
              />
            </div>

            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between">
              <span className="text-neutral-800 font-medium">Public Reviews & Ratings</span>
              <input
                type="checkbox"
                checked={formState.featureFlags.enablePublicReviews}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    featureFlags: {
                      ...formState.featureFlags,
                      enablePublicReviews: e.target.checked,
                    },
                  })
                }
                className="rounded border-neutral-300 text-black focus:ring-0"
              />
            </div>
          </div>
        </div>

        {/* 6. System Social Media Handles */}
        <div className="md:col-span-2 bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
            <div>
              <h3 className="font-bold text-sm text-black flex items-center gap-2">
                <Share2 className="w-4 h-4 text-neutral-600" />
                <span>Ecosystem Social Media Handles</span>
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Manage public social channels displayed across the guest portal, landing pages, and email communications.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-800 border border-neutral-200">
              {currentSocialHandles.length} Active Handles
            </span>
          </div>

          {/* Add Social Handle Input Bar */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 space-y-3">
            <span className="text-[11px] font-bold uppercase text-neutral-600">Add New Handle</span>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div>
                <select
                  value={newPlatform}
                  onChange={(e) => setNewPlatform(e.target.value as any)}
                  className="w-full p-2 bg-white border border-neutral-300 rounded-lg text-xs text-neutral-800 font-medium"
                >
                  <option value="instagram">Instagram</option>
                  <option value="x">X (Twitter)</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="facebook">Facebook</option>
                  <option value="youtube">YouTube</option>
                  <option value="tiktok">TikTok</option>
                  <option value="other">Other Link</option>
                </select>
              </div>
              <div>
                <input
                  type="text"
                  value={newHandle}
                  onChange={(e) => setNewHandle(e.target.value)}
                  placeholder="Handle (e.g. @ighostay)"
                  className="w-full p-2 bg-white border border-neutral-300 rounded-lg text-xs text-neutral-900"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="Full URL (optional)"
                  className="w-full p-2 bg-white border border-neutral-300 rounded-lg text-xs text-neutral-900 font-mono"
                />
              </div>
              <div>
                <button
                  type="button"
                  onClick={handleAddSocial}
                  className="w-full p-2 bg-black hover:bg-neutral-800 text-white rounded-full text-xs font-bold transition-colors flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Handle</span>
                </button>
              </div>
            </div>
          </div>

          {/* Existing Social Handles List */}
          <div className="space-y-2">
            {currentSocialHandles.map((handle) => (
              <div
                key={handle.id}
                className="flex items-center justify-between p-3 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-700 font-bold text-xs">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-black flex items-center gap-1.5">
                      <span>{handle.platformName}</span>
                      <span className="font-mono text-neutral-500 font-normal">{handle.handle}</span>
                    </div>
                    <a
                      href={handle.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-blue-600 hover:underline font-mono truncate max-w-xs block"
                    >
                      {handle.url}
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRemoveSocial(handle.id)}
                    className="p-1.5 rounded-lg border border-neutral-200 text-neutral-400 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50 transition-colors"
                    title="Remove social handle"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </form>
  );
};
