import { Badge, BrushingRecord, ReminderConfig, SavedAccountInfo, ToothbrushCharacter, UserStats } from '../types';

const LEGACY_STATS_KEY = 'gigijuara_user_stats';
const LEGACY_RECORDS_KEY = 'gigijuara_brushing_records';
const LEGACY_TOOTHBRUSHES_KEY = 'gigijuara_toothbrushes';
const LEGACY_BADGES_KEY = 'gigijuara_badges';

const ACTIVE_EMAIL_KEY = 'gigijuara_active_account_email';
const SAVED_ACCOUNTS_KEY = 'gigijuara_saved_accounts_registry';
const REMINDER_KEY = 'gigijuara_reminder_config';

export function sanitizeEmailKey(email?: string | null): string {
  if (!email || !email.trim()) return 'default_guest';
  return email.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
}

export const INITIAL_TOOTHBRUSHES: ToothbrushCharacter[] = [
  {
    id: 'classic-blue',
    name: 'Sikat Juara Biru',
    theme: 'Klasik',
    icon: '🪥',
    requiredStreak: 0,
    description: 'Sikat gigi andalan pertama untuk memulai petualangan senyum bersih!',
    brushColor: '#0284c7',
    bristleColor: '#38bdf8',
    unlocked: true,
  },
  {
    id: 'dino-rex',
    name: 'Dino Rex Hijau',
    theme: 'Dinosaurus',
    icon: '🦖',
    requiredStreak: 3,
    description: 'Kekuatan T-Rex melibas kuman sisa makanan hingga bersih tak bersisa!',
    brushColor: '#16a34a',
    bristleColor: '#4ade80',
    unlocked: false,
  },
  {
    id: 'space-rocket',
    name: 'Roket Galaksi',
    theme: 'Astronot',
    icon: '🚀',
    requiredStreak: 7,
    description: 'Meluncur cepat membersihkan sela-sela gigi secepat roket antariksa!',
    brushColor: '#6366f1',
    bristleColor: '#a855f7',
    unlocked: false,
  },
  {
    id: 'rainbow-unicorn',
    name: 'Unicorn Pelangi',
    theme: 'Pelangi Manis',
    icon: '🦄',
    requiredStreak: 14,
    description: 'Sentuhan lembut bulu sikat ajaib berkilau dengan busa warna-warni!',
    brushColor: '#ec4899',
    bristleColor: '#f472b6',
    unlocked: false,
  },
  {
    id: 'lightning-hero',
    name: 'Pahlawan Kilat',
    theme: 'Superhero',
    icon: '⚡',
    requiredStreak: 21,
    description: 'Kekuatan petir pahlawan super membasmi karang gigi membandel!',
    brushColor: '#eab308',
    bristleColor: '#facc15',
    unlocked: false,
  },
  {
    id: 'golden-crown',
    name: 'Mahkota Emas Juara',
    theme: 'Legenda Gigi Sehat',
    icon: '👑',
    requiredStreak: 30,
    description: 'Sikat emas legendaris para master sikat gigi disiplin 30 hari!',
    brushColor: '#f59e0b',
    bristleColor: '#fbbf24',
    unlocked: false,
  },
];

export const INITIAL_BADGES: Badge[] = [
  {
    id: 'badge-first-brush',
    title: 'Langkah Pertama',
    description: 'Selesaikan sikat gigi 2 menit pertamamu!',
    icon: '🦷',
    requiredStreak: 0,
    unlocked: false,
  },
  {
    id: 'badge-streak-3',
    title: 'Pejuang Gigi 3 Hari',
    description: 'Pertahankan streak sikat gigi selama 3 hari berturut-turut.',
    icon: '🥉',
    requiredStreak: 3,
    unlocked: false,
  },
  {
    id: 'badge-streak-7',
    title: 'Juara Seminggu Sehat',
    description: 'Konsisten sikat gigi pagi dan malam selama 7 hari berturut-turut!',
    icon: '🥈',
    requiredStreak: 7,
    unlocked: false,
  },
  {
    id: 'badge-streak-14',
    title: 'Ksatria Senyum Cemerlang',
    description: 'Dua minggu tanpa bolong merawat gigi dengan penuh semangat!',
    icon: '🥇',
    requiredStreak: 14,
    unlocked: false,
  },
  {
    id: 'badge-streak-30',
    title: 'Master Gigi Berlian',
    description: 'Capai streak luar biasa 30 hari! Dokter gigi pun bangga padamu.',
    icon: '💎',
    requiredStreak: 30,
    unlocked: false,
  },
  {
    id: 'badge-morning-night',
    title: 'Kombinasi Sempurna',
    description: 'Selesaikan sikat gigi pagi dan malam dalam 1 hari yang sama.',
    icon: '✨',
    requiredStreak: 1,
    unlocked: false,
  },
];

