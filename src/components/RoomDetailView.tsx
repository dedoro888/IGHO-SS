import React, { useState, useEffect } from 'react';
import {
  Users,
  Maximize2,
  Bed,
  Layers,
  Wifi,
  Wind,
  Tv,
  Bath,
  Flame,
  Shirt,
  Sparkles,
  Calendar,
  ChevronDown,
  ShieldCheck,
  Check,
  X,
  BookmarkCheck,
  ArrowRight,
  Coffee,
  Utensils,
  Car,
  Dumbbell,
  Waves,
  Laptop,
  Eye,
  Droplets,
  Bell,
  Plus,
  Minus,
} from 'lucide-react';
import { Room, Hotel, ActiveScreen, CustomerProfile } from '../types';
import { CalendarPickerModal } from './CalendarPickerModal';
import { BackButton } from './BackButton';
import { GuestAccountNavMenu } from './GuestAccountNavMenu';
import { resolveUserAccount } from '../utils/auth';
import { getRoomLevelInfo, isRoomStatusAvailable } from '../utils/roomCategories';

interface RoomDetailViewProps {
  room: Room;
  hotel: Hotel;
  allRooms: Room[];
  onSelectRoom: (room: Room) => void;
  onNavigate: (screen: ActiveScreen) => void;
  onStartBooking: (bookingDraft: {
    room: Room;
    checkIn: string;
    checkOut: string;
    nights: number;
    guests: number;
    total: number;
  }) => void;
  currentUserEmail?: string;
  currentGuestProfile?: CustomerProfile | null;
  onSignOut?: () => void;
  onEditProfile?: () => void;
  isSuperAdmin?: boolean;
}

