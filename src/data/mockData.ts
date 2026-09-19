import {
  Hotel,
  Room,
  Reservation,
  StaffAccount,
  HousekeepingTask,
  StaffInvitation,
  CustomerFeedback,
} from '../types';
import { ALL_PERMISSION_IDS, DEFAULT_ROLE_PERMISSIONS } from '../utils/permissions';

export const INITIAL_HOTELS: Hotel[] = [];

export const INITIAL_ROOMS: Room[] = [];

export const INITIAL_RESERVATIONS: Reservation[] = [];

export const INITIAL_STAFF: StaffAccount[] = [];

export const INITIAL_HOUSEKEEPING: HousekeepingTask[] = [];

export const INITIAL_INVITATIONS: StaffInvitation[] = [];

export const INITIAL_FEEDBACK: CustomerFeedback[] = [];
