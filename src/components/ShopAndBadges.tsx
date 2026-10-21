import React, { useState } from 'react';
import { Badge, ToothbrushCharacter, UserStats } from '../types';
import { Storage } from '../utils/storage';
import { sound } from '../utils/audio';
import { Check, Lock, Sparkles, Award, Star, Flame, CheckCircle2 } from 'lucide-react';

interface ShopAndBadgesProps {
  stats: UserStats;
  selectedToothbrushId: string;
  onSelectToothbrush: (brush: ToothbrushCharacter) => void;
  onUpdateStats: (newStats: UserStats) => void;
}

export const ShopAndBadges: React.FC<ShopAndBadgesProps> = ({
  stats,
  selectedToothbrushId,
  onSelectToothbrush,
  onUpdateStats,
}) => {
  const [activeTab, setActiveTab] = useState<'brushes' | 'badges'>('brushes');
  const [toothbrushes, setToothbrushes] = useState<ToothbrushCharacter[]>(Storage.getToothbrushes());
  const [badges, setBadges] = useState<Badge[]>(Storage.getBadges());

  // Equip a toothbrush
  const handleEquip = (brush: ToothbrushCharacter) => {
    if (!brush.unlocked) return;
    sound.playSparkle();
    const updatedStats = { ...stats, selectedToothbrushId: brush.id };
    Storage.saveStats(updatedStats);
    onUpdateStats(updatedStats);
    onSelectToothbrush(brush);
  };

  // Unlock with stars if streak requirement hasn't been met yet
  const handleBuyWithStars = (brush: ToothbrushCharacter, starCost: number) => {
    if (stats.totalStars < starCost) {
      alert(`Bintangmu belum cukup! Kamu butuh ${starCost} ⭐ (Sekarang: ${stats.totalStars} ⭐). Terus sikat gigi setiap hari untuk mengumpulkan bintang!`);
      return;
    }

    sound.playFanfare();
    const updatedBrushes = toothbrushes.map((b) =>
      b.id === brush.id ? { ...b, unlocked: true } : b
    );
    setToothbrushes(updatedBrushes);
    Storage.saveToothbrushes(updatedBrushes);

    const updatedStats = {
      ...stats,
      totalStars: stats.totalStars - starCost,
      selectedToothbrushId: brush.id,
    };
    Storage.saveStats(updatedStats);
    onUpdateStats(updatedStats);
    onSelectToothbrush({ ...brush, unlocked: true });
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Top Banner Tab Switcher */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-3xl shadow-sm border border-sky-100">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('brushes')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-display font-bold text-sm transition cursor-pointer ${
              activeTab === 'brushes'
                ? 'bg-sky-500 text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>🪥 Karakter Sikat Gigi</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/20">
              {toothbrushes.filter((b) => b.unlocked).length}/{toothbrushes.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('badges')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-display font-bold text-sm transition cursor-pointer ${
              activeTab === 'badges'
                ? 'bg-amber-500 text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>🎖️ Piagam & Lencana</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/20">
              {badges.filter((b) => b.unlocked).length}/{badges.length}
            </span>
          </button>
        </div>

        {/* Current Balance */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-100/90 text-amber-900 font-bold text-sm">
            <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
            <span>{stats.totalStars} Bintang</span>
          </div>
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-100/90 text-rose-900 font-bold text-sm">
            <Flame className="w-4 h-4 text-rose-500 fill-rose-500" />
            <span>{stats.currentStreak} Hari Streak</span>
          </div>
        </div>
      </div>

      {/* Brushes Tab */}
      {activeTab === 'brushes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-extrabold text-xl text-slate-800">
              Pilih Karakter Sikat Gigimu!
            </h3>
            <p className="text-xs text-slate-500">
              Sikat yang kamu pilih akan langsung dipakai saat bermain game 2 menit.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {toothbrushes.map((brush) => {
              const isSelected = brush.id === selectedToothbrushId;
              const starPrice = brush.requiredStreak * 40;

              return (
                <div
                  key={brush.id}
                  className={`relative p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-sky-50/90 border-sky-400 shadow-md ring-2 ring-sky-300'
                      : brush.unlocked
                      ? 'bg-white border-slate-200 hover:border-sky-300 shadow-xs'
                      : 'bg-slate-50/80 border-slate-200 opacity-90'
                  }`}
                >
                  {/* Top Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {brush.theme}
                    </span>
                    {isSelected ? (
                      <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-extrabold">
                        <Check className="w-3 h-3" /> Sedang Dipakai
                      </span>
                    ) : brush.unlocked ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-bold">
                        Terbuka
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold">
                        <Lock className="w-3 h-3" /> Streak {brush.requiredStreak} Hari
                      </span>
                    )}
                  </div>

                  {/* Character Avatar & Preview */}
                  <div className="flex items-center gap-4 my-2">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-md border-2 border-white relative"
                      style={{ backgroundColor: brush.brushColor }}
                    >
                      <span>{brush.icon}</span>
                      <div
                        className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white shadow-xs"
                        style={{ backgroundColor: brush.bristleColor }}
                      />
                    </div>

                    <div>
                      <h4 className="font-display font-bold text-base text-slate-800">
                        {brush.name}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                        {brush.description}
                      </p>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    {isSelected ? (
                      <button
                        disabled
                        className="w-full py-2.5 rounded-xl bg-emerald-500/10 text-emerald-700 font-bold text-xs flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Sikat Aktif</span>
                      </button>
                    ) : brush.unlocked ? (
                      <button
                        onClick={() => handleEquip(brush)}
                        className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-sm transition active:scale-95 cursor-pointer"
                      >
                        Gunakan Sikat Ini
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-[11px] text-slate-500 text-center font-medium">
                          Buka dengan <strong>Streak {brush.requiredStreak} Hari</strong> (Sekarang: {stats.currentStreak} Hari)
                        </div>
                        {stats.totalStars >= starPrice && (
                          <button
                            onClick={() => handleBuyWithStars(brush, starPrice)}
                            className="w-full py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Star className="w-3.5 h-3.5 fill-amber-950" />
                            <span>Buka Instan ({starPrice} ⭐)</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Badges Tab */}
      {activeTab === 'badges' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-extrabold text-xl text-slate-800">
              Koleksi Lencana & Prestasi Gigi Sehat
            </h3>
            <p className="text-xs text-slate-500">
              Kumpulkan semua penghargaan dokter gigi cilik!
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className={`p-5 rounded-3xl border-2 transition-all flex flex-col items-center text-center ${
                  badge.unlocked
                    ? 'bg-gradient-to-b from-amber-50 to-white border-amber-300 shadow-md'
                    : 'bg-slate-50/70 border-slate-200 opacity-60'
                }`}
              >
                {/* Badge Icon */}
                <div
                  className={`w-20 h-20 rounded-3xl flex items-center justify-center text-4xl shadow-inner mb-3 border-4 ${
                    badge.unlocked
                      ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-amber-200'
                      : 'bg-slate-200 border-slate-300 text-slate-400'
                  }`}
                >
                  {badge.icon}
                </div>

                <h4 className="font-display font-extrabold text-base text-slate-800">
                  {badge.title}
                </h4>

                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {badge.description}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 w-full">
                  {badge.unlocked ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Terbuka! 🎉</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-200 text-slate-600 text-xs font-semibold">
                      <Lock className="w-3.5 h-3.5" />
                      <span>{badge.requiredStreak > 0 ? `Streak ${badge.requiredStreak} Hari` : 'Terkunci'}</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
