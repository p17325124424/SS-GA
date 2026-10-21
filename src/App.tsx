/**
 * GigiJuara - Edukasi & Pengingat Sikat Gigi PWA
 * @license Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Storage, getTodayKey } from './utils/storage';
import { sound } from './utils/audio';
import { ToothbrushCharacter, UserStats } from './types';
import { BrushingGame } from './components/BrushingGame';
import { StreakTracker } from './components/StreakTracker';
import { ShopAndBadges } from './components/ShopAndBadges';
import { EducationGuide } from './components/EducationGuide';
import { ReminderModal } from './components/ReminderModal';
import { SuperAdminPanel } from './components/SuperAdminPanel';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { 
  auth, 
  loginWithGmail, 
  loginWithEmailDirect,
  loginAsPlayerAccount,
  loginAsSuperAdminDirect,
  logoutUser, 
  isUserSuperAdmin, 
  syncUserProfile, 
  saveUserStatsToCloud, 
  saveRecordToCloud,
  fetchUserRecordsFromCloud,
  CloudUserProfile,
  SUPER_ADMIN_EMAIL,
  PRESET_PLAYER_ACCOUNT,
  getActiveStorageUserId,
  ACTIVE_PLAYER_KEY
} from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  Gamepad2, 
  Calendar, 
  Award, 
  BookOpen, 
  Bell, 
  Flame, 
  Star, 
  Sparkles,
  Info,
  Clock,
  X,
  Crown,
  LogOut,
  UserCheck,
  ShieldCheck,
  ChevronDown,
  CloudCheck,
  RefreshCw,
  AlertTriangle,
  Mail,
  CheckCircle2,
  Lock,
  Unlock,
  FileText,
  KeyRound,
  Eye,
  EyeOff,
  User as UserIcon,
  Database,
  AlertCircle
} from 'lucide-react';

export default function App() {
  const [stats, setStats] = useState<UserStats>(Storage.getStats());
  const [activeTab, setActiveTab] = useState<'game' | 'streak' | 'rewards' | 'education' | 'superadmin'>(() => {
    const initialStats = Storage.getStats();
    return !initialStats.hasPassedQuiz ? 'education' : 'game';
  });
  const [isReminderOpen, setIsReminderOpen] = useState<boolean>(false);
  const [activeReminderAlert, setActiveReminderAlert] = useState<{
    title: string;
    message: string;
  } | null>(null);

  // Authentication & Cloud State
  const [user, setUser] = useState<User | null>(null);
  const [cloudProfile, setCloudProfile] = useState<CloudUserProfile | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncToastMessage, setSyncToastMessage] = useState<string | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState<boolean>(false);
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Active account mode: 'ssga01' | 'google' | 'direct' | null
  const [activeAccountType, setActiveAccountType] = useState<string | null>(() => {
    try {
      return localStorage.getItem(ACTIVE_PLAYER_KEY) || null;
    } catch {
      return null;
    }
  });

  // Player Form State
  const [playerUsername, setPlayerUsername] = useState<string>('');
  const [playerPassword, setPlayerPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Direct Email Form State
  const [directEmail, setDirectEmail] = useState<string>('');
  const [directName, setDirectName] = useState<string>('');

  // Check if current user is Super Admin (Only p17325124424@student.poltekkesbandung.ac.id)
  const isSuper = isUserSuperAdmin(user, cloudProfile);
  const isPlayer = activeAccountType === 'ssga01' || cloudProfile?.userId === 'ssga01';

  // Active equipped toothbrush
  const toothbrushes = Storage.getToothbrushes();
  const currentEquippedBrush = 
    toothbrushes.find((b) => b.id === stats.selectedToothbrushId) || toothbrushes[0];

  // =========================================================================
  // MANDATORY EDUCATION & QUIZ LOGIC
  // =========================================================================
  const hasPassedQuiz = Boolean(stats.hasPassedQuiz);
  const isMandatoryEducationRequired = !hasPassedQuiz;
  const mandatoryReason: 'first_time' | 'streak_reset' | 'normal' = !hasPassedQuiz ? 'first_time' : 'normal';

  // Automatically guide user to education on first time access
  useEffect(() => {
    if (isMandatoryEducationRequired) {
      setActiveTab('education');
    }
  }, [isMandatoryEducationRequired]);

  // Refresh stats & badges helper with auto cloud sync
  const handleUpdateStats = (newStats: UserStats) => {
    setStats(newStats);
    Storage.saveStats(newStats);
    const targetUid = getActiveStorageUserId();
    if (targetUid) {
      saveUserStatsToCloud(
        targetUid, 
        newStats, 
        targetUid === 'ssga01' ? PRESET_PLAYER_ACCOUNT.email : user?.email || undefined, 
        targetUid === 'ssga01' ? 'Pemain ssga01' : user?.displayName || undefined, 
        user?.photoURL || undefined
      ).catch((err) => console.warn('Sync stats error:', err));
    }
  };

  const handleCheckBadges = () => {
    setStats(Storage.getStats());
  };

  // Completion handler for mandatory education reading & online quiz
  const handleCompleteEducation = (quizScore: number = 100) => {
    const updated: UserStats = {
      ...stats,
      hasReadEducation: true,
      lastReadEducationAt: new Date().toISOString(),
      hasPassedQuiz: true,
      quizScore,
      totalStars: (stats.totalStars || 0) + 25,
    };
    handleUpdateStats(updated);
    setActiveTab('game');
    
    setSyncToastMessage(`🎉 Selamat! Kamu telah lulus Ujian Online (${quizScore}%) & mendapat +25 Bintang ⭐! Game 2 Menit telah terbuka!`);
    setTimeout(() => setSyncToastMessage(null), 5000);
  };

  // Close user dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check saved player session on mount
  useEffect(() => {
    const initPlayerSession = async () => {
      try {
        const savedAccount = localStorage.getItem(ACTIVE_PLAYER_KEY);
        if (savedAccount && savedAccount !== 'admin') {
          setActiveAccountType(savedAccount);
          try {
            const cloudRecords = await fetchUserRecordsFromCloud(savedAccount);
            const today = getTodayKey();
            const localStats = Storage.getStats();
            if (cloudRecords[today]) {
              localStats.todayRecords = {
                morning: cloudRecords[today].morning,
                night: cloudRecords[today].night,
              };
            }
            Object.values(cloudRecords).forEach((rec) => Storage.saveRecord(rec));
            setStats({ ...localStats });
            Storage.saveStats(localStats);
          } catch (err) {
            console.warn(err);
          }
        }
      } catch (err) {
        console.warn('Auto restore player session:', err);
      }
    };

    initPlayerSession();
  }, []);

  // Listen to Firebase Auth state for Gmail / Super Admin accounts
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser && activeAccountType !== 'ssga01') {
        try {
          const currentLocalStats = Storage.getStats();
          const profile = await syncUserProfile(firebaseUser, currentLocalStats);
          setCloudProfile(profile);

          const userCloudStats: UserStats = {
            currentStreak: profile.currentStreak ?? currentLocalStats.currentStreak ?? 0,
            bestStreak: Math.max(profile.bestStreak ?? 0, currentLocalStats.bestStreak ?? 0),
            totalStars: Math.max(profile.totalStars ?? 0, currentLocalStats.totalStars ?? 50),
            totalSessions: Math.max(profile.totalSessions ?? 0, currentLocalStats.totalSessions ?? 0),
            selectedToothbrushId: profile.selectedToothbrushId || currentLocalStats.selectedToothbrushId || 'classic-blue',
            lastBrushedDate: profile.lastBrushedDate || currentLocalStats.lastBrushedDate || undefined,
            hasReadEducation: profile.hasReadEducation ?? currentLocalStats.hasReadEducation ?? false,
            lastReadEducationAt: profile.lastReadEducationAt || currentLocalStats.lastReadEducationAt || undefined,
            hasPassedQuiz: profile.hasPassedQuiz ?? currentLocalStats.hasPassedQuiz ?? false,
            quizScore: profile.quizScore ?? currentLocalStats.quizScore ?? undefined,
            todayRecords: { morning: false, night: false },
          };

          try {
            const cloudRecords = await fetchUserRecordsFromCloud(firebaseUser.uid);
            const today = getTodayKey();
            if (cloudRecords[today]) {
              userCloudStats.todayRecords = {
                morning: cloudRecords[today].morning,
                night: cloudRecords[today].night,
              };
            }
            Object.values(cloudRecords).forEach((rec) => Storage.saveRecord(rec));
            const localRecords = Storage.getRecords();
            for (const rDate in localRecords) {
              if (!cloudRecords[rDate]) {
                await saveRecordToCloud(firebaseUser.uid, localRecords[rDate]);
              }
            }
          } catch (recErr) {
            console.warn('Could not fetch cloud records:', recErr);
          }

          setStats(userCloudStats);
          Storage.saveStats(userCloudStats);

          if (profile.role === 'superadmin' || firebaseUser.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
            setSyncToastMessage('👑 Mode Kelola Data Aktif.');
          } else {
            setSyncToastMessage(`✅ Masuk sebagai ${firebaseUser.displayName || 'Pengguna'}. Data tersimpan di Cloud Firestore!`);
          }
          setTimeout(() => setSyncToastMessage(null), 4000);
        } catch (err) {
          console.error('Error syncing user profile:', err);
        }
      }
    });

    return () => unsubscribe();
  }, [activeAccountType]);

  // Handle Player Login (Supports flexible username & password)
  const handlePlayerLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoggingIn(true);
    setAuthErrorMessage(null);
    try {
      const trimmedUser = playerUsername.trim();
      const trimmedPass = playerPassword.trim();

      // Check if super admin enters credentials directly
      if (trimmedUser.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
        if (trimmedPass === '12345') {
          const profile = await loginAsSuperAdminDirect(SUPER_ADMIN_EMAIL, stats);
          setCloudProfile(profile);
          setUser(auth.currentUser);
          setActiveAccountType('admin');
          setIsEmailModalOpen(false);
          setActiveTab('superadmin');
          setSyncToastMessage('👑 Mode Kelola Data Aktif.');
          setTimeout(() => setSyncToastMessage(null), 4000);
          return;
        } else {
          throw new Error('Kata sandi tidak valid. Silakan periksa kembali.');
        }
      }

      const profile = await loginAsPlayerAccount(trimmedUser, trimmedPass, stats);
      setCloudProfile(profile);
      setActiveAccountType(profile.userId);

      // Fetch existing cloud records for this player
      try {
        const cloudRecords = await fetchUserRecordsFromCloud(profile.userId);
        const today = getTodayKey();
        const userCloudStats: UserStats = {
          currentStreak: profile.currentStreak ?? 0,
          bestStreak: profile.bestStreak ?? 0,
          totalStars: profile.totalStars ?? 50,
          totalSessions: profile.totalSessions ?? 0,
          selectedToothbrushId: profile.selectedToothbrushId || 'classic-blue',
          lastBrushedDate: profile.lastBrushedDate || undefined,
          hasReadEducation: profile.hasReadEducation ?? false,
          lastReadEducationAt: profile.lastReadEducationAt || undefined,
          hasPassedQuiz: profile.hasPassedQuiz ?? false,
          quizScore: profile.quizScore ?? undefined,
          todayRecords: {
            morning: cloudRecords[today]?.morning ?? false,
            night: cloudRecords[today]?.night ?? false,
          },
        };
        Object.values(cloudRecords).forEach((rec) => Storage.saveRecord(rec));
        setStats(userCloudStats);
        Storage.saveStats(userCloudStats);
      } catch (recErr) {
        console.warn(recErr);
      }

      setIsEmailModalOpen(false);
      setSyncToastMessage(`🎮 Berhasil masuk sebagai ${profile.displayName}! Data sikat gigi tersimpan di Cloud.`);
      setTimeout(() => setSyncToastMessage(null), 4000);
    } catch (err: any) {
      console.error('Failed player login:', err);
      setAuthErrorMessage(err.message || 'Gagal masuk. Silakan periksa kembali nama pengguna dan kata sandi.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Direct Super Admin Access (p17325124424@student.poltekkesbandung.ac.id)
  const handleSuperAdminDirectLogin = async () => {
    setIsLoggingIn(true);
    setAuthErrorMessage(null);
    try {
      const profile = await loginAsSuperAdminDirect(SUPER_ADMIN_EMAIL, stats);
      setCloudProfile(profile);
      setUser(auth.currentUser);
      setActiveAccountType('admin');
      setIsEmailModalOpen(false);
      setActiveTab('superadmin');
      setSyncToastMessage(`👑 Masuk sebagai Super Admin (${SUPER_ADMIN_EMAIL}). Akses kelola data siap!`);
      setTimeout(() => setSyncToastMessage(null), 4000);
    } catch (err: any) {
      console.error('Super Admin login error:', err);
      setAuthErrorMessage(err.message || 'Gagal masuk Super Admin.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Gmail Google Sign-In
  const handleGmailLogin = async () => {
    setIsLoggingIn(true);
    setAuthErrorMessage(null);
    try {
      await loginWithGmail();
      setActiveAccountType('google');
      setIsEmailModalOpen(false);
    } catch (err: any) {
      console.error('Failed to log in with Gmail:', err);
      setAuthErrorMessage(err.message || 'Gagal masuk dengan Google.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Direct Custom Email Login
  const handleEmailDirectLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directEmail.trim()) return;
    setIsLoggingIn(true);
    setAuthErrorMessage(null);
    try {
      const emailClean = directEmail.trim().toLowerCase();
      const nameClean = directName.trim() || emailClean.split('@')[0];
      const profile = await loginWithEmailDirect(emailClean, nameClean, stats);
      setCloudProfile(profile);
      setUser(auth.currentUser);
      setActiveAccountType('direct');
      setIsEmailModalOpen(false);
      setSyncToastMessage(`✅ Masuk sebagai ${emailClean}. Data tersimpan di Cloud Firestore!`);
      setTimeout(() => setSyncToastMessage(null), 4000);
    } catch (err: any) {
      console.error('Failed direct email login:', err);
      setAuthErrorMessage(err.message || 'Gagal masuk dengan email.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Manual Trigger to force-sync all local stats & records to Firestore
  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const targetUid = getActiveStorageUserId();
      await saveUserStatsToCloud(
        targetUid, 
        stats, 
        targetUid === 'ssga01' ? PRESET_PLAYER_ACCOUNT.email : user?.email || undefined, 
        targetUid === 'ssga01' ? 'Pemain ssga01' : user?.displayName || undefined, 
        user?.photoURL || undefined
      );

      const records = Storage.getRecords();
      for (const date in records) {
        await saveRecordToCloud(targetUid, records[date]);
      }

      setSyncToastMessage('☁️ Seluruh data sikat gigi & rekor berhasil disinkronkan ke Firestore!');
      setTimeout(() => setSyncToastMessage(null), 3000);
    } catch (err) {
      console.error('Manual sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await logoutUser();
      setUser(null);
      setCloudProfile(null);
      setActiveAccountType(null);
      setIsUserMenuOpen(false);
      setActiveTab('game');
      setStats(Storage.getStats());
      setSyncToastMessage('👋 Anda telah keluar dari akun.');
      setTimeout(() => setSyncToastMessage(null), 3000);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Background interval checker for offline local reminders
  useEffect(() => {
    const checkSchedule = () => {
      const config = Storage.getReminderConfig();
      const currentStats = Storage.getStats();
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${hours}:${minutes}`;

      if (
        config.morningEnabled &&
        currentTimeStr === config.morningTime &&
        !currentStats.todayRecords?.morning
      ) {
        triggerReminderAlert(
          '☀️ Waktunya Sikat Gigi Pagi!',
          'Setelah sarapan, ayo bersihkan kuman selama 2 menit agar gigimu sehat dan segar!'
        );
      }

      if (
        config.nightEnabled &&
        currentTimeStr === config.nightTime &&
        !currentStats.todayRecords?.night
      ) {
        triggerReminderAlert(
          '🌙 Waktunya Sikat Gigi Malam!',
          'Sebelum tidur, basmi kuman gigi yang suka berpesta semalaman!'
        );
      }
    };

    const interval = setInterval(checkSchedule, 60000);
    checkSchedule();
    return () => clearInterval(interval);
  }, []);

  const triggerReminderAlert = (title: string, message: string) => {
    sound.playReminderChime();
    setActiveReminderAlert({ title, message });

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready.then((reg) => {
            reg.showNotification(title, {
              body: message,
              icon: '/pwa-192x192.png',
              tag: 'brushing-daily-reminder',
            });
          });
        } else {
          new Notification(title, {
            body: message,
            icon: '/pwa-192x192.png',
          });
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-sky-100/40 to-white text-slate-800 flex flex-col justify-between selection:bg-sky-200">
      
      {/* Cloud Sync Status Toast */}
      {syncToastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-sky-400 text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top duration-300">
          <span>{syncToastMessage}</span>
          <button 
            onClick={() => setSyncToastMessage(null)}
            className="p-1 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Floating Offline Notification Banner */}
      {activeReminderAlert && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white px-4 py-3 shadow-lg z-50 flex items-center justify-between animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-3 max-w-3xl mx-auto">
            <span className="text-2xl animate-bounce">⏰</span>
            <div>
              <div className="font-display font-extrabold text-sm">{activeReminderAlert.title}</div>
              <div className="text-xs text-amber-100">{activeReminderAlert.message}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveReminderAlert(null);
                if (isMandatoryEducationRequired) {
                  setActiveTab('education');
                } else {
                  setActiveTab('game');
                }
              }}
              className="px-3 py-1 bg-white text-amber-900 rounded-xl text-xs font-bold hover:bg-amber-100 transition shadow-xs cursor-pointer"
            >
              Mulai Sikat Gigi
            </button>
            <button
              onClick={() => setActiveReminderAlert(null)}
              className="p-1 rounded-full text-white/80 hover:bg-white/20 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main App Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-sky-100 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          {/* Logo & Title */}
          <div
            onClick={() => setActiveTab('game')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white flex items-center justify-center text-xl shadow-md border-2 border-white group-hover:scale-105 transition-transform">
              🦷
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-display font-black text-lg md:text-xl text-sky-950 tracking-tight leading-none">
                  GigiJuara
                </h1>
                <span className="px-1.5 py-0.5 rounded-md bg-sky-100 text-sky-700 text-[10px] font-extrabold uppercase tracking-wider">
                  PWA
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                Game & Pengingat Sikat Gigi 2 Menit
              </p>
            </div>
          </div>

          {/* Quick HUD: Streak + Stars + Auth (Player ssga01 / Super Admin) + Reminder + Install */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Streak Counter */}
            <button
              onClick={() => setActiveTab('streak')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border font-bold text-xs transition cursor-pointer shadow-xs ${
                stats.currentStreak === 0
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700'
              }`}
              title="Lihat Daily Streak"
            >
              <Flame className={`w-4 h-4 ${stats.currentStreak === 0 ? 'text-amber-500' : 'text-rose-500 fill-rose-500'}`} />
              <span className="hidden xs:inline">{stats.currentStreak} Hari</span>
              <span className="xs:hidden">{stats.currentStreak}d</span>
            </button>

            {/* Stars Counter */}
            <button
              onClick={() => setActiveTab('rewards')}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-bold text-xs transition cursor-pointer shadow-xs"
              title="Koleksi Hadiah Bintang"
            >
              <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
              <span>{stats.totalStars}</span>
            </button>

            {/* AUTH SECTION: Player or Super Admin or Login Button */}
            {isSuper ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  <Crown className="w-4 h-4 text-amber-500 fill-amber-400" />
                  <span className="hidden sm:inline font-medium">Kelola Data</span>
                </button>

                {/* Dropdown User Menu for Admin */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-sky-100 p-3.5 z-50 text-left animate-in fade-in zoom-in-95 duration-150">
                    <div className="pb-2.5 mb-2 border-b border-slate-100">
                      <div className="font-bold text-xs text-slate-900">
                        Pusat Kendali Data
                      </div>
                      <div className="mt-1 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span>Akses Data Firestore Aktif</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setActiveTab('superadmin');
                      }}
                      className="w-full mb-1.5 flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold hover:from-amber-600 hover:to-orange-600 transition shadow-xs cursor-pointer"
                    >
                      <Crown className="w-3.5 h-3.5 fill-white" />
                      <span>Buka Panel Kelola Data</span>
                    </button>

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-bold transition cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Keluar Akun</span>
                    </button>
                  </div>
                )}
              </div>
            ) : isPlayer ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-300 text-blue-900 text-xs font-bold shadow-xs cursor-pointer hover:bg-blue-100 transition"
                  title="Akun Pemain (Tersambung ke Database Firebase)"
                >
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                    🎮
                  </div>
                  <span className="font-display font-bold max-w-[100px] truncate">
                    {cloudProfile?.displayName || playerUsername || 'Pemain'}
                  </span>
                  <Database className="w-3.5 h-3.5 text-blue-600" />
                </button>

                {/* Dropdown User Menu for Player */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-sky-100 p-3.5 z-50 text-left animate-in fade-in zoom-in-95 duration-150">
                    <div className="pb-2.5 mb-2 border-b border-slate-100">
                      <div className="font-bold text-xs text-slate-900">
                        Akun Pemain: {cloudProfile?.displayName || playerUsername || 'Pemain'}
                      </div>
                      <div className="mt-1 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span>Data sikat gigi tersimpan di Firestore</span>
                      </div>
                    </div>

                    <button
                      onClick={handleManualSync}
                      disabled={isSyncing}
                      className="w-full mb-1.5 flex items-center justify-between px-3 py-2 rounded-xl bg-sky-50 text-sky-800 text-xs font-bold hover:bg-sky-100 transition cursor-pointer disabled:opacity-50"
                    >
                      <div className="flex items-center gap-2">
                        <RefreshCw className={`w-3.5 h-3.5 text-sky-600 ${isSyncing ? 'animate-spin' : ''}`} />
                        <span>Sinkronkan ke Database</span>
                      </div>
                      <span className="text-[10px] text-sky-600 font-semibold">Tersimpan</span>
                    </button>

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-bold transition cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Keluar Akun</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => {
                  setAuthErrorMessage(null);
                  setIsEmailModalOpen(true);
                }}
                disabled={isLoggingIn}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-bold text-xs transition cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
              >
                <KeyRound className="w-3.5 h-3.5 text-white" />
                <span>Masuk Akun</span>
              </button>
            )}

            {/* Reminder Settings Trigger */}
            <button
              onClick={() => setIsReminderOpen(true)}
              className="p-2 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 transition cursor-pointer relative"
              title="Atur Jam Pengingat Sikat Gigi"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping"></span>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full"></span>
            </button>

            {/* PWA In-App Install Button */}
            <PWAInstallButton />
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <div className="max-w-5xl mx-auto px-4 pt-1 pb-2 flex items-center justify-center sm:justify-start gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => {
              if (isMandatoryEducationRequired) {
                setActiveTab('education');
              } else {
                setActiveTab('game');
              }
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl font-display font-bold text-xs md:text-sm whitespace-nowrap transition cursor-pointer relative ${
              activeTab === 'game'
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-slate-600 hover:bg-sky-100/60'
            }`}
          >
            {isMandatoryEducationRequired ? (
              <Lock className="w-4 h-4 text-amber-300" />
            ) : (
              <Gamepad2 className="w-4 h-4" />
            )}
            <span>Game 2 Menit</span>
            {isMandatoryEducationRequired && (
              <span className="px-1.5 py-0.2 bg-amber-400 text-amber-950 text-[9px] font-black rounded-md">
                Terkunci
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('streak')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl font-display font-bold text-xs md:text-sm whitespace-nowrap transition cursor-pointer ${
              activeTab === 'streak'
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-slate-600 hover:bg-sky-100/60'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Kalender Streak</span>
          </button>

          <button
            onClick={() => setActiveTab('rewards')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl font-display font-bold text-xs md:text-sm whitespace-nowrap transition cursor-pointer ${
              activeTab === 'rewards'
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-slate-600 hover:bg-sky-100/60'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Sikat & Lencana</span>
          </button>

          <button
            onClick={() => setActiveTab('education')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl font-display font-bold text-xs md:text-sm whitespace-nowrap transition cursor-pointer ${
              activeTab === 'education'
                ? 'bg-sky-500 text-white shadow-md'
                : isMandatoryEducationRequired
                ? 'bg-rose-100 text-rose-900 border border-rose-300 shadow-xs'
                : 'text-slate-600 hover:bg-sky-100/60'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Tips & Ujian Online</span>
            {isMandatoryEducationRequired && (
              <span className="px-1.5 py-0.2 bg-rose-600 text-white text-[9px] font-black rounded-md animate-pulse">
                WAJIB UJIAN
              </span>
            )}
          </button>

          {/* Super Admin Tab (Only for p17325124424@student.poltekkesbandung.ac.id) */}
          {isSuper && (
            <button
              onClick={() => setActiveTab('superadmin')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl font-display font-bold text-xs md:text-sm whitespace-nowrap transition cursor-pointer ${
                activeTab === 'superadmin'
                  ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-md'
                  : 'bg-amber-100/60 text-amber-900 hover:bg-amber-100'
              }`}
            >
              <Crown className="w-4 h-4 text-amber-400 fill-amber-300" />
              <span>Kelola Data (Super Admin)</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-5 md:py-6">
        
        {/* Game Lock Screen if Mandatory Education/Quiz not passed */}
        {activeTab === 'game' && isMandatoryEducationRequired ? (
          <div className="w-full max-w-xl mx-auto my-6 p-8 rounded-3xl bg-white border-2 border-sky-100 shadow-xl text-center space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-400 via-rose-500 to-indigo-600 text-white flex items-center justify-center text-4xl mx-auto shadow-lg animate-bounce">
              🔒
            </div>
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-black uppercase tracking-wider">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>Akses Pertama Kali • Wajib Ujian Online</span>
              </span>
              <h3 className="font-display font-black text-2xl text-slate-900">
                Game 2 Menit Masih Terkunci! 🚫🦷
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                Dokter gigi mewajibkanmu mempelajari tips teknik sikat gigi dan menyelesaikan <strong>Ujian Online</strong> terlebih dahulu. Setelah melakukan ujian online, Game 2 Menit dapat selalu diakses kapan saja, bahkan jika streak kembali menjadi 0 hari!
              </p>
            </div>

            <div className="bg-sky-50 p-4 rounded-2xl border border-sky-100 text-left text-xs space-y-2.5 text-slate-700">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Pelajari teknik gerakan memutar 45 derajat (30 detik per kuadran).</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Kenali 4 monster kuman gigi & cara menguji aplikasi secara offline (PWA).</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Jawab 4 soal Ujian Online & raih nilai minimal kelulusan 75%.</span>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('education')}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white font-display font-black text-sm shadow-xl flex items-center justify-center gap-2 transition cursor-pointer active:scale-95"
            >
              <FileText className="w-4 h-4" />
              <span>Buka Tips & Ikuti Ujian Online Sekarang 📖📝</span>
            </button>
          </div>
        ) : activeTab === 'game' ? (
          <BrushingGame
            stats={stats}
            selectedToothbrush={currentEquippedBrush}
            onUpdateStats={handleUpdateStats}
            onCheckBadges={handleCheckBadges}
            onOpenShop={() => setActiveTab('rewards')}
          />
        ) : null}

        {activeTab === 'streak' && (
          <StreakTracker
            stats={stats}
            onStartSession={() => {
              if (isMandatoryEducationRequired) {
                setActiveTab('education');
              } else {
                setActiveTab('game');
              }
            }}
          />
        )}

        {activeTab === 'rewards' && (
          <ShopAndBadges
            stats={stats}
            selectedToothbrushId={stats.selectedToothbrushId}
            onSelectToothbrush={(brush) => {
              const updatedStats = { ...stats, selectedToothbrushId: brush.id };
              handleUpdateStats(updatedStats);
            }}
            onUpdateStats={handleUpdateStats}
          />
        )}

        {activeTab === 'education' && (
          <EducationGuide 
            isMandatory={isMandatoryEducationRequired}
            reason={mandatoryReason}
            streakCount={stats.currentStreak}
            hasAlreadyPassedQuiz={stats.hasPassedQuiz}
            initialQuizScore={stats.quizScore}
            onNavigateToGame={() => setActiveTab('game')}
            onCompleteReading={handleCompleteEducation}
          />
        )}

        {activeTab === 'superadmin' && isSuper && (
          <SuperAdminPanel
            currentUserEmail={user?.email || SUPER_ADMIN_EMAIL}
            onClose={() => setActiveTab('game')}
          />
        )}
      </main>

      {/* LOGIN MODAL: Form Masuk Pemain Sederhana & Bersih */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border-4 border-sky-100 text-center relative overflow-hidden animate-in zoom-in-95 duration-200">
            <button
              onClick={() => {
                setIsEmailModalOpen(false);
                setAuthErrorMessage(null);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-sky-400 to-blue-600 text-white flex items-center justify-center text-2xl mx-auto shadow-md mb-3">
              🦷
            </div>

            <h3 className="font-display font-black text-xl text-slate-900">
              Masuk Akun GigiJuara
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Masuk untuk menyimpan riwayat sikat gigi, daily streak, dan bintang ke database.
            </p>

            {/* Error Message */}
            {authErrorMessage && (
              <div className="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs text-left flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{authErrorMessage}</span>
              </div>
            )}

            {/* Form Login Pemain */}
            <form onSubmit={handlePlayerLogin} className="mt-4 space-y-3.5 text-left">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Nama Pengguna
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={playerUsername}
                    onChange={(e) => setPlayerUsername(e.target.value)}
                    placeholder="Nama Pengguna"
                    required
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-400 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Kata Sandi
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={playerPassword}
                    onChange={(e) => setPlayerPassword(e.target.value)}
                    placeholder="Kata Sandi"
                    required
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-400 focus:bg-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-display font-bold text-xs shadow-md transition cursor-pointer active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Gamepad2 className="w-4 h-4" />
                <span>{isLoggingIn ? 'Memproses Masuk...' : 'Masuk & Simpan ke Database'}</span>
              </button>

              {/* Discreet Google sign in link for admin and google users */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={handleGmailLogin}
                  disabled={isLoggingIn}
                  className="text-[11px] text-slate-400 hover:text-slate-600 transition cursor-pointer inline-flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.27v3.14C3.26 21.36 7.33 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.59H1.27C.46 8.2 0 10.04 0 12s.46 3.8 1.27 5.41l4.01-3.14z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.27 6.59l4.01 3.14c.95-2.83 3.6-4.98 6.72-4.98z"/>
                  </svg>
                  <span>Atau masuk dengan Akun Google</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bottom Footer */}
      <footer className="mt-8 border-t border-sky-100 bg-white/70 backdrop-blur-xs py-4 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sky-800">GigiJuara PWA</span>
            <span>— Sahabat Senyum Sehat & Gigi Berkilau Anak Indonesia 🇮🇩</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>Offline-Ready (PWA)</span>
            <span>•</span>
            <span>Cloud Database Firestore</span>
            <span>•</span>
            <span>Rekomendasi 2 Menit PDGI</span>
          </div>
        </div>
      </footer>

      {/* Offline Reminder Modal */}
      <ReminderModal
        isOpen={isReminderOpen}
        onClose={() => setIsReminderOpen(false)}
        onSaved={() => {}}
      />

      {/* Offline State Toast Indicator */}
      <OfflineIndicator />
    </div>
  );
}
