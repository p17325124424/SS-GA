import React from 'react';
import { UserStats, BrushingRecord } from '../types';
import { Storage, getTodayKey } from '../utils/storage';
import { Flame, Sun, Moon, Calendar, Award, Star, CheckCircle, Clock, Sparkles } from 'lucide-react';

interface StreakTrackerProps {
  stats: UserStats;
  onStartSession: (timeOfDay: 'morning' | 'night') => void;
}

export const StreakTracker: React.FC<StreakTrackerProps> = ({ stats, onStartSession }) => {
  const records = Storage.getRecords();
  const todayKey = getTodayKey();
  const todayRecord = records[todayKey] || {
    date: todayKey,
    morning: false,
    night: false,
    durationSeconds: 0,
    starsEarned: 0,
  };

  // Generate last 7 days for the weekly strip
  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dayName = d.toLocaleDateString('id-ID', { weekday: 'short' });
    const dayNumber = d.getDate();
    const record = records[key];

    return {
      dateKey: key,
      dayName,
      dayNumber,
      isToday: key === todayKey,
      morning: !!record?.morning,
      night: !!record?.night,
      full: !!(record?.morning && record?.night),
    };
  });

  // Calculate next goal
  let nextMilestone = 3;
  let rewardName = 'Sikat Dino Rex 🦖';
  if (stats.currentStreak >= 30) {
    nextMilestone = 60;
    rewardName = 'Piala Dokter Gigi Cilik Sejati 🎖️';
  } else if (stats.currentStreak >= 21) {
    nextMilestone = 30;
    rewardName = 'Mahkota Emas Juara 👑';
  } else if (stats.currentStreak >= 14) {
    nextMilestone = 21;
    rewardName = 'Sikat Pahlawan Kilat ⚡';
  } else if (stats.currentStreak >= 7) {
    nextMilestone = 14;
    rewardName = 'Sikat Unicorn Pelangi 🦄';
  } else if (stats.currentStreak >= 3) {
    nextMilestone = 7;
    rewardName = 'Sikat Roket Galaksi 🚀';
  }

  const daysRemaining = Math.max(0, nextMilestone - stats.currentStreak);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5">
      {/* Hero Streak Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-6 md:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className="relative flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-white/20 backdrop-blur-md border-2 border-white/40 shadow-inner">
              <Flame className="w-12 h-12 md:w-14 md:h-14 text-yellow-300 animate-bounce" />
              <div className="absolute -bottom-2 px-2.5 py-0.5 rounded-full bg-yellow-400 text-amber-950 font-black text-xs shadow-md">
                STREAK
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-display font-black text-4xl md:text-5xl drop-shadow-sm">
                  {stats.currentStreak}
                </span>
                <span className="font-display font-bold text-xl md:text-2xl text-yellow-200">
                  Hari Berturut-turut!
                </span>
              </div>
              <p className="mt-1 text-xs md:text-sm text-amber-100 max-w-md">
                {stats.currentStreak === 0
                  ? 'Ayo mulai hari ini dengan sikat gigi pagi dan malam untuk menyalakan apimu!'
                  : daysRemaining === 0
                  ? 'Selamat! Target tercapai! Cek hadiah barumu di menu Koleksi!'
                  : `Hebat! Tinggal ${daysRemaining} hari lagi menuju ${rewardName}!`}
              </p>
            </div>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-3 bg-black/20 backdrop-blur-md p-3.5 rounded-2xl border border-white/20">
            <div className="text-center px-2">
              <div className="text-amber-300 font-black text-xl flex items-center justify-center gap-1">
                <Star className="w-4 h-4 fill-amber-300" />
                <span>{stats.totalStars}</span>
              </div>
              <div className="text-[10px] text-amber-100 uppercase font-semibold">Total Bintang</div>
            </div>
            <div className="w-px h-8 bg-white/20"></div>
            <div className="text-center px-2">
              <div className="text-white font-black text-xl flex items-center justify-center gap-1">
                <Award className="w-4 h-4 text-yellow-300" />
                <span>{stats.bestStreak}</span>
              </div>
              <div className="text-[10px] text-amber-100 uppercase font-semibold">Rekor Terbaik</div>
            </div>
          </div>
        </div>

        {/* Ambient background sparkle */}
        <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
      </div>

      {/* Today's Checklist: Pagi & Malam */}
      <div className="bg-white rounded-3xl p-5 md:p-6 shadow-md border border-sky-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-sky-500" />
            <h3 className="font-display font-bold text-lg text-slate-800">
              Misi Sikat Gigi Hari Ini
            </h3>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Pagi Card */}
          <div
            className={`p-4 rounded-2xl border-2 transition-all ${
              todayRecord.morning
                ? 'bg-emerald-50/80 border-emerald-300'
                : 'bg-amber-50/60 border-amber-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow-xs ${
                    todayRecord.morning ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-amber-950'
                  }`}
                >
                  <Sun className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-base text-slate-800">Sikat Gigi Pagi</h4>
                  <p className="text-[11px] text-slate-500">Setelah sarapan pagi</p>
                </div>
              </div>

              {todayRecord.morning ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-200/80 text-emerald-800 font-bold text-xs">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Selesai ({todayRecord.morningTime || 'Pagi'})</span>
                </div>
              ) : (
                <button
                  onClick={() => onStartSession('morning')}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs shadow-md transition"
                >
                  Sikat Sekarang!
                </button>
              )}
            </div>
          </div>

          {/* Malam Card */}
          <div
            className={`p-4 rounded-2xl border-2 transition-all ${
              todayRecord.night
                ? 'bg-emerald-50/80 border-emerald-300'
                : 'bg-indigo-50/60 border-indigo-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow-xs ${
                    todayRecord.night ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white'
                  }`}
                >
                  <Moon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-base text-slate-800">Sikat Gigi Malam</h4>
                  <p className="text-[11px] text-slate-500">Sebelum tidur malam</p>
                </div>
              </div>

              {todayRecord.night ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-200/80 text-emerald-800 font-bold text-xs">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Selesai ({todayRecord.nightTime || 'Malam'})</span>
                </div>
              ) : (
                <button
                  onClick={() => onStartSession('night')}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white font-bold text-xs shadow-md transition"
                >
                  Sikat Sekarang!
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Progress Tracker (7 Days) */}
      <div className="bg-white rounded-3xl p-5 md:p-6 shadow-md border border-sky-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-sky-500" />
            <h3 className="font-display font-bold text-lg text-slate-800">
              Riwayat 7 Hari Terakhir
            </h3>
          </div>
          <span className="text-xs text-sky-600 font-semibold bg-sky-50 px-2.5 py-1 rounded-lg">
            {last7Days.filter((d) => d.full).length} dari 7 Hari Lengkap
          </span>
        </div>

        <div className="grid grid-cols-7 gap-2 md:gap-3">
          {last7Days.map((day) => (
            <div
              key={day.dateKey}
              className={`flex flex-col items-center p-2.5 md:p-3 rounded-2xl border transition-all ${
                day.isToday
                  ? 'border-sky-400 bg-sky-50 ring-2 ring-sky-300'
                  : day.full
                  ? 'border-emerald-200 bg-emerald-50/50'
                  : 'border-slate-100 bg-slate-50/60'
              }`}
            >
              <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase">
                {day.dayName}
              </span>
              <span
                className={`my-1 text-sm md:text-base font-display font-extrabold ${
                  day.isToday ? 'text-sky-600' : 'text-slate-700'
                }`}
              >
                {day.dayNumber}
              </span>

              {/* Status Pagi & Malam indicators */}
              <div className="flex gap-1 mt-1">
                <span
                  title={day.morning ? 'Pagi Selesai' : 'Pagi Belum'}
                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] ${
                    day.morning ? 'bg-amber-400 text-amber-950 font-bold' : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  ☀️
                </span>
                <span
                  title={day.night ? 'Malam Selesai' : 'Malam Belum'}
                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] ${
                    day.night ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  🌙
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> ☀️ Sikat Pagi
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span> 🌙 Sikat Malam
            </span>
          </div>
          <span className="italic text-[11px] text-slate-400">Data tersimpan di penyimpanan offline HP / Komputer</span>
        </div>
      </div>
    </div>
  );
};
