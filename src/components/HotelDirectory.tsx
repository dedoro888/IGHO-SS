import React, { useState, useMemo } from 'react';
import {
  Search,
  MapPin,
  Star,
  Bell,
  Navigation,
  Building2,
  Users,
  Radio,
  Globe,
} from 'lucide-react';
import { Hotel, ActiveScreen, CustomerProfile } from '../types';
import { BackButton } from './BackButton';
import { GuestAccountNavMenu } from './GuestAccountNavMenu';

interface HotelDirectoryProps {
  hotels: Hotel[];
  onSelectHotel: (hotel: Hotel) => void;
  onNavigate: (screen: ActiveScreen) => void;
  currentUserEmail?: string;
  currentGuestProfile?: CustomerProfile | null;
  onSignOut?: () => void;
  onEditProfile?: () => void;
}

export const HotelDirectory: React.FC<HotelDirectoryProps> = ({
  hotels,
  onSelectHotel,
  onNavigate,
  currentUserEmail,
  currentGuestProfile,
  onSignOut,
  onEditProfile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('All States');
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [activeTab, setActiveTab] = useState<'all' | 'live' | 'coming_soon'>('all');
  const [notifiedHotels, setNotifiedHotels] = useState<string[]>([]);
  const [locationDetecting, setLocationDetecting] = useState(false);

  // Dynamically aggregate States & Cities so newly approved hotels immediately appear in dropdowns
  const states = useMemo(() => {
    const list = new Set<string>(['Lagos', 'Delta', 'Imo', 'Edo', 'Cross River', 'Akwa Ibom', 'FCT', 'Enugu', 'Rivers']);
    hotels.forEach((h) => {
      if (h.state && h.status !== 'pending' && h.status !== 'suspended') {
        list.add(h.state);
      }
    });
    return ['All States', ...Array.from(list)];
  }, [hotels]);

  const cities = useMemo(() => {
    const list = new Set<string>(['Lagos', 'Asaba', 'Owerri', 'Benin City', 'Calabar', 'Uyo', 'Abuja', 'Enugu', 'Port Harcourt']);
    hotels.forEach((h) => {
      if (h.city && h.status !== 'pending' && h.status !== 'suspended') {
        list.add(h.city);
      }
    });
    return ['All Cities', ...Array.from(list)];
  }, [hotels]);

  const filteredHotels = hotels.filter((h) => {
    // Only approved/active and paid hotels should be discoverable on discovery page
    if (h.approvalStatus === 'pending' || h.approvalStatus === 'rejected' || h.status === 'pending' || h.status === 'suspended' || (h.paymentStatus === 'pending' && h.approvalStatus !== 'approved')) {
      return false;
    }

    const matchesSearch =
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (h.city && h.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (h.location && h.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (h.state && h.state.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesState =
      selectedState === 'All States' ||
      (h.state && h.state.toLowerCase() === selectedState.toLowerCase());
    const matchesCity =
      selectedCity === 'All Cities' ||
      (h.city && h.city.toLowerCase() === selectedCity.toLowerCase());
    const matchesTab =
      activeTab === 'all' ? true : activeTab === 'live' ? h.isLive : !h.isLive;

    return matchesSearch && matchesState && matchesCity && matchesTab;
  });

  const handleNotifyMe = (hotelId: string) => {
    setNotifiedHotels((prev) =>
      prev.includes(hotelId) ? prev.filter((id) => id !== hotelId) : [...prev, hotelId]
    );
  };

  const handleNearMe = () => {
    setLocationDetecting(true);
    setTimeout(() => {
      setLocationDetecting(false);
      setSelectedCity('Asaba');
      setSelectedState('Delta');
    }, 600);
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 pb-16">
      {/* Directory Top Nav */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-100 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackButton onClick={() => onNavigate('landing')} />
          <div className="h-4 w-px bg-neutral-200"></div>
          <div className="flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-black" />
            <span className="font-extrabold text-sm tracking-tight text-black">IGHO Stay</span>
          </div>
        </div>

        <GuestAccountNavMenu
          currentUserEmail={currentUserEmail}
          currentGuestProfile={currentGuestProfile}
          onNavigate={onNavigate}
          onSignOut={onSignOut}
          onEditProfile={onEditProfile}
          signInLabel="Sign in"
        />
      </header>

      {/* Dark Search & Location Hero */}
      <section className="bg-black text-white px-4 sm:px-6 pt-10 pb-12">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900 text-neutral-300 text-xs font-medium border border-neutral-800">
            <Building2 className="w-3.5 h-3.5 text-neutral-400" />
            <span>IGHO Stay</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Find the right hotel, wherever you're going.
          </h1>
          <p className="text-neutral-400 text-xs sm:text-sm max-w-xl">
            Search by state, city or area — or let us show you the closest hotels to where you are right now.
          </p>

          {/* Search Box Card */}
          <div className="bg-neutral-900/90 border border-neutral-800 p-3 sm:p-4 rounded-2xl space-y-3 shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
              <div className="md:col-span-5 relative">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Hotel, city or area..."
                  className="w-full pl-9 pr-3 py-2 bg-black border border-neutral-700 text-white rounded-xl text-xs placeholder:text-neutral-500 focus:outline-none focus:border-white"
                />
              </div>

              <div className="md:col-span-2">
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="w-full px-2.5 py-2 bg-black border border-neutral-700 text-white rounded-xl text-xs focus:outline-none focus:border-white"
                >
                  {states.map((s) => (
                    <option key={s} value={s} className="bg-neutral-900">
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full px-2.5 py-2 bg-black border border-neutral-700 text-white rounded-xl text-xs focus:outline-none focus:border-white"
                >
                  {cities.map((c) => (
                    <option key={c} value={c} className="bg-neutral-900">
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3">
                <button
                  onClick={handleNearMe}
                  disabled={locationDetecting}
                  className="w-full py-2 px-3 bg-white text-black font-bold text-xs rounded-full hover:bg-neutral-200 transition-colors flex items-center justify-center gap-1.5"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{locationDetecting ? 'Locating...' : 'Hotels Near Me'}</span>
                </button>
              </div>
            </div>

            <p className="text-[11px] text-neutral-500">
              Sharing your location is optional — searching by city works too.
            </p>
          </div>

          {/* Popular Locations */}
          <div className="space-y-2 pt-2">
            <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
              POPULAR LOCATIONS
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { city: 'Lagos', state: 'Lagos', count: '3 hotels' },
                { city: 'Abuja', state: 'FCT', count: '1 hotel' },
                { city: 'Port Harcourt', state: 'Rivers', count: '1 hotel' },
                { city: 'Asaba', state: 'Delta', count: '1 hotel' },
              ].map((loc) => (
                <button
                  key={loc.city}
                  onClick={() => {
                    setSelectedCity(loc.city);
                    setSelectedState(loc.state);
                  }}
                  className="bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 p-2.5 rounded-xl text-left transition-colors flex items-center gap-2.5"
                >
                  <MapPin className="w-4 h-4 text-neutral-400 shrink-0" />
                  <div>
                    <div className="font-bold text-xs text-white">{loc.city}</div>
                    <div className="text-[10px] text-neutral-400">{loc.count}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-neutral-800">
            <div className="flex items-center gap-2.5 bg-neutral-900/40 p-2.5 rounded-xl">
              <Building2 className="w-5 h-5 text-neutral-400" />
              <div>
                <div className="text-sm font-bold text-white">9</div>
                <div className="text-[10px] text-neutral-400">Hotels listed</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 bg-neutral-900/40 p-2.5 rounded-xl">
              <Users className="w-5 h-5 text-neutral-400" />
              <div>
                <div className="text-sm font-bold text-white">4,200+</div>
                <div className="text-[10px] text-neutral-400">Guests served</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 bg-neutral-900/40 p-2.5 rounded-xl">
              <Radio className="w-5 h-5 text-emerald-400" />
              <div>
                <div className="text-sm font-bold text-white">2</div>
                <div className="text-[10px] text-neutral-400">Live now</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 bg-neutral-900/40 p-2.5 rounded-xl">
              <Globe className="w-5 h-5 text-neutral-400" />
              <div>
                <div className="text-sm font-bold text-white">9</div>
                <div className="text-[10px] text-neutral-400">States covered</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hotel Cards List Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-1.5">
            {[
              { id: 'all', label: 'All hotels' },
              { id: 'live', label: 'Live' },
              { id: 'coming_soon', label: 'Coming Soon' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  activeTab === tab.id
                    ? 'bg-black text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:text-black hover:bg-neutral-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="text-xs text-neutral-500 font-medium">
            <span>{filteredHotels.length} hotels</span>
          </div>
        </div>

        {/* Hotels Grid or Empty State */}
        {filteredHotels.length === 0 ? (
          <div className="bg-white border border-neutral-200 rounded-2xl p-10 sm:p-12 text-center space-y-4 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center mx-auto text-neutral-500">
              <Building2 className="w-6 h-6" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-base font-bold text-black">No hotels listed yet</h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                All placeholder hotels have been cleared from the platform. Hoteliers and property owners can register their establishment on IGHO Stay.
              </p>
            </div>
            <button
              onClick={() => onNavigate('hotel_onboarding')}
              className="inline-flex items-center justify-center bg-black text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-neutral-800 transition-all shadow-sm active:scale-95"
            >
              <span>Onboard Your Hotel</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {filteredHotels.map((hotel) => (
            <div
              key={hotel.id}
              className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Hotel Image with Badges */}
                <div className="relative h-44 w-full bg-neutral-100 overflow-hidden">
                  <img
                    src={hotel.coverImage}
                    alt={hotel.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Status Badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    {hotel.isLive ? (
                      <span className="flex items-center gap-1 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                        LIVE
                      </span>
                    ) : (
                      <span className="bg-neutral-900/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-xs">
                        ● Coming Soon
                      </span>
                    )}
                  </div>

                  {hotel.rating && hotel.rating > 0 ? (
                    <div className="absolute bottom-3 right-3 bg-white/95 text-neutral-900 text-xs font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-xs">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span>{hotel.rating.toFixed(1)}</span>
                    </div>
                  ) : (
                    <div className="absolute bottom-3 right-3 bg-white/90 text-neutral-600 text-[10px] font-semibold px-2 py-0.5 rounded-lg shadow-xs">
                      <span>New</span>
                    </div>
                  )}
                </div>

                {/* Hotel Details */}
                <div className="p-4 space-y-1.5">
                  <h3 className="font-bold text-base text-black group-hover:text-neutral-700 transition-colors">
                    {hotel.name}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-neutral-500">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>{hotel.location}</span>
                  </div>

                  {hotel.isLive && (
                    <div className="flex items-center justify-between text-xs pt-2">
                      <span className="text-neutral-500">{hotel.roomCount} Rooms</span>
                      <span className="font-bold text-black">
                        From ₦{hotel.startingPrice?.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 pt-0">
                {hotel.isLive ? (
                  <button
                    onClick={() => {
                      onSelectHotel(hotel);
                      onNavigate('hotel_guest_portal');
                    }}
                    className="w-full bg-black text-white py-2.5 px-4 rounded-xl text-xs font-bold hover:bg-neutral-800 transition-all shadow-2xs active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <span>View Hotel</span>
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleNotifyMe(hotel.id)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1 transition-all ${
                        notifiedHotels.includes(hotel.id)
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-neutral-800 border-neutral-300 hover:bg-neutral-50'
                      }`}
                    >
                      <Bell className="w-3 h-3" />
                      <span>{notifiedHotels.includes(hotel.id) ? 'Notified ✓' : 'Notify Me'}</span>
                    </button>
                    <button
                      onClick={() =>
                        window.open(
                          `https://www.google.com/maps/search/?api=1&query=${hotel.coordinates.lat},${hotel.coordinates.lng}`,
                          '_blank'
                        )
                      }
                      className="py-2 px-3 rounded-xl text-xs font-semibold border border-neutral-300 text-neutral-800 hover:bg-neutral-50 flex items-center justify-center gap-1 transition-colors"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>Directions</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          </div>
        )}
      </section>

      {/* Bottom Information & CTA Section (exact match from video 08:38) */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1 */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-5 space-y-3">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
              NO ACCOUNT NEEDED
            </span>
            <h4 className="text-base font-bold text-black">Continue as a guest</h4>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Browse hotels, pick a room and complete your booking with just your contact details.
            </p>
            <button
              onClick={() => onNavigate('hotel_guest_portal')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-black hover:underline pt-1"
            >
              <span>Browse rooms</span>
            </button>
          </div>

          {/* Card 2 */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-5 space-y-3">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${currentUserEmail ? 'text-emerald-600' : 'text-neutral-400'}`}>
              {currentUserEmail ? 'ACCOUNT ACTIVE' : 'OPTIONAL'}
            </span>
            <h4 className="text-base font-bold text-black">
              {currentUserEmail
                ? `Signed in as ${currentGuestProfile ? `${currentGuestProfile.firstName} ${currentGuestProfile.lastName}`.trim() : currentUserEmail}`
                : 'Create a free account'}
            </h4>
            <p className="text-xs text-neutral-600 leading-relaxed">
              {currentUserEmail
                ? `Manage your bookings, receipts, and profile information for ${currentUserEmail}.`
                : 'Keep your booking history, receipts and profile so future stays take seconds.'}
            </p>
            {currentUserEmail ? (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={() => {
                    if (onEditProfile) onEditProfile();
                    else onNavigate('guest_dashboard');
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full bg-black text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <span>Edit profile</span>
                </button>
                <button
                  onClick={() => onNavigate('guest_dashboard')}
                  className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full bg-white text-neutral-800 border border-neutral-300 hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  <span>My bookings</span>
                </button>
                {onSignOut && (
                  <button
                    onClick={onSignOut}
                    className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                  >
                    <span>Sign out</span>
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => onNavigate('guest_login')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-black hover:underline pt-1 cursor-pointer"
              >
                <span>Create account</span>
              </button>
            )}
          </div>
        </div>

        {/* Card 3: Want IGHO Stay for your hotel */}
        <div className="bg-black text-white rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-white">Want IGHO Stay for your hotel?</h4>
            <p className="text-xs text-neutral-400">Join hotels already running smarter with IGHO.</p>
          </div>
          <button
            onClick={() => onNavigate('demo_request')}
            className="shrink-0 bg-white text-black px-4 py-2 rounded-full text-xs font-bold hover:bg-neutral-200 transition-colors flex items-center gap-1"
          >
            <span>Book a Demo</span>
          </button>
        </div>
      </section>
    </div>
  );
};
