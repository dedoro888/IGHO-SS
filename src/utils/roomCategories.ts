import { Room } from '../types';

export interface RoomCategory {
  id: string;
  name: string;
  level: number;
  levelLabel: string;
  tier: string;
  pricePerNight: number;
  isAvailable: boolean;
  availableCount: number;
  totalCount: number;
  representativeRoom: Room;
  rooms: Room[];
  maxGuests: number;
  bed: string;
  roomSize: number;
  description: string;
  amenities: string[];
  images: string[];
  features?: string[];
}

/**
 * Checks if a room status represents an available room for guests.
 */
export function isRoomStatusAvailable(status?: string): boolean {
  if (!status) return true;
  const s = status.toLowerCase();
  return s === 'available' || s === 'vacant / clean' || s === 'inspected';
}

/**
 * Groups hotel rooms into distinct Categories / Levels for guest viewing.
 * Levels are ordered by price ascending: Level 1 (Entry/Standard), Level 2 (Deluxe), Level 3 (Executive), Level 4 (Presidential).
 */
export function getRoomCategories(rooms: Room[]): RoomCategory[] {
  if (!rooms || rooms.length === 0) return [];

  // Group rooms by category type
  const groupMap = new Map<string, Room[]>();

  rooms.forEach((room) => {
    const key = (room.type || 'Standard Room').trim();
    if (!groupMap.has(key)) {
      groupMap.set(key, []);
    }
    groupMap.get(key)!.push(room);
  });

  // Convert map to array and sort by average price ascending to assign Levels
  const categoryGroups = Array.from(groupMap.entries()).map(([typeName, roomList]) => {
    const avgPrice = Math.round(
      roomList.reduce((sum, r) => sum + (r.pricePerNight || 0), 0) / Math.max(1, roomList.length)
    );
    return { typeName, roomList, avgPrice };
  });

  categoryGroups.sort((a, b) => a.avgPrice - b.avgPrice);

  return categoryGroups.map((group, index) => {
    const level = index + 1;
    const { typeName, roomList, avgPrice } = group;

    // Find an available room to use as representative, or fall back to the first room
    const availableRooms = roomList.filter((r) => isRoomStatusAvailable(r.status));
    const representativeRoom = availableRooms.length > 0 ? availableRooms[0] : roomList[0];

    // Gather aggregated images
    const allImages: string[] = [];
    roomList.forEach((r) => {
      if (r.images && r.images.length > 0) {
        r.images.forEach((img) => {
          if (img && !allImages.includes(img)) allImages.push(img);
        });
      } else if (r.image && !allImages.includes(r.image)) {
        allImages.push(r.image);
      }
    });

    if (allImages.length === 0) {
      allImages.push(
        'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80'
      );
    }

    // Consolidated amenities
    const amenitiesSet = new Set<string>();
    roomList.forEach((r) => {
      (r.amenities || r.features || []).forEach((am) => amenitiesSet.add(am));
    });

    const isAvailable = availableRooms.length > 0;

    return {
      id: `cat-${typeName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      name: typeName,
      level,
      levelLabel: `Level ${level}`,
      tier: representativeRoom.tier || `Level ${level} Tier`,
      pricePerNight: avgPrice || representativeRoom.pricePerNight || 0,
      isAvailable,
      availableCount: availableRooms.length,
      totalCount: roomList.length,
      representativeRoom,
      rooms: roomList,
      maxGuests: representativeRoom.maxGuests || representativeRoom.capacity || 2,
      bed: representativeRoom.bed || representativeRoom.beds || '1 King Bed',
      roomSize: representativeRoom.roomSize || 35,
      description: representativeRoom.description || `${typeName} offering high-end hospitality and modern comforts.`,
      amenities: Array.from(amenitiesSet),
      images: allImages,
      features: representativeRoom.features || Array.from(amenitiesSet),
    };
  });
}

/**
 * Returns Level info for a specific room or reservation for guest display.
 */
export function getRoomLevelInfo(
  room: { type: string; pricePerNight?: number; floor?: number },
  allRooms: Room[] = []
): { level: number; levelLabel: string; displayName: string } {
  if (!room || !room.type) {
    return { level: 1, levelLabel: 'Level 1', displayName: 'Standard' };
  }

  if (allRooms.length > 0) {
    const categories = getRoomCategories(allRooms);
    const matched = categories.find(
      (c) => c.name.toLowerCase() === room.type.toLowerCase()
    );
    if (matched) {
      return {
        level: matched.level,
        levelLabel: matched.levelLabel,
        displayName: `${matched.name} (${matched.levelLabel})`,
      };
    }
  }

  // Fallback heuristic based on common types or price
  const t = room.type.toLowerCase();
  let level = 1;
  if (t.includes('deluxe')) level = 2;
  else if (t.includes('executive')) level = 3;
  else if (t.includes('presidential') || t.includes('penthouse') || t.includes('royal')) level = 4;
  else if (room.floor && room.floor > 1) level = room.floor;

  return {
    level,
    levelLabel: `Level ${level}`,
    displayName: `${room.type} (Level ${level})`,
  };
}
