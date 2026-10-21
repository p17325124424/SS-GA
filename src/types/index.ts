export type QuadrantType = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface QuadrantInfo {
  id: QuadrantType;
  name: string;
  shortName: string;
  description: string;
  color: string;
}

export type GermType = 'sugar' | 'plaque' | 'acid' | 'monster';

export interface Germ {
  id: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  size: number;
  type: GermType;
  name: string;
  color: string;
  health: number; // 0 to 100
  maxHealth: number;
  quadrant: QuadrantType;
  defeated: boolean;
  scale: number;
  rotation: number;
  isFading?: boolean;
  isNew?: boolean;
  defeatedAt?: number;
}

export interface FoamParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  color: string;
}

export interface SparkleParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  rotation: number;
}

export interface ToothbrushCharacter {
  id: string;
  name: string;
  theme: string;
  icon: string;
  requiredStreak: number;
  description: string;
  brushColor: string;
  bristleColor: string;
  handlePattern?: string;
  unlocked: boolean;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  requiredStreak: number;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface BrushingRecord {
  date: string; // YYYY-MM-DD
  morning: boolean;
  morningTime?: string;
  night: boolean;
  nightTime?: string;
  durationSeconds: number;
  starsEarned: number;
}

export interface ReminderConfig {
  morningTime: string; // '06:30'
  morningEnabled: boolean;
  nightTime: string; // '20:30'
  nightEnabled: boolean;
  soundEnabled: boolean;
  notificationsAllowed: boolean;
}

export interface SavedAccountInfo {
  email: string;
  displayName: string;
  photoURL?: string;
  role?: 'superadmin' | 'user';
  lastLogin: string;
  uid?: string;
  currentStreak: number;
  totalStars: number;
  hasPassedQuiz: boolean;
}

export interface UserStats {
  userName?: string;
  userEmail?: string;
  currentStreak: number;
  bestStreak: number;
  totalStars: number;
  totalSessions: number;
  selectedToothbrushId: string;
  lastBrushedDate?: string;
  hasReadEducation?: boolean;
  lastReadEducationAt?: string;
  hasPassedQuiz?: boolean;
  quizScore?: number;
  todayRecords: {
    morning: boolean;
    night: boolean;
  };
}

