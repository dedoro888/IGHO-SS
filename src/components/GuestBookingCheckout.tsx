import React, { useState, useEffect, useRef } from 'react';
import {
  Copy,
  Check,
  Upload,
  Camera,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  X,
  Building2,
  RefreshCw,
  AlertTriangle,
  BookmarkCheck,
  Save,
  FileCode,
} from 'lucide-react';
import { Room, Hotel, Reservation, ActiveScreen, CustomerProfile } from '../types';
import { BackButton } from './BackButton';
import { GuestAccountNavMenu } from './GuestAccountNavMenu';
import { saveCustomerProfile } from '../utils/auth';

interface GuestBookingCheckoutProps {
  room: Room;
  hotel: Hotel;
  bookingDraft: {
    checkIn: string;
    checkOut: string;
    nights: number;
    guests: number;
    total: number;
  };
  onCompleteBooking: (newReservation: Reservation) => void;
  onNavigate: (screen: ActiveScreen) => void;
  currentUserEmail?: string;
  currentGuestProfile?: CustomerProfile | null;
  onSignOut?: () => void;
  onEditProfile?: () => void;
}

export const GuestBookingCheckout: React.FC<GuestBookingCheckoutProps> = ({
  room,
  hotel,
  bookingDraft,
  onCompleteBooking,
  onNavigate,
  currentUserEmail,
  currentGuestProfile,
  onSignOut,
  onEditProfile,
}) => {
  const [subStep, setSubStep] = useState<'details' | 'payment'>('details');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Form inputs with local draft recovery
  const DRAFT_STORAGE_KEY = `igho_booking_draft_${hotel.id}_${room.id}`;

  const [guestName, setGuestName] = useState(() => {
    if (currentGuestProfile) {
      const full = `${currentGuestProfile.firstName || ''} ${currentGuestProfile.lastName || ''}`.trim();
      if (full) return full;
    }
    if (currentUserEmail) {
      return currentUserEmail.split('@')[0].replace(/[._]/g, ' ');
    }
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.guestName) return parsed.guestName;
      }
    } catch (e) {}
    return '';
  });

  const [guestPhone, setGuestPhone] = useState(() => {
    if (currentGuestProfile?.phone) return currentGuestProfile.phone;
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.guestPhone) return parsed.guestPhone;
      }
    } catch (e) {}
    return '';
  });

  const [guestEmail, setGuestEmail] = useState(() => {
    if (currentUserEmail) return currentUserEmail;
    if (currentGuestProfile?.email) return currentGuestProfile.email;
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.guestEmail) return parsed.guestEmail;
      }
    } catch (e) {}
    return '';
  });

  const lastSyncedProfileRef = useRef<string | null>(null);

  // Keep synced if current logged in guest profile changes, but do not fight user edits
  useEffect(() => {
    const profileId = currentGuestProfile?.id || currentUserEmail || null;
    if (profileId && lastSyncedProfileRef.current !== profileId) {
      lastSyncedProfileRef.current = profileId;
      if (currentGuestProfile) {
        const full = `${currentGuestProfile.firstName || ''} ${currentGuestProfile.lastName || ''}`.trim();
        setGuestName(full);
        setGuestPhone(currentGuestProfile.phone || '');
        setGuestEmail(currentGuestProfile.email || '');
      } else if (currentUserEmail) {
        setGuestEmail(currentUserEmail);
      }
    }
  }, [currentGuestProfile, currentUserEmail]);

  const [specialRequests, setSpecialRequests] = useState(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.specialRequests) return parsed.specialRequests;
      }
    } catch (e) {}
    return '';
  });

  const [linkToAccount, setLinkToAccount] = useState(true);
  const [saveDraftFeedback, setSaveDraftFeedback] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);

  const [paymentRef, setPaymentRef] = useState('');
  const [uploadedReceipt, setUploadedReceipt] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [uploadedFileType, setUploadedFileType] = useState<'image' | 'pdf'>('image');
  const [uploadedFileSize, setUploadedFileSize] = useState<string>('');

  const [createdReservation, setCreatedReservation] = useState<Reservation | null>(null);
  const checkoutFileInputRef = useRef<HTMLInputElement>(null);

  // Auto-save draft on form changes
  useEffect(() => {
    try {
      const draftData = {
        hotelId: hotel.id,
        hotelName: hotel.name,
        roomId: room.id,
        roomNumber: room.number,
        roomType: room.type,
        checkIn: bookingDraft.checkIn,
        checkOut: bookingDraft.checkOut,
        nights: bookingDraft.nights,
        guests: bookingDraft.guests,
        total: bookingDraft.total,
        guestName,
        guestPhone,
        guestEmail,
        specialRequests,
        linkToAccount,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
      // Also save global active draft for resume prompt
      localStorage.setItem('igho_latest_booking_draft', JSON.stringify(draftData));
    } catch (e) {}
  }, [guestName, guestPhone, guestEmail, specialRequests, linkToAccount, hotel, room, bookingDraft]);

  const handleManualSaveDraft = () => {
    setSaveDraftFeedback(true);
    setTimeout(() => setSaveDraftFeedback(false), 3000);
  };

  const handleDeviceReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setReceiptError(null);
    const file = e.target.files?.[0];
    if (file) {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const isImage = file.type.startsWith('image/');

      if (!isPdf && !isImage) {
        setReceiptError('Unsupported file type. Please upload an image (PNG, JPG, WebP) or a PDF document.');
        return;
      }

      setUploadedFileName(file.name);
      setUploadedFileType(isPdf ? 'pdf' : 'image');
      setUploadedFileSize(`${(file.size / 1024).toFixed(0)} KB`);

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setUploadedReceipt(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Generate reference PVG-2026-E345A7
  const reference = 'PVG-2026-E345A7';

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleContinueToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setSubStep('payment');
    }, 700);
  };

  const handleSubmitVerification = () => {
    setReceiptError(null);

    if (!paymentRef.trim()) {
      setReceiptError('Transaction reference is required. Please enter your bank transfer transaction ID or session reference.');
      return;
    }

    if (!uploadedReceipt) {
      setReceiptError('Payment proof is required. Please upload your bank transfer receipt or transaction screenshot (image or PDF).');
      return;
    }

    setIsProcessing(true);

    const newRes: Reservation = {
      id: `res-${Date.now()}`,
      reference: reference,
      hotelId: hotel.id,
      hotelName: hotel.name,
      roomId: room.id,
      roomNumber: room.number,
      roomType: room.type,
      guestName,
      guestEmail,
      guestPhone,
      checkIn: bookingDraft.checkIn,
      checkOut: bookingDraft.checkOut,
      nights: bookingDraft.nights,
      guests: bookingDraft.guests,
      total: bookingDraft.total,
      status: 'pending_verification',
      createdAt: new Date().toISOString(),
      paymentRef: paymentRef.trim(),
      receiptUrl: uploadedReceipt,
      specialRequests,
    };

    setTimeout(() => {
      setIsProcessing(false);
      setCreatedReservation(newRes);
      onCompleteBooking(newRes);

      // Clear draft on successful submission
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        localStorage.removeItem('igho_latest_booking_draft');
      } catch (e) {}

      if (linkToAccount && guestEmail) {
        try {
          const names = guestName.trim().split(' ');
          const fName = names[0] || '';
          const lName = names.slice(1).join(' ') || '';
          saveCustomerProfile({
            id: currentGuestProfile?.id || `cust-${Date.now()}`,
            email: guestEmail.trim().toLowerCase(),
            firstName: fName,
            lastName: lName,
            phone: guestPhone.trim(),
            createdAt: currentGuestProfile?.createdAt || new Date().toISOString(),
          });
        } catch (e) {}
      }

      setShowSuccessModal(true);
    }, 900);
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-100 px-4 sm:px-6 py-3 flex items-center justify-between">
        <BackButton
          onClick={() => {
            if (subStep === 'payment') setSubStep('details');
            else onNavigate('room_detail');
          }}
        />

        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-black text-white font-black rounded flex items-center justify-center text-xs">
            I
          </div>
          <span className="font-extrabold text-xs sm:text-sm text-black tracking-tight">IGHO Stay</span>
        </div>

        <div className="flex items-center gap-2">
          <GuestAccountNavMenu
            currentUserEmail={currentUserEmail}
            currentGuestProfile={currentGuestProfile}
            onNavigate={onNavigate}
            onSignOut={onSignOut}
            onEditProfile={onEditProfile}
            signInLabel="Sign in"
          />
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* SUBSTEP 1: GUEST DETAILS */}
        {subStep === 'details' && (
          <form onSubmit={handleContinueToPayment} className="space-y-6">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-black">Complete your booking</h1>
              <p className="text-xs sm:text-sm text-neutral-500">
                Review your details. You'll receive a booking reference for bank transfer on the next step.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Form inputs */}
              <div className="lg:col-span-7 space-y-4">
                <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  Guest details
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-neutral-700">Full name</label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:border-black"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-neutral-700">Phone number</label>
                    <input
                      type="text"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      placeholder="e.g. 08012345678"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:border-black"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-neutral-700">Email</label>
                    <input
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="e.g. you@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:border-black"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-neutral-500">Check-in</span>
                    <input
                      type="text"
                      disabled
                      value={bookingDraft.checkIn}
                      className="w-full px-2.5 py-2 bg-neutral-100 rounded-lg text-xs font-medium text-neutral-700 border border-neutral-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-neutral-500">Nights</span>
                    <input
                      type="text"
                      disabled
                      value={bookingDraft.nights}
                      className="w-full px-2.5 py-2 bg-neutral-100 rounded-lg text-xs font-medium text-neutral-700 border border-neutral-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-neutral-500">Guests (max 2)</span>
                    <input
                      type="text"
                      disabled
                      value={bookingDraft.guests}
                      className="w-full px-2.5 py-2 bg-neutral-100 rounded-lg text-xs font-medium text-neutral-700 border border-neutral-200"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-neutral-700">
                    Special requests (optional)
                  </label>
                  <textarea
                    rows={2}
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    placeholder="Late arrival, dietary needs, room preference..."
                    className="w-full px-3.5 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:border-black"
                  />
                </div>

                {/* Booking Progress Saving & Account Linking */}
                <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200/80 space-y-2.5">
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={linkToAccount}
                      onChange={(e) => setLinkToAccount(e.target.checked)}
                      className="mt-0.5 rounded border-neutral-300 text-black focus:ring-black"
                    />
                    <div>
                      <span className="font-semibold text-neutral-900 block">
                        Link booking to my IGHO Guest Account
                      </span>
                      <span className="text-[11px] text-neutral-500 block">
                        Associate this reservation with {guestEmail} for instant check-in, invoices, and stay history.
                      </span>
                    </div>
                  </label>

                  <div className="pt-2 border-t border-neutral-200/60 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleManualSaveDraft}
                      className="inline-flex items-center gap-1.5 text-xs text-neutral-600 hover:text-black font-semibold transition-colors"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save progress to device</span>
                    </button>
                    {saveDraftFeedback && (
                      <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1 animate-in fade-in">
                        <Check className="w-3.5 h-3.5" /> Progress saved
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full bg-black text-white py-3 rounded-full font-bold text-xs hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm"
                >
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" /> Creating booking...
                    </span>
                  ) : (
                    'Continue to payment'
                  )}
                </button>
              </div>

              {/* Summary Card */}
              <div className="lg:col-span-5 bg-neutral-50 border border-neutral-200 rounded-2xl overflow-hidden p-4 space-y-3">
                <div className="h-36 w-full rounded-xl overflow-hidden bg-neutral-200 flex items-center justify-center text-center">
                  {room.images && room.images.length > 0 && room.images[0] ? (
                    <img src={room.images[0]} alt={room.type} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-semibold text-neutral-400">No Image Available</span>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-base text-black">
                    {room.type} — Room {room.number}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {bookingDraft.checkIn} → {bookingDraft.checkOut} · {bookingDraft.nights} night ·{' '}
                    {bookingDraft.guests} guest
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-200 space-y-1.5 text-xs">
                  <div className="flex justify-between text-neutral-600">
                    <span>
                      ₦{room.pricePerNight.toLocaleString()} × {bookingDraft.nights}
                    </span>
                    <span>₦{(room.pricePerNight * bookingDraft.nights).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span>Taxes & service (7.5%)</span>
                    <span>
                      ₦{Math.round(room.pricePerNight * bookingDraft.nights * 0.075).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between font-extrabold text-sm text-black pt-2 border-t border-neutral-200">
                    <span>Total</span>
                    <span>₦{bookingDraft.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* SUBSTEP 2: PAYMENT (Bank Transfer + Proof Upload) */}
        {subStep === 'payment' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-black">Complete your payment</h1>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Booking reference:{' '}
                  <span className="font-mono font-bold text-black">{reference}</span>
                </p>
              </div>
              <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full">
                Pending Payment
              </span>
            </div>

            {/* Section 1: Make Bank Transfer */}
            <div className="space-y-3 bg-neutral-50 border border-neutral-200 rounded-2xl p-5">
              <div>
                <h3 className="text-sm font-bold text-black">1. Make the bank transfer</h3>
                <p className="text-xs text-neutral-500">
                  Pay the total amount to the hotel's account. Use your booking reference as the narration.
                </p>
              </div>

              <div className="space-y-2 pt-2 text-xs">
                {/* Bank */}
                <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-neutral-200">
                  <div>
                    <div className="text-[10px] font-bold text-neutral-400 uppercase">BANK</div>
                    <div className="font-semibold text-black">{hotel.bankName || 'Zenith Bank'}</div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(hotel.bankName || 'Zenith Bank', 'bank')}
                    className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-500 hover:text-black"
                  >
                    {copiedKey === 'bank' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {/* Account Name */}
                <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-neutral-200">
                  <div>
                    <div className="text-[10px] font-bold text-neutral-400 uppercase">ACCOUNT NAME</div>
                    <div className="font-semibold text-black">{hotel.accountName || 'Palmview Grand Hotel Ltd'}</div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(hotel.accountName || 'Palmview Grand Hotel Ltd', 'accName')}
                    className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-500 hover:text-black"
                  >
                    {copiedKey === 'accName' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {/* Account Number */}
                <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-neutral-200">
                  <div>
                    <div className="text-[10px] font-bold text-neutral-400 uppercase">ACCOUNT NUMBER</div>
                    <div className="font-mono font-bold text-black text-sm">
                      {hotel.accountNumber || '1012345678'}
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(hotel.accountNumber || '1012345678', 'accNum')}
                    className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-500 hover:text-black"
                  >
                    {copiedKey === 'accNum' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {/* Amount to pay */}
                <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-neutral-200">
                  <div>
                    <div className="text-[10px] font-bold text-neutral-400 uppercase">AMOUNT TO PAY</div>
                    <div className="font-extrabold text-black text-base">
                      ₦{bookingDraft.total.toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(`${bookingDraft.total}`, 'amt')}
                    className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-500 hover:text-black"
                  >
                    {copiedKey === 'amt' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {/* Booking Reference Narration */}
                <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-neutral-200">
                  <div>
                    <div className="text-[10px] font-bold text-neutral-400 uppercase">
                      BOOKING REFERENCE (NARRATION)
                    </div>
                    <div className="font-mono font-extrabold text-black">{reference}</div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(reference, 'ref')}
                    className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-500 hover:text-black"
                  >
                    {copiedKey === 'ref' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Section 2: Upload Proof of Payment */}
            <div className="space-y-4 bg-neutral-50 border border-neutral-200 rounded-2xl p-5">
              <div>
                <h3 className="text-sm font-bold text-black">2. Upload proof of payment</h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Provide your transaction reference and attach the bank receipt or transfer screenshot.
                </p>
              </div>

              {/* Transaction Reference (Required) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-neutral-800">
                  Payment Reference / Transaction ID <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => {
                    setPaymentRef(e.target.value);
                    if (receiptError) setReceiptError(null);
                  }}
                  placeholder="e.g. 000013892318 or Bank Session ID"
                  className="w-full px-3 py-2.5 bg-white rounded-xl border border-neutral-300 text-xs focus:outline-none focus:border-black font-medium"
                />
                <p className="text-[11px] text-neutral-500">
                  Found on your bank debit alert, mobile app transaction receipt, or USSD confirmation.
                </p>
              </div>

              {/* Receipt dropzone (Image & PDF supported) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-neutral-800">
                  Transfer Receipt / Screenshot <span className="text-rose-600">*</span>
                </label>

                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={checkoutFileInputRef}
                  onChange={handleDeviceReceiptUpload}
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  className="hidden"
                />

                {uploadedReceipt ? (
                  <div className="flex items-center justify-between p-3.5 bg-white border border-neutral-200 rounded-xl shadow-2xs">
                    <div className="flex items-center gap-3">
                      {uploadedFileType === 'pdf' ? (
                        <div className="w-11 h-11 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-center shrink-0">
                          <FileText className="w-6 h-6 text-rose-600" />
                        </div>
                      ) : (
                        <img
                          src={uploadedReceipt}
                          alt="Receipt Preview"
                          className="w-11 h-11 object-cover rounded-xl border border-neutral-200 shrink-0"
                        />
                      )}
                      <div>
                        <div className="text-xs font-bold text-black max-w-[200px] sm:max-w-xs truncate">
                          {uploadedFileName || (uploadedFileType === 'pdf' ? 'Transfer_Receipt.pdf' : 'Receipt_Transfer.jpg')}
                        </div>
                        <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{uploadedFileType === 'pdf' ? 'PDF Document' : 'Image receipt'} · Ready to submit</span>
                          {uploadedFileSize && <span className="text-neutral-400">({uploadedFileSize})</span>}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedReceipt(null);
                        setUploadedFileName('');
                        setUploadedFileSize('');
                      }}
                      className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2 py-1 rounded hover:bg-rose-50 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => checkoutFileInputRef.current?.click()}
                      className="w-full p-5 border-2 border-dashed border-neutral-300 hover:border-black rounded-xl bg-white flex flex-col items-center justify-center gap-1.5 text-xs text-neutral-600 hover:text-black transition-colors group cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-full bg-neutral-100 group-hover:bg-black group-hover:text-white flex items-center justify-center transition-colors">
                        <Upload className="w-4 h-4" />
                      </div>
                      <span className="font-semibold text-neutral-800">
                        Choose transfer receipt (Images or PDF)
                      </span>
                      <span className="text-[11px] text-neutral-400">
                        Supports PNG, JPG, WebP, or PDF documents up to 10MB
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Error Banner */}
              {receiptError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{receiptError}</span>
                </div>
              )}
            </div>

            {/* Booking Summary Box */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-4 text-xs space-y-2">
              <div className="font-bold text-neutral-900">Booking summary</div>
              <div className="grid grid-cols-2 gap-2 text-neutral-600">
                <div>
                  Room: <span className="font-semibold text-black">{room.type} - Room {room.number}</span>
                </div>
                <div>
                  Guests: <span className="font-semibold text-black">{bookingDraft.guests}</span>
                </div>
                <div>
                  Check-in: <span className="font-semibold text-black">{bookingDraft.checkIn}</span>
                </div>
                <div>
                  Check-out: <span className="font-semibold text-black">{bookingDraft.checkOut}</span>
                </div>
                <div>
                  Nights: <span className="font-semibold text-black">{bookingDraft.nights}</span>
                </div>
                <div>
                  Total:{' '}
                  <span className="font-bold text-black">₦{bookingDraft.total.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              onClick={handleSubmitVerification}
              disabled={isProcessing}
              className="w-full bg-black text-white py-3.5 rounded-full font-bold text-xs sm:text-sm hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-md"
            >
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Uploading...
                </span>
              ) : (
                'Submit for verification'
              )}
            </button>
          </div>
        )}
      </main>

      {/* Native Mobile Media Picker Action Sheet (matches video 11:56 - 12:00) */}
      {showMediaPicker && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center p-3 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-[#1e1e1e] text-white rounded-2xl p-5 space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="text-sm font-semibold text-center text-neutral-200">
              Choose an action
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              {/* Camera */}
              <button
                type="button"
                onClick={() => {
                  setUploadedReceipt(
                    'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=400&q=80'
                  );
                  setShowMediaPicker(false);
                }}
                className="flex flex-col items-center justify-center p-4 bg-neutral-800 hover:bg-neutral-700 rounded-2xl gap-2 transition-colors"
              >
                <Camera className="w-7 h-7 text-neutral-300" />
                <span className="text-xs font-medium">Camera</span>
              </button>

              {/* Files */}
              <button
                type="button"
                onClick={() => {
                  setUploadedReceipt(
                    'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=400&q=80'
                  );
                  setShowMediaPicker(false);
                }}
                className="flex flex-col items-center justify-center p-4 bg-neutral-800 hover:bg-neutral-700 rounded-2xl gap-2 transition-colors"
              >
                <FileText className="w-7 h-7 text-neutral-300" />
                <span className="text-xs font-medium">Files</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowMediaPicker(false)}
              className="w-full py-2.5 text-xs font-semibold text-neutral-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Success Modal (matches video 12:58 - 13:00) */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white text-neutral-900 rounded-2xl p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => {
                setShowSuccessModal(false);
                onNavigate('guest_dashboard');
              }}
              className="absolute right-4 top-4 text-neutral-400 hover:text-black"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center mx-auto shadow-md">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-xl font-extrabold text-black">Reservation submitted</h3>
              <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                Your payment receipt is with our team for verification. You'll get an update shortly.
              </p>
            </div>

            <div className="bg-neutral-50 rounded-2xl border border-neutral-200 p-4 text-xs space-y-2">
              <div className="flex justify-between py-1 border-b border-neutral-200/60">
                <span className="text-neutral-500">Reference</span>
                <span className="font-mono font-bold text-black">{reference}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-200/60">
                <span className="text-neutral-500">Room</span>
                <span className="font-semibold text-black">
                  {room.type} — Room {room.number}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-200/60">
                <span className="text-neutral-500">Check-in</span>
                <span className="font-medium text-black">{bookingDraft.checkIn}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-200/60">
                <span className="text-neutral-500">Check-out</span>
                <span className="font-medium text-black">{bookingDraft.checkOut}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-200/60">
                <span className="text-neutral-500">Guests</span>
                <span className="font-medium text-black">{bookingDraft.guests}</span>
              </div>
              <div className="flex justify-between py-1 font-bold text-black">
                <span>Total paid</span>
                <span>₦{bookingDraft.total.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  onNavigate('guest_dashboard');
                }}
                className="w-full bg-black text-white py-2.5 rounded-xl font-bold text-xs hover:bg-neutral-800 transition-all flex items-center justify-center gap-1.5"
              >
                <span>View my bookings</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  onNavigate('guest_dashboard');
                }}
                className="w-full text-xs font-semibold text-neutral-500 hover:text-black py-1.5"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
