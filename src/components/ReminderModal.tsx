import React, { useState, useEffect } from 'react';
import { ReminderConfig } from '../types';
import { Storage } from '../utils/storage';
import { sound } from '../utils/audio';
import { Bell, BellRing, Sun, Moon, Volume2, Check, X, ShieldAlert, Sparkles } from 'lucide-react';

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const ReminderModal: React.FC<ReminderModalProps> = ({ isOpen, onClose, onSaved }) => {
  const [config, setConfig] = useState<ReminderConfig>(Storage.getReminderConfig());
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');
  const [testNotificationSent, setTestNotificationSent] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionState(Notification.permission);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Request Notification Permission
  const requestPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('Browser perangkat ini belum mendukung Web Notifications API.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermissionState(permission);
      if (permission === 'granted') {
        const newConf = { ...config, notificationsAllowed: true };
        setConfig(newConf);
        Storage.saveReminderConfig(newConf);
        sendNotificationSample('Notifikasi Berhasil Diaktifkan! 🦷', 'GigiJuara akan mengingatkanmu sikat gigi pagi dan malam!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Helper to trigger offline notification
  const sendNotificationSample = (title: string, body: string) => {
    sound.playReminderChime();

    // Check service worker notification
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: 'gigijuara-brushing-reminder',
        });
      }).catch(() => {
        // Fallback to direct Notification
        if (Notification.permission === 'granted') {
          new Notification(title, {
            body,
            icon: '/pwa-192x192.png',
          });
        }
      });
    } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/pwa-192x192.png',
      });
    }
  };

  // Test notification button
  const handleTestNotification = () => {
    if (permissionState !== 'granted') {
      requestPermission();
      return;
    }

    setTestNotificationSent(true);
    sendNotificationSample(
      '⏰ Waktunya Sikat Gigi! (Uji Coba)',
      'Ayo ambil sikat gigimu dan bersihkan kuman selama 2 menit agar gigi putih cemerlang! ⭐'
    );

    setTimeout(() => {
      setTestNotificationSent(false);
    }, 4000);
  };

  const handleSave = () => {
    Storage.saveReminderConfig(config);
    setSavedSuccess(true);
    if (onSaved) onSaved();
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 md:p-7 shadow-2xl border-4 border-sky-200 relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-sky-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500 text-white flex items-center justify-center shadow-md">
              <BellRing className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-display font-bold text-xl text-slate-900">
                Pengingat Sikat Gigi 2x Sehari
              </h3>
              <p className="text-xs text-slate-500">
                Jadwal sikat gigi pagi & malam tetap aktif saat offline
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Permission status card */}
        <div className="my-4">
          {permissionState === 'granted' ? (
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Izin Notifikasi Offline <strong>Aktif</strong></span>
              </div>
              <button
                onClick={handleTestNotification}
                disabled={testNotificationSent}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition text-xs shadow-xs"
              >
                {testNotificationSent ? 'Terkirim! 🔔' : 'Tes Notifikasi'}
              </button>
            </div>
          ) : permissionState === 'denied' ? (
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Izin notifikasi diblokir di browser.</strong>
                <p className="mt-0.5 text-rose-700">
                  Klik ikon gembok di sebelah URL browser dan pilih "Izinkan Notifikasi" agar pengingat dapat berbunyi.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 text-xs">
              <div>
                <strong>Nyalakan Notifikasi Lokal:</strong>
                <p className="text-slate-600">Terima pengingat sikat gigi bahkan saat aplikasi ditutup.</p>
              </div>
              <button
                onClick={requestPermission}
                className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold transition shadow-sm text-xs flex-shrink-0"
              >
                Izinkan
              </button>
            </div>
          )}
        </div>

        {/* Schedule Inputs */}
        <div className="space-y-4">
          {/* Sikat Gigi Pagi */}
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center font-bold">
                  <Sun className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-sm text-slate-800">
                    Sikat Gigi Pagi (Setelah Sarapan)
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Membersihkan sisa sarapan agar napas segar seharian
                  </span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.morningEnabled}
                  onChange={(e) => setConfig({ ...config, morningEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            {config.morningEnabled && (
              <div className="flex items-center justify-between pt-2 border-t border-amber-200/60">
                <span className="text-xs font-semibold text-slate-700">Waktu Pengingat:</span>
                <input
                  type="time"
                  value={config.morningTime}
                  onChange={(e) => setConfig({ ...config, morningTime: e.target.value })}
                  className="px-3 py-1.5 rounded-xl border border-amber-300 bg-white font-bold text-slate-800 text-sm focus:ring-2 focus:ring-amber-400 outline-hidden"
                />
              </div>
            )}
          </div>

          {/* Sikat Gigi Malam */}
          <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <Moon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-sm text-slate-800">
                    Sikat Gigi Malam (Sebelum Tidur)
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Paling penting! Kuman berkembang biak 2x lebih cepat saat tidur
                  </span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.nightEnabled}
                  onChange={(e) => setConfig({ ...config, nightEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {config.nightEnabled && (
              <div className="flex items-center justify-between pt-2 border-t border-indigo-200/60">
                <span className="text-xs font-semibold text-slate-700">Waktu Pengingat:</span>
                <input
                  type="time"
                  value={config.nightTime}
                  onChange={(e) => setConfig({ ...config, nightTime: e.target.value })}
                  className="px-3 py-1.5 rounded-xl border border-indigo-300 bg-white font-bold text-slate-800 text-sm focus:ring-2 focus:ring-indigo-400 outline-hidden"
                />
              </div>
            )}
          </div>

          {/* Sound alert option */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2.5">
              <Volume2 className="w-4 h-4 text-slate-600" />
              <div>
                <div className="text-xs font-bold text-slate-800">Bunyikan Lonceng Pengingat</div>
                <div className="text-[11px] text-slate-500">Suara melodi ramah anak saat jam sikat gigi tiba</div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.soundEnabled}
                onChange={(e) => setConfig({ ...config, soundEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
            </label>
          </div>
        </div>

        {/* Dentist Tip */}
        <div className="mt-4 p-3 rounded-2xl bg-sky-50 text-[11px] text-sky-800 flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-sky-500 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Rekomendasi PDGI (Persatuan Dokter Gigi Indonesia):</strong> Sikat gigi minimal 2 kali sehari selama 2 menit penuh dengan pasta gigi berfluoride.
          </span>
        </div>

        {/* Footer Actions */}
        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-1.5"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Tersimpan!</span>
              </>
            ) : (
              <span>Simpan Jadwal</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
