import React, { useState } from 'react';
import {
  Building2,
  Filter,
  User,
  Phone,
  Mail,
  ShieldCheck,
  Headphones,
} from 'lucide-react';
import { Hotel, Room, ActiveScreen, CustomerProfile } from '../types';
import { BackButton } from './BackButton';
import { GuestAccountNavMenu } from './GuestAccountNavMenu';

interface HotelGuestPortalProps {
  hotel: Hotel;
  rooms: Room[];
  onSelectRoom: (room: Room) => void;
  onNavigate: (screen: ActiveScreen) => void;
  currentUserEmail?: string;
  currentGuestProfile?: CustomerProfile | null;
  onSignOut?: () => void;
  onEditProfile?: () => void;
}

export const HotelGuestPortal: React.FC<HotelGuestPortalProps> = ({
  hotel,
  rooms,
  onSelectRoom,
  onNavigate,
  currentUserEmail,
  currentGuestProfile,
  onSignOut,
  onEditProfile,
}) => {
  const [selectedType, setSelectedType] = useState<string>('all');

  const roomTypes = ['all', 'Standard', 'Deluxe', 'Suite', 'Presidential'];

  const filteredRooms = rooms.filter((r) => {
    if (selectedType === 'all') return true;
    return r.type.toLowerCase().includes(selectedType.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col justify-between">
      {/* Hotel Public Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-100 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BackButton onClick={() => onNavigate('hotel_directory')} />
          <button
            onClick={() => onNavigate('hotel_directory')}
            className="flex items-center gap-2 text-left"
          >
            <div className="w-6 h-6 bg-black text-white font-black rounded flex items-center justify-center text-xs">
              I
            </div>
            <div className="leading-tight">
              <span className="font-extrabold text-sm text-black tracking-tight">IGHO Stay</span>
            </div>
          </button>

          <nav className="hidden sm:flex items-center gap-4 text-xs font-medium text-neutral-600">
            <button onClick={() => onNavigate('landing')} className="hover:text-black">
              Home
            </button>
            <button className="text-black font-semibold">Rooms</button>
            <button onClick={() => onNavigate('demo_request')} className="hover:text-black">
              About
            </button>
            <button onClick={() => onNavigate('demo_request')} className="hover:text-black">
              Contact
            </button>
          </nav>
        </div>

        <div>
          <GuestAccountNavMenu
            currentUserEmail={currentUserEmail}
            currentGuestProfile={currentGuestProfile}
            onNavigate={onNavigate}
            onSignOut={onSignOut}
            onEditProfile={onEditProfile}
            signInLabel="Login / Register"
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8 w-full">
        {/* Title Header */}
        <div className="space-y-1.5 border-b border-neutral-100 pb-6">
          <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
            STAY WITH US
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-black">
            Our rooms & suites
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 max-w-xl">
            From cozy standard rooms to a spacious Presidential suite — all designed for a restful stay at{' '}
            <span className="font-semibold text-neutral-800">{hotel.name}</span>.
          </p>

          {/* Type filters */}
          <div className="flex items-center gap-1.5 pt-4 overflow-x-auto scrollbar-none">
            {roomTypes.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors whitespace-nowrap ${
                  selectedType === t
                    ? 'bg-black text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {t === 'all' ? 'All Rooms' : t}
              </button>
            ))}
          </div>
        </div>

        {/* Room Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {filteredRooms.map((room) => (
            <div
              key={room.id}
              className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Room Image */}
                <div className="relative h-48 sm:h-52 w-full bg-neutral-100 overflow-hidden">
                  <img
                    src={room.images[0]}
                    alt={`Room ${room.number}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 right-3 bg-white/95 text-neutral-900 text-xs font-bold px-2 py-0.5 rounded-md shadow-2xs">
                    Room {room.number}
                  </div>
                  <div className="absolute top-3 left-3 bg-black/80 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-xs">
                    {room.type}
                  </div>
                </div>

                {/* Details */}
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-base text-black">{room.type}</h3>
                      <p className="text-xs text-neutral-500 line-clamp-1">{room.typeName}</p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <span className="text-lg font-extrabold text-black">
                      ₦{room.pricePerNight.toLocaleString()}
                    </span>
                    <span className="text-xs text-neutral-500"> per night</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="p-4 pt-0">
                <button
                  onClick={() => {
                    onSelectRoom(room);
                    onNavigate('room_detail');
                  }}
                  className="w-full bg-black text-white py-2.5 px-4 rounded-xl text-xs font-bold hover:bg-neutral-800 transition-all flex items-center justify-center active:scale-95 shadow-2xs"
                >
                  <span>View details</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-neutral-50 border-t border-neutral-200 mt-12 py-8 px-4 sm:px-6 text-xs text-neutral-500">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6 pb-6 border-b border-neutral-200">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-black" />
              <span className="font-bold text-black text-xs">IGHO Stay</span>
            </div>
            <p className="text-[11px] text-neutral-500">Modern comfort and warm hospitality.</p>
          </div>

          <div className="space-y-1">
            <div className="font-semibold text-black text-xs">Contact</div>
            <p className="text-[11px] text-neutral-500">{hotel.email || 'info@hotel.com'}</p>
            <p className="text-[11px] text-neutral-500">{hotel.phone || '+234 800 000 0000'}</p>
          </div>

          <div className="space-y-1">
            <div className="font-semibold text-black text-xs">Hotel</div>
            <ul className="space-y-1 text-[11px]">
              <li>Rooms & Suites</li>
              <li>About us</li>
              <li>
                <button onClick={() => onNavigate('staff_login')} className="hover:text-black underline">
                  Staff portal
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-5xl mx-auto pt-4 text-center text-[11px] text-neutral-400">
          © {new Date().getFullYear()} {hotel.name} — Powered by IGHO Stay
        </div>
      </footer>
    </div>
  );
};
