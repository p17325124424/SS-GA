import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Flame, 
  Star, 
  Sparkles, 
  Search, 
  RefreshCw, 
  Crown, 
  CheckCircle2, 
  Calendar, 
  AlertCircle,
  Award,
  Download,
  FileSpreadsheet,
  FileJson,
  Edit,
  Trash2,
  Eye,
  X,
  Save,
  Clock,
  Sun,
  Moon,
  Check,
  Lock,
  UserCheck
} from 'lucide-react';
import { 
  CloudUserProfile, 
  fetchAllUsersForSuperAdmin, 
  fetchUserDetailRecordsForAdmin,
  updateUserStatsByAdmin,
  deleteUserByAdmin,
  deleteUserRecordByAdmin,
  SUPER_ADMIN_EMAIL,
  PRESET_PLAYER_ACCOUNT
} from '../firebase';
import { BrushingRecord } from '../types';

interface SuperAdminPanelProps {
  currentUserEmail?: string;
  onClose: () => void;
}

export const SuperAdminPanel: React.FC<SuperAdminPanelProps> = ({ currentUserEmail, onClose }) => {
  const [users, setUsers] = useState<CloudUserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Detail Modal State
  const [selectedUserForDetail, setSelectedUserForDetail] = useState<CloudUserProfile | null>(null);
  const [userRecords, setUserRecords] = useState<BrushingRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState<boolean>(false);

  // Edit Modal State
  const [editingUser, setEditingUser] = useState<CloudUserProfile | null>(null);
  const [editForm, setEditForm] = useState<{
    displayName: string;
    currentStreak: number;
    bestStreak: number;
    totalStars: number;
    totalSessions: number;
    hasPassedQuiz: boolean;
    quizScore: number;
  }>({
    displayName: '',
    currentStreak: 0,
    bestStreak: 0,
    totalStars: 0,
    totalSessions: 0,
    hasPassedQuiz: false,
    quizScore: 0,
  });
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Delete Confirmation State
  const [userToDelete, setUserToDelete] = useState<CloudUserProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const loadUsers = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchAllUsersForSuperAdmin();
      setUsers(data);
    } catch (err) {
      console.error(err);
      setErrorMessage('Gagal memuat data pengguna dari cloud. Pastikan Anda masuk sebagai ' + SUPER_ADMIN_EMAIL);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleOpenDetail = async (user: CloudUserProfile) => {
    setSelectedUserForDetail(user);
    setLoadingRecords(true);
    try {
      const records = await fetchUserDetailRecordsForAdmin(user.userId);
      setUserRecords(records);
    } catch (err) {
      console.error('Error fetching user records:', err);
      setUserRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  };

  const handleOpenEdit = (user: CloudUserProfile) => {
    setEditingUser(user);
    setEditForm({
      displayName: user.displayName || '',
      currentStreak: user.currentStreak || 0,
      bestStreak: user.bestStreak || 0,
      totalStars: user.totalStars || 0,
      totalSessions: user.totalSessions || 0,
      hasPassedQuiz: Boolean(user.hasPassedQuiz),
      quizScore: user.quizScore || 100,
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSavingEdit(true);
    try {
      await updateUserStatsByAdmin(editingUser.userId, {
        displayName: editForm.displayName,
        currentStreak: Number(editForm.currentStreak),
        bestStreak: Number(editForm.bestStreak),
        totalStars: Number(editForm.totalStars),
        totalSessions: Number(editForm.totalSessions),
        hasPassedQuiz: editForm.hasPassedQuiz,
        quizScore: Number(editForm.quizScore),
      });

      setSuccessMessage(`Data pengguna ${editingUser.displayName} berhasil diperbarui di database!`);
      setTimeout(() => setSuccessMessage(null), 4000);
      setEditingUser(null);
      await loadUsers();
    } catch (err) {
      console.error(err);
      setErrorMessage('Gagal memperbarui data pengguna.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      await deleteUserByAdmin(userToDelete.userId);
      setSuccessMessage(`Pengguna ${userToDelete.displayName} dan seluruh riwayatnya telah dihapus.`);
      setTimeout(() => setSuccessMessage(null), 4000);
      setUserToDelete(null);
      if (selectedUserForDetail?.userId === userToDelete.userId) {
        setSelectedUserForDetail(null);
      }
      await loadUsers();
    } catch (err) {
      console.error(err);
      setErrorMessage('Gagal menghapus pengguna.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Export all users and their records to CSV (Poltekkes research ready)
  const handleExportCSV = async () => {
    try {
      setLoading(true);
      let csvContent = 'data:text/csv;charset=utf-8,';
      // Header row
      csvContent += 'User ID,Nama Pengguna,Email,Username,Role,Streak Saat Ini,Rekor Streak,Total Bintang,Total Sesi Sikat,Lulus Ujian Online,Nilai Ujian,Terakhir Sikat,Dibuat Pada,Diperbarui Pada\n';

      users.forEach((u) => {
        const row = [
          `"${u.userId}"`,
          `"${u.displayName || ''}"`,
          `"${u.email || ''}"`,
          `"${u.username || ''}"`,
          `"${u.role}"`,
          u.currentStreak || 0,
          u.bestStreak || 0,
          u.totalStars || 0,
          u.totalSessions || 0,
          u.hasPassedQuiz ? 'YA' : 'TIDAK',
          u.quizScore || 0,
          `"${u.lastBrushedDate || ''}"`,
          `"${u.createdAt || ''}"`,
          `"${u.updatedAt || ''}"`,
        ];
        csvContent += row.join(',') + '\n';
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `GigiJuara_Rekap_Pengguna_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccessMessage('Rekap data pengguna berhasil diekspor ke format CSV!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Export error:', err);
      setErrorMessage('Gagal mengekspor data ke CSV.');
    } finally {
      setLoading(false);
    }
  };

  // Export full JSON Backup
  const handleExportJSON = () => {
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(users, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `GigiJuara_Database_Backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setSuccessMessage('Backup database berhasil diunduh dalam format JSON!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.error('JSON Export error:', err);
      setErrorMessage('Gagal mengekspor data ke JSON.');
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.displayName && u.displayName.toLowerCase().includes(q)) ||
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.userId && u.userId.toLowerCase().includes(q))
    );
  });

  const totalUsersCount = users.length;
  const totalSessionsCount = users.reduce((acc, u) => acc + (u.totalSessions || 0), 0);
  const totalStarsCount = users.reduce((acc, u) => acc + (u.totalStars || 0), 0);
  const highestStreak = users.reduce((max, u) => Math.max(max, u.bestStreak || 0), 0);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      {/* Super Admin Exclusive Authorization Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-600 via-rose-600 to-indigo-700 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-amber-200 text-xs font-black uppercase tracking-wider border border-white/30">
              <Crown className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              <span>Otoritas Pengelola Data Eksklusif</span>
            </div>
            <h2 className="font-display font-black text-2xl sm:text-3xl tracking-tight">
              Pusat Kendali & Pengelolaan Data GigiJuara 👑
            </h2>
            <p className="text-xs sm:text-sm text-sky-100 max-w-xl">
              Hak akses eksklusif untuk <strong>{SUPER_ADMIN_EMAIL}</strong> guna memantau akun pemain <strong>(ssga01)</strong>, mengelola catatan sikat gigi 2x sehari, mengedit data statistik, serta mengekspor rekap penelitian.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-bold text-xs transition border border-white/20 shadow-xs cursor-pointer"
              title="Unduh seluruh data dalam format CSV untuk Excel atau pengolahan statistik"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
              <span>Ekspor CSV</span>
            </button>
            <button
              onClick={handleExportJSON}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-bold text-xs transition border border-white/20 shadow-xs cursor-pointer"
              title="Unduh backup data lengkap format JSON"
            >
              <FileJson className="w-4 h-4 text-sky-300" />
              <span>JSON Backup</span>
            </button>
            <button
              onClick={loadUsers}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-bold text-xs transition border border-white/20 shadow-xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Segarkan</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl bg-white text-slate-800 font-bold text-xs shadow-md hover:bg-slate-100 transition cursor-pointer"
            >
              Kembali ke Aplikasi
            </button>
          </div>
        </div>

        {/* Security & Access Verification Box */}
        <div className="mt-4 pt-4 border-t border-white/20 flex flex-wrap items-center justify-between text-[11px] text-white/90 gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            <span>Pengelola Data Terverifikasi: <strong className="font-mono underline">{SUPER_ADMIN_EMAIL}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-400/30 px-2.5 py-0.5 rounded-full text-emerald-200 font-bold border border-emerald-300/40">
              Hak Akses Penuh Firestore DB Aktif ✓
            </span>
            <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-sky-200 font-medium border border-white/30">
              Akun Pemain: <strong>ssga01</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-between animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-600 hover:text-rose-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Aggregate Statistics Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-5 rounded-3xl border border-sky-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Total Pengguna</span>
            <div className="p-2.5 rounded-2xl bg-sky-100 text-sky-700">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-display font-black text-2xl sm:text-3xl text-slate-900">
              {totalUsersCount}
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Akun tersimpan di Firestore</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-sky-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Total Sesi Sikat</span>
            <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-display font-black text-2xl sm:text-3xl text-emerald-600">
              {totalSessionsCount}
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Sesi 2 menit terlaksana</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-sky-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Streak Tertinggi</span>
            <div className="p-2.5 rounded-2xl bg-rose-100 text-rose-700">
              <Flame className="w-5 h-5 fill-rose-500" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-display font-black text-2xl sm:text-3xl text-rose-600">
              {highestStreak} Hari
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Disiplin sikat gigi terlama</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-sky-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Total Bintang</span>
            <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-700">
              <Star className="w-5 h-5 fill-amber-400" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-display font-black text-2xl sm:text-3xl text-amber-500">
              {totalStarsCount}
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Hadiah bintang dikumpulkan</p>
          </div>
        </div>
      </div>

      {/* Quick Action Button for Player ssga01 */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 p-4 rounded-3xl text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl">
            🎮
          </div>
          <div>
            <div className="font-display font-bold text-sm">Akun Pemain Resmi: ssga01 (Password: 12345)</div>
            <div className="text-xs text-sky-100">
              Akun ini dapat dipakai pengguna/anak untuk bermain game sikat gigi dan seluruh datanya tersimpan di database.
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            const ssgaUser = users.find((u) => u.userId === 'ssga01' || u.username === 'ssga01');
            if (ssgaUser) {
              handleOpenDetail(ssgaUser);
            } else {
              setSearchQuery('ssga01');
            }
          }}
          className="px-4 py-2 bg-white text-sky-800 rounded-xl font-bold text-xs shadow-xs hover:bg-sky-50 transition cursor-pointer whitespace-nowrap"
        >
          Lihat Riwayat ssga01
        </button>
      </div>

      {/* User Search & Management Table */}
      <div className="bg-white rounded-3xl border border-sky-100 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-sky-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-black text-lg text-slate-800 flex items-center gap-2">
              <span>Kelola Data Akun & Riwayat Sikat Gigi</span>
              <span className="text-xs px-2 py-0.5 bg-sky-100 text-sky-800 rounded-full font-bold">
                {filteredUsers.length} Akun
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Klik ikon mata untuk melihat riwayat harian lengkap, pensil untuk mengedit statistik, atau tempat sampah untuk menghapus.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari ssga01, email, nama..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-400 focus:bg-white transition"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-extrabold uppercase text-slate-500 tracking-wider">
                <th className="py-3 px-4">Pengguna (ID / Email)</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4 text-center">Ujian Online 📝</th>
                <th className="py-3 px-4 text-center">Streak Saat Ini</th>
                <th className="py-3 px-4 text-center">Rekor Streak</th>
                <th className="py-3 px-4 text-center">Total Sesi</th>
                <th className="py-3 px-4 text-center">Bintang ⭐</th>
                <th className="py-3 px-4">Terakhir Sikat</th>
                <th className="py-3 px-4 text-center">Aksi Pengelolaan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-sky-500" />
                      <span>Memuat data pengguna dari Firestore...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Users className="w-8 h-8 mx-auto text-slate-300" />
                      <p className="text-xs">Tidak ada akun yang sesuai dengan pencarian "{searchQuery}".</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isSuper = u.role === 'superadmin' || u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
                  const isPlayerAccount = u.userId === 'ssga01' || u.username === 'ssga01';

                  return (
                    <tr 
                      key={u.userId} 
                      className={`hover:bg-sky-50/50 transition ${isPlayerAccount ? 'bg-sky-50/30' : ''}`}
                    >
                      {/* User Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {isPlayerAccount ? (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-xs border-2 border-sky-300">
                              🎮
                            </div>
                          ) : u.photoURL ? (
                            <img
                              src={u.photoURL}
                              alt={u.displayName}
                              className="w-9 h-9 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-sky-400 to-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                              {u.displayName?.charAt(0).toUpperCase() || 'U'}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{u.displayName || (isPlayerAccount ? 'ssga01' : 'Pengguna')}</span>
                              {isPlayerAccount && (
                                <span className="px-1.5 py-0.2 bg-sky-200 text-sky-900 text-[9px] font-black rounded-md">
                                  Akun Pemain
                                </span>
                              )}
                              {isSuper && <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {isPlayerAccount ? 'ssga01 • pass: 12345' : u.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        {isSuper ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-extrabold text-[10px] border border-amber-200">
                            👑 Super Admin
                          </span>
                        ) : isPlayerAccount ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px] border border-blue-200">
                            🎮 Pemain Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-medium text-[10px]">
                            Pengguna
                          </span>
                        )}
                      </td>

                      {/* Ujian Online Status */}
                      <td className="py-3.5 px-4 text-center">
                        {u.hasPassedQuiz ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px] border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Lulus ({u.quizScore || 100}%)</span>
                          </span>
                        ) : u.hasReadEducation ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-bold text-[10px]">
                            Baca Selesai
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px]">
                            Belum Ujian
                          </span>
                        )}
                      </td>

                      {/* Current Streak */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 font-bold text-rose-600">
                          <Flame className="w-3.5 h-3.5 fill-rose-500" />
                          <span>{u.currentStreak || 0} Hari</span>
                        </span>
                      </td>

                      {/* Best Streak */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-slate-800">
                          {u.bestStreak || 0} Hari
                        </span>
                      </td>

                      {/* Total Sessions */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-extrabold text-emerald-600">
                          {u.totalSessions || 0}x
                        </span>
                      </td>

                      {/* Stars */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-black text-amber-600 flex items-center justify-center gap-1">
                          <span>⭐</span>
                          <span>{u.totalStars || 0}</span>
                        </span>
                      </td>

                      {/* Last Brushed Date */}
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {u.lastBrushedDate ? (
                          <div className="flex items-center gap-1 text-slate-700 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{u.lastBrushedDate}</span>
                          </div>
                        ) : (
                          <span className="italic text-slate-400">Belum ada</span>
                        )}
                      </td>

                      {/* Management Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenDetail(u)}
                            className="p-1.5 rounded-lg bg-sky-100 text-sky-700 hover:bg-sky-200 transition cursor-pointer"
                            title="Lihat Riwayat Detail Sikat Gigi Harian"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition cursor-pointer"
                            title="Edit Data / Statistik Pengguna"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          {!isSuper && (
                            <button
                              onClick={() => setUserToDelete(u)}
                              className="p-1.5 rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200 transition cursor-pointer"
                              title="Hapus Pengguna dari Database"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL MODAL: Detailed Daily Brushing Records */}
      {selectedUserForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl border-4 border-sky-100 max-h-[90vh] flex flex-col relative overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-500 text-white flex items-center justify-center text-lg">
                  📋
                </div>
                <div>
                  <h4 className="font-display font-black text-lg text-slate-900">
                    Riwayat Sikat Gigi: {selectedUserForDetail.displayName || selectedUserForDetail.userId}
                  </h4>
                  <p className="text-xs text-slate-500">
                    ID: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">{selectedUserForDetail.userId}</code> • Email: {selectedUserForDetail.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserForDetail(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Summary Pill Row */}
            <div className="grid grid-cols-3 gap-2 my-4">
              <div className="bg-sky-50 p-3 rounded-2xl text-center">
                <div className="text-[10px] font-bold text-sky-700 uppercase">Streak</div>
                <div className="font-display font-black text-lg text-sky-900">
                  {selectedUserForDetail.currentStreak || 0} Hari
                </div>
              </div>
              <div className="bg-amber-50 p-3 rounded-2xl text-center">
                <div className="text-[10px] font-bold text-amber-700 uppercase">Bintang</div>
                <div className="font-display font-black text-lg text-amber-900">
                  ⭐ {selectedUserForDetail.totalStars || 0}
                </div>
              </div>
              <div className="bg-emerald-50 p-3 rounded-2xl text-center">
                <div className="text-[10px] font-bold text-emerald-700 uppercase">Ujian Online</div>
                <div className="font-display font-black text-lg text-emerald-900">
                  {selectedUserForDetail.hasPassedQuiz ? `Lulus (${selectedUserForDetail.quizScore || 100}%)` : 'Belum'}
                </div>
              </div>
            </div>

            {/* Records List */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2.5">
              <div className="text-xs font-bold text-slate-700 mb-2">
                Log Sesi Sikat Harian (Pagi & Malam):
              </div>

              {loadingRecords ? (
                <div className="py-12 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-sky-500 mb-2" />
                  <span>Mengambil data riwayat sikat gigi...</span>
                </div>
              ) : userRecords.length === 0 ? (
                <div className="py-10 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Calendar className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                  <p className="text-xs">Belum ada riwayat sesi sikat gigi tercatat untuk pengguna ini.</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Saat pengguna memainkan Game 2 Menit, data akan muncul di sini secara otomatis.
                  </p>
                </div>
              ) : (
                userRecords.map((rec) => (
                  <div
                    key={rec.date}
                    className="p-3.5 rounded-2xl bg-slate-50 hover:bg-sky-50/50 border border-slate-200/80 transition flex items-center justify-between text-xs"
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-slate-800 flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-sky-600" />
                        <span>Tanggal: {rec.date}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>Durasi: {rec.durationSeconds || 120} detik</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-amber-700 font-semibold">
                          <Star className="w-3 h-3 fill-amber-400" />
                          <span>+{rec.starsEarned || 10} Bintang</span>
                        </span>
                      </div>
                    </div>

                    {/* Morning and Night Session Indicators */}
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold ${
                        rec.morning ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-slate-200 text-slate-400'
                      }`}>
                        <Sun className="w-3 h-3" />
                        <span>Pagi {rec.morning ? '✓' : '—'}</span>
                      </span>

                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold ${
                        rec.night ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' : 'bg-slate-200 text-slate-400'
                      }`}>
                        <Moon className="w-3 h-3" />
                        <span>Malam {rec.night ? '✓' : '—'}</span>
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end mt-2">
              <button
                onClick={() => setSelectedUserForDetail(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL: Modify Stats */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border-4 border-amber-100 relative overflow-hidden animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setEditingUser(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-lg shadow-xs">
                ✏️
              </div>
              <div>
                <h4 className="font-display font-black text-lg text-slate-900">
                  Edit Data Pengguna
                </h4>
                <p className="text-xs text-slate-500">
                  Kelola nilai statistik untuk akun <strong className="font-mono">{editingUser.userId}</strong>
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Nama Tampilan Pengguna
                </label>
                <input
                  type="text"
                  value={editForm.displayName}
                  onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-amber-400 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Streak Saat Ini (Hari)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.currentStreak}
                    onChange={(e) => setEditForm({ ...editForm, currentStreak: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-amber-400 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Rekor Streak Terbaik
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.bestStreak}
                    onChange={(e) => setEditForm({ ...editForm, bestStreak: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-amber-400 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Total Bintang Hadiah ⭐
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.totalStars}
                    onChange={(e) => setEditForm({ ...editForm, totalStars: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-amber-400 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Total Sesi Sikat Selesai
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.totalSessions}
                    onChange={(e) => setEditForm({ ...editForm, totalSessions: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-amber-400 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Quiz / Mandatory Education Controls */}
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-900">Status Kelulusan Ujian Online:</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.hasPassedQuiz}
                      onChange={(e) => setEditForm({ ...editForm, hasPassedQuiz: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
                {editForm.hasPassedQuiz && (
                  <div>
                    <label className="block text-[10px] font-bold text-amber-800 uppercase mb-1">
                      Nilai Ujian (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editForm.quizScore}
                      onChange={(e) => setEditForm({ ...editForm, quizScore: parseInt(e.target.value) || 100 })}
                      className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-xl font-medium"
                    />
                  </div>
                )}
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 text-white font-bold shadow-md hover:from-amber-600 hover:to-rose-700 transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border-4 border-rose-100 text-center relative overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center text-xl mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>

            <h4 className="font-display font-black text-lg text-slate-900">
              Hapus Pengguna dari Database?
            </h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Anda akan menghapus data akun <strong>{userToDelete.displayName}</strong> ({userToDelete.email || userToDelete.userId}) dan seluruh riwayat sikat gigi yang tersimpan di Firestore. Tindakan ini tidak dapat dibatalkan.
            </p>

            <div className="mt-5 flex items-center justify-center gap-2.5">
              <button
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus Data'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