export const RoomDetailView: React.FC<RoomDetailViewProps> = ({
  room,
  hotel,
  allRooms,
  onSelectRoom,
  onNavigate,
  onStartBooking,
  currentUserEmail,
  currentGuestProfile,
  onSignOut,
  onEditProfile,
  isSuperAdmin = false,
}) => {
  const [checkIn, setCheckIn] = useState('2026-09-08');
  const [checkOut, setCheckOut] = useState('2026-09-09');
  const [guests, setGuests] = useState(1);
  const [guestsInput, setGuestsInput] = useState('1');
  const [activeDatePicker, setActiveDatePicker] = useState<'checkIn' | 'checkOut' | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [hasSavedDraft, setHasSavedDraft] = useState(false);

  const activeRoom = allRooms.find((r) => r.id === room?.id) || room;
  const isRoomRemoved = allRooms.length > 0 && !!room?.id && !allRooms.some((r) => r.id === room.id);
  const levelInfo = getRoomLevelInfo(activeRoom, allRooms);
  const isAvailable = isRoomStatusAvailable(activeRoom?.status);
  const maxGuests = activeRoom?.maxGuests || activeRoom?.capacity || 2;

  const roomImages = (activeRoom?.images && activeRoom.images.length > 0)
    ? activeRoom.images
    : [activeRoom?.image || 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80'];

  // Auto-redirect if room was removed by hotel staff while viewing
  useEffect(() => {
    if (isRoomRemoved) {
      const timer = setTimeout(() => {
        onNavigate('hotel_guest_portal');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isRoomRemoved, onNavigate]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`igho_booking_draft_${hotel.id}_${room?.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.checkIn) setCheckIn(parsed.checkIn);
        if (parsed.checkOut) setCheckOut(parsed.checkOut);
        if (parsed.guests) {
          const g = Math.max(1, parsed.guests);
          setGuests(g);
          setGuestsInput(String(g));
        }
        setHasSavedDraft(true);
      }
    } catch (e) {}
  }, [hotel?.id, room?.id]);

  const calculateNights = (inDate: string, outDate: string) => {
    try {
      const d1 = new Date(inDate);
      const d2 = new Date(outDate);
      const diffTime = Math.abs(d2.getTime() - d1.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 1;
    } catch {
      return 1;
    }
  };

  const nights = calculateNights(checkIn, checkOut);
  const basePrice = (activeRoom?.pricePerNight || 0) * nights;
  const taxes = Math.round(basePrice * 0.075);
  const totalPrice = basePrice + taxes;

  const handleBookNow = () => {
    onStartBooking({
      room: activeRoom,
      checkIn,
      checkOut,
      nights,
      guests,
      total: totalPrice,
    });
    onNavigate('guest_checkout');
  };

  const otherRooms = allRooms.filter((r) => r.id !== activeRoom.id).slice(0, 2);

  return (
    <div className="min-h-screen bg-white text-neutral-900 pb-16">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-100 px-4 sm:px-6 py-3 flex items-center justify-between">
        <BackButton onClick={() => onNavigate('hotel_guest_portal')} />

        {(() => {
          const account = currentUserEmail ? resolveUserAccount(currentUserEmail) : null;
          const showReturnButton = isSuperAdmin || (account && account.role !== 'customer');
          return (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-black text-white font-black rounded flex items-center justify-center text-xs">
                I
              </div>
              <span className="font-extrabold text-xs sm:text-sm text-black tracking-tight">IGHO Stay</span>
              {showReturnButton && (
                <button
                  onClick={() => {
                    if (isSuperAdmin) {
                      onNavigate('super_admin_console');
                    } else {
                      onNavigate('staff_portal');
                    }
                  }}
                  className="ml-2 flex items-center gap-1 px-2.5 py-1 bg-[#10b981]/10 hover:bg-[#10b981]/20 border border-[#10b981]/25 text-[#10b981] rounded-lg text-[10px] sm:text-xs font-bold transition-all shadow-3xs cursor-pointer"
                >
                  <span>← Return to {isSuperAdmin ? 'Console' : 'Dashboard'}</span>
                </button>
              )}
            </div>
          );
        })()}

        <div>
          <GuestAccountNavMenu
            currentUserEmail={currentUserEmail}
            currentGuestProfile={currentGuestProfile}
            onNavigate={onNavigate}
            onSignOut={onSignOut}
            onEditProfile={onEditProfile}
            signInLabel="Sign in"
            isSuperAdmin={isSuperAdmin}
          />
        </div>
      </header>

      {/* Real-Time Live Removal Notification Banner */}
      {isRoomRemoved && (
        <div className="bg-rose-600 text-white px-4 sm:px-6 py-3 flex items-center justify-between text-xs animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
            <span>
              <strong>Real-Time Live Update:</strong> This room category was just updated by hotel management. Redirecting to available categories...
            </span>
          </div>
          <button
            onClick={() => onNavigate('hotel_guest_portal')}
            className="px-3 py-1 bg-white text-rose-700 font-bold rounded-full text-xs shadow-xs cursor-pointer"
          >
            View Available Rooms
          </button>
        </div>
      )}

      {/* Draft Resume Banner */}
      {hasSavedDraft && (
        <div className="bg-neutral-900 text-white px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <BookmarkCheck className="w-4 h-4 text-emerald-400" />
            <span>
              You have an unfinished booking draft saved for <strong>{activeRoom.type} ({levelInfo.levelLabel})</strong>.
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleBookNow}
              className="inline-flex items-center gap-1 font-bold text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
            >
              <span>Resume Checkout</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                try {
                  localStorage.removeItem(`igho_booking_draft_${hotel.id}_${room.id}`);
                } catch (e) {}
                setHasSavedDraft(false);
              }}
              className="text-neutral-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Photo Gallery Grid */}
        {roomImages.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 rounded-2xl overflow-hidden relative">
            {/* Main Hero Photo */}
            <div className="md:col-span-8 relative h-64 sm:h-80 bg-neutral-100 overflow-hidden">
              <img src={roomImages[0]} alt="Main Room" className="w-full h-full object-cover" />
              <button
                onClick={() => setGalleryOpen(true)}
                className="absolute bottom-3 left-3 bg-black/75 hover:bg-black text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg backdrop-blur-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>View gallery</span>
              </button>
            </div>

            {/* Side Thumbnail Photos */}
            <div className="hidden md:grid md:col-span-4 grid-cols-2 gap-2.5 h-80">
              {roomImages.slice(1, 5).map((img, i) => (
                <div key={i} className="h-full bg-neutral-100 overflow-hidden rounded-lg">
                  <img
                    src={img}
                    alt={`Room thumb ${i + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform"
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="border border-dashed border-neutral-200 rounded-2xl p-8 text-center text-neutral-400 text-xs bg-neutral-50/50">
            No pictures uploaded for this room category.
          </div>
        )}

        {/* Room Header Info */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Specs, About, Amenities */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-neutral-500 uppercase tracking-wider bg-neutral-100 px-2.5 py-0.5 rounded-full">
                  {levelInfo.levelLabel} · {activeRoom.tier || 'Room Category'}
                </span>
                {isAvailable ? (
                  <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    Available
                  </span>
                ) : (
                  <span className="bg-neutral-100 text-neutral-500 text-xs font-bold px-2.5 py-0.5 rounded-full border border-neutral-300">
                    Not available for your dates
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-black">{activeRoom.type}</h1>
              {activeRoom.typeName && activeRoom.typeName !== activeRoom.type && (
                <p className="text-xs text-neutral-500 font-medium">{activeRoom.typeName}</p>
              )}
            </div>

            {/* Quick Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-y border-neutral-100">
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-[11px] text-neutral-400">
                  <Users className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Max guests</span>
                </div>
                <div className="text-xs font-bold text-neutral-900">{room.maxGuests} guests</div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1 text-[11px] text-neutral-400">
                  <Maximize2 className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Room size</span>
                </div>
                <div className="text-xs font-bold text-neutral-900">{room.roomSize} sqm</div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1 text-[11px] text-neutral-400">
                  <Bed className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Bed</span>
                </div>
                <div className="text-xs font-bold text-neutral-900">{room.bed}</div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1 text-[11px] text-neutral-400">
                  <Layers className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Floor</span>
                </div>
                <div className="text-xs font-bold text-neutral-900">{room.floor}</div>
              </div>
            </div>

            {/* About this room */}
            <div className="space-y-2">
              <h3 className="font-bold text-sm text-black">About this room</h3>
              <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">{room.description}</p>
            </div>

            {/* Amenities & Services */}
            <div className="space-y-3 pt-2">
              <h3 className="font-bold text-sm text-black">Amenities & services</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-neutral-700">
                {room.amenities.map((amenity) => {
                  const norm = amenity.toLowerCase();
                  let iconElement = <Layers className="w-4 h-4 text-neutral-500 shrink-0" />;
                  if (norm.includes('wi-fi') || norm.includes('wifi')) {
                    iconElement = <Wifi className="w-4 h-4 text-neutral-500 shrink-0" />;
                  } else if (norm.includes('air conditioning') || norm.includes('ac')) {
                    iconElement = <Wind className="w-4 h-4 text-neutral-500 shrink-0" />;
                  } else if (norm.includes('tv')) {
                    iconElement = <Tv className="w-4 h-4 text-neutral-500 shrink-0" />;
                  } else if (norm.includes('bathroom') || norm.includes('bath') || norm.includes('bathtub')) {
                    iconElement = <Bath className="w-4 h-4 text-neutral-500 shrink-0" />;
                  } else if (norm.includes('breakfast') || norm.includes('coffee') || norm.includes('tea')) {
                    iconElement = <Coffee className="w-4 h-4 text-neutral-500 shrink-0" />;
                  } else if (norm.includes('hot water')) {
                    iconElement = <Flame className="w-4 h-4 text-neutral-500 shrink-0" />;
                  } else if (norm.includes('fridge') || norm.includes('refrigerator')) {
                    iconElement = <Droplets className="w-4 h-4 text-neutral-500 shrink-0" />;
                  } else if (norm.includes('wardrobe') || norm.includes('hanger')) {
                    iconElement = <Shirt className="w-4 h-4 text-neutral-500 shrink-0" />;
                  } else if (norm.includes('room service') || norm.includes('dining') || norm.includes('food')) {
                    iconElement = <Utensils className="w-4 h-4 text-neutral-500 shrink-0" />;
                  } else if (norm.includes('housekeeping') || norm.includes('clean')) {
                    iconElement = <Bell className="w-4 h-4 text-neutral-500 shrink-0" />;
                  } else if (norm.includes('pool') || norm.includes('swimming')) {
                    iconElement = <Waves className="w-4 h-4 text-neutral-500 shrink-0" />;
                  } else if (norm.includes('gym') || norm.includes('fitness') || norm.includes('workout')) {
                    iconElement = <Dumbbell className="w-4 h-4 text-neutral-500 shrink-0" />;
                  } else if (norm.includes('parking') || norm.includes('car')) {
                    iconElement = <Car className="w-4 h-4 text-neutral-500 shrink-0" />;
                  } else if (norm.includes('balcony') || norm.includes('view') || norm.includes('terrace')) {
                    iconElement = <Eye className="w-4 h-4 text-neutral-500 shrink-0" />;
                  } else if (norm.includes('desk') || norm.includes('work') || norm.includes('workspace')) {
                    iconElement = <Laptop className="w-4 h-4 text-neutral-500 shrink-0" />;
                  } else if (norm.includes('bed') || norm.includes('linen') || norm.includes('bedding')) {
                    iconElement = <Bed className="w-4 h-4 text-neutral-500 shrink-0" />;
                  }
                  return (
                    <div key={amenity} className="flex items-center gap-2.5">
                      {iconElement}
                      <span>{amenity}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Sticky Booking Widget */}
          <div className="lg:col-span-5">
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 sm:p-6 shadow-md space-y-5 sticky top-20">
              <div className="space-y-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-black">
                    ₦{room.pricePerNight.toLocaleString()}
                  </span>
                  <span className="text-xs text-neutral-500"> / night</span>
                </div>
              </div>

              {/* Date Inputs */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-neutral-600">Check-in</label>
                  <button
                    type="button"
                    onClick={() => setActiveDatePicker('checkIn')}
                    className="w-full text-left px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-800 hover:bg-neutral-100 transition-colors flex items-center justify-between"
                  >
                    <span>{checkIn}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-neutral-600">Check-out</label>
                  <button
                    type="button"
                    onClick={() => setActiveDatePicker('checkOut')}
                    className="w-full text-left px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-800 hover:bg-neutral-100 transition-colors flex items-center justify-between"
                  >
                    <span>{checkOut}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                  </button>
                </div>
              </div>

              {/* Guests Input with Plus and Minus Steppers */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-semibold text-neutral-600">Guests</label>
                  <span className="text-[10px] text-neutral-400">Up to {maxGuests} {maxGuests === 1 ? 'guest' : 'guests'}</span>
                </div>

                <div className="flex items-center justify-between bg-neutral-50 border border-neutral-300 rounded-xl p-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.max(1, guests - 1);
                      setGuests(next);
                      setGuestsInput(String(next));
                    }}
                    disabled={guests <= 1}
                    className="w-9 h-9 rounded-lg bg-white border border-neutral-200 text-neutral-800 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center font-bold transition-all shadow-3xs cursor-pointer active:scale-95"
                    title="Decrease guests"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={guestsInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setGuestsInput(val);
                        const parsed = parseInt(val, 10);
                        if (!isNaN(parsed) && parsed >= 1) {
                          setGuests(Math.min(maxGuests, parsed));
                        }
                      }}
                      onBlur={() => {
                        const parsed = parseInt(guestsInput, 10);
                        if (isNaN(parsed) || parsed < 1) {
                          setGuests(1);
                          setGuestsInput('1');
                        } else {
                          const clamped = Math.min(maxGuests, Math.max(1, parsed));
                          setGuests(clamped);
                          setGuestsInput(String(clamped));
                        }
                      }}
                      className="w-10 text-center bg-transparent font-extrabold text-sm text-neutral-900 focus:outline-none"
                    />
                    <span className="text-xs font-semibold text-neutral-600 select-none">
                      {guests === 1 ? 'Guest' : 'Guests'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.min(maxGuests, guests + 1);
                      setGuests(next);
                      setGuestsInput(String(next));
                    }}
                    disabled={guests >= maxGuests}
                    className="w-9 h-9 rounded-lg bg-white border border-neutral-200 text-neutral-800 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center font-bold transition-all shadow-3xs cursor-pointer active:scale-95"
                    title="Increase guests"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="pt-3 border-t border-neutral-100 space-y-2 text-xs">
                <div className="flex justify-between text-neutral-600">
                  <span>
                    ₦{room.pricePerNight.toLocaleString()} × {nights} {nights === 1 ? 'night' : 'nights'}
                  </span>
                  <span>₦{basePrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Taxes & service (7.5%)</span>
                  <span>₦{taxes.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-black pt-2 border-t border-neutral-100">
                  <span>Total</span>
                  <span>₦{totalPrice.toLocaleString()}</span>
                </div>
              </div>

              {/* Helper text */}
              <p className="text-[11px] text-neutral-400 text-center">
                No charge yet — you'll be guided through payment on the next step.
              </p>

              {/* Action Button */}
              {isAvailable ? (
                <button
                  type="button"
                  onClick={handleBookNow}
                  className="w-full bg-black text-white py-3 rounded-full font-bold text-xs hover:bg-neutral-800 transition-all active:scale-95 shadow-sm cursor-pointer"
                >
                  Book Now
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="w-full bg-neutral-200 text-neutral-400 py-3 rounded-full font-bold text-xs cursor-not-allowed"
                >
                  Not available for your dates
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Similar Rooms Section */}
        <div className="pt-10 border-t border-neutral-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-black">You may also like</h3>
            <button
              onClick={() => onNavigate('hotel_guest_portal')}
              className="text-xs font-semibold text-neutral-500 hover:text-black flex items-center gap-1"
            >
              <span>View all</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {otherRooms.map((r) => (
              <div
                key={r.id}
                onClick={() => onSelectRoom(r)}
                className="bg-white border border-neutral-200 rounded-2xl p-3 flex gap-3 hover:shadow-sm transition-all cursor-pointer group"
              >
                <img
                  src={r.images[0]}
                  alt={r.type}
                  className="w-24 h-24 object-cover rounded-xl shrink-0 group-hover:scale-105 transition-transform"
                />
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-black">{r.type}</span>
                      <span className="text-[10px] font-bold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
                        {getRoomLevelInfo(r, allRooms).levelLabel}
                      </span>
                    </div>
                    <div className="text-xs font-extrabold text-neutral-900 mt-1">
                      ₦{r.pricePerNight.toLocaleString()}
                      <span className="text-[10px] text-neutral-400 font-normal"> /night</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-black underline">View</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Calendar Picker Modal */}
      <CalendarPickerModal
        isOpen={activeDatePicker !== null}
        onClose={() => setActiveDatePicker(null)}
        initialDate={activeDatePicker === 'checkIn' ? checkIn : checkOut}
        onSelectDate={(dateStr) => {
          if (activeDatePicker === 'checkIn') setCheckIn(dateStr);
          if (activeDatePicker === 'checkOut') setCheckOut(dateStr);
        }}
      />

      {/* Fullscreen Gallery Lightbox Modal */}
      {galleryOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 p-4 flex flex-col justify-between">
          <div className="flex justify-between items-center text-white px-2 py-2">
            <span className="text-sm font-semibold">{room.type} Gallery</span>
            <button
              onClick={() => setGalleryOpen(false)}
              className="p-1 rounded-full bg-neutral-800 text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl">
              {room.images.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`Gallery ${i}`}
                  className="w-full h-64 object-cover rounded-xl"
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