export function getTodayKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const Storage = {
  // Active Account Email management
  getActiveEmail(): string | null {
    try {
      return localStorage.getItem(ACTIVE_EMAIL_KEY);
    } catch {
      return null;
    }
  },

  setActiveEmail(email: string | null) {
    try {
      if (email && email.trim()) {
        localStorage.setItem(ACTIVE_EMAIL_KEY, email.trim().toLowerCase());
      } else {
        localStorage.removeItem(ACTIVE_EMAIL_KEY);
      }
    } catch {
      // Ignore
    }
  },

  // Saved accounts list
  getSavedAccounts(): SavedAccountInfo[] {
    try {
      const data = localStorage.getItem(SAVED_ACCOUNTS_KEY);
      if (data) {
        return JSON.parse(data) as SavedAccountInfo[];
      }
    } catch {
      // Ignore
    }
    return [];
  },

  saveSavedAccount(account: SavedAccountInfo) {
    try {
      const accounts = Storage.getSavedAccounts();
      const cleanEmail = account.email.trim().toLowerCase();
      const existingIdx = accounts.findIndex((a) => a.email.toLowerCase() === cleanEmail);
      
      const payload: SavedAccountInfo = {
        ...account,
        email: cleanEmail,
        lastLogin: new Date().toISOString(),
      };

      if (existingIdx >= 0) {
        accounts[existingIdx] = {
          ...accounts[existingIdx],
          ...payload,
        };
      } else {
        accounts.unshift(payload);
      }

      localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(accounts));
    } catch {
      // Ignore
    }
  },

  removeSavedAccount(email: string) {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const accounts = Storage.getSavedAccounts().filter((a) => a.email.toLowerCase() !== cleanEmail);
      localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(accounts));
      if (Storage.getActiveEmail()?.toLowerCase() === cleanEmail) {
        Storage.setActiveEmail(null);
      }
    } catch {
      // Ignore
    }
  },

  // Key helpers partitioned by active email
  _getStatsKey(emailOverride?: string | null): string {
    const email = emailOverride !== undefined ? emailOverride : Storage.getActiveEmail();
    return `gigijuara_stats_${sanitizeEmailKey(email)}`;
  },

  _getRecordsKey(emailOverride?: string | null): string {
    const email = emailOverride !== undefined ? emailOverride : Storage.getActiveEmail();
    return `gigijuara_records_${sanitizeEmailKey(email)}`;
  },

  _getToothbrushesKey(emailOverride?: string | null): string {
    const email = emailOverride !== undefined ? emailOverride : Storage.getActiveEmail();
    return `gigijuara_brushes_${sanitizeEmailKey(email)}`;
  },

  _getBadgesKey(emailOverride?: string | null): string {
    const email = emailOverride !== undefined ? emailOverride : Storage.getActiveEmail();
    return `gigijuara_badges_${sanitizeEmailKey(email)}`;
  },

  getStats(emailOverride?: string | null): UserStats {
    try {
      const key = Storage._getStatsKey(emailOverride);
      let data = localStorage.getItem(key);
      
      // Fallback migration from legacy key if first time accessing this device
      if (!data && (!emailOverride || emailOverride === Storage.getActiveEmail())) {
        data = localStorage.getItem(LEGACY_STATS_KEY);
      }

      if (data) {
        const parsed = JSON.parse(data) as UserStats;
        const today = getTodayKey();
        if (parsed.lastBrushedDate !== today) {
          const lastDate = parsed.lastBrushedDate;
          if (lastDate) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
            if (lastDate !== yKey && lastDate !== today) {
              parsed.currentStreak = 0;
            }
          }
          parsed.todayRecords = { morning: false, night: false };
        }
        return parsed;
      }
    } catch {
      // Ignore
    }

    return {
      userName: 'Juara Cilik',
      userEmail: emailOverride || Storage.getActiveEmail() || undefined,
      currentStreak: 0,
      bestStreak: 0,
      totalStars: 50,
      totalSessions: 0,
      selectedToothbrushId: 'classic-blue',
      hasReadEducation: false,
      todayRecords: {
        morning: false,
        night: false,
      },
    };
  },

  saveStats(stats: UserStats, emailOverride?: string | null) {
    try {
      const key = Storage._getStatsKey(emailOverride);
      localStorage.setItem(key, JSON.stringify(stats));

      // Also mirror to legacy key if active account
      if (!emailOverride || emailOverride === Storage.getActiveEmail()) {
        localStorage.setItem(LEGACY_STATS_KEY, JSON.stringify(stats));
      }

      // Automatically update saved accounts registry snapshot
      const targetEmail = (emailOverride || stats.userEmail || Storage.getActiveEmail())?.trim().toLowerCase();
      if (targetEmail) {
        const accounts = Storage.getSavedAccounts();
        const existing = accounts.find((a) => a.email.toLowerCase() === targetEmail);
        Storage.saveSavedAccount({
          email: targetEmail,
          displayName: stats.userName || existing?.displayName || targetEmail.split('@')[0],
          photoURL: existing?.photoURL,
          role: existing?.role || (targetEmail.toLowerCase() === 'p17325124424@student.poltekkesbandung.ac.id' ? 'superadmin' : 'user'),
          lastLogin: new Date().toISOString(),
          currentStreak: stats.currentStreak,
          totalStars: stats.totalStars,
          hasPassedQuiz: Boolean(stats.hasPassedQuiz),
          uid: existing?.uid,
        });
      }
    } catch {
      // Ignore
    }
  },

  getRecords(emailOverride?: string | null): Record<string, BrushingRecord> {
    try {
      const key = Storage._getRecordsKey(emailOverride);
      let data = localStorage.getItem(key);
      if (!data && (!emailOverride || emailOverride === Storage.getActiveEmail())) {
        data = localStorage.getItem(LEGACY_RECORDS_KEY);
      }
      if (data) return JSON.parse(data);
    } catch {
      // Ignore
    }
    return {};
  },

  saveRecord(record: BrushingRecord, emailOverride?: string | null) {
    try {
      const records = Storage.getRecords(emailOverride);
      records[record.date] = record;
      const key = Storage._getRecordsKey(emailOverride);
      localStorage.setItem(key, JSON.stringify(records));
      if (!emailOverride || emailOverride === Storage.getActiveEmail()) {
        localStorage.setItem(LEGACY_RECORDS_KEY, JSON.stringify(records));
      }
    } catch {
      // Ignore
    }
  },

  getToothbrushes(emailOverride?: string | null): ToothbrushCharacter[] {
    try {
      const key = Storage._getToothbrushesKey(emailOverride);
      let data = localStorage.getItem(key);
      if (!data && (!emailOverride || emailOverride === Storage.getActiveEmail())) {
        data = localStorage.getItem(LEGACY_TOOTHBRUSHES_KEY);
      }
      if (data) return JSON.parse(data);
    } catch {
      // Ignore
    }
    return INITIAL_TOOTHBRUSHES;
  },

  saveToothbrushes(brushes: ToothbrushCharacter[], emailOverride?: string | null) {
    try {
      const key = Storage._getToothbrushesKey(emailOverride);
      localStorage.setItem(key, JSON.stringify(brushes));
      if (!emailOverride || emailOverride === Storage.getActiveEmail()) {
        localStorage.setItem(LEGACY_TOOTHBRUSHES_KEY, JSON.stringify(brushes));
      }
    } catch {
      // Ignore
    }
  },

  getBadges(emailOverride?: string | null): Badge[] {
    try {
      const key = Storage._getBadgesKey(emailOverride);
      let data = localStorage.getItem(key);
      if (!data && (!emailOverride || emailOverride === Storage.getActiveEmail())) {
        data = localStorage.getItem(LEGACY_BADGES_KEY);
      }
      if (data) return JSON.parse(data);
    } catch {
      // Ignore
    }
    return INITIAL_BADGES;
  },

  saveBadges(badges: Badge[], emailOverride?: string | null) {
    try {
      const key = Storage._getBadgesKey(emailOverride);
      localStorage.setItem(key, JSON.stringify(badges));
      if (!emailOverride || emailOverride === Storage.getActiveEmail()) {
        localStorage.setItem(LEGACY_BADGES_KEY, JSON.stringify(badges));
      }
    } catch {
      // Ignore
    }
  },

  getReminderConfig(): ReminderConfig {
    try {
      const data = localStorage.getItem(REMINDER_KEY);
      if (data) return JSON.parse(data);
    } catch {
      // Ignore
    }
    return {
      morningTime: '06:30',
      morningEnabled: true,
      nightTime: '20:30',
      nightEnabled: true,
      soundEnabled: true,
      notificationsAllowed: false,
    };
  },

  saveReminderConfig(config: ReminderConfig) {
    try {
      localStorage.setItem(REMINDER_KEY, JSON.stringify(config));
    } catch {
      // Ignore
    }
  },
};

