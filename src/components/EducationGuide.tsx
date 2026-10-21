import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { sound } from '../utils/audio';
import { 
  BookOpen, 
  Sparkles, 
  Smartphone, 
  WifiOff, 
  ShieldCheck, 
  Heart, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight,
  Flame,
  Award,
  Zap,
  Check,
  HelpCircle,
  FileText,
  Lock,
  Unlock,
  RotateCcw
} from 'lucide-react';

interface EducationGuideProps {
  userName?: string;
  isMandatory?: boolean;
  reason?: 'first_time' | 'streak_reset' | 'normal';
  streakCount?: number;
  hasAlreadyPassedQuiz?: boolean;
  initialQuizScore?: number;
  onNavigateToGame?: () => void;
  onCompleteReading?: (quizScore?: number) => void;
}

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question: 'Berapa total durasi menyikat gigi yang dianjurkan dokter gigi dalam satu kali sesi?',
    options: [
      '30 detik saja',
      '2 Menit penuh (dibagi 4 kuadran @30 detik)',
      '5 menit tanpa henti',
      '10 detik asal berbusa',
    ],
    correctIndex: 1,
    explanation: 'Dokter gigi menganjurkan sikat gigi minimal 2 menit yang dibagi menjadi 4 kuadran masing-masing 30 detik agar kuman bersih merata.',
  },
  {
    id: 2,
    question: 'Kapan waktu paling wajib dan terbaik untuk menyikat gigi setiap hari?',
    options: [
      'Hanya saat mandi sore',
      '2x Sehari: Pagi setelah sarapan & Malam sebelum tidur',
      'Hanya saat gigi mulai terasa sakit',
      'Seminggu sekali',
    ],
    correctIndex: 1,
    explanation: 'Sikat gigi pagi setelah sarapan membersihkan sisa makanan, dan malam sebelum tidur mencegah kuman berpesta semalaman.',
  },
  {
    id: 3,
    question: 'Bagaimana cara menyikat gigi yang tepat dan merata di seluruh mulut?',
    options: [
      'Menggosok gigi depan saja dengan sangat keras',
      'Gerakan melingkar memutar lembut 45 derajat menyebar di 4 kuadran gigi',
      'Cukup berkumur dengan air tanpa sikat',
      'Menggosok cepat ke kiri-kanan sekuat tenaga',
    ],
    correctIndex: 1,
    explanation: 'Gerakan memutar melingkar lembut dengan sudut 45 derajat membersihkan plak tanpa merusak email gigi atau melukai gusi.',
  },
  {
    id: 4,
    question: 'Bagaimana cara kerja aplikasi GigiJuara saat tidak ada sinyal internet / offline?',
    options: [
      'Aplikasi akan rusak dan tidak dapat dibuka',
      'Tetap bisa dimainkan penuh secara offline (PWA) karena game, audio & streak tersimpan di perangkat',
      'Harus membeli kuota baru agar bisa sikat gigi',
      'Hanya bisa melihat logo aplikasi saja',
    ],
    correctIndex: 1,
    explanation: 'Berkat teknologi PWA & Service Worker, seluruh aset game, efek audio, dan streak tersimpan di perangkat sehingga dapat dimainkan offline tanpa kuota.',
  },
];

