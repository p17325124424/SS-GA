import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { sound } from '../utils/audio';
import { Storage, getTodayKey } from '../utils/storage';
import { Germ, QuadrantType, ToothbrushCharacter, UserStats } from '../types';
import { auth, saveUserStatsToCloud, saveRecordToCloud, getActiveStorageUserId } from '../firebase';
import { 
  Play, 
  RotateCcw, 
  Sparkles, 
  Trophy, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  ArrowRight,
  Sun, 
  Moon, 
  Clock, 
  Flame, 
  Award,
  Timer,
  Zap,
  Info
} from 'lucide-react';

interface BrushingGameProps {
  stats: UserStats;
  selectedToothbrush: ToothbrushCharacter;
  onUpdateStats: (newStats: UserStats) => void;
  onCheckBadges: () => void;
  onOpenShop: () => void;
}

const QUADRANTS: { id: QuadrantType; name: string; position: string; advice: string }[] = [
  { id: 'top-right', name: 'Atas Kanan', position: 'Kanan Atas', advice: 'Sikat bagian luar & dalam gigi geraham kanan atas dengan gerakan memutar melingkar selama 30 detik!' },
  { id: 'top-left', name: 'Atas Kiri', position: 'Kiri Atas', advice: 'Bagus! Bersihkan sela-sela gigi kiri atas sampai bersih selama 30 detik.' },
  { id: 'bottom-left', name: 'Bawah Kiri', position: 'Kiri Bawah', advice: 'Hebat! Sikat permukaan kunyah gigi bawah kiri yang sering ada sisa makanan selama 30 detik.' },
  { id: 'bottom-right', name: 'Bawah Kanan', position: 'Kanan Bawah', advice: 'Sedikit lagi! Gosok gigi bawah kanan dan sela dekat lidah selama 30 detik.' },
];

const SESSION_DURATION_SECONDS = 30; // Standar 30 detik persesi kuadran

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  alpha: number;
  color: string;
  vx: number;
  vy: number;
}

