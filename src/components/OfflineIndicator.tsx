import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff, Wifi } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-2xl bg-amber-500/95 backdrop-blur-xs px-3.5 py-2 text-xs font-bold text-white shadow-xl border border-amber-300 animate-bounce">
      <WifiOff className="w-4 h-4 text-white" />
      <span>Mode Offline Aktif — Game & Data Tersimpan Lokal</span>
    </div>
  );
};
