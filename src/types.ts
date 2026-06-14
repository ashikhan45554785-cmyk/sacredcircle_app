export type ReligionType = 'muslim' | 'christian' | 'hindu';
export type ModeType = 'individual' | 'couple' | 'group';

export interface Member {
  id: number;
  room_code: string | null;
  name: string;
  email: string | null;
  role?: string; // 'husband' | 'wife' | 'member'
}

export interface ChantingSession {
  word: string;
  count: number;
  time: string;
}

export interface CustomPrayer {
  id: string;
  name: string;
  time: string;
}
