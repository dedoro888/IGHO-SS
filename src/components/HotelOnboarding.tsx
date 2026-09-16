import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  Upload,
  RefreshCw,
  X,
  MapPin,
  Building,
  CreditCard,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck2,
  Building2,
  Sparkles,
} from 'lucide-react';
import { ActiveScreen, SubscriptionPlan, PlatformSettings, Hotel } from '../types';
import { BackButton } from './BackButton';
import { INITIAL_PLANS } from '../data/platformData';
import { IghoOfficialEmblem } from './IghoLogo';
import { PaystackSubscriptionModal } from './PaystackSubscriptionModal';

interface HotelOnboardingProps {
  onNavigate: (screen: ActiveScreen) => void;
  onHotelCreated: (hotelData: any) => void;
  plans?: SubscriptionPlan[];
  payoutSettings?: PlatformSettings['subscriptionPayout'];
  onRegisterRequest?: (hotelData: any) => void;
  existingHotels?: Hotel[];
}

// Device Image Uploader Component (click to browse or drag & drop from device)
const DeviceImageUploader: React.FC<{
  label: string;
  helperText?: string;
  value: string;
  onChange: (dataUrl: string) => void;
  aspectRatio?: 'square' | 'cover';
}> = ({ label, helperText, value, onChange, aspectRatio = 'square' }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const processFile = (file: File) => {
    setUploadError(null);
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size exceeds 5MB limit. Please choose a smaller file.');
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploading(false);
      if (e.target?.result) {
        onChange(e.target.result as string);
      }
    };
    reader.onerror = () => {
      setUploading(false);
      setUploadError('Error reading image from your device.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-neutral-700">{label}</label>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png,image/jpeg,image/jpg,image/webp"
        className="hidden"
      />
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center gap-2 transition-all ${
          dragOver
            ? 'border-black bg-neutral-100'
            : 'border-neutral-300 bg-neutral-50/60 hover:bg-neutral-50'
        }`}
      >
        {value ? (
          <div className="flex items-center gap-4 w-full">
            <img
              src={value}
              alt={label}
              className={`object-cover rounded-xl border border-neutral-200 shadow-2xs shrink-0 ${
                aspectRatio === 'cover' ? 'w-24 h-16' : 'w-14 h-14'
              }`}
            />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-neutral-800 block truncate">
                Uploaded image from device
              </span>
              <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1 mt-0.5">
                <Check className="w-3.5 h-3.5" /> Ready for display
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl border border-neutral-300 bg-white text-neutral-700 font-semibold text-xs hover:bg-neutral-50 shadow-2xs transition-colors"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={() => onChange('')}
                className="px-3 py-1.5 rounded-xl border border-neutral-200 text-rose-600 font-semibold text-xs hover:bg-rose-50 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-neutral-300 rounded-xl text-xs font-bold text-neutral-800 shadow-2xs hover:bg-neutral-50 active:scale-95 transition-all mx-auto"
            >
              {uploading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-neutral-500" />
              ) : (
                <Upload className="w-4 h-4 text-neutral-600" />
              )}
              <span>Choose image from device</span>
            </button>
            <p className="text-[11px] text-neutral-400 mt-1.5">
              PNG, JPG, or WEBP up to 5MB (Drag & drop supported)
            </p>
          </div>
        )}
      </div>
      {uploadError && <p className="text-xs text-rose-600 font-medium">{uploadError}</p>}
      {helperText && <p className="text-[11px] text-neutral-400">{helperText}</p>}
    </div>
  );
};

export const HotelOnboarding: React.FC<HotelOnboardingProps> = ({
  onNavigate,
  onHotelCreated,
  plans = INITIAL_PLANS,
  payoutSettings,
  onRegisterRequest,
  existingHotels = [],
}) => {
  // Step 1: Account, 2: Hotel & Uploads, 3: Approval Gate, 4: Packages, 5: Paystack, 6: Workspace Ready
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Approval status for Step 3 Gate
  const [approvalStatus, setApprovalStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [showPaystackModal, setShowPaystackModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Account
    fullName: 'David',
    email: 'avendoorcompany@gmail.com',
    phone: '+234 811 223 3445',
    password: 'password123',
    confirmPassword: 'password123',

    // Step 2: Hotel
    hotelName: 'Lava Hotel & Suites',
    hotelEmail: 'lavahotel@info.com',
    hotelPhone: '+234 811 223 3445',
    address: 'Plot 14 Admiralty Way, Lekki Phase 1',
    city: 'Lagos',
    state: 'Lagos',
    country: 'Nigeria',
    roomCount: '35',
    logoImage: '',
    coverImage: '',
    isRegisteredBusiness: true,
    cacNumber: 'RC-1849204',
    mapsLink: 'https://maps.google.com/?q=6.4474,3.4735',
    lat: '6.4474',
    lng: '3.4735',
    website: 'https://lavahotels.ng',
    instagram: '@lavahotel',
    facebook: 'lavahotelng',
    bankName: 'Providus Bank',
    accountName: 'Lava Hospitality Operations Ltd',
    accountNumber: '5401829471',

    // Step 4: Package selection
    selectedPlanId: plans[1]?.id || plans[0]?.id || 'stay_complete',
    selectedPlanName: plans[1]?.name || plans[0]?.name || 'IGHO Stay — Complete',

    // Step 5: Paystack settlement reference
    payerName: 'David Avendoor',
    paystackReference: '',
  });

  const updateField = (field: string, val: any) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const handleNextFromAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep(2);
    }, 400);
  };

  const handleNextFromHotel = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Requirement 4: Duplicate hotel prevention (Name, Slug, CAC)
    if (existingHotels && existingHotels.length > 0) {
      const cleanName = formData.hotelName.trim().toLowerCase();
      const duplicateName = existingHotels.some(
        (h) => h.name.trim().toLowerCase() === cleanName
      );
      if (duplicateName) {
        setErrorMessage(`A hotel with the name "${formData.hotelName}" is already registered on IGHO Stay.`);
        return;
      }

      const generatedSlug = cleanName.replace(/[^a-z0-9]/g, '-');
      const duplicateSlug = existingHotels.some(
        (h) => h.id.toLowerCase() === generatedSlug || (h as any).slug === generatedSlug
      );
      if (duplicateSlug) {
        setErrorMessage(`The identifier or subdomain for "${formData.hotelName}" is already claimed.`);
        return;
      }

      if (formData.isRegisteredBusiness && formData.cacNumber?.trim()) {
        const cleanCac = formData.cacNumber.trim().toLowerCase();
        const duplicateCac = existingHotels.some(
          (h) => h.cacNumber && h.cacNumber.trim().toLowerCase() === cleanCac
        );
        if (duplicateCac) {
          setErrorMessage(`A registered business with CAC number "${formData.cacNumber}" already exists.`);
          return;
        }
      }
    }

    setIsLoading(true);

    // Call registration request callback to add to platform registry
    if (onRegisterRequest) {
      onRegisterRequest(formData);
    }

    setTimeout(() => {
      setIsLoading(false);
      setApprovalStatus('pending');
      setStep(3); // Go to Step 3: Approval Gate
    }, 600);
  };

  const handleNextFromApprovalGate = () => {
    if (approvalStatus !== 'approved') return;
    setStep(4); // Advance to Package Selection
  };

  const handleNextFromPackage = () => {
    setStep(5); // Advance to Paystack
  };

  const handlePaystackPaymentSuccess = (paymentRef: string) => {
    setIsLoading(true);
    setFormData((prev) => ({ ...prev, paystackReference: paymentRef }));

    setTimeout(() => {
      setIsLoading(false);
      onHotelCreated({
        ...formData,
        packageType: formData.selectedPlanId.includes('complete') ? 'complete' : 'management',
        approvalStatus: 'approved',
        paymentStatus: 'paid',
        isLive: true,
        paystackReference: paymentRef,
      });
      setStep(6);
    }, 600);
  };

  const selectedPlan = plans.find((p) => p.id === formData.selectedPlanId) || plans[0];
  const duePrice = billingCycle === 'annual' ? selectedPlan?.annualPrice || 0 : selectedPlan?.monthlyPrice || 0;

  const defaultPayout = payoutSettings || {
    walletOrAccount: 'Providus Bank PLC (Corporate NGN) & USDT (TRC-20)',
    networkOrBank: 'Providus Bank PLC / TRON (TRC-20)',
    recipientName: 'IGHO PLATFORMS NIGERIA LTD',
    accountNumber: '0938475811 / TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    notes: 'Please quote your Hotel ID or CAC number in the transfer description for automatic clearing.',
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 px-4 sm:px-6 py-6 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-neutral-100 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <BackButton
            onClick={() => {
              if (step > 1 && step < 6) setStep((step - 1) as any);
              else onNavigate('setup_selector');
            }}
          />
          <span className="text-xs text-neutral-600 font-semibold">Back to Setup</span>
        </div>

        <div className="flex items-center gap-2">
          <IghoOfficialEmblem className="w-6 h-6" />
          <span className="font-black text-sm tracking-tight text-black">IGHO Stay</span>
        </div>

        <span className="text-xs text-neutral-400 font-medium">Hotel Onboarding</span>
      </div>

      {/* 6-Step Visual Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs font-semibold text-neutral-500">
          {[
            { num: 1, label: '1. Owner Account' },
            { num: 2, label: '2. Hotel Details' },
            { num: 3, label: '3. Admin Approval' },
            { num: 4, label: '4. Choose Plan' },
            { num: 5, label: '5. Paystack' },
            { num: 6, label: '6. Workspace Live' },
          ].map((s) => (
            <div
              key={s.num}
              className={`flex items-center gap-1.5 ${
                step === s.num
                  ? 'text-black font-bold'
                  : step > s.num
                  ? 'text-emerald-700'
                  : 'text-neutral-400'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  step === s.num
                    ? 'bg-black text-white'
                    : step > s.num
                    ? 'bg-emerald-600 text-white'
                    : 'bg-neutral-100 text-neutral-400'
                }`}
              >
                {step > s.num ? '✓' : s.num}
              </div>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
          ))}
        </div>
        <div className="w-full bg-neutral-100 h-1.5 rounded-full mt-3 overflow-hidden">
          <div
            className="bg-black h-full transition-all duration-300"
            style={{
              width: `${
                step === 1 ? 16 : step === 2 ? 33 : step === 3 ? 50 : step === 4 ? 66 : step === 5 ? 83 : 100
              }%`,
            }}
          />
        </div>
      </div>

      {/* STEP 1: OWNER ACCOUNT */}
      {step === 1 && (
        <form onSubmit={handleNextFromAccount} className="max-w-xl mx-auto space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-black tracking-tight">Create your IGHO account</h2>
            <p className="text-xs sm:text-sm text-neutral-500">
              One IGHO identity manages all your organizations and hospitality operations.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Full name</label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => updateField('fullName', e.target.value)}
                placeholder="e.g. David Avendoor"
                className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Email address</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="name@company.com"
                className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Phone number</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="+234 800 000 0000"
                className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-neutral-400 hover:text-black"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Confirm password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => updateField('confirmPassword', e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2.5 text-neutral-400 hover:text-black"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-black text-white py-3 rounded-full font-bold text-xs hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" /> Verifying identity...
              </span>
            ) : (
              'Next: Hotel Information'
            )}
          </button>
        </form>
      )}

      {/* STEP 2: HOTEL INFORMATION & DEVICE UPLOADS */}
      {step === 2 && (
        <form onSubmit={handleNextFromHotel} className="max-w-2xl mx-auto space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-black tracking-tight">Hotel Information</h2>
            <p className="text-xs sm:text-sm text-neutral-500">
              Details will be verified by the IGHO Console Super Admin before your subscription is activated.
            </p>
          </div>

          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-semibold">{errorMessage}</span>
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Hotel name</label>
                <input
                  type="text"
                  required
                  value={formData.hotelName}
                  onChange={(e) => updateField('hotelName', e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Total rooms</label>
                <input
                  type="number"
                  required
                  value={formData.roomCount}
                  onChange={(e) => updateField('roomCount', e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-black"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Official email</label>
                <input
                  type="email"
                  required
                  value={formData.hotelEmail}
                  onChange={(e) => updateField('hotelEmail', e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Phone number</label>
                <input
                  type="tel"
                  required
                  value={formData.hotelPhone}
                  onChange={(e) => updateField('hotelPhone', e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-black"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Street address</label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={(e) => updateField('address', e.target.value)}
                className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-black"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">City</label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">State</label>
                <input
                  type="text"
                  required
                  value={formData.state}
                  onChange={(e) => updateField('state', e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Country</label>
                <input
                  type="text"
                  required
                  value={formData.country}
                  onChange={(e) => updateField('country', e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-black"
                />
              </div>
            </div>

            {/* Device Image Uploads (Logo & Background Cover) */}
            <div className="pt-2 border-t border-neutral-100">
              <div className="text-xs font-bold text-black uppercase tracking-wider mb-3">
                Property Visuals & Branding (Upload from your Device)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DeviceImageUploader
                  label="Hotel Logo"
                  helperText="Square emblem or brand mark shown in header and booking portal."
                  value={formData.logoImage}
                  onChange={(url) => updateField('logoImage', url)}
                  aspectRatio="square"
                />
                <DeviceImageUploader
                  label="Hotel Cover / Background"
                  helperText="High-resolution hero banner for guest booking discovery."
                  value={formData.coverImage}
                  onChange={(url) => updateField('coverImage', url)}
                  aspectRatio="cover"
                />
              </div>
            </div>

            {/* Corporate CAC & Settlement Account */}
            <div className="pt-3 border-t border-neutral-100 space-y-4">
              <div className="text-xs font-bold text-black uppercase tracking-wider">
                Corporate Verification & Guest Settlement Account
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    CAC Registration Number
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.cacNumber}
                    onChange={(e) => updateField('cacNumber', e.target.value)}
                    placeholder="e.g. RC-1849204"
                    className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Settlement Bank Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.bankName}
                    onChange={(e) => updateField('bankName', e.target.value)}
                    placeholder="e.g. Providus Bank / Zenith Bank"
                    className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Account Name (as registered with bank)
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.accountName}
                    onChange={(e) => updateField('accountName', e.target.value)}
                    placeholder="e.g. Lava Hospitality Operations Ltd"
                    className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    10-Digit NUBAN Account Number
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={formData.accountNumber}
                    onChange={(e) => updateField('accountNumber', e.target.value)}
                    placeholder="e.g. 5401829471"
                    className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-black font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-5 py-2.5 rounded-xl border border-neutral-300 text-xs font-bold text-neutral-700 hover:bg-neutral-50"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-black text-white px-7 py-2.5 rounded-full text-xs font-bold hover:bg-neutral-800 transition-all flex items-center gap-2 active:scale-95 shadow-sm"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Submitting...
                </span>
              ) : (
                'Submit for IGHO Approval'
              )}
            </button>
          </div>
        </form>
      )}

      {/* STEP 3: REGISTRATION APPROVAL GATE (Requirement 4) */}
      {step === 3 && (
        <div className="max-w-xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="space-y-1 text-center">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xs ${
                approvalStatus === 'approved'
                  ? 'bg-emerald-100 text-emerald-700'
                  : approvalStatus === 'rejected'
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {approvalStatus === 'approved' ? (
                <CheckCircle2 className="w-8 h-8" />
              ) : approvalStatus === 'rejected' ? (
                <AlertCircle className="w-8 h-8" />
              ) : (
                <Clock className="w-8 h-8 animate-pulse" />
              )}
            </div>

            <h2 className="text-2xl font-black text-black tracking-tight">
              {approvalStatus === 'approved'
                ? 'Registration Approved!'
                : approvalStatus === 'rejected'
                ? 'Registration Needs Revision'
                : 'Awaiting Super Admin Approval'}
            </h2>
            <p className="text-xs text-neutral-500 max-w-md mx-auto leading-relaxed">
              {approvalStatus === 'approved'
                ? 'Your hotel registration has been verified and approved by the IGHO Console Super Admin. You may now select your subscription package.'
                : approvalStatus === 'rejected'
                ? 'The platform administrator requested updates to your submitted registration.'
                : 'Before hotels can choose their subscription packages, registrations must be verified and approved by the owner of IGHO Console to ensure platform compliance.'}
            </p>
          </div>

          {/* Registration Summary Card */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-5 space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
              <span className="font-bold text-neutral-500 uppercase text-[10px]">Submitted Hotel</span>
              <span
                className={`font-bold px-2.5 py-0.5 rounded-full text-[10px] ${
                  approvalStatus === 'approved'
                    ? 'bg-emerald-100 text-emerald-800'
                    : approvalStatus === 'rejected'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-900'
                }`}
              >
                {approvalStatus === 'approved'
                  ? 'Approved by IGHO Console'
                  : approvalStatus === 'rejected'
                  ? 'Rejected'
                  : 'Pending Review in Console'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-neutral-700">
              <div>
                <span className="text-neutral-400 block text-[10px]">Property Name</span>
                <span className="font-bold text-black">{formData.hotelName}</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px]">Location</span>
                <span className="font-medium">{formData.city}, {formData.state}</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px]">CAC Number</span>
                <span className="font-mono font-semibold">{formData.cacNumber}</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px]">Settlement Account</span>
                <span className="font-medium">{formData.bankName} ({formData.accountNumber})</span>
              </div>
            </div>

            {/* Visual preview if uploaded */}
            {(formData.logoImage || formData.coverImage) && (
              <div className="pt-2 border-t border-neutral-200 flex items-center gap-3">
                {formData.logoImage && (
                  <img
                    src={formData.logoImage}
                    alt="Logo preview"
                    className="w-10 h-10 rounded-lg object-cover border border-neutral-200"
                  />
                )}
                {formData.coverImage && (
                  <img
                    src={formData.coverImage}
                    alt="Cover preview"
                    className="w-16 h-10 rounded-lg object-cover border border-neutral-200"
                  />
                )}
                <span className="text-[11px] text-neutral-500">Device assets attached to review dossier</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="space-y-3 pt-2">
            {approvalStatus === 'approved' ? (
              <button
                onClick={handleNextFromApprovalGate}
                className="w-full bg-black hover:bg-neutral-800 text-white py-3 rounded-full font-bold text-xs transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
              >
                <span>Proceed to Choose Subscription Package</span>
                <Check className="w-4 h-4" />
              </button>
            ) : (
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Submitted to IGHO Platform Review Queue</span>
                  </div>
                  <p className="text-amber-800 leading-relaxed text-[11px]">
                    Your registration request is currently being reviewed by the IGHO Console Super Admin. Once your CAC registration, ownership credentials, and property specs are verified, your subscription and hotel workspace will unlock.
                  </p>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex-1 border border-neutral-300 hover:bg-neutral-50 text-neutral-800 py-2.5 rounded-xl font-semibold text-xs transition-colors"
                  >
                    Edit Registration Details
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('landing')}
                    className="px-5 border border-neutral-200 hover:bg-neutral-50 text-neutral-600 py-2.5 rounded-xl font-semibold text-xs"
                  >
                    Return to Home
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 4: PACKAGE SELECTION (Linked dynamically to IGHO Console Subscription Plans) */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
              Select your subscription package
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 max-w-lg mx-auto">
              Packages and features are managed directly from the IGHO Console.
            </p>

            {/* Monthly / Annual Toggle */}
            <div className="inline-flex items-center bg-neutral-100 p-1 rounded-xl text-xs font-semibold mt-2">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-1.5 rounded-lg transition-colors ${
                  billingCycle === 'monthly' ? 'bg-black text-white shadow-xs font-bold' : 'text-neutral-600'
                }`}
              >
                Monthly billing
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('annual')}
                className={`px-4 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  billingCycle === 'annual' ? 'bg-black text-white shadow-xs font-bold' : 'text-neutral-600'
                }`}
              >
                <span>Annual billing</span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  Save 20%
                </span>
              </button>
            </div>
          </div>

          {/* Dynamic Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {plans.map((plan) => {
              const price = billingCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice;
              const isSelected = formData.selectedPlanId === plan.id;
              const isComplete = plan.id.includes('complete');

              return (
                <div
                  key={plan.id}
                  onClick={() => {
                    updateField('selectedPlanId', plan.id);
                    updateField('selectedPlanName', plan.name);
                  }}
                  className={`rounded-2xl p-6 border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                    isSelected
                      ? 'border-black bg-white shadow-lg ring-2 ring-black'
                      : 'border-neutral-200 hover:border-neutral-300 bg-white'
                  }`}
                >
                  {isComplete && (
                    <div className="absolute -top-3 left-6 bg-black text-white text-[10px] font-bold px-3 py-0.5 rounded-full tracking-wider uppercase">
                      RECOMMENDED
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-base font-bold text-neutral-900">{plan.name}</div>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? 'border-black bg-black text-white' : 'border-neutral-300'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>

                    <div>
                      <span className="text-3xl font-extrabold text-black">
                        ₦{price.toLocaleString()}
                      </span>
                      <span className="text-xs text-neutral-500">
                        {billingCycle === 'annual' ? ' /year' : ' /month'}
                      </span>
                    </div>

                    <div className="text-xs text-neutral-600">
                      Cap: Up to {plan.maxRooms} rooms · {plan.maxStaff} staff seats
                    </div>

                    <div className="pt-3 border-t border-neutral-100 space-y-2 text-xs text-neutral-700">
                      {plan.features.map((feat) => (
                        <div key={feat} className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-neutral-100">
            <button
              onClick={() => setStep(3)}
              className="px-5 py-2.5 rounded-xl border border-neutral-300 text-xs font-bold text-neutral-700 hover:bg-neutral-50"
            >
              Back
            </button>
            <button
              onClick={handleNextFromPackage}
              className="bg-black text-white px-7 py-2.5 rounded-full text-xs font-bold hover:bg-neutral-800 transition-all shadow-sm active:scale-95"
            >
              Continue to Settlement
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: PAYSTACK PAYMENT SETTLEMENT (Strictly Paystack Only) */}
      {step === 5 && (
        <div className="max-w-xl mx-auto space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-black tracking-tight">Subscription Payment</h2>
            <p className="text-xs sm:text-sm text-neutral-500">
              Subscription payments are processed strictly through Paystack.
            </p>
          </div>

          {/* Subscription Summary */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-6 space-y-3 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-neutral-200">
              <span className="text-neutral-500">Hotel Property</span>
              <span className="font-bold text-black">{formData.hotelName}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-neutral-200">
              <span className="text-neutral-500">Selected Tier</span>
              <span className="font-semibold text-black">{formData.selectedPlanName}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-neutral-200">
              <span className="text-neutral-500">Billing Cycle</span>
              <span className="font-medium text-black capitalize">{billingCycle}</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm font-bold text-black">Due Amount</span>
              <span className="text-2xl font-black text-black">₦{duePrice.toLocaleString()}</span>
            </div>
          </div>

          {/* Paystack Channel Overview Card */}
          <div className="bg-neutral-900 text-white rounded-2xl p-6 space-y-4 shadow-lg border border-neutral-800">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#0BA4DB] text-white flex items-center justify-center font-black text-xs">
                  P
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Paystack Payment Gateway</div>
                  <div className="text-[10px] text-neutral-400">Official IGHO Billing Settlement</div>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-950 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-800">
                Live Channels
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-neutral-800/80 rounded-xl border border-neutral-700/60">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-[#0BA4DB]" />
                  <span>Debit / Credit Card</span>
                </div>
                <div className="text-[10px] text-neutral-400 mt-1">Mastercard, Visa, Verve</div>
              </div>

              <div className="p-3 bg-neutral-800/80 rounded-xl border border-neutral-700/60">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#0BA4DB]" />
                  <span>Bank Direct Debit</span>
                </div>
                <div className="text-[10px] text-neutral-400 mt-1">Direct from Nigerian Banks</div>
              </div>

              <div className="p-3 bg-neutral-800/80 rounded-xl border border-neutral-700/60">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 text-[#0BA4DB]" />
                  <span>Paystack Transfer</span>
                </div>
                <div className="text-[10px] text-neutral-400 mt-1">Dynamic virtual account</div>
              </div>

              <div className="p-3 bg-neutral-800/80 rounded-xl border border-neutral-700/60">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#0BA4DB]" />
                  <span>USSD Fast Pay</span>
                </div>
                <div className="text-[10px] text-neutral-400 mt-1">*737#, *966#, *894#, *901#</div>
              </div>
            </div>

            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Upon clicking "Pay via Paystack", you can select your preferred payment channel. Instant verification will automatically activate your hotel workspace.
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => setStep(4)}
              className="px-5 py-2.5 rounded-xl border border-neutral-300 text-xs font-bold text-neutral-700 hover:bg-neutral-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setShowPaystackModal(true)}
              disabled={isLoading}
              className="bg-[#0BA4DB] hover:bg-[#0993C5] text-white px-8 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 active:scale-95 shadow-md"
            >
              <CreditCard className="w-4 h-4" />
              <span>Pay ₦{duePrice.toLocaleString()} via Paystack</span>
            </button>
          </div>
        </div>
      )}

      {/* Paystack Modal for Onboarding */}
      <PaystackSubscriptionModal
        isOpen={showPaystackModal}
        onClose={() => setShowPaystackModal(false)}
        plan={selectedPlan}
        billingCycle={billingCycle}
        customerEmail={formData.email}
        hotelName={formData.hotelName}
        onSuccess={handlePaystackPaymentSuccess}
      />

      {/* STEP 6: WORKSPACE READY */}
      {step === 6 && (
        <div className="max-w-md mx-auto text-center space-y-6 pt-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg">
            <Check className="w-8 h-8 stroke-[3]" />
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl sm:text-3xl font-black text-black">Workspace Activated</h2>
            <p className="text-xs sm:text-sm text-neutral-500">
              <span className="font-semibold text-black">{formData.hotelName}</span> is now live on IGHO Stay.
            </p>
          </div>

          <div className="bg-neutral-50 rounded-2xl border border-neutral-200 p-5 text-left text-xs space-y-3">
            <div className="flex justify-between py-1 border-b border-neutral-200">
              <span className="text-neutral-500">Tenant ID</span>
              <span className="font-mono font-bold text-black">HTL-{formData.hotelName.substring(0, 4).toUpperCase()}-001</span>
            </div>
            <div className="flex justify-between py-1 border-b border-neutral-200">
              <span className="text-neutral-500">Active Package</span>
              <span className="font-semibold text-black">{formData.selectedPlanName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-neutral-200">
              <span className="text-neutral-500">Next Renewal Date</span>
              <span className="font-medium text-black">
                {billingCycle === 'annual' ? '2027-09-11' : '2026-10-11'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-neutral-500">Settlement Bank</span>
              <span className="font-semibold text-black">
                {formData.bankName} · {formData.accountNumber}
              </span>
            </div>
          </div>

          <button
            onClick={() => onNavigate('staff_portal')}
            className="w-full bg-black text-white py-3.5 rounded-xl font-bold text-sm hover:bg-neutral-800 transition-all active:scale-95 shadow-md"
          >
            Enter Hotel Dashboard
          </button>
        </div>
      )}
    </div>
  );
};
