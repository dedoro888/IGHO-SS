import React, { useState, useMemo } from 'react';
import {
  Hotel,
  Room,
  Reservation,
} from '../../types';
import {
  Plus,
  Zap,
  Search,
  ChevronDown,
  ChevronUp,
  X,
  Camera,
  Edit2,
  Trash2,
  Star,
  Upload,
  Calendar,
  Users,
  Check,
  CheckCircle2,
  AlertCircle,
  DoorClosed,
  BedDouble,
  Sparkles,
  Layers,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  Maximize2,
} from 'lucide-react';

interface RoomInventoryViewProps {
  hotel: Hotel;
  rooms: Room[];
  reservations: Reservation[];
  onAddRoom: (room: Room) => void;
  onUpdateRoom: (room: Room) => void;
  onDeleteRoom?: (roomId: string) => void;
  onAddReservation?: (reservation: Reservation) => void;
}

// 17 predefined amenities matching the video / screenshots exactly
const PREDEFINED_AMENITIES = [
  'Free High-Speed Wi-Fi',
  'Air Conditioning',
  'Flat-screen TV',
  'Smart TV',
  'Complimentary Breakfast',
  'Private Bathroom',
  'Hot Water',
  'Mini Fridge',
  'Wardrobe',
  'Room Service',
  'Daily Housekeeping',
  'Swimming Pool Access',
  'Gym Access',
  'Free Parking',
  'Balcony / View',
  'Work Desk',
  'Premium Bedding',
];

// Curated stock photos for rooms when hotel chooses presets or uploads
const PRESET_ROOM_PHOTOS = [
  'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
];