export const EducationGuide: React.FC<EducationGuideProps> = ({
  userName = 'Dokter Cilik',
  isMandatory = false,
  reason = 'normal',
  streakCount = 0,
  hasAlreadyPassedQuiz = false,
  initialQuizScore = 0,
  onNavigateToGame,
  onCompleteReading,
}) => {
  const [activeSection, setActiveSection] = useState<'techniques' | 'monsters' | 'offline_guide' | 'online_quiz'>(
    isMandatory ? 'techniques' : 'techniques'
  );
  
  // Track sections the user has opened and read
  const [readSections, setReadSections] = useState<Record<string, boolean>>({
    techniques: true,
    monsters: hasAlreadyPassedQuiz,
    offline_guide: hasAlreadyPassedQuiz,
    online_quiz: hasAlreadyPassedQuiz,
  });

  // Quiz State
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [isQuizSubmitted, setIsQuizSubmitted] = useState<boolean>(hasAlreadyPassedQuiz);
  const [quizScore, setQuizScore] = useState<number>(initialQuizScore || (hasAlreadyPassedQuiz ? 100 : 0));
  const [isPassed, setIsPassed] = useState<boolean>(hasAlreadyPassedQuiz);

  const handleSelectSection = (section: 'techniques' | 'monsters' | 'offline_guide' | 'online_quiz') => {
    setActiveSection(section);
    setReadSections((prev) => ({ ...prev, [section]: true }));
  };

  const totalSections = 4;
  const completedSectionsCount = Object.values(readSections).filter(Boolean).length;

  const handleAnswerSelect = (questionId: number, optionIdx: number) => {
    if (isQuizSubmitted) return;
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionIdx }));
  };

  const handleSubmitQuiz = () => {
    let correctCount = 0;
    QUIZ_QUESTIONS.forEach((q) => {
      if (selectedAnswers[q.id] === q.correctIndex) {
        correctCount++;
      }
    });

    const percent = Math.round((correctCount / QUIZ_QUESTIONS.length) * 100);
    const passed = correctCount >= 3; // Minimal 3 benar (75%)
    setQuizScore(percent);
    setIsPassed(passed);
    setIsQuizSubmitted(true);
    setReadSections((prev) => ({ ...prev, online_quiz: true }));

    if (passed) {
      sound.playSparkle();
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
      });
    } else {
      sound.playBrush();
    }
  };

  const handleResetQuiz = () => {
    setSelectedAnswers({});
    setIsQuizSubmitted(false);
    setQuizScore(0);
    setIsPassed(false);
  };

  const handleFinishAndUnlock = () => {
    sound.playSparkle();
    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.55 },
    });
    if (onCompleteReading) {
      onCompleteReading(quizScore || 100);
    } else if (onNavigateToGame) {
      onNavigateToGame();
    }
  };

  const allQuestionsAnswered = QUIZ_QUESTIONS.every((q) => selectedAnswers[q.id] !== undefined);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Mandatory Notification Banner if required */}
      {isMandatory && (
        <div className="rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-5 text-white shadow-lg border-2 border-amber-300 animate-in slide-in-from-top duration-300">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl flex-shrink-0 border border-white/30 animate-bounce">
                {reason === 'streak_reset' ? '🔥' : '🌟'}
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/25 text-white text-[10px] font-black uppercase tracking-wider mb-1">
                  <AlertTriangle className="w-3 h-3 text-amber-200" />
                  <span>
                    {reason === 'streak_reset' 
                      ? 'Streak Kembali 0 Hari • Wajib Pelajari Ulang & Ujian' 
                      : 'Akses Pertama Kali • Wajib Pelajari Tips & Lulus Ujian'}
                  </span>
                </div>
                <h3 className="font-display font-black text-lg sm:text-xl leading-tight">
                  {reason === 'streak_reset'
                    ? 'Segarkan Kembali Semangat Senyum Sehatmu!'
                    : 'Pelajari Tips Sikat Gigi & Ikuti Ujian Online!'}
                </h3>
                <p className="text-xs text-amber-100 mt-0.5 max-w-xl">
                  {reason === 'streak_reset'
                    ? 'Karena streak sikat gigimu kembali ke 0 hari, mari baca kembali tips menyikat dan ikuti ujian online agar Game 2 Menit terbuka kembali!'
                    : 'Sebelum Game 2 Menit dimulai, dokter gigi mewajibkanmu membaca panduan sikat gigi, mengenal kuman, dan lulus Ujian Online.'}
                </p>
              </div>
            </div>

            {/* Reading & Quiz Progress Indicator */}
            <div className="bg-white/15 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-white/20 text-center self-stretch sm:self-auto flex flex-col items-center justify-center min-w-[130px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-100">
                {isPassed ? 'Status Ujian' : 'Progres Materi'}
              </span>
              <span className="font-display font-black text-base text-white">
                {isPassed ? 'LULUS ✓' : `${completedSectionsCount} / ${totalSections} Bagian`}
              </span>
              <div className="w-full bg-black/20 h-1.5 rounded-full mt-1 overflow-hidden">
                <div 
                  className="bg-emerald-300 h-full rounded-full transition-all duration-300"
                  style={{ width: `${isPassed ? 100 : (completedSectionsCount / totalSections) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Passed Quiz & Game Unlocked Banner (accessible even if streak is 0) */}
      {!isMandatory && hasAlreadyPassedQuiz && (
        <div className="rounded-3xl bg-gradient-to-r from-emerald-500 via-teal-600 to-sky-600 p-4 sm:p-5 text-white shadow-md border-2 border-emerald-300/60 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl flex-shrink-0 border border-white/30">
              🎮
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/25 text-white text-[10px] font-black uppercase tracking-wider mb-0.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-200" />
                <span>Ujian Telah Selesai • Game 2 Menit Terbuka</span>
              </div>
              <h4 className="font-display font-black text-sm sm:text-base leading-snug">
                Game 2 Menit Dapat Diakses Kapan Saja
              </h4>
              <p className="text-xs text-emerald-100 max-w-xl">
                Karena kamu sudah menyelesaikan Ujian Online, Game 2 Menit dapat selalu kamu mainkan untuk membasmi kuman, bahkan jika streak kembali menjadi 0 hari!
              </p>
            </div>
          </div>
          {onNavigateToGame && (
            <button
              onClick={onNavigateToGame}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white text-emerald-800 font-display font-black text-xs hover:bg-emerald-50 shadow-md transition cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-95"
            >
              <span>Mainkan Game 2 Menit 🪥</span>
            </button>
          )}
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-3xl shadow-sm border border-sky-100">
        <button
          onClick={() => handleSelectSection('techniques')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-display font-bold text-xs md:text-sm transition cursor-pointer relative ${
            activeSection === 'techniques'
              ? 'bg-sky-500 text-white shadow-md'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>1. Cara Sikat Gigi</span>
          {readSections.techniques && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" title="Sudah dibuka" />
          )}
        </button>

        <button
          onClick={() => handleSelectSection('monsters')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-display font-bold text-xs md:text-sm transition cursor-pointer relative ${
            activeSection === 'monsters'
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>2. Ensiklopedia Kuman</span>
          {readSections.monsters && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" title="Sudah dibuka" />
          )}
        </button>

        <button
          onClick={() => handleSelectSection('offline_guide')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-display font-bold text-xs md:text-sm transition cursor-pointer relative ${
            activeSection === 'offline_guide'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <WifiOff className="w-4 h-4" />
          <span>3. Panduan Uji Offline (PWA)</span>
          {readSections.offline_guide && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" title="Sudah dibuka" />
          )}
        </button>

        <button
          onClick={() => handleSelectSection('online_quiz')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-display font-bold text-xs md:text-sm transition cursor-pointer relative ${
            activeSection === 'online_quiz'
              ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-md'
              : isMandatory && !isPassed
              ? 'bg-rose-100 text-rose-800 border border-rose-300 font-extrabold shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>4. Ujian Online Dokter Cilik</span>
          {isPassed ? (
            <span className="px-1.5 py-0.2 bg-emerald-500 text-white text-[9px] font-black rounded-md">
              LULUS ⭐
            </span>
          ) : isMandatory ? (
            <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[9px] font-black rounded-md animate-pulse">
              WAJIB
            </span>
          ) : null}
        </button>
      </div>

      {/* 4 Langkah Sikat Gigi yang Benar */}
      {activeSection === 'techniques' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="bg-gradient-to-r from-sky-500 to-blue-600 rounded-3xl p-6 text-white shadow-lg">
            <h3 className="font-display font-black text-2xl">
              Panduan Dokter Gigi: 4 Langkah Senyum Sehat 🌟
            </h3>
            <p className="mt-1 text-xs md:text-sm text-sky-100">
              Menyikat gigi bukan sekadar cepat-cepatan, tetapi membersihkan seluruh permukaan gigi secara merata selama 2 menit (30 detik per kuadran)!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Step 1 */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-sky-100 flex gap-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 font-display font-black text-xl flex items-center justify-center flex-shrink-0">
                1
              </div>
              <div>
                <h4 className="font-display font-bold text-base text-slate-800">
                  Gerakan Memutar 45 Derajat 🔄
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Posisikan bulu sikat miring 45 derajat di perbatasan gusi dan gigi. Gerakkan sikat dengan putaran lembut melingkar kecil, bukan maju mundur terlalu keras.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-sky-100 flex gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 font-display font-black text-xl flex items-center justify-center flex-shrink-0">
                2
              </div>
              <div>
                <h4 className="font-display font-bold text-base text-slate-800">
                  Bersihkan Seluruh 4 Kuadran (30 Detik Tiap Area) ⏱️
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Bagi mulut menjadi 4 bagian (kanan atas, kiri atas, kiri bawah, kanan bawah). Sikat masing-masing bagian selama 30 detik untuk mencapai durasi ideal 2 menit.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-sky-100 flex gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 font-display font-black text-xl flex items-center justify-center flex-shrink-0">
                3
              </div>
              <div>
                <h4 className="font-display font-bold text-base text-slate-800">
                  Sikat Permukaan Mengunyah & Bagian Belakang 🦷
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Gigi geraham belakang tempat menumpuknya kuman gula. Sikat permukaan kunyah dengan gerakan maju-mundur pendek dan bersihkan bagian lidah.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-sky-100 flex gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-800 font-display font-black text-xl flex items-center justify-center flex-shrink-0">
                4
              </div>
              <div>
                <h4 className="font-display font-bold text-base text-slate-800">
                  Wajib 2x Sehari (Pagi & Malam) ☀️🌙
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Sikat gigi pagi setelah sarapan untuk membersihkan sisa makanan, dan malam sebelum tidur agar kuman tidak merusak email gigi semalaman.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => handleSelectSection('monsters')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-purple-600 text-white font-bold text-xs shadow-md hover:bg-purple-700 transition cursor-pointer"
            >
              <span>Lanjut ke Mengenal Kuman</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Ensiklopedia Kuman Gigi */}
      {activeSection === 'monsters' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-3xl p-6 text-white shadow-lg">
            <h3 className="font-display font-black text-2xl">
              Kenali 4 Monster Kuman Musuh Gigimu 👾
            </h3>
            <p className="mt-1 text-xs md:text-sm text-purple-100">
              Kuman-kuman ini suka berpesta jika kamu lupa menyikat gigi. Kenali kelemahan mereka dan basmi mereka di game 2 menit!
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Monster 1 */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-rose-100 flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-500 text-white flex items-center justify-center text-3xl shadow-md flex-shrink-0">
                🍬
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-500">Tipe Manis</span>
                <h4 className="font-display font-bold text-lg text-slate-800">Kuman Gula (Strepto)</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Muncul setelah kamu makan permen, cokelat, atau biskuit. Kuman ini memfermentasi gula menjadi zat lengket yang melubangi gigi.
                </p>
              </div>
            </div>

            {/* Monster 2 */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-amber-100 flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-3xl shadow-md flex-shrink-0">
                👾
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-500">Tipe Lapisan</span>
                <h4 className="font-display font-bold text-lg text-slate-800">Plak Kuning (Biofilm)</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Lapisan tipis licin berwarna kekuningan yang menempel di leher gigi. Plak ini membuat gigi tampak kusam dan menyebabkan bau mulut.
                </p>
              </div>
            </div>

            {/* Monster 3 */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-purple-100 flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-600 text-white flex items-center justify-center text-3xl shadow-md flex-shrink-0">
                🧪
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-600">Tipe Korosif</span>
                <h4 className="font-display font-bold text-lg text-slate-800">Asam Korosif (Acid)</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Zat asam hasil buangan kuman yang mengikis lapisan email pelindung gigi, membuat gigi menjadi ngilu dan mudah berlubang.
                </p>
              </div>
            </div>

            {/* Monster 4 */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-cyan-100 flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-cyan-600 text-white flex items-center justify-center text-3xl shadow-md flex-shrink-0">
                👹
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-600">Tipe Keras</span>
                <h4 className="font-display font-bold text-lg text-slate-800">Monster Karang (Tartar)</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Plak yang mengeras karena mineral air liur. Jika sudah mengeras menjadi karang, hanya dokter gigi dengan alat scaler yang bisa membersihkannya!
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <button
              onClick={() => handleSelectSection('techniques')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition cursor-pointer"
            >
              <span>← Kembali ke Tips</span>
            </button>
            <button
              onClick={() => handleSelectSection('offline_guide')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 text-white font-bold text-xs shadow-md hover:bg-emerald-700 transition cursor-pointer"
            >
              <span>Lanjut ke Panduan Uji Offline</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Panduan Uji Offline PWA */}
      {activeSection === 'offline_guide' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-6 text-white shadow-lg">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-emerald-100 text-xs font-black uppercase tracking-wider mb-2">
              <WifiOff className="w-3.5 h-3.5 text-emerald-200" />
              <span>Full PWA Offline Support</span>
            </div>
            <h3 className="font-display font-black text-2xl">
              Panduan Menguji Fitur Offline (Tanpa Internet) 📶🚫
            </h3>
            <p className="mt-1 text-xs md:text-sm text-emerald-100">
              GigiJuara dirancang dengan standar PWA modern. Aplikasi tetap dapat dibuka, game 2 menit dapat dimainkan, dan suara sikat gigi tetap bersuara meski tanpa kuota internet!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cara 1: Laptop / Komputer */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  💻
                </div>
                <h4 className="font-display font-bold text-base text-slate-800">
                  Uji di Komputer / Laptop (DevTools)
                </h4>
              </div>

              <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside leading-relaxed">
                <li>Buka website ini di Google Chrome / Edge / Firefox.</li>
                <li>Tekan tombol <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-800">F12</code> atau klik kanan lalu pilih <strong>Inspect (Periksa)</strong>.</li>
                <li>Masuk ke tab <strong>Network (Jaringan)</strong>.</li>
                <li>Ubah status jaringan dari <em>"No throttling"</em> menjadi <strong>"Offline"</strong>.</li>
                <li>Tekan tombol Refresh (<code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-800">Ctrl + R</code> / <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-800">F5</code>).</li>
                <li><strong className="text-emerald-700">Hasil:</strong> Halaman web tetap terbuka sempurna, game 2 menit dapat dimainkan, suara Web Audio API berbunyi, dan streak tersimpan!</li>
              </ol>
            </div>

            {/* Cara 2: Smartphone Android / iPhone */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-800 flex items-center justify-center font-bold">
                  📲
                </div>
                <h4 className="font-display font-bold text-base text-slate-800">
                  Uji di Smartphone (Mode Pesawat)
                </h4>
              </div>

              <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside leading-relaxed">
                <li>Buka website di browser Chrome (Android) atau Safari (iPhone).</li>
                <li>Klik tombol <strong>"Install Aplikasi"</strong> di bagian atas atau opsi "Tambah ke Layar Utama".</li>
                <li>Setelah ikon GigiJuara muncul di layar utama HP, aktifkan <strong>Mode Pesawat (Airplane Mode)</strong> atau matikan WiFi dan Kuota Data.</li>
                <li>Buka aplikasi GigiJuara dari ikon di layar HP.</li>
                <li><strong className="text-sky-700">Hasil:</strong> Aplikasi terbuka seperti aplikasi asli (native app) dengan layar penuh, tanpa internet!</li>
              </ol>
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <button
              onClick={() => handleSelectSection('monsters')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition cursor-pointer"
            >
              <span>← Kembali ke Ensiklopedia Kuman</span>
            </button>
            <button
              onClick={() => handleSelectSection('online_quiz')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-600 text-white font-bold text-xs shadow-md hover:from-amber-600 hover:to-rose-700 transition cursor-pointer"
            >
              <span>Lanjut ke Ujian Online 📝</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 4. UJIAN ONLINE / KUIS DOKTER CILIK GIGIJUARA */}
      {activeSection === 'online_quiz' && (
        <div className="space-y-5 animate-in fade-in">
          <div className="bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 rounded-3xl p-6 text-white shadow-lg">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-amber-100 text-xs font-black uppercase tracking-wider mb-2">
              <Award className="w-3.5 h-3.5 text-amber-200" />
              <span>Sertifikasi Dokter Cilik GigiJuara</span>
            </div>
            <h3 className="font-display font-black text-2xl">
              Ujian Online Pemahaman Sikat Gigi & Tips Kesehatan 📝
            </h3>
            <p className="mt-1 text-xs md:text-sm text-amber-100">
              Jawab 4 pertanyaan di bawah ini untuk membuktikan pemahamanmu tentang teknik sikat gigi yang benar dan cara uji offline! Nilai minimal kelulusan adalah <strong>75%</strong> (3 dari 4 benar).
            </p>
          </div>

          {/* Quiz Result Card if Submitted */}
          {isQuizSubmitted && (
            <div
              className={`p-6 rounded-3xl border-2 text-center animate-in zoom-in-95 duration-200 ${
                isPassed
                  ? 'bg-gradient-to-br from-emerald-50 to-teal-100/60 border-emerald-300 shadow-md'
                  : 'bg-gradient-to-br from-rose-50 to-amber-100/60 border-rose-300 shadow-md'
              }`}
            >
              <div className="text-4xl mb-2">
                {isPassed ? '🏆' : '📚'}
              </div>
              <h4 className="font-display font-black text-2xl text-slate-900">
                {isPassed ? `SELAMAT, ${userName.toUpperCase()}! KAMU LULUS UJIAN DOKTER CILIK! 🎉` : 'Belum Mencapai Nilai Kelulusan (75%)'}
              </h4>
              <p className="text-xs text-slate-700 mt-1 max-w-lg mx-auto">
                {isPassed
                  ? `Hebat sekali ${userName}! Kamu berhasil meraih skor ${quizScore}%. Sertifikat Dokter Cilik resmi diterbitkan atas namamu. Game 2 Menit telah terbuka!`
                  : `Skor kamu: ${quizScore}%. Jangan khawatir, baca kembali materi pada tab di atas lalu ulangi kuis ini untuk membuka Game 2 Menit!`}
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                {isPassed ? (
                  <button
                    onClick={handleFinishAndUnlock}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-display font-black text-sm shadow-xl hover:from-emerald-600 hover:to-green-700 transition cursor-pointer flex items-center gap-2 active:scale-95"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>Buka Game 2 Menit Sekarang (+25 Bintang ⭐) 🚀</span>
                  </button>
                ) : (
                  <button
                    onClick={handleResetQuiz}
                    className="px-5 py-2.5 rounded-2xl bg-rose-600 text-white font-bold text-xs shadow-md hover:bg-rose-700 transition cursor-pointer flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Ulangi Ujian Online 🔄</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Quiz Question Cards */}
          <div className="space-y-4">
            {QUIZ_QUESTIONS.map((q, qIndex) => {
              const isAnswered = selectedAnswers[q.id] !== undefined;
              const isCorrect = isQuizSubmitted && selectedAnswers[q.id] === q.correctIndex;
              const isWrong = isQuizSubmitted && isAnswered && selectedAnswers[q.id] !== q.correctIndex;

              return (
                <div
                  key={q.id}
                  className={`bg-white p-5 rounded-3xl shadow-sm border transition-all ${
                    isQuizSubmitted
                      ? isCorrect
                        ? 'border-emerald-300 bg-emerald-50/20'
                        : isWrong
                        ? 'border-rose-300 bg-rose-50/20'
                        : 'border-slate-200'
                      : 'border-sky-100 hover:border-sky-200'
                  }`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <span className="w-7 h-7 rounded-xl bg-sky-100 text-sky-800 font-display font-black text-xs flex items-center justify-center flex-shrink-0">
                      {qIndex + 1}
                    </span>
                    <div className="flex-1">
                      <h4 className="font-display font-bold text-sm sm:text-base text-slate-900 leading-snug">
                        {q.question}
                      </h4>
                    </div>
                  </div>

                  {/* Options List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 ml-0 sm:ml-10">
                    {q.options.map((option, optIdx) => {
                      const isSelected = selectedAnswers[q.id] === optIdx;
                      const isOptionCorrect = q.correctIndex === optIdx;

                      let btnStyle = 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-sky-50 hover:border-sky-300';
                      if (isQuizSubmitted) {
                        if (isOptionCorrect) {
                          btnStyle = 'bg-emerald-500 text-white border-emerald-600 font-bold shadow-xs';
                        } else if (isSelected && !isOptionCorrect) {
                          btnStyle = 'bg-rose-500 text-white border-rose-600 font-bold';
                        } else {
                          btnStyle = 'bg-slate-50 text-slate-400 border-slate-100 opacity-60';
                        }
                      } else if (isSelected) {
                        btnStyle = 'bg-sky-500 text-white border-sky-600 font-bold shadow-md';
                      }

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => handleAnswerSelect(q.id, optIdx)}
                          disabled={isQuizSubmitted}
                          className={`w-full text-left p-3 rounded-2xl border text-xs transition cursor-pointer flex items-center justify-between gap-2 ${btnStyle}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-black/10 flex items-center justify-center text-[10px] font-bold">
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span>{option}</span>
                          </div>
                          {isQuizSubmitted && isOptionCorrect && (
                            <CheckCircle2 className="w-4 h-4 text-white flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Explanation after submission */}
                  {isQuizSubmitted && (
                    <div className="mt-3 ml-0 sm:ml-10 p-3 rounded-2xl bg-slate-100/70 border border-slate-200 text-[11px] text-slate-700 leading-relaxed">
                      <strong>Penjelasan Dokter Gigi:</strong> {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Submit Action */}
          {!isQuizSubmitted && (
            <div className="p-4 bg-white rounded-3xl shadow-sm border border-sky-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-600">
                {allQuestionsAnswered ? (
                  <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Semua 4 pertanyaan telah dijawab. Siap kirim!</span>
                  </span>
                ) : (
                  <span>Pilih jawaban untuk semua pertanyaan sebelum mengirimkan ujian.</span>
                )}
              </div>

              <button
                onClick={handleSubmitQuiz}
                disabled={!allQuestionsAnswered}
                className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white font-display font-black text-xs shadow-lg transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Kirim Jawaban Ujian Online 📝</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Confirmation & Completion Card */}
      <div className="rounded-3xl bg-white p-6 shadow-sm border border-sky-100 text-center space-y-4">
        <div className="max-w-xl mx-auto space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 text-xl shadow-xs">
            {isPassed ? '🎓' : '✨'}
          </div>
          <h4 className="font-display font-black text-xl text-slate-900">
            {isPassed
              ? 'Status: Lulus Ujian Dokter Cilik GigiJuara!'
              : isMandatory 
              ? 'Wajib Lulus Ujian Online untuk Membuka Game 2 Menit' 
              : 'Uji Pemahaman Kesehatan Gigimu Hari Ini!'}
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            {isPassed
              ? 'Kamu telah menyelesaikan materi edukasi dan lulus ujian online! Game 2 Menit telah terbuka dan siap dimainkan.'
              : isMandatory
              ? 'Pastikan kamu membaca tips 4 kuadran, memahami kuman, dan menyelesaikan Ujian Online di atas untuk membuka Game 2 Menit!'
              : 'Materi edukasi dan ujian online dapat kamu ulangi kapan saja untuk menyegarkan ingatan tentang kebersihan gigi.'}
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          {isPassed ? (
            <button
              onClick={handleFinishAndUnlock}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-display font-black text-sm shadow-xl hover:from-emerald-600 hover:to-green-700 transition cursor-pointer flex items-center justify-center gap-2 active:scale-95"
            >
              <Unlock className="w-5 h-5" />
              <span>Buka Game 2 Menit Sekarang (+25 Bintang ⭐) 🚀</span>
            </button>
          ) : (
            <button
              onClick={() => handleSelectSection('online_quiz')}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-600 text-white font-display font-black text-sm shadow-xl hover:from-amber-600 hover:to-rose-700 transition cursor-pointer flex items-center justify-center gap-2 active:scale-95"
            >
              <FileText className="w-5 h-5" />
              <span>Ikuti Ujian Online Sekarang 📝</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
