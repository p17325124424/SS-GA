import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share2, PlusSquare, X, Smartphone } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed, hide button
  if (isInstalled) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100/90 text-emerald-800 text-xs font-semibold">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>Aplikasi Terpasang</span>
      </div>
    );
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-3.5 py-2 text-xs md:text-sm font-bold text-white shadow-md hover:from-sky-600 hover:to-blue-700 active:scale-95 transition-all cursor-pointer"
        title="Pasang GigiJuara ke Layar Utama HP / Desktop"
      >
        <Download className="w-4 h-4 animate-bounce" />
        <span>Install Aplikasi</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-xl border border-sky-300 bg-white/80 px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-50 active:scale-95 transition cursor-pointer shadow-sm"
        >
          <Smartphone className="w-3.5 h-3.5 text-sky-500" />
          <span>Pasang di iPhone/iPad</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border-4 border-sky-200 animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-sky-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center font-bold text-lg">
                    🦷
                  </div>
                  <h3 className="font-display font-bold text-base text-slate-800">
                    Pasang di iPhone / iPad
                  </h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3.5 text-xs text-slate-600 leading-relaxed">
                <div className="flex items-start gap-3 bg-sky-50 p-3 rounded-2xl">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-sky-500 text-white font-bold flex items-center justify-center text-xs">
                    1
                  </span>
                  <div>
                    Buka di browser <strong className="text-slate-800">Safari</strong>, lalu ketuk tombol <strong className="text-sky-600">Bagikan (Share)</strong>
                    <div className="mt-1 flex items-center gap-1 text-sky-600 font-semibold">
                      <Share2 className="w-4 h-4 inline" /> Ikon kotak berpanah atas
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-sky-50 p-3 rounded-2xl">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-sky-500 text-white font-bold flex items-center justify-center text-xs">
                    2
                  </span>
                  <div>
                    Gulir ke bawah dan pilih opsi <strong className="text-slate-800">"Tambah ke Layar Utama" (Add to Home Screen)</strong>.
                    <div className="mt-1 flex items-center gap-1 text-sky-600 font-semibold">
                      <PlusSquare className="w-4 h-4 inline" /> Tambah ke Layar Utama
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-emerald-50 p-3 rounded-2xl text-emerald-800">
                  <span className="text-base">🎉</span>
                  <span>Aplikasi siap dimainkan kapan saja secara offline tanpa internet!</span>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 py-3 text-sm font-bold text-white shadow-md hover:from-sky-600 hover:to-blue-700 transition"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback button for devices that have already prompt or can bookmark
  return (
    <button
      onClick={() => {
        alert('Untuk memasang web ini di layar utama:\n- Di Android: Ketuk titik tiga (⋮) lalu pilih "Tambahkan ke Layar Utama".\n- Di Chrome PC: Klik ikon unduh di sebelah kanan bilah alamat.');
      }}
      className="hidden sm:flex items-center gap-1.5 rounded-xl border border-sky-300 bg-white/90 px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-50 transition cursor-pointer shadow-xs"
      title="Panduan install"
    >
      <Download className="w-3.5 h-3.5 text-sky-500" />
      <span>Install PWA</span>
    </button>
  );
};