export const RoomInventoryView: React.FC<RoomInventoryViewProps> = ({
  hotel,
  rooms,
  reservations,
  onAddRoom,
  onUpdateRoom,
  onDeleteRoom,
  onAddReservation,
}) => {
  // Filter and search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Room['status']>('all');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'Presidential Suite': true,
    'Luxury Suite': false,
  });
  const [categoryRoomSearch, setCategoryRoomSearch] = useState<Record<string, string>>({});

  // Inline rate editing state: { [roomId]: priceString }
  const [editingRates, setEditingRates] = useState<Record<string, string>>({});
  const [savingRateId, setSavingRateId] = useState<string | null>(null);

  // Modals state
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [photosRoom, setPhotosRoom] = useState<Room | null>(null);
  const [showQuickBookModal, setShowQuickBookModal] = useState(false);

  // Add Room form state
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newRoomType, setNewRoomType] = useState('Presidential Suite');
  const [customRoomType, setCustomRoomType] = useState('');
  const [newRoomFloor, setNewRoomFloor] = useState('1');
  const [newRoomPrice, setNewRoomPrice] = useState('250000');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [newRoomPhotos, setNewRoomPhotos] = useState<string[]>([]);
  const [addRoomError, setAddRoomError] = useState<string | null>(null);

  // Edit Room form state
  const [editType, setEditType] = useState('');
  const [editPrice, setEditPrice] = useState('250000');
  const [editApplyToAllCategory, setEditApplyToAllCategory] = useState(false);
  const [editMaxOccupancy, setEditMaxOccupancy] = useState(2);
  const [editSize, setEditSize] = useState('750');
  const [editBedType, setEditBedType] = useState('Queensize');
  const [editDesc, setEditDesc] = useState('');
  const [editAmenities, setEditAmenities] = useState<string[]>([]);

  // Photos Room state
  const [tempPhotos, setTempPhotos] = useState<string[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Quick Book wizard state (4 steps)
  const [qbStep, setQbStep] = useState<1 | 2 | 3 | 4>(1);
  const [qbSelectedCategory, setQbSelectedCategory] = useState<string>('');
  const [qbSelectedRoomId, setQbSelectedRoomId] = useState<string>('');
  const [qbGuestName, setQbGuestName] = useState('');
  const [qbGuestEmail, setQbGuestEmail] = useState('');
  const [qbGuestPhone, setQbGuestPhone] = useState('');
  const [qbCheckIn, setQbCheckIn] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [qbCheckOut, setQbCheckOut] = useState(() => {
    const future = new Date();
    future.setDate(future.getDate() + 3);
    return future.toISOString().split('T')[0];
  });
  const [qbGuestCount, setQbGuestCount] = useState(2);
  const [qbSpecialRequests, setQbSpecialRequests] = useState('');

  // Existing categories derived from rooms or defaults
  const existingCategories = useMemo(() => {
    const set = new Set<string>();
    rooms.forEach((r) => {
      if (r.type) set.add(r.type);
    });
    if (set.size === 0) {
      set.add('Presidential Suite');
      set.add('Luxury Suite');
      set.add('Executive Suite');
      set.add('Deluxe Room');
      set.add('Standard Double');
    }
    return Array.from(set);
  }, [rooms]);

  // Group rooms by category
  const categorySummary = useMemo(() => {
    const map = new Map<
      string,
      {
        category: string;
        total: number;
        available: number;
        occupied: number;
        reserved: number;
        cleaning: number;
        maintenance: number;
        price: number;
        image: string;
        rooms: Room[];
      }
    >();

    rooms.forEach((room) => {
      const cat = room.type || 'Standard';
      if (!map.has(cat)) {
        map.set(cat, {
          category: cat,
          total: 0,
          available: 0,
          occupied: 0,
          reserved: 0,
          cleaning: 0,
          maintenance: 0,
          price: room.pricePerNight,
          image:
            room.images?.[0] ||
            'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=800&q=80',
          rooms: [],
        });
      }
      const item = map.get(cat)!;
      item.total += 1;
      item.rooms.push(room);
      if (room.status === 'available') item.available += 1;
      else if (room.status === 'occupied') item.occupied += 1;
      else if (room.status === 'reserved') item.reserved += 1;
      else if (room.status === 'cleaning') item.cleaning += 1;
      else if (room.status === 'maintenance') item.maintenance += 1;
    });

    return Array.from(map.values());
  }, [rooms]);

  // Overall totals
  const overallTotals = useMemo(() => {
    return rooms.reduce(
      (acc, r) => {
        acc.total += 1;
        if (r.status === 'available') acc.available += 1;
        else if (r.status === 'occupied') acc.occupied += 1;
        else if (r.status === 'reserved') acc.reserved += 1;
        else if (r.status === 'cleaning') acc.cleaning += 1;
        else if (r.status === 'maintenance') acc.maintenance += 1;
        return acc;
      },
      { total: 0, available: 0, occupied: 0, reserved: 0, cleaning: 0, maintenance: 0 }
    );
  }, [rooms]);

  // Filtered rooms for "All Rooms" table
  const filteredAllRooms = useMemo(() => {
    return rooms.filter((room) => {
      const matchesSearch =
        searchQuery === '' ||
        room.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `floor ${room.floor}`.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || room.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [rooms, searchQuery, statusFilter]);

  // Toggle category expansion
  const toggleCategory = (categoryName: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryName]: !prev[categoryName],
    }));
  };

  // Open Edit Room Modal
  const handleOpenEditRoom = (room: Room) => {
    setEditingRoom(room);
    setEditType(room.type);
    setEditPrice(room.pricePerNight ? String(room.pricePerNight) : '50000');
    setEditApplyToAllCategory(false);
    setEditMaxOccupancy(room.maxGuests || 2);
    setEditSize(room.roomSize ? String(room.roomSize) : '750');
    setEditBedType(room.bed || 'Queensize');
    setEditDesc(room.description || '');
    setEditAmenities(room.amenities && room.amenities.length > 0 ? [...room.amenities] : [...PREDEFINED_AMENITIES.slice(0, 8)]);
  };

  // Save Edit Room
  const handleSaveEditRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;

    const parsedPrice = parseInt(editPrice, 10);
    const validPrice = !isNaN(parsedPrice) && parsedPrice > 0 ? parsedPrice : editingRoom.pricePerNight;

    const updated: Room = {
      ...editingRoom,
      type: editType,
      pricePerNight: validPrice,
      maxGuests: Number(editMaxOccupancy) || 2,
      roomSize: parseInt(editSize, 10) || 0,
      bed: editBedType,
      description: editDesc,
      amenities: editAmenities,
    };

    onUpdateRoom(updated);

    if (editApplyToAllCategory) {
      rooms
        .filter((r) => r.type === editType && r.id !== editingRoom.id)
        .forEach((r) => {
          onUpdateRoom({ ...r, pricePerNight: validPrice });
        });
    }

    setEditingRoom(null);
  };

  // Open Photos Modal
  const handleOpenPhotos = (room: Room) => {
    setPhotosRoom(room);
    setTempPhotos(room.images && room.images.length > 0 ? [...room.images] : []);
  };

  // Handle Photo Upload / Preset add
  const handleAddPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingPhoto(true);
    // Convert file to local preview object URL
    const newUrls: string[] = [];
    Array.from(files).forEach((file: File) => {
      const url = URL.createObjectURL(file);
      newUrls.push(url);
    });

    setTimeout(() => {
      setTempPhotos((prev) => [...prev, ...newUrls]);
      setIsUploadingPhoto(false);
    }, 600);
  };

  const handleAddPresetPhotos = () => {
    setTempPhotos((prev) => {
      const available = PRESET_ROOM_PHOTOS.filter((p) => !prev.includes(p));
      const toAdd = available.slice(0, 5 - prev.length > 0 ? 5 - prev.length : 2);
      return [...prev, ...toAdd];
    });
  };

  const handleDeletePhoto = (index: number) => {
    setTempPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSetPrimaryPhoto = (index: number) => {
    setTempPhotos((prev) => {
      const selected = prev[index];
      const rest = prev.filter((_, i) => i !== index);
      return [selected, ...rest];
    });
  };

  const handleSavePhotos = () => {
    if (!photosRoom) return;
    const updated: Room = {
      ...photosRoom,
      images: tempPhotos,
    };
    onUpdateRoom(updated);
    setPhotosRoom(null);
  };

  // Handle Inline Rate Save
  const handleSaveRate = (room: Room) => {
    const newPriceStr = editingRates[room.id];
    if (!newPriceStr) return;
    const newPrice = parseInt(newPriceStr, 10);
    if (isNaN(newPrice) || newPrice <= 0) return;

    setSavingRateId(room.id);
    const updated: Room = {
      ...room,
      pricePerNight: newPrice,
    };
    onUpdateRoom(updated);
    setTimeout(() => {
      setSavingRateId(null);
      setEditingRates((prev) => {
        const copy = { ...prev };
        delete copy[room.id];
        return copy;
      });
    }, 400);
  };

  // Change room status directly
  const handleChangeRoomStatus = (room: Room, nextStatus: Room['status']) => {
    const updated: Room = {
      ...room,
      status: nextStatus,
    };
    onUpdateRoom(updated);
  };

  // Handle Add Room Submit (with duplicate check!)
  const handleCreateNewRoom = (e: React.FormEvent) => {
    e.preventDefault();
    setAddRoomError(null);

    const trimmedNumber = newRoomNumber.trim();
    if (!trimmedNumber) {
      setAddRoomError('Please enter a room number.');
      return;
    }

    // Duplicate check within same hotel
    const exists = rooms.some(
      (r) => r.number.toLowerCase() === trimmedNumber.toLowerCase()
    );
    if (exists) {
      setAddRoomError('Room number already exists in this hotel.');
      return;
    }

    const finalType = newRoomType === '__custom__' ? customRoomType.trim() || 'Standard' : newRoomType;

    const defaultPhotos = [
      'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80',
    ];

    const newRoom: Room = {
      id: `room-${Date.now()}`,
      number: trimmedNumber,
      type: finalType,
      typeName: `${finalType} with premium furnishings`,
      pricePerNight: parseInt(newRoomPrice, 10) || 50000,
      status: 'available',
      floor: parseInt(newRoomFloor, 10) || 1,
      maxGuests: 2,
      roomSize: 35,
      bed: 'Queensize',
      description: newRoomDesc || `Well-appointed ${finalType} with luxury conveniences.`,
      amenities: PREDEFINED_AMENITIES.slice(0, 6),
      images: newRoomPhotos.length > 0 ? newRoomPhotos : defaultPhotos,
    };

    onAddRoom(newRoom);
    setShowAddRoomModal(false);
    setNewRoomNumber('');
    setNewRoomDesc('');
    setNewRoomPhotos([]);
    setAddRoomError(null);
  };

  // Quick Book state derivations
  const qbSelectedRoom = useMemo(() => {
    return rooms.find((r) => r.id === qbSelectedRoomId);
  }, [rooms, qbSelectedRoomId]);

  const qbNights = useMemo(() => {
    try {
      const inDate = new Date(qbCheckIn);
      const outDate = new Date(qbCheckOut);
      const diffTime = outDate.getTime() - inDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 1;
    } catch {
      return 1;
    }
  }, [qbCheckIn, qbCheckOut]);

  const qbTotalPrice = useMemo(() => {
    if (!qbSelectedRoom) return 0;
    return qbSelectedRoom.pricePerNight * qbNights;
  }, [qbSelectedRoom, qbNights]);

  const handleStartQuickBook = () => {
    setQbStep(1);
    const firstCat = categorySummary[0]?.category || existingCategories[0] || 'Presidential Suite';
    setQbSelectedCategory(firstCat);
    const availableRoom = rooms.find((r) => r.type === firstCat && r.status === 'available') || rooms.find((r) => r.type === firstCat) || rooms[0];
    if (availableRoom) {
      setQbSelectedRoomId(availableRoom.id);
    }
    setShowQuickBookModal(true);
  };

  const handleConfirmQuickBook = () => {
    if (!qbSelectedRoom) return;

    const guestName = qbGuestName.trim() || 'Walk-in Guest';
    const guestEmail = qbGuestEmail.trim() || 'guest@igho.com';
    const guestPhone = qbGuestPhone.trim() || '+234 800 000 0000';

    const newRes: Reservation = {
      id: `res-${Date.now()}`,
      reference: `BK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      hotelId: hotel.id,
      hotelName: hotel.name,
      roomId: qbSelectedRoom.id,
      roomNumber: qbSelectedRoom.number,
      roomType: qbSelectedRoom.type,
      guestName,
      guestEmail,
      guestPhone,
      checkIn: qbCheckIn,
      checkOut: qbCheckOut,
      nights: qbNights,
      guests: qbGuestCount,
      total: qbTotalPrice,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      specialRequests: qbSpecialRequests,
    };

    if (onAddReservation) {
      onAddReservation(newRes);
    }

    // Mark room as occupied or reserved
    onUpdateRoom({
      ...qbSelectedRoom,
      status: 'occupied',
    });

    setShowQuickBookModal(false);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full">
      {/* Top Header matching ECO Hotel — Staff Portal / Room Inventory */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <div className="text-[11px] font-medium text-neutral-400 flex items-center gap-1.5">
            <span>{hotel.name || 'ECO Hotel'}</span>
            <span>—</span>
            <span>Staff Portal</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-black tracking-tight">Room Inventory</h1>
          <p className="text-xs text-neutral-500">
            Organized by category. Expand a category to view rooms.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="quick-book-button"
            onClick={handleStartQuickBook}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-black text-white text-xs font-bold hover:bg-neutral-800 transition-all shadow-xs"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Quick Book</span>
          </button>
          <button
            id="add-room-button"
            onClick={() => {
              setAddRoomError(null);
              setShowAddRoomModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-black text-white text-xs font-bold hover:bg-neutral-800 transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Room</span>
          </button>
        </div>
      </div>

      {/* Category Dashboard Table (Screenshot 1: Category Dashboard) */}
      <div className="bg-white border border-neutral-200/90 rounded-xl p-4 sm:p-5 space-y-3 shadow-2xs">
        <div className="font-bold text-xs text-black">Category Dashboard</div>

        {categorySummary.length === 0 ? (
          <div className="p-6 text-center text-xs text-neutral-400">
            No room categories established yet. Click <span className="font-semibold text-black">+ Add Room</span> to configure your first category.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[620px]">
              <thead>
                <tr className="border-b border-neutral-100 text-[11px] font-semibold text-neutral-500">
                  <th className="pb-2.5 font-semibold">Category</th>
                  <th className="pb-2.5 text-center font-semibold">Total</th>
                  <th className="pb-2.5 text-center font-semibold">Available</th>
                  <th className="pb-2.5 text-center font-semibold">Occupied</th>
                  <th className="pb-2.5 text-center font-semibold">Reserved</th>
                  <th className="pb-2.5 text-center font-semibold">Cleaning</th>
                  <th className="pb-2.5 text-center font-semibold">Maintenance</th>
                  <th className="pb-2.5 text-right font-semibold">Price / night</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100/80">
                {categorySummary.map((item) => (
                  <tr key={item.category} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="py-2.5 font-bold text-neutral-900">{item.category}</td>
                    <td className="py-2.5 text-center font-semibold text-neutral-800">{item.total}</td>
                    <td className="py-2.5 text-center font-semibold text-emerald-600">{item.available}</td>
                    <td className="py-2.5 text-center font-semibold text-rose-600">{item.occupied}</td>
                    <td className="py-2.5 text-center font-semibold text-amber-600">{item.reserved}</td>
                    <td className="py-2.5 text-center font-semibold text-amber-600">{item.cleaning}</td>
                    <td className="py-2.5 text-center font-semibold text-neutral-500">{item.maintenance}</td>
                    <td className="py-2.5 text-right font-extrabold text-black">
                      ₦{item.price.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-neutral-200 font-bold text-neutral-900 bg-neutral-50/40">
                  <td className="py-2.5 font-bold">All categories</td>
                  <td className="py-2.5 text-center">{overallTotals.total}</td>
                  <td className="py-2.5 text-center text-emerald-600">{overallTotals.available}</td>
                  <td className="py-2.5 text-center text-rose-600">{overallTotals.occupied}</td>
                  <td className="py-2.5 text-center text-amber-600">{overallTotals.reserved}</td>
                  <td className="py-2.5 text-center text-amber-600">{overallTotals.cleaning}</td>
                  <td className="py-2.5 text-center text-neutral-500">{overallTotals.maintenance}</td>
                  <td className="py-2.5 text-right text-neutral-400 font-normal">—</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Rooms by Category Section */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="font-bold text-xs text-neutral-900">Rooms by Category</div>

          {/* Filter Bar */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search # / type / floor"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 sm:w-60 pl-4 pr-8 py-1.5 bg-white border border-neutral-200 rounded-full text-xs text-neutral-800 focus:outline-none focus:border-black placeholder:text-neutral-400"
              />
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3.5 py-1.5 bg-white border border-neutral-200 rounded-full text-xs text-neutral-800 font-medium focus:outline-none focus:border-black"
            >
              <option value="all">all</option>
              <option value="available">available</option>
              <option value="occupied">occupied</option>
              <option value="reserved">reserved</option>
              <option value="cleaning">cleaning</option>
              <option value="maintenance">maintenance</option>
            </select>
          </div>
        </div>

        {/* Category Cards List */}
        {categorySummary.length === 0 ? (
          <div className="bg-white border border-dashed border-neutral-300 rounded-2xl p-8 text-center space-y-3">
            <DoorClosed className="w-10 h-10 text-neutral-300 mx-auto" />
            <div className="space-y-1">
              <div className="text-sm font-bold text-black">No rooms have been added yet</div>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                Get started by creating your first room with pricing, capacity, and amenities.
              </p>
            </div>
            <button
              onClick={() => setShowAddRoomModal(true)}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-black text-white text-xs font-bold rounded-full hover:bg-neutral-800"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Room</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {categorySummary.map((catItem) => {
              const isExpanded = !!expandedCategories[catItem.category];
              const roomSearchTerm = (categoryRoomSearch[catItem.category] || '').toLowerCase();
              const categoryRoomsFiltered = catItem.rooms.filter((r) => {
                if (!roomSearchTerm) return true;
                return (
                  r.number.toLowerCase().includes(roomSearchTerm) ||
                  `floor ${r.floor}`.toLowerCase().includes(roomSearchTerm)
                );
              });

              return (
                <div
                  key={catItem.category}
                  className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-2xs transition-all"
                >
                  {/* Category Top Banner Card */}
                  <div className="p-4 sm:p-5 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                    <div className="flex gap-4 items-start sm:items-center">
                      <img
                        src={catItem.image}
                        alt={catItem.category}
                        className="w-32 h-24 sm:w-44 sm:h-28 object-cover rounded-xl border border-neutral-100 shrink-0"
                      />
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-sm sm:text-base text-black">
                            {catItem.category}
                          </h3>
                          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider bg-neutral-100 px-2 py-0.5 rounded-full">
                            TOTAL ROOMS {catItem.total}
                          </span>
                        </div>
                        <div className="text-xs font-black text-neutral-900">
                          ₦{catItem.price.toLocaleString()} <span className="text-neutral-400 font-normal">/ night</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                          <span className="font-semibold text-neutral-600 bg-neutral-50 border border-neutral-200 px-2.5 py-0.5 rounded-full">
                            Available <strong className="text-emerald-700 font-bold">{catItem.available}</strong>
                          </span>
                          <span className="font-semibold text-neutral-600 bg-neutral-50 border border-neutral-200 px-2.5 py-0.5 rounded-full">
                            Occupied <strong className="text-rose-700 font-bold">{catItem.occupied}</strong>
                          </span>
                          <span className="font-semibold text-neutral-600 bg-neutral-50 border border-neutral-200 px-2.5 py-0.5 rounded-full">
                            Reserved <strong className="text-amber-700 font-bold">{catItem.reserved}</strong>
                          </span>
                          <span className="font-semibold text-neutral-600 bg-neutral-50 border border-neutral-200 px-2.5 py-0.5 rounded-full">
                            Cleaning <strong className="text-amber-700 font-bold">{catItem.cleaning}</strong>
                          </span>
                          <span className="font-semibold text-neutral-600 bg-neutral-50 border border-neutral-200 px-2.5 py-0.5 rounded-full">
                            Maintenance <strong className="text-neutral-700 font-bold">{catItem.maintenance}</strong>
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-400 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>Capacity varies per room</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleCategory(catItem.category)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-black text-white text-xs font-bold hover:bg-neutral-800 transition-all self-end md:self-center shrink-0"
                    >
                      <span>{isExpanded ? 'Hide Rooms' : 'View Rooms'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Expanded Category Rooms Drawer */}
                  {isExpanded && (
                    <div className="border-t border-neutral-100 bg-neutral-50/50 p-4 sm:p-5 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <input
                          type="text"
                          placeholder="Search room # or floor"
                          value={categoryRoomSearch[catItem.category] || ''}
                          onChange={(e) =>
                            setCategoryRoomSearch((prev) => ({
                              ...prev,
                              [catItem.category]: e.target.value,
                            }))
                          }
                          className="w-48 sm:w-60 px-4 py-1.5 bg-white border border-neutral-200 rounded-full text-xs text-neutral-800 focus:outline-none focus:border-black placeholder:text-neutral-400"
                        />
                        <span className="text-xs text-neutral-400 font-medium">
                          {categoryRoomsFiltered.length} of {catItem.rooms.length}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {categoryRoomsFiltered.map((room) => (
                          <div
                            key={room.id}
                            className="bg-white border border-neutral-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-neutral-300 transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-700 font-bold shrink-0">
                                🚪
                              </div>
                              <div className="space-y-0.5">
                                <div className="font-bold text-xs text-black">
                                  Room {room.number}
                                </div>
                                <div className="text-[11px] text-neutral-500">
                                  {room.type} · Floor {room.floor} · ₦{room.pricePerNight.toLocaleString()}/night
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Status badge */}
                              {room.status === 'available' ? (
                                <>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Available
                                  </span>
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white text-emerald-600 border border-emerald-200">
                                    Not Reserved
                                  </span>
                                </>
                              ) : room.status === 'occupied' ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                                  Occupied
                                </span>
                              ) : room.status === 'reserved' ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                  Reserved
                                </span>
                              ) : room.status === 'cleaning' ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                  Cleaning
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-300">
                                  Maintenance
                                </span>
                              )}

                              <button
                                onClick={() => handleOpenEditRoom(room)}
                                className="flex items-center gap-1 px-3 py-1 rounded-full border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>Edit</span>
                              </button>

                              <button
                                onClick={() => handleOpenPhotos(room)}
                                className="flex items-center gap-1 px-3 py-1 rounded-full border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                              >
                                <Camera className="w-3 h-3" />
                                <span>Photos</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Tip Banner from Screenshot 1 */}
        <div className="text-[11px] text-neutral-500 bg-neutral-50 border border-neutral-200/80 rounded-xl p-3">
          Tip: click <strong className="text-black font-semibold">View Rooms</strong> to expand a category and see each room's live status. Use <strong className="text-black font-semibold">Quick Book</strong> at the top for category-first reservations.
        </div>
      </div>

      {/* All Rooms Table (Screenshot 1: All Rooms with Rate inline save) */}
      <div className="space-y-2">
        <div className="font-bold text-xs text-neutral-900">All Rooms</div>

        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-2xs overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-semibold text-neutral-500">
              <tr>
                <th className="py-3 px-4 font-semibold">Room</th>
                <th className="py-3 px-4 font-semibold">Type</th>
                <th className="py-3 px-4 font-semibold">Specs</th>
                <th className="py-3 px-4 font-semibold">Rate (₦/night)</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Guest / Reservation</th>
                <th className="py-3 px-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredAllRooms.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-neutral-400">
                    No rooms match the current search or filter.
                  </td>
                </tr>
              ) : (
                filteredAllRooms.map((room) => {
                  const currentEditRate = editingRates[room.id] !== undefined ? editingRates[room.id] : String(room.pricePerNight);
                  const isRateChanged = currentEditRate !== String(room.pricePerNight);

                  // Find active reservation for this room
                  const activeRes = reservations.find(
                    (r) => r.roomId === room.id && (r.status === 'confirmed' || r.status === 'pending')
                  );

                  return (
                    <tr key={room.id} className="hover:bg-neutral-50/50 transition-colors">
                      {/* Room Number */}
                      <td className="py-3 px-4 font-bold text-black">{room.number}</td>

                      {/* Room Type */}
                      <td className="py-3 px-4 font-semibold text-neutral-800">{room.type}</td>

                      {/* Specs: 2g · 750sqm · Fl5 */}
                      <td className="py-3 px-4 text-neutral-500 text-[11px]">
                        {room.maxGuests || 2}g · {room.roomSize ? `${room.roomSize}sqm` : '? sqm'} · Fl{room.floor}
                      </td>

                      {/* Rate (₦/night) with inline input and Save button */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            value={currentEditRate}
                            onChange={(e) =>
                              setEditingRates((prev) => ({
                                ...prev,
                                [room.id]: e.target.value,
                              }))
                            }
                            className="w-24 px-3 py-1 bg-white border border-neutral-200 rounded-full text-xs font-semibold focus:outline-none focus:border-black"
                          />
                          <button
                            onClick={() => handleSaveRate(room)}
                            disabled={!isRateChanged || savingRateId === room.id}
                            className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                              isRateChanged
                                ? 'bg-black text-white hover:bg-neutral-800 shadow-2xs'
                                : 'bg-neutral-100 text-neutral-400 cursor-default'
                            }`}
                          >
                            {savingRateId === room.id ? '...' : 'Save'}
                          </button>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {room.status === 'available' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            available
                          </span>
                        ) : room.status === 'occupied' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                            occupied
                          </span>
                        ) : room.status === 'reserved' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            reserved
                          </span>
                        ) : room.status === 'cleaning' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            cleaning
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-300">
                            maintenance
                          </span>
                        )}
                      </td>

                      {/* Guest / Reservation */}
                      <td className="py-3 px-4 text-neutral-600 text-xs">
                        {activeRes ? (
                          <span className="font-semibold text-black">{activeRes.guestName}</span>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>

                      {/* Actions: status dropdown, edit, photos */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <select
                            value={room.status}
                            onChange={(e) => handleChangeRoomStatus(room, e.target.value as any)}
                            className="text-[11px] font-semibold px-2.5 py-1 border border-neutral-200 rounded-full bg-white focus:outline-none focus:border-black"
                          >
                            <option value="available">available</option>
                            <option value="occupied">occupied</option>
                            <option value="reserved">reserved</option>
                            <option value="cleaning">cleaning</option>
                            <option value="maintenance">maintenance</option>
                          </select>

                          <button
                            onClick={() => handleOpenEditRoom(room)}
                            className="p-1.5 rounded-full border border-neutral-200 hover:bg-neutral-100 text-neutral-700"
                            title="Edit Room"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleOpenPhotos(room)}
                            className="p-1.5 rounded-full border border-neutral-200 hover:bg-neutral-100 text-neutral-700"
                            title="Room Photos"
                          >
                            <Camera className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: NEW ROOM MODAL (Screenshot 2: New Room) */}
      {/* ========================================================================= */}
      {showAddRoomModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="font-bold text-base text-black">New Room</h3>
              <button
                onClick={() => setShowAddRoomModal(false)}
                className="text-neutral-400 hover:text-black p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {addRoomError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{addRoomError}</span>
              </div>
            )}

            <form onSubmit={handleCreateNewRoom} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-neutral-700">Room number</label>
                  <input
                    type="text"
                    required
                    value={newRoomNumber}
                    onChange={(e) => {
                      setNewRoomNumber(e.target.value);
                      if (addRoomError) setAddRoomError(null);
                    }}
                    placeholder="123"
                    className="w-full px-4 py-2 rounded-full border border-neutral-300 text-xs focus:outline-none focus:border-black"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-neutral-700">Type</label>
                  <select
                    value={newRoomType}
                    onChange={(e) => setNewRoomType(e.target.value)}
                    className="w-full px-4 py-2 rounded-full border border-neutral-300 text-xs focus:outline-none focus:border-black"
                  >
                    {existingCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value="__custom__">+ Custom Category...</option>
                  </select>
                </div>
              </div>

              {newRoomType === '__custom__' && (
                <div className="space-y-1">
                  <label className="block font-semibold text-neutral-700">Custom Category Name</label>
                  <input
                    type="text"
                    value={customRoomType}
                    onChange={(e) => setCustomRoomType(e.target.value)}
                    placeholder="e.g. Royal Penthouse"
                    className="w-full px-4 py-2 rounded-full border border-neutral-300 text-xs focus:outline-none focus:border-black"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-neutral-700">Floor</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newRoomFloor}
                    onChange={(e) => setNewRoomFloor(e.target.value)}
                    placeholder="2"
                    className="w-full px-4 py-2 rounded-full border border-neutral-300 text-xs focus:outline-none focus:border-black"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-neutral-700">Price / night (₦)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={newRoomPrice}
                    onChange={(e) => setNewRoomPrice(e.target.value)}
                    placeholder="250000"
                    className="w-full px-4 py-2 rounded-full border border-neutral-300 text-xs focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-neutral-700">Description</label>
                <textarea
                  rows={2}
                  value={newRoomDesc}
                  onChange={(e) => setNewRoomDesc(e.target.value)}
                  placeholder="Water, king size bed, tv, balcony, 24/7 room service, office"
                  className="w-full px-4 py-2.5 rounded-2xl border border-neutral-300 text-xs focus:outline-none focus:border-black"
                />
              </div>

              {/* Room Pictures Option: Up to 6 pictures */}
              <div className="space-y-2 pt-1 border-t border-neutral-100">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-neutral-700">
                    Room Pictures ({newRoomPhotos.length}/6 added)
                  </label>
                  <span className="text-[10px] text-neutral-400">Up to 6 pictures</span>
                </div>

                {/* Thumbnails grid */}
                <div className="grid grid-cols-3 gap-2">
                  {newRoomPhotos.map((picUrl, idx) => (
                    <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-neutral-200 group">
                      <img src={picUrl} alt={`Room photo ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setNewRoomPhotos((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/70 hover:bg-black text-white rounded-full flex items-center justify-center text-[10px] transition-opacity"
                      >
                        ✕
                      </button>
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 text-white rounded-md text-[9px] font-bold">
                        #{idx + 1}
                      </span>
                    </div>
                  ))}

                  {/* Add Picture slot if under 6 */}
                  {newRoomPhotos.length < 6 && (
                    <label className="flex flex-col items-center justify-center aspect-video border-2 border-dashed border-neutral-200 hover:border-black rounded-xl cursor-pointer bg-neutral-50/50 hover:bg-neutral-50 transition-colors">
                      <Upload className="w-4 h-4 text-neutral-400 mb-1" />
                      <span className="text-[10px] font-semibold text-neutral-600">Add Picture</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const files = e.target.files;
                          if (!files || files.length === 0) return;
                          const newUrls: string[] = [];
                          Array.from(files).forEach((file: File) => {
                            newUrls.push(URL.createObjectURL(file));
                          });
                          setNewRoomPhotos((prev) => [...prev, ...newUrls].slice(0, 6));
                        }}
                      />
                    </label>
                  )}
                </div>

                {/* Quick Presets helper button */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setNewRoomPhotos((prev) => {
                        const available = PRESET_ROOM_PHOTOS.filter((p) => !prev.includes(p));
                        const needed = 6 - prev.length;
                        return [...prev, ...available.slice(0, needed)];
                      });
                    }}
                    className="text-[11px] text-neutral-600 hover:text-black font-semibold underline underline-offset-2 flex items-center gap-1"
                  >
                    + Use Curated Luxury Photo Presets
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end pt-2 border-t border-neutral-100">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-black text-white text-xs font-bold rounded-full hover:bg-neutral-800 transition-all shadow-xs"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT ROOM MODAL (Video 00:08 - 00:39: Edit Room 111) */}
      {/* ========================================================================= */}
      {editingRoom && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl space-y-4 my-8 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="font-bold text-base text-black">Edit Room {editingRoom.number}</h3>
              <button
                onClick={() => setEditingRoom(null)}
                className="text-neutral-400 hover:text-black p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditRoom} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-neutral-700">Type</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                    className="w-full px-4 py-2 rounded-full border border-neutral-300 text-xs focus:outline-none focus:border-black"
                  >
                    {existingCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block font-semibold text-neutral-700">Price / night (₦)</label>
                    <span className="text-[10px] font-bold text-neutral-500">
                      ₦{Number(editPrice || 0).toLocaleString()}
                    </span>
                  </div>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    placeholder="250000"
                    className="w-full px-4 py-2 rounded-full border border-neutral-300 text-xs focus:outline-none focus:border-black font-semibold"
                  />
                </div>
              </div>

              {/* Option to apply new price to all rooms of this category */}
              <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200">
                <label className="flex items-start gap-2.5 cursor-pointer select-none text-[11px] text-neutral-700">
                  <input
                    type="checkbox"
                    checked={editApplyToAllCategory}
                    onChange={(e) => setEditApplyToAllCategory(e.target.checked)}
                    className="mt-0.5 rounded text-black focus:ring-black"
                  />
                  <div>
                    <span className="font-bold text-black block">
                      Apply this price to all rooms in the &ldquo;{editType}&rdquo; category
                    </span>
                    <span className="text-neutral-500 text-[10px]">
                      Will update rates for {rooms.filter((r) => r.type === editType).length} total rooms in {editType} to ₦{Number(editPrice || 0).toLocaleString()} / night
                    </span>
                  </div>
                </label>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-neutral-700">Max occupancy</label>
                  <input
                    type="number"
                    min={1}
                    value={editMaxOccupancy}
                    onChange={(e) => setEditMaxOccupancy(Number(e.target.value))}
                    className="w-full px-4 py-2 rounded-full border border-neutral-300 text-xs focus:outline-none focus:border-black"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-neutral-700">Size (sqm)</label>
                  <input
                    type="text"
                    value={editSize}
                    onChange={(e) => setEditSize(e.target.value)}
                    placeholder="750"
                    className="w-full px-4 py-2 rounded-full border border-neutral-300 text-xs focus:outline-none focus:border-black"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-neutral-700">Bed type</label>
                  <input
                    type="text"
                    value={editBedType}
                    onChange={(e) => setEditBedType(e.target.value)}
                    placeholder="Queensize"
                    className="w-full px-4 py-2 rounded-full border border-neutral-300 text-xs focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-neutral-700">Description</label>
                <textarea
                  rows={2}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Water, king size bed, tv, balcony, 24/7 room service, office"
                  className="w-full px-4 py-2.5 rounded-2xl border border-neutral-300 text-xs focus:outline-none focus:border-black"
                />
              </div>

              {/* Amenities included: Selectable pill grid with checkboxes */}
              <div className="space-y-2">
                <label className="block font-semibold text-neutral-700">Amenities included</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PREDEFINED_AMENITIES.map((amenity) => {
                    const isSelected = editAmenities.includes(amenity);
                    return (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => {
                          setEditAmenities((prev) =>
                            prev.includes(amenity)
                              ? prev.filter((a) => a !== amenity)
                              : [...prev, amenity]
                          );
                        }}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-left text-[11px] transition-all ${
                          isSelected
                            ? 'bg-neutral-900 text-white border-neutral-900 font-semibold'
                            : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 border ${
                            isSelected
                              ? 'bg-white border-white text-black'
                              : 'border-neutral-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                        <span className="truncate">{amenity}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-neutral-100">
                <button
                  type="submit"
                  className="px-6 py-2 bg-black text-white text-xs font-bold rounded-full hover:bg-neutral-800 transition-all shadow-xs"
                >
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ROOM PHOTOS MODAL (Video 00:44 - 01:46: Room 111 Photos) */}
      {/* ========================================================================= */}
      {photosRoom && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl space-y-4 my-8 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-black">Room {photosRoom.number}</h3>
                <p className="text-[11px] text-neutral-500">
                  Photos: bedroom, bathroom, living area, balcony, workspace, etc. Customers will see them in the room gallery and lightbox.
                </p>
              </div>
              <button
                onClick={() => setPhotosRoom(null)}
                className="text-neutral-400 hover:text-black p-1 shrink-0 ml-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Photo count indicator requirement check */}
            <div className="flex items-center justify-between text-xs p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl">
              <span className="font-semibold text-neutral-700">
                Uploaded: <strong className="text-black">{tempPhotos.length}</strong> photos
              </span>
              {tempPhotos.length >= 5 ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" /> Ready for publish (≥5 photos)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-700 font-semibold text-[11px] bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  <AlertCircle className="w-3 h-3" /> Minimum 5 photos required for active badge
                </span>
              )}
            </div>

            {/* Upload Area */}
            <div className="border-2 border-dashed border-neutral-200 rounded-2xl p-4 text-center space-y-2 hover:border-neutral-400 transition-colors">
              <div className="flex items-center justify-center gap-2">
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-full text-xs font-bold transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose images (multiple allowed)</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleAddPhotos}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleAddPresetPhotos}
                  className="inline-flex items-center gap-1 px-3 py-2 bg-neutral-50 hover:bg-neutral-100 text-neutral-600 rounded-full text-xs font-semibold border border-neutral-200 transition-colors"
                >
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>Use curated presets</span>
                </button>
              </div>
              <p className="text-[10px] text-neutral-400">
                Upload real photos of the room. First photo is used as the cover.
              </p>
            </div>

            {isUploadingPhoto && (
              <div className="text-center p-3 text-xs text-neutral-500 animate-pulse">
                Uploading photos...
              </div>
            )}

            {/* Photos Grid */}
            {tempPhotos.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-400 border border-neutral-100 rounded-2xl bg-neutral-50/50">
                No photos yet. Stock images will be shown until you upload.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2.5">
                {tempPhotos.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative group rounded-xl overflow-hidden border border-neutral-200 aspect-square bg-neutral-100"
                  >
                    <img
                      src={url}
                      alt={`Photo ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />

                    {/* Primary Badge */}
                    {idx === 0 ? (
                      <span className="absolute top-1.5 left-1.5 bg-black/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 backdrop-blur-xs">
                        <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" /> Cover
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetPrimaryPhoto(idx)}
                        className="opacity-0 group-hover:opacity-100 absolute top-1.5 left-1.5 bg-black/70 hover:bg-black text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md transition-opacity"
                        title="Set as cover photo"
                      >
                        Set cover
                      </button>
                    )}

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleDeletePhoto(idx)}
                      className="opacity-0 group-hover:opacity-100 absolute top-1.5 right-1.5 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md transition-opacity"
                      title="Delete photo"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setPhotosRoom(null)}
                className="text-xs font-semibold text-neutral-500 hover:text-black"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePhotos}
                className="px-6 py-2 bg-black text-white text-xs font-bold rounded-full hover:bg-neutral-800 transition-all shadow-xs"
              >
                Save Photos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: QUICK BOOK 4-STEP WIZARD (Video 01:57 - 02:59) */}
      {/* ========================================================================= */}
      {showQuickBookModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4 my-8 animate-in zoom-in-95 duration-150">
            {/* Header with Step indicator */}
            <div className="space-y-2 border-b border-neutral-100 pb-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-black">
                  Quick Book — Step {qbStep} of 4
                </h3>
                <button
                  onClick={() => setShowQuickBookModal(false)}
                  className="text-neutral-400 hover:text-black p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 4 horizontal progress segment bars */}
              <div className="grid grid-cols-4 gap-1.5">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`h-1.5 rounded-full transition-all ${
                      qbStep >= step ? 'bg-black' : 'bg-neutral-200'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* STEP 1: Select room category */}
            {qbStep === 1 && (
              <div className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="block font-semibold text-neutral-700">Choose a category</label>
                  <select
                    value={qbSelectedCategory}
                    onChange={(e) => {
                      const cat = e.target.value;
                      setQbSelectedCategory(cat);
                      const matchingRoom = rooms.find(
                        (r) => r.type === cat && r.status === 'available'
                      ) || rooms.find((r) => r.type === cat);
                      if (matchingRoom) setQbSelectedRoomId(matchingRoom.id);
                    }}
                    className="w-full px-4 py-2.5 rounded-full border border-neutral-300 text-xs focus:outline-none focus:border-black font-semibold"
                  >
                    {categorySummary.map((c) => (
                      <option key={c.category} value={c.category}>
                        {c.category} — {c.available} available / {c.total} total
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selected Category Preview Card */}
                {(() => {
                  const catItem = categorySummary.find((c) => c.category === qbSelectedCategory);
                  if (!catItem) return null;
                  return (
                    <div className="border border-neutral-200 rounded-2xl p-3 flex items-center gap-3 bg-neutral-50/50">
                      <img
                        src={catItem.image}
                        alt={catItem.category}
                        className="w-20 h-16 object-cover rounded-xl border border-neutral-100 shrink-0"
                      />
                      <div className="space-y-0.5">
                        <div className="font-bold text-xs text-black">{catItem.category}</div>
                        <div className="text-xs font-black text-black">
                          ₦{catItem.price.toLocaleString()} <span className="text-neutral-400 font-normal">/ night</span>
                        </div>
                        <div className="text-[10px] text-emerald-700 font-semibold">
                          {catItem.available} bookable now · {catItem.total} total
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setShowQuickBookModal(false)}
                    className="text-neutral-500 hover:text-black font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setQbStep(2)}
                    className="px-6 py-2 bg-black text-white text-xs font-bold rounded-full hover:bg-neutral-800 transition-all flex items-center gap-1"
                  >
                    <span>Next</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Select room from category */}
            {qbStep === 2 && (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-700">Select room</span>
                  <span className="text-[11px] text-neutral-400">
                    Category: <strong>{qbSelectedCategory}</strong>
                  </span>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {rooms
                    .filter((r) => r.type === qbSelectedCategory)
                    .map((room, idx) => {
                      const isSelected = qbSelectedRoomId === room.id;
                      return (
                        <div
                          key={room.id}
                          onClick={() => setQbSelectedRoomId(room.id)}
                          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'border-black bg-neutral-50 shadow-2xs'
                              : 'border-neutral-200 hover:border-neutral-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                {idx === 0 && (
                                  <span className="text-[9px] font-extrabold uppercase tracking-wider bg-black text-white px-2 py-0.5 rounded-full">
                                    RECOMMENDED
                                  </span>
                                )}
                                <span className="font-bold text-xs text-black">
                                  Room {room.number}
                                </span>
                              </div>
                              <div className="text-[11px] text-neutral-500">
                                Floor {room.floor} · ₦{room.pricePerNight.toLocaleString()}/night
                              </div>
                              <div className="flex items-center gap-2 text-[10px]">
                                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                  ● Available
                                </span>
                                <span className="text-neutral-500">● Not Reserved</span>
                              </div>
                            </div>

                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                isSelected
                                  ? 'border-black bg-black text-white'
                                  : 'border-neutral-300'
                              }`}
                            >
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setQbStep(1)}
                    className="text-neutral-500 hover:text-black font-semibold flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    disabled={!qbSelectedRoomId}
                    onClick={() => setQbStep(3)}
                    className="px-6 py-2 bg-black text-white text-xs font-bold rounded-full hover:bg-neutral-800 transition-all flex items-center gap-1 disabled:opacity-50"
                  >
                    <span>Next</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Room Overview & Specs review (Video 02:08 - 02:11) */}
            {qbStep === 3 && qbSelectedRoom && (
              <div className="space-y-4 text-xs">
                {/* Room Image and Header */}
                <div className="relative rounded-2xl overflow-hidden border border-neutral-200 h-36 bg-neutral-100">
                  <img
                    src={
                      qbSelectedRoom.images?.[0] ||
                      'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80'
                    }
                    alt={qbSelectedRoom.number}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-3 text-white">
                    <div className="font-bold text-sm">Room {qbSelectedRoom.number} · Floor {qbSelectedRoom.floor}</div>
                    <div className="text-base font-extrabold text-white">
                      ₦{qbSelectedRoom.pricePerNight.toLocaleString()}{' '}
                      <span className="text-xs font-normal text-white/80">per night</span>
                    </div>
                  </div>
                </div>

                {/* Specs */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/80">
                    <div className="text-[10px] text-neutral-400 font-semibold">Size</div>
                    <div className="font-bold text-neutral-900 mt-0.5">
                      {qbSelectedRoom.roomSize || 750} sqm
                    </div>
                  </div>
                  <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/80">
                    <div className="text-[10px] text-neutral-400 font-semibold">Bed</div>
                    <div className="font-bold text-neutral-900 mt-0.5">
                      {qbSelectedRoom.bed || 'Queensize'}
                    </div>
                  </div>
                  <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/80">
                    <div className="text-[10px] text-neutral-400 font-semibold">Capacity</div>
                    <div className="font-bold text-neutral-900 mt-0.5">
                      {qbSelectedRoom.maxGuests || 2} guests
                    </div>
                  </div>
                </div>

                {/* Amenities pills */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-neutral-700">Included Amenities</div>
                  <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto">
                    {(qbSelectedRoom.amenities && qbSelectedRoom.amenities.length > 0
                      ? qbSelectedRoom.amenities
                      : PREDEFINED_AMENITIES.slice(0, 8)
                    ).map((amenity) => (
                      <span
                        key={amenity}
                        className="text-[10px] font-medium bg-neutral-100 text-neutral-700 px-2.5 py-0.5 rounded-full"
                      >
                        ✓ {amenity}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setQbStep(2)}
                    className="text-neutral-500 hover:text-black font-semibold flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQbStep(4)}
                    className="px-6 py-2 bg-black text-white text-xs font-bold rounded-full hover:bg-neutral-800 transition-all flex items-center gap-1"
                  >
                    <span>Next</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: Reservation & Guest Details (Video 02:12 - 02:59) */}
            {qbStep === 4 && qbSelectedRoom && (
              <div className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="block font-semibold text-neutral-700">Guest</label>
                  <input
                    type="text"
                    required
                    value={qbGuestName}
                    onChange={(e) => setQbGuestName(e.target.value)}
                    placeholder="Enter guest full name (e.g. Dave Caleb)"
                    className="w-full px-4 py-2 rounded-full border border-neutral-300 text-xs focus:outline-none focus:border-black"
                  />
                  <p className="text-[10px] text-neutral-400">
                    Need a new guest? Create them from the Guests page first.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block font-semibold text-neutral-700">Check-in</label>
                    <input
                      type="date"
                      value={qbCheckIn}
                      onChange={(e) => setQbCheckIn(e.target.value)}
                      className="w-full px-4 py-2 rounded-full border border-neutral-300 text-xs focus:outline-none focus:border-black font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block font-semibold text-neutral-700">Check-out</label>
                    <input
                      type="date"
                      value={qbCheckOut}
                      onChange={(e) => setQbCheckOut(e.target.value)}
                      className="w-full px-4 py-2 rounded-full border border-neutral-300 text-xs focus:outline-none focus:border-black font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block font-semibold text-neutral-700">Guests</label>
                    <input
                      type="number"
                      min={1}
                      max={qbSelectedRoom.maxGuests || 4}
                      value={qbGuestCount}
                      onChange={(e) => setQbGuestCount(Number(e.target.value))}
                      className="w-full px-4 py-2 rounded-full border border-neutral-300 text-xs focus:outline-none focus:border-black"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-semibold text-neutral-700">Nights</label>
                    <div className="px-4 py-2 rounded-full bg-neutral-100 border border-neutral-200 text-xs font-bold text-neutral-800">
                      {qbNights}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-neutral-700">Special requests</label>
                  <textarea
                    rows={2}
                    value={qbSpecialRequests}
                    onChange={(e) => setQbSpecialRequests(e.target.value)}
                    placeholder="Optional (e.g. extra towels, late check-in)"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:border-black"
                  />
                </div>

                {/* Calculation Summary Box from video 02:39 */}
                <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-2xl space-y-1.5">
                  <div className="flex items-center justify-between text-neutral-600 text-[11px]">
                    <span>Room {qbSelectedRoom.number} · {qbSelectedRoom.type}</span>
                    <span>{qbCheckIn} → {qbCheckOut}</span>
                  </div>
                  <div className="flex items-center justify-between font-extrabold text-sm text-black pt-1 border-t border-neutral-200/80">
                    <span>Total</span>
                    <span className="text-base text-black font-black">
                      ₦{qbTotalPrice.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setQbStep(3)}
                    className="text-neutral-500 hover:text-black font-semibold flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmQuickBook}
                    className="px-6 py-2.5 bg-black text-white text-xs font-bold rounded-full hover:bg-neutral-800 transition-all flex items-center gap-1.5 shadow-xs"
                  >
                    <Check className="w-4 h-4" />
                    <span>Confirm Booking</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