export const BrushingGame: React.FC<BrushingGameProps> = ({
  stats,
  selectedToothbrush,
  onUpdateStats,
  onCheckBadges,
  onOpenShop,
}) => {
  // Game mode: standard 120s (4 sesi x 30s) or quick practice (1 sesi x 30s)
  const [gameDuration, setGameDuration] = useState<number>(120); 
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(120);
  const [currentQuadrantIndex, setCurrentQuadrantIndex] = useState<number>(0);
  const [sessionTimeOfDay, setSessionTimeOfDay] = useState<'morning' | 'night'>('morning');
  const [soundMuted, setSoundMuted] = useState<boolean>(false);

  // Quadrant session countdown (30s)
  const [sessionTimeLeft, setSessionTimeLeft] = useState<number>(SESSION_DURATION_SECONDS);
  const [quadrantToast, setQuadrantToast] = useState<{ title: string; subtitle: string } | null>(null);

  // Score & clean percentage
  const [score, setScore] = useState<number>(0);
  const [germsDefeatedCount, setGermsDefeatedCount] = useState<number>(0);
  const [showCelebration, setShowCelebration] = useState<boolean>(false);
  const [celebrationDetails, setCelebrationDetails] = useState<{
    starsEarned: number;
    newStreak: number;
    unlockedBadge: string | null;
  } | null>(null);

  // Brush cursor position
  const [brushPos, setBrushPos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [isBrushing, setIsBrushing] = useState<boolean>(false);

  // Germs state
  const [germs, setGerms] = useState<Germ[]>([]);

  // Particles: bubbles & sparkles
  const [foamParticles, setFoamParticles] = useState<Particle[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const nextParticleId = useRef(1);
  const lastSoundTime = useRef(0);
  const lastHitTimes = useRef<Record<string, number>>({});

  // Determine current quadrant
  const currentQuadrant = QUADRANTS[currentQuadrantIndex] || QUADRANTS[0];

  // Initialize time of day suggestion based on local hour
  useEffect(() => {
    const currentHour = new Date().getHours();
    if (currentHour >= 5 && currentHour < 16) {
      setSessionTimeOfDay('morning');
    } else {
      setSessionTimeOfDay('night');
    }
  }, []);

  // Helper to spawn germs spread widely across the entire tooth arch of a specific quadrant
  const createGermsForQuadrant = useCallback((q: QuadrantType, count: number = 4, isReinforcement = false): Germ[] => {
    const germTypes: { type: Germ['type']; name: string; color: string }[] = [
      { type: 'sugar', name: 'Kuman Gula', color: '#f43f5e' },
      { type: 'plaque', name: 'Plak Kuning', color: '#eab308' },
      { type: 'acid', name: 'Asam Mulut', color: '#8b5cf6' },
      { type: 'monster', name: 'Monster Karang', color: '#06b6d4' },
    ];

    // Sebaran titik anatomis kuman sepanjang lengkung gigi agar TIDAK menumpuk di 1 area:
    // Tersebar dari geraham belakang, premolar, gigi taring, gigi seri depan, dan permukaan kunyah
    const QUADRANT_SLOTS: Record<QuadrantType, { x: number; y: number }[]> = {
      'top-left': [
        { x: 15, y: 25 }, // Geraham belakang kiri (outer molar)
        { x: 23, y: 17 }, // Geraham depan / premolar kiri
        { x: 32, y: 14 }, // Gigi taring kiri (canine)
        { x: 42, y: 13 }, // Gigi seri tengah kiri (incisor)
        { x: 27, y: 29 }, // Area kunyah dalam atas kiri
        { x: 18, y: 34 }, // Sela gigi belakang atas kiri
      ],
      'top-right': [
        { x: 58, y: 13 }, // Gigi seri tengah kanan (incisor)
        { x: 68, y: 14 }, // Gigi taring kanan (canine)
        { x: 77, y: 17 }, // Geraham depan / premolar kanan
        { x: 85, y: 25 }, // Geraham belakang kanan (outer molar)
        { x: 73, y: 29 }, // Area kunyah dalam atas kanan
        { x: 82, y: 34 }, // Sela gigi belakang atas kanan
      ],
      'bottom-left': [
        { x: 15, y: 75 }, // Geraham belakang bawah kiri
        { x: 23, y: 82 }, // Geraham depan / premolar bawah kiri
        { x: 32, y: 85 }, // Gigi taring bawah kiri
        { x: 42, y: 86 }, // Gigi seri tengah bawah kiri
        { x: 27, y: 70 }, // Area kunyah dalam bawah kiri
        { x: 18, y: 64 }, // Sela gigi belakang bawah kiri
      ],
      'bottom-right': [
        { x: 58, y: 86 }, // Gigi seri tengah bawah kanan
        { x: 68, y: 85 }, // Gigi taring bawah kanan
        { x: 77, y: 82 }, // Geraham depan / premolar bawah kanan
        { x: 85, y: 75 }, // Geraham belakang bawah kanan
        { x: 73, y: 70 }, // Area kunyah dalam bawah kanan
        { x: 82, y: 64 }, // Sela gigi belakang bawah kanan
      ],
    };

    const slots = QUADRANT_SLOTS[q] || QUADRANT_SLOTS['top-left'];
    const generated: Germ[] = [];
    const timestamp = Date.now();

    for (let i = 0; i < count; i++) {
      // Pastikan kuman menyebar ke slot berbeda, dengan variasi acak kecil (±2%)
      const slotIndex = isReinforcement 
        ? Math.floor(Math.random() * slots.length)
        : i % slots.length;
      const basePos = slots[slotIndex];
      const jitterX = (Math.random() - 0.5) * 4;
      const jitterY = (Math.random() - 0.5) * 4;
      const x = Math.max(10, Math.min(90, basePos.x + jitterX));
      const y = Math.max(10, Math.min(90, basePos.y + jitterY));

      const t = germTypes[(i + Math.floor(Math.random() * 4)) % germTypes.length];
      generated.push({
        id: `germ-${q}-${timestamp}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        x,
        y,
        size: 34 + Math.random() * 10,
        type: t.type,
        name: t.name,
        color: t.color,
        health: 100,
        maxHealth: 100,
        quadrant: q,
        defeated: false,
        scale: isReinforcement ? 0.4 : 1,
        rotation: (Math.random() - 0.5) * 25,
        isNew: isReinforcement,
      });
    }

    return generated;
  }, []);

  // Spawn initial germs ONLY for the active first quadrant!
  const generateInitialGerms = useCallback(() => {
    setGerms(createGermsForQuadrant(QUADRANTS[0].id, 4, false));
  }, [createGermsForQuadrant]);

  // Spawn germs immediately on load before session starts!
  useEffect(() => {
    if (germs.length === 0) {
      setGerms(createGermsForQuadrant(QUADRANTS[0].id, 4, false));
    }
  }, [createGermsForQuadrant, germs.length]);

  // Reset or start game
  const startGame = (duration: number = gameDuration) => {
    setGameDuration(duration);
    setTimeLeft(duration);
    setCurrentQuadrantIndex(0);
    setSessionTimeLeft(SESSION_DURATION_SECONDS);
    setScore(0);
    setGermsDefeatedCount(0);
    setShowCelebration(false);
    setCelebrationDetails(null);
    setFoamParticles([]);
    lastHitTimes.current = {};
    // Pastikan kuman sesi pertama aktif dan siap disikat
    setGerms(createGermsForQuadrant(QUADRANTS[0].id, 4, false));
    setIsPlaying(true);
    setIsPaused(false);
    sound.playQuadrantBell();

    setQuadrantToast({
      title: `Sesi 1: Gigi ${QUADRANTS[0].position}`,
      subtitle: `Kuman muncul selama 30 detik! Sikat secara memutar perlahan.`,
    });
    setTimeout(() => setQuadrantToast(null), 3000);
  };

  const stopGame = () => {
    setIsPlaying(false);
    setIsPaused(false);
    setTimeLeft(gameDuration);
    setSessionTimeLeft(SESSION_DURATION_SECONDS);
    setFoamParticles([]);
    setQuadrantToast(null);
    // Kuman kembali muncul di gigi sebelum sesi dimulai kembali
    setGerms(createGermsForQuadrant(QUADRANTS[0].id, 4, false));
  };

  // Timer countdown, 30s session management, quadrant progression, and continuous 30s germ appearance
  useEffect(() => {
    if (!isPlaying || isPaused) return;

    const timer = setInterval(() => {
      // 1. Clean up fading defeated germs
      setGerms((prev) => 
        prev.filter((g) => !g.isFading || (g.defeatedAt && Date.now() - g.defeatedAt < 750))
      );

      // 2. Manage 30-second session time & game total time
      setTimeLeft((prevTotal) => {
        if (prevTotal <= 1) {
          clearInterval(timer);
          handleGameFinish();
          return 0;
        }

        const nextTotal = prevTotal - 1;
        const elapsed = gameDuration - nextTotal;

        // Calculate quadrant based on 30s session duration
        const maxQuadrants = gameDuration === 120 ? 4 : 1;
        const newQuadrantIdx = Math.min(maxQuadrants - 1, Math.floor(elapsed / SESSION_DURATION_SECONDS));
        const newSessionRemaining = Math.max(0, SESSION_DURATION_SECONDS - (elapsed % SESSION_DURATION_SECONDS));

        setSessionTimeLeft(newSessionRemaining === 0 ? SESSION_DURATION_SECONDS : newSessionRemaining);

        // KETIKA PINDAH SESI: Hapus semua kuman di sesi lama!
        if (newQuadrantIdx !== currentQuadrantIndex && newQuadrantIdx < maxQuadrants) {
          const prevQuad = QUADRANTS[currentQuadrantIndex];
          const nextQuad = QUADRANTS[newQuadrantIdx];
          setCurrentQuadrantIndex(newQuadrantIdx);
          sound.playQuadrantBell();

          // Tampilkan notifikasi transisi sesi ceria
          setQuadrantToast({
            title: `✨ Sesi ${prevQuad.position} Bersih! Pindah ke Sesi ${newQuadrantIdx + 1}/4: ${nextQuad.position}`,
            subtitle: `Kuman sesi sebelumnya telah disapu bersih! Ayo basmi kuman di area baru!`,
          });
          setTimeout(() => setQuadrantToast(null), 3500);

          // PENTING: Semua kuman lama hilang! Ganti dengan kuman baru khusus sesi kuadran berikutnya
          setGerms(createGermsForQuadrant(nextQuad.id, 4, false));
          lastHitTimes.current = {};
          return nextTotal;
        }

        // 3. CONTINUOUS GERMS OVER 30 SECONDS (HANYA UNTUK KUADRAN AKTIF):
        // Pastikan kuman selalu ada selama 30 detik untuk kuadran yang sedang disikat
        setGerms((prev) => {
          const activeQuad = QUADRANTS[newQuadrantIdx]?.id;
          if (!activeQuad) return [];

          // Pastikan hanya kuman kuadran aktif saat ini yang diproses
          const currentQuadrantOnly = prev.filter((g) => g.quadrant === activeQuad);
          const activeCount = currentQuadrantOnly.filter((g) => !g.defeated).length;

          // Jika kuman tinggal sedikit dan masih ada sisa waktu di sesi 30s ini:
          if (activeCount <= 1 && newSessionRemaining > 4) {
            sound.playBubblePop();
            const reinforcement = createGermsForQuadrant(activeQuad, 3, true);
            return [...currentQuadrantOnly, ...reinforcement];
          }

          // Gelombang kuman mengintip di pertengahan sesi
          if ((newSessionRemaining === 18 || newSessionRemaining === 9) && activeCount < 3) {
            const reinforcement = createGermsForQuadrant(activeQuad, 2, true);
            return [...currentQuadrantOnly, ...reinforcement];
          }

          return currentQuadrantOnly;
        });

        return nextTotal;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying, isPaused, gameDuration, currentQuadrantIndex, createGermsForQuadrant]);

  // Finish game logic: calculate streaks, stars, record daily log, unlock rewards
  const handleGameFinish = () => {
    sound.playFanfare();
    confetti({
      particleCount: 130,
      spread: 90,
      origin: { y: 0.6 },
    });

    const today = getTodayKey();
    const currentStats = Storage.getStats();
    const records = Storage.getRecords();
    const existingToday = records[today] || {
      date: today,
      morning: false,
      night: false,
      durationSeconds: 0,
      starsEarned: 0,
    };

    // Calculate stars (base 30 + bonus for defeated germs)
    const earnedStars = Math.min(60, 30 + Math.floor(germsDefeatedCount * 2));
    const newTotalStars = (currentStats.totalStars || 0) + earnedStars;

    // Update today record
    const updatedToday = { ...existingToday };
    const nowTimeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    if (sessionTimeOfDay === 'morning') {
      updatedToday.morning = true;
      updatedToday.morningTime = nowTimeStr;
    } else {
      updatedToday.night = true;
      updatedToday.nightTime = nowTimeStr;
    }
    updatedToday.durationSeconds += gameDuration;
    updatedToday.starsEarned += earnedStars;
    Storage.saveRecord(updatedToday);

    // Calculate streak
    let newStreak = currentStats.currentStreak;
    if (currentStats.lastBrushedDate !== today) {
      newStreak += 1;
    }
    const newBestStreak = Math.max(currentStats.bestStreak, newStreak);

    // Save stats
    const updatedStats: UserStats = {
      ...currentStats,
      currentStreak: newStreak,
      bestStreak: newBestStreak,
      totalStars: newTotalStars,
      totalSessions: currentStats.totalSessions + 1,
      lastBrushedDate: today,
      todayRecords: {
        morning: updatedToday.morning,
        night: updatedToday.night,
      },
    };

    Storage.saveStats(updatedStats);
    onUpdateStats(updatedStats);

    // Sync data to active player account (ssga01 / authenticated user) in Firestore database
    const targetUid = getActiveStorageUserId();
    if (targetUid) {
      saveUserStatsToCloud(targetUid, updatedStats).catch((err) =>
        console.warn('Sync stats to cloud warning:', err)
      );
      saveRecordToCloud(targetUid, updatedToday).catch((err) =>
        console.warn('Sync record to cloud warning:', err)
      );
    }

    // Check unlocks for toothbrushes & badges
    const allBrushes = Storage.getToothbrushes();
    let unlockedItemName: string | null = null;
    const updatedBrushes = allBrushes.map((b) => {
      if (!b.unlocked && newStreak >= b.requiredStreak) {
        unlockedItemName = `Sikat Gigi ${b.name}`;
        return { ...b, unlocked: true };
      }
      return b;
    });
    Storage.saveToothbrushes(updatedBrushes);

    const allBadges = Storage.getBadges();
    const updatedBadges = allBadges.map((badge) => {
      let shouldUnlock = false;
      if (badge.id === 'badge-first-brush') shouldUnlock = true;
      if (badge.id === 'badge-streak-3' && newStreak >= 3) shouldUnlock = true;
      if (badge.id === 'badge-streak-7' && newStreak >= 7) shouldUnlock = true;
      if (badge.id === 'badge-streak-14' && newStreak >= 14) shouldUnlock = true;
      if (badge.id === 'badge-streak-30' && newStreak >= 30) shouldUnlock = true;
      if (badge.id === 'badge-morning-night' && updatedToday.morning && updatedToday.night) shouldUnlock = true;

      if (!badge.unlocked && shouldUnlock) {
        if (!unlockedItemName) unlockedItemName = `Lencana ${badge.title}`;
        return { ...badge, unlocked: true, unlockedAt: today };
      }
      return badge;
    });
    Storage.saveBadges(updatedBadges);
    onCheckBadges();

    setCelebrationDetails({
      starsEarned: earnedStars,
      newStreak,
      unlockedBadge: unlockedItemName,
    });
    setShowCelebration(true);
    setIsPlaying(false);
  };

  // Foam particles animation frame cleanup
  useEffect(() => {
    if (foamParticles.length === 0) return;

    const interval = setInterval(() => {
      setFoamParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            alpha: p.alpha - 0.04,
            size: p.size * 0.96,
          }))
          .filter((p) => p.alpha > 0.05)
      );
    }, 40);

    return () => clearInterval(interval);
  }, [foamParticles]);

  // Handle pointer / touch movement for brushing
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const clampedX = Math.max(5, Math.min(95, x));
    const clampedY = Math.max(5, Math.min(95, y));
    setBrushPos({ x: clampedX, y: clampedY });

    if (!isPlaying || isPaused) return;

    setIsBrushing(true);

    // Audio rate limit for brushing noise
    const now = Date.now();
    if (now - lastSoundTime.current > 120) {
      sound.playBrush();
      lastSoundTime.current = now;
      if (navigator.vibrate) {
        navigator.vibrate(15);
      }
    }

    // Spawn foam bubble particles
    if (Math.random() > 0.3) {
      const bubbleColors = ['#ffffff', '#e0f2fe', '#bae6fd', '#7dd3fc'];
      setFoamParticles((prev) => [
        ...prev.slice(-35),
        {
          id: nextParticleId.current++,
          x: clampedX + (Math.random() - 0.5) * 8,
          y: clampedY + (Math.random() - 0.5) * 8,
          size: 10 + Math.random() * 16,
          alpha: 0.9,
          color: bubbleColors[Math.floor(Math.random() * bubbleColors.length)],
          vx: (Math.random() - 0.5) * 0.4,
          vy: -0.3 - Math.random() * 0.5,
        },
      ]);
    }

    // Hit test against active quadrant germs
    // Germ durability is calibrated so germs persist throughout the ~30s session:
    // Requires circular, continuous brushing motions rather than disappearing in 0.5 seconds.
    setGerms((prevGerms) => {
      let anyHit = false;
      const updated = prevGerms.map((germ) => {
        if (germ.defeated) return germ;

        // Distance check
        const dx = germ.x - clampedX;
        const dy = germ.y - clampedY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Brush hit radius (12% of container)
        if (dist < 12) {
          anyHit = true;

          // Rate-limit damage per germ to ~75ms so it doesn't instantly die on rapid pointer events
          const lastHit = lastHitTimes.current[germ.id] || 0;
          if (now - lastHit < 75) {
            return germ;
          }
          lastHitTimes.current[germ.id] = now;

          // Gentle health decrement (~4.5 per tick, requiring ~22 deliberate circular brush strokes)
          const newHealth = Math.max(0, germ.health - 4.5);
          if (newHealth === 0 && germ.health > 0) {
            // Defeated!
            sound.playGermDefeated();
            setScore((s) => s + 30);
            setGermsDefeatedCount((c) => c + 1);
            return {
              ...germ,
              health: 0,
              defeated: true,
              isFading: true,
              defeatedAt: now,
              scale: 1.4,
            };
          }

          return {
            ...germ,
            health: newHealth,
            scale: 0.85 + Math.random() * 0.25,
            rotation: (Math.random() - 0.5) * 35,
          };
        }
        return germ;
      });

      if (anyHit && Math.random() > 0.6) {
        sound.playBubblePop();
      }

      return updated;
    });
  };

  const handlePointerLeave = () => {
    setIsBrushing(false);
  };

  // Remaining germs in current quadrant
  const currentQuadrantGerms = germs.filter((g) => g.quadrant === currentQuadrant.id);
  const currentQuadrantDefeated = currentQuadrantGerms.filter((g) => g.defeated).length;
  const currentQuadrantProgress = currentQuadrantGerms.length > 0 
    ? Math.round((currentQuadrantDefeated / currentQuadrantGerms.length) * 100) 
    : 100;

  // Total clean percentage across the 4 quadrant sessions:
  const maxSessions = gameDuration === 120 ? 4 : 1;
  const completedSessionsWeight = (currentQuadrantIndex / maxSessions) * 100;
  const currentSessionWeight = (currentQuadrantProgress / maxSessions);
  const overallCleanPercent = Math.min(100, Math.round(completedSessionsWeight + currentSessionWeight));

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleSound = () => {
    const newState = !soundMuted;
    setSoundMuted(newState);
    sound.enabled = !newState;
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
      {/* Top Banner / Session Mode & Sound Switcher */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 mb-3 bg-white/80 backdrop-blur-xs rounded-2xl border border-sky-100 shadow-xs">
        {/* Time of day picker */}
        <div className="flex items-center gap-1.5 p-1 bg-sky-50 rounded-xl">
          <button
            onClick={() => setSessionTimeOfDay('morning')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              sessionTimeOfDay === 'morning'
                ? 'bg-amber-400 text-amber-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sun className="w-4 h-4 text-amber-600" />
            <span>Sikat Pagi</span>
            {stats.todayRecords?.morning && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
          </button>
          <button
            onClick={() => setSessionTimeOfDay('night')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              sessionTimeOfDay === 'night'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Moon className="w-4 h-4 text-indigo-200" />
            <span>Sikat Malam</span>
            {stats.todayRecords?.night && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
          </button>
        </div>

        {/* Current Active Brush Character Pill */}
        <button
          onClick={onOpenShop}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-900 text-xs font-bold transition cursor-pointer"
          title="Ganti karakter sikat gigi"
        >
          <span className="text-base">{selectedToothbrush.icon}</span>
          <span className="truncate max-w-[120px]">{selectedToothbrush.name}</span>
          <span className="text-[10px] text-sky-600 bg-white/70 px-1.5 py-0.5 rounded-md font-semibold">Ganti</span>
        </button>

        {/* Audio Mute & Duration Switcher */}
        <div className="flex items-center gap-2">
          {!isPlaying && (
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-bold">
              <button
                onClick={() => setGameDuration(120)}
                className={`px-2.5 py-1 rounded-lg transition ${
                  gameDuration === 120 ? 'bg-sky-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="4 Sesi x 30 Detik = 2 Menit Ideal Standar Dokter Gigi"
              >
                4 Sesi x 30s (2m) ⭐
              </button>
              <button
                onClick={() => setGameDuration(30)}
                className={`px-2.5 py-1 rounded-lg transition ${
                  gameDuration === 30 ? 'bg-sky-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Mode Kilat 1 Sesi Penuh 30 Detik"
              >
                1 Sesi Kilat (30s)
              </button>
            </div>
          )}

          <button
            onClick={toggleSound}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            title={soundMuted ? 'Nyalakan Suara' : 'Bisukan Suara'}
          >
            {soundMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-sky-600" />}
          </button>
        </div>
      </div>

      {/* Main Interactive Game Canvas Container */}
      <div className="relative w-full bg-gradient-to-b from-sky-400 via-sky-300 to-sky-100 rounded-3xl p-4 md:p-6 shadow-xl border-4 border-white overflow-hidden select-none">
        
        {/* Game Info HUD Header with 30s Session Countdown */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3 bg-white/95 backdrop-blur-xs px-4 py-2.5 rounded-2xl shadow-sm border border-sky-100">
          {/* Total Game Timer */}
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl text-white font-bold flex items-center justify-center ${timeLeft < 15 ? 'bg-rose-500 animate-pulse' : 'bg-sky-600'}`}>
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Waktu Total</div>
              <div className="font-display font-black text-lg md:text-xl text-slate-800 leading-tight">
                {formatTime(timeLeft)}
              </div>
            </div>
          </div>

          {/* DEDICATED 30s QUADRANT SESSION TIMER */}
          <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl shadow-xs">
            <div className={`p-1.5 rounded-lg text-amber-900 ${sessionTimeLeft <= 5 ? 'bg-rose-400 text-white animate-bounce' : 'bg-amber-300'}`}>
              <Timer className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] uppercase font-extrabold text-amber-800 tracking-wider">
                  Sesi {currentQuadrant.name}
                </span>
                <span className="px-1.5 py-0.2 bg-amber-200/80 text-amber-900 rounded text-[9px] font-bold">
                  30 Detik/Sesi
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="font-display font-black text-base md:text-lg text-amber-950 leading-tight">
                  {sessionTimeLeft}s
                </div>
                {/* 30-Second Progress Bar */}
                <div className="w-16 sm:w-20 h-2 bg-amber-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-300"
                    style={{ width: `${(sessionTimeLeft / SESSION_DURATION_SECONDS) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Clean Percentage & Stars */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Kebersihan</div>
              <div className="font-display font-black text-lg md:text-xl text-emerald-600 leading-tight">
                {overallCleanPercent}%
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-500 font-bold text-lg shadow-xs">
              ⭐
            </div>
          </div>
        </div>

        {/* Quadrant Progress Bar (4 Segments x 30 Detik) */}
        <div className="w-full grid grid-cols-4 gap-1.5 mb-3">
          {QUADRANTS.map((quad, idx) => {
            const isCompleted = idx < currentQuadrantIndex;
            const isCurrent = idx === currentQuadrantIndex;
            return (
              <div
                key={quad.id}
                className={`relative py-1.5 px-2 rounded-xl text-center transition-all ${
                  isCurrent
                    ? 'bg-amber-400 text-amber-950 font-bold shadow-md scale-102 ring-2 ring-white'
                    : isCompleted
                    ? 'bg-emerald-500 text-white font-semibold'
                    : 'bg-white/60 text-slate-500'
                }`}
              >
                <div className="text-[10px] leading-tight truncate">{quad.position}</div>
                {isCompleted && <span className="text-[9px] block">✓ Bersih (30s)</span>}
                {isCurrent && (
                  <span className="text-[9px] block font-extrabold animate-pulse">
                    Sikat Sini ({sessionTimeLeft}s)
                  </span>
                )}
                {!isCompleted && !isCurrent && <span className="text-[9px] block opacity-70">30s</span>}
              </div>
            );
          })}
        </div>

        {/* Interactive Mouth & Teeth Arena */}
        <div
          ref={containerRef}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          className="relative w-full aspect-[4/3] max-h-[460px] bg-gradient-to-b from-rose-200 via-rose-100 to-rose-300 rounded-3xl border-4 border-rose-400/80 shadow-inner overflow-hidden cursor-none touch-none mx-auto"
        >
          {/* Friendly Mouth Cavity Illustration */}
          <div className="absolute inset-4 rounded-full bg-rose-950/70 shadow-2xl flex items-center justify-center overflow-hidden">
            {/* Tongue */}
            <div className="absolute -bottom-16 w-3/4 h-1/2 bg-rose-500/90 rounded-t-full shadow-inner border-t-4 border-rose-400">
              <div className="w-1 h-14 bg-rose-600/60 mx-auto rounded-full mt-2"></div>
            </div>
          </div>

          {/* Quadrant Division Overlay Guide */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/20 -translate-x-1/2"></div>
            <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-white/20 -translate-y-1/2"></div>
          </div>

          {/* Active Quadrant Highlight Glow */}
          <div
            className={`absolute pointer-events-none transition-all duration-300 ${
              currentQuadrant.id === 'top-left'
                ? 'top-0 left-0 w-1/2 h-1/2 bg-amber-400/20 border-r-2 border-b-2 border-amber-300'
                : currentQuadrant.id === 'top-right'
                ? 'top-0 right-0 w-1/2 h-1/2 bg-amber-400/20 border-l-2 border-b-2 border-amber-300'
                : currentQuadrant.id === 'bottom-left'
                ? 'bottom-0 left-0 w-1/2 h-1/2 bg-amber-400/20 border-r-2 border-t-2 border-amber-300'
                : 'bottom-0 right-0 w-1/2 h-1/2 bg-amber-400/20 border-l-2 border-t-2 border-amber-300'
            }`}
          >
            <div className="absolute m-2 px-2.5 py-1 rounded-lg bg-amber-400 text-amber-950 text-[10px] font-extrabold shadow-sm uppercase tracking-wider animate-bounce flex items-center gap-1">
              <span>🌟 Sikat Kuadran Ini</span>
              <span className="bg-amber-900 text-amber-100 px-1 rounded text-[9px]">{sessionTimeLeft}s</span>
            </div>
          </div>

          {/* Upper Teeth Arc (Gigi Atas) */}
          <div className="absolute top-5 left-1/2 -translate-x-1/2 w-[85%] flex justify-between items-start pointer-events-none z-10 px-2">
            {[...Array(12)].map((_, i) => {
              const isLeft = i < 6;
              const belongsToActive =
                (isLeft && currentQuadrant.id === 'top-left') ||
                (!isLeft && currentQuadrant.id === 'top-right');
              const toothQuadrantId: QuadrantType = isLeft ? 'top-left' : 'top-right';
              const toothQuadrantIdx = QUADRANTS.findIndex((q) => q.id === toothQuadrantId);
              const isCompleted = toothQuadrantIdx < currentQuadrantIndex;

              return (
                <div
                  key={`upper-tooth-${i}`}
                  className={`w-6 sm:w-8 md:w-9 h-10 sm:h-12 md:h-14 bg-gradient-to-b from-white via-slate-50 to-sky-100 rounded-b-2xl border-2 shadow-md flex flex-col items-center justify-end pb-1 transition-all ${
                    belongsToActive 
                      ? 'border-amber-400 ring-2 ring-amber-400 shadow-amber-300/60' 
                      : isCompleted
                      ? 'border-emerald-400 bg-gradient-to-b from-white to-emerald-50 ring-1 ring-emerald-300'
                      : 'border-slate-300'
                  }`}
                  style={{
                    transform: `translateY(${Math.sin((i / 11) * Math.PI) * 14}px) rotate(${
                      (i - 5.5) * 4
                    }deg)`,
                  }}
                >
                  <div className="w-2.5 h-1 bg-sky-200/50 rounded-full mb-1"></div>
                  {isCompleted && (
                    <span className="text-[10px] text-amber-400 animate-sparkle">✨</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Lower Teeth Arc (Gigi Bawah) */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-[85%] flex justify-between items-end pointer-events-none z-10 px-2">
            {[...Array(12)].map((_, i) => {
              const isLeft = i < 6;
              const belongsToActive =
                (isLeft && currentQuadrant.id === 'bottom-left') ||
                (!isLeft && currentQuadrant.id === 'bottom-right');
              const toothQuadrantId: QuadrantType = isLeft ? 'bottom-left' : 'bottom-right';
              const toothQuadrantIdx = QUADRANTS.findIndex((q) => q.id === toothQuadrantId);
              const isCompleted = toothQuadrantIdx < currentQuadrantIndex;

              return (
                <div
                  key={`lower-tooth-${i}`}
                  className={`w-6 sm:w-8 md:w-9 h-10 sm:h-12 md:h-14 bg-gradient-to-t from-white via-slate-50 to-sky-100 rounded-t-2xl border-2 shadow-md flex flex-col items-center justify-start pt-1 transition-all ${
                    belongsToActive 
                      ? 'border-amber-400 ring-2 ring-amber-400 shadow-amber-300/60' 
                      : isCompleted
                      ? 'border-emerald-400 bg-gradient-to-t from-white to-emerald-50 ring-1 ring-emerald-300'
                      : 'border-slate-300'
                  }`}
                  style={{
                    transform: `translateY(-${Math.sin((i / 11) * Math.PI) * 14}px) rotate(${
                      -(i - 5.5) * 4
                    }deg)`,
                  }}
                >
                  <div className="w-2.5 h-1 bg-sky-200/50 rounded-full mt-1"></div>
                  {isCompleted && (
                    <span className="text-[10px] text-amber-400 animate-sparkle">✨</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Germ Monsters On Teeth: HANYA untuk sesi kuadran aktif! Kuman sesi lama hilang saat pindah sesi */}
          {germs.map((germ) => {
            if (germ.defeated && !germ.isFading) return null;
            // Jangan pernah tampilkan kuman selain dari kuadran sesi aktif saat ini
            if (germ.quadrant !== currentQuadrant.id) return null;

            // Animasi kuman meredup saat waktu kuadran akan habis (<= 8 detik tersisa di sesi aktif)
            const isDimming = isPlaying && sessionTimeLeft <= 8 && !germ.defeated;
            const dimOpacity = isDimming ? Math.max(0.25, sessionTimeLeft / 8) : 1;

            return (
              <div
                key={germ.id}
                className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-150 z-20 pointer-events-none ${
                  germ.isFading
                    ? 'scale-125 opacity-90'
                    : isDimming
                    ? 'animate-pulse'
                    : 'opacity-100 scale-100'
                }`}
                style={{
                  left: `${germ.x}%`,
                  top: `${germ.y}%`,
                  opacity: germ.isFading ? 0.9 : dimOpacity,
                  filter: isDimming 
                    ? `brightness(${0.55 + dimOpacity * 0.45}) grayscale(${Math.round((1 - dimOpacity) * 60)}%)` 
                    : 'none',
                  transform: `translate(-50%, -50%) scale(${germ.isFading ? 1.3 : isDimming ? germ.scale * (0.85 + dimOpacity * 0.15) : germ.scale}) rotate(${germ.rotation}deg)`,
                }}
              >
                {germ.isFading ? (
                  // Rewarding Cleaned Bubble Pop Animation
                  <div className="flex flex-col items-center animate-bounce">
                    <span className="text-2xl drop-shadow-md">✨</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white font-black text-[10px] shadow-lg whitespace-nowrap">
                      Bersih! +30
                    </span>
                  </div>
                ) : (
                  <>
                    {/* Health Bar with animated fill */}
                    <div className="w-10 h-2 bg-black/60 rounded-full mb-1 p-0.5 overflow-hidden backdrop-blur-xs border border-white/40 shadow-xs">
                      <div
                        className={`h-full rounded-full transition-all duration-75 ${
                          germ.health > 50
                            ? 'bg-emerald-400'
                            : germ.health > 25
                            ? 'bg-amber-400'
                            : 'bg-rose-500 animate-pulse'
                        }`}
                        style={{ width: `${germ.health}%` }}
                      />
                    </div>

                    {/* Germ Avatar Character with Dynamic Reaction & Dimming state */}
                    <div
                      className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center text-xl shadow-lg border-2 border-white select-none relative transition-transform ${
                        isDimming ? 'animate-bounce' : 'animate-float'
                      }`}
                      style={{
                        backgroundColor: germ.color,
                        boxShadow: isDimming 
                          ? `0 2px 8px ${germ.color}40` 
                          : `0 4px 14px ${germ.color}90`,
                      }}
                    >
                      {/* Meredup Badge when quadrant session is ending */}
                      {isDimming && (
                        <span className="absolute -top-3.5 bg-rose-600/90 text-white text-[8px] font-black px-1.5 py-0.2 rounded-full animate-pulse whitespace-nowrap shadow-xs border border-white/40">
                          ⏳ Meredup ({sessionTimeLeft}s)
                        </span>
                      )}

                      {/* Interactive expression based on health & brush damage & dimming */}
                      {isDimming ? (
                        <span className="text-base select-none">😵‍💫</span>
                      ) : germ.health < 40 ? (
                        <span className="text-base select-none">😵</span>
                      ) : germ.health < 75 ? (
                        <span className="text-base select-none">😰</span>
                      ) : (
                        <span className="select-none">
                          {germ.type === 'sugar' && '🍬'}
                          {germ.type === 'plaque' && '👾'}
                          {germ.type === 'acid' && '🧪'}
                          {germ.type === 'monster' && '👹'}
                        </span>
                      )}

                      {/* Foamy bubble on germ when taking hits */}
                      {germ.health < 100 && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-white/95 rounded-full border border-sky-300 opacity-90 shadow-xs animate-ping" />
                      )}

                      {/* "Baru!" badge if reinforcement germ */}
                      {germ.isNew && germ.health === 100 && !isDimming && (
                        <span className="absolute -bottom-1.5 bg-amber-400 text-amber-950 text-[8px] font-black px-1 rounded-sm shadow-xs uppercase tracking-tighter">
                          Baru!
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {/* Soapy Foam Bubble Particles */}
          {foamParticles.map((p) => (
            <div
              key={p.id}
              className="absolute rounded-full pointer-events-none z-30 transition-transform"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                backgroundColor: p.color,
                opacity: p.alpha,
                boxShadow: 'inset -2px -2px 4px rgba(0,0,0,0.1), 0 2px 6px rgba(255,255,255,0.8)',
                transform: 'translate(-50%, -50%)',
              }}
            />
          ))}

          {/* Toothbrush Avatar Cursor */}
          <div
            className="absolute pointer-events-none z-40 transition-transform duration-75"
            style={{
              left: `${brushPos.x}%`,
              top: `${brushPos.y}%`,
              transform: `translate(-20%, -30%) rotate(${isBrushing ? '-25deg' : '-10deg'}) scale(1.1)`,
            }}
          >
            {/* Toothbrush Head & Bristles */}
            <div className="relative flex items-center">
              {/* Bristles with soap foam */}
              <div
                className="w-10 h-6 rounded-t-lg border-2 border-white flex items-center justify-center shadow-lg relative overflow-hidden"
                style={{ backgroundColor: selectedToothbrush.bristleColor }}
              >
                <div className="flex gap-0.5">
                  <div className="w-1.5 h-4 bg-white/70 rounded-full"></div>
                  <div className="w-1.5 h-4 bg-white/70 rounded-full"></div>
                  <div className="w-1.5 h-4 bg-white/70 rounded-full"></div>
                </div>
                {/* Bubble soap on bristles */}
                <div className="absolute -top-1 w-4 h-4 bg-white rounded-full opacity-80 animate-ping"></div>
              </div>

              {/* Toothbrush Handle */}
              <div
                className="w-20 h-5 rounded-r-full border-2 border-white shadow-md flex items-center justify-between px-2 text-xs font-bold text-white"
                style={{ backgroundColor: selectedToothbrush.brushColor }}
              >
                <span className="text-sm">{selectedToothbrush.icon}</span>
                <span className="text-[9px] uppercase tracking-tighter opacity-80">JUARA</span>
              </div>
            </div>
          </div>

          {/* Floating Quadrant Transition Toast Banner */}
          {quadrantToast && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-amber-400 text-amber-950 px-4 py-2 rounded-2xl shadow-xl border-2 border-white font-display text-center animate-in slide-in-from-top duration-300 pointer-events-none">
              <div className="font-black text-sm flex items-center justify-center gap-1.5">
                <span>⏰</span>
                <span>{quadrantToast.title}</span>
              </div>
              <div className="text-[11px] font-semibold text-amber-900 mt-0.5">
                {quadrantToast.subtitle}
              </div>
            </div>
          )}

          {/* Overlay when game is NOT running: Kuman terlihat jelas di gigi sebelum sesi dimulai */}
          {!isPlaying && !showCelebration && (
            <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 sm:p-6 text-center z-50 animate-in fade-in">
              <div className="bg-slate-900/85 backdrop-blur-md p-5 sm:p-6 rounded-3xl border-2 border-white/40 shadow-2xl max-w-md flex flex-col items-center text-center">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center text-2xl shadow-lg border-2 border-white animate-bounce">
                    👾
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-sky-400 text-white flex items-center justify-center text-2xl shadow-lg border-2 border-white">
                    🦷
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/90 text-white rounded-full text-[11px] font-extrabold uppercase tracking-wider shadow-sm mb-2">
                  <span>⚠️ Kuman Terdeteksi di Gigi!</span>
                </div>

                <h2 className="font-display font-extrabold text-xl md:text-2xl text-white drop-shadow-md">
                  Ayo Bersihkan Kuman Sekarang!
                </h2>
                <p className="mt-1 text-xs text-sky-100 max-w-sm">
                  Lihat kuman yang menempel di gigimu! Kuman bertahan selama sesi 30 detik dan hanya hilang setelah sesi selesai disikat.
                </p>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    onClick={() => startGame(120)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-display font-bold text-sm shadow-xl hover:from-emerald-600 hover:to-green-700 active:scale-95 transition cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Mulai (4 Sesi x 30s)</span>
                  </button>

                  <button
                    onClick={() => startGame(30)}
                    className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white/95 hover:bg-white text-slate-800 font-display font-bold text-xs shadow-md transition cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Latihan 1 Sesi (30s)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Pause Overlay */}
          {isPaused && (
            <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-50">
              <h3 className="font-display font-extrabold text-2xl text-white">Sikat Gigi Dijeda</h3>
              <p className="text-xs text-sky-200 mt-1">Jangan biarkan kuman kembali berpesta!</p>
              <button
                onClick={() => setIsPaused(false)}
                className="mt-4 px-6 py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-sm shadow-lg transition"
              >
                Lanjutkan Sikat Gigi ({sessionTimeLeft}s tersisa di sesi ini)
              </button>
            </div>
          )}
        </div>

        {/* Quadrant Dentist Advice Card */}
        <div className="mt-3 bg-white/90 backdrop-blur-xs px-4 py-2.5 rounded-2xl border border-sky-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">💡</span>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wide">
                  Tips Dokter Gigi ({currentQuadrant.name} - 30 Detik):
                </span>
                <span className="text-[10px] bg-sky-100 text-sky-700 font-bold px-1.5 py-0.2 rounded">
                  Sisa {sessionTimeLeft}s
                </span>
              </div>
              <p className="text-xs text-slate-700 font-medium leading-relaxed">
                {currentQuadrant.advice}
              </p>
            </div>
          </div>

          {isPlaying && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                {isPaused ? 'Lanjut' : 'Jeda'}
              </button>
              <button
                onClick={stopGame}
                className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition"
                title="Hentikan Game"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Celebration Win Modal */}
      {showCelebration && celebrationDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 md:p-8 shadow-2xl border-4 border-amber-300 text-center relative overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Top Stars Decor */}
            <div className="flex justify-center gap-2 text-3xl mb-2 animate-bounce">
              <span>⭐</span>
              <span>🌟</span>
              <span>⭐</span>
            </div>

            <h2 className="font-display font-extrabold text-2xl md:text-3xl text-slate-900">
              Hore! Gigimu Bersih Berkilau! 🎉
            </h2>
            <p className="text-xs md:text-sm text-slate-600 mt-1">
              Kamu berhasil menuntaskan sesi sikat gigi {sessionTimeOfDay === 'morning' ? 'pagi ☀️' : 'malam 🌙'} dengan disiplin 30 detik per kuadran!
            </p>

            {/* Rewards Overview Box */}
            <div className="my-5 grid grid-cols-2 gap-3">
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl flex flex-col items-center">
                <span className="text-2xl mb-0.5">⭐</span>
                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wide">Bintang Diperoleh</span>
                <span className="font-display font-black text-2xl text-amber-600">
                  +{celebrationDetails.starsEarned}
                </span>
              </div>

              <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl flex flex-col items-center">
                <Flame className="w-6 h-6 text-rose-500 mb-0.5" />
                <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wide">Daily Streak</span>
                <span className="font-display font-black text-2xl text-rose-600">
                  {celebrationDetails.newStreak} Hari 🔥
                </span>
              </div>
            </div>

            {/* Unlocked Badge Alert */}
            {celebrationDetails.unlockedBadge && (
              <div className="mb-5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-3.5 rounded-2xl shadow-md flex items-center gap-3 text-left">
                <Award className="w-8 h-8 flex-shrink-0 text-yellow-300" />
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-purple-200">Hadiah Terbuka!</div>
                  <div className="font-bold text-sm">{celebrationDetails.unlockedBadge}</div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5 mt-2">
              <button
                onClick={() => setShowCelebration(false)}
                className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-display font-bold text-sm shadow-md hover:from-sky-600 hover:to-blue-700 transition"
              >
                Lihat Catatan Streak
              </button>
              <button
                onClick={() => {
                  setShowCelebration(false);
                  onOpenShop();
                }}
                className="py-3 px-4 rounded-2xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-display font-bold text-sm transition"
              >
                Koleksi Sikat & Stiker 🎁
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
