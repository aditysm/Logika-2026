import { useState, useMemo, useEffect } from 'react';
import {
  Trophy,
  Medal,
  Crown,
  Clock,
  Calendar,
  Flame,
  Search,
  Users,
  ArrowLeft,
  TrendingUp,
  Zap,
  ShieldCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Mahasiswa, PhotoRecord } from '../types';
import { normalizeNim } from '../lib/photoStorage';
import { CustomDatePicker, formatDateToYMD } from './CustomDatePicker';
import { CustomSelect, CustomSelectOption } from './CustomSelect';

interface LeaderboardPageProps {
  students: Mahasiswa[];
  photoRecords: PhotoRecord[];
  currentUser?: Mahasiswa | null;
  onBack: () => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

// Clean Minimalist WhatsApp Icon SVG
function WhatsAppIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.699c.97.53 1.771.82 2.796.82 3.185 0 5.77-2.586 5.77-5.766.001-3.182-2.585-5.768-5.77-5.768zm0-2.172c4.418 0 8 3.582 8 8 0 1.505-.418 2.913-1.144 4.119l1.144 4.181-4.281-1.122c-1.129.626-2.428.982-3.719.982-4.418 0-8-3.582-8-8 0-4.418 3.582-8 8-8zm3.262 10.974c-.139.388-.809.736-1.129.774-.316.038-.724.058-2.34-.607-1.944-.799-3.204-2.766-3.301-2.895-.097-.129-.789-1.05-.789-2.001 0-.951.5-1.42.678-1.614.179-.193.389-.242.518-.242.13 0 .259.002.372.008.12.006.279-.045.437.334.162.388.552 1.345.6 1.442.049.097.081.21.016.339-.065.129-.097.21-.194.323-.097.113-.205.253-.292.34-.097.097-.199.202-.086.396.113.194.502.828 1.077 1.341.74.66 1.365.865 1.559.962.194.097.307.081.421-.049.113-.129.486-.566.615-.76.13-.194.259-.162.437-.097.178.065 1.133.534 1.327.631.194.097.324.145.372.226.049.081.049.469-.09 1.025z" />
    </svg>
  );
}

export function LeaderboardPage({
  students,
  photoRecords,
  currentUser,
  onBack,
}: LeaderboardPageProps) {
  // Format local date YYYY-MM-DD
  const todayStr = useMemo(() => {
    return formatDateToYMD(new Date());
  }, []);

  const [filterPeriod, setFilterPeriod] = useState<'today' | 'custom' | 'all'>('today');
  const [customDate, setCustomDate] = useState<string>(todayStr);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const ITEMS_PER_PAGE = 15;

  // Selected date key for daily reset calculation (cannot be after today)
  const activeDateKey = useMemo(() => {
    if (filterPeriod === 'today') return todayStr;
    if (filterPeriod === 'custom') {
      return customDate > todayStr ? todayStr : customDate;
    }
    return 'ALL';
  }, [filterPeriod, todayStr, customDate]);

  // Total companion target (excluding oneself: e.g. 132 or students.length - 1)
  const totalTarget = useMemo(() => {
    return students.length > 1 ? students.length - 1 : Math.max(students.length, 1);
  }, [students.length]);

  // Extract all unique groups
  const groupOptions = useMemo(() => {
    const groups = new Set<string>();
    students.forEach((s) => {
      if (s.kelompok) groups.add(s.kelompok);
    });
    return Array.from(groups).sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || '0', 10);
      const numB = parseInt(b.match(/\d+/)?.[0] || '0', 10);
      return numA - numB;
    });
  }, [students]);

  // Custom select options for Kelompok dropdown
  const customGroupSelectOptions: CustomSelectOption[] = useMemo(() => {
    const allOpt: CustomSelectOption = {
      value: 'ALL',
      label: 'Semua Kelompok',
      badge: students.length,
      icon: <Users className="w-3.5 h-3.5" />,
    };
    const groupOpts: CustomSelectOption[] = groupOptions.map((grp) => {
      const countInGrp = students.filter((s) => s.kelompok === grp).length;
      return {
        value: grp,
        label: grp,
        badge: countInGrp,
      };
    });
    return [allOpt, ...groupOpts];
  }, [students, groupOptions]);

  // Aggregate stats per student for the selected period
  // CRITICAL RULE: "dia yg upload itu dihitung sebagai capaian"
  const leaderboardData = useMemo(() => {
    const studentMap = new Map<
      string,
      {
        student: Mahasiswa;
        count: number; // Unique companion targets uploaded by this student
        totalUploads: number; // Total photos uploaded by this student
        uniqueTargets: Set<string>;
        firstUploadTimestamp: number | null;
        latestUploadTimestamp: number | null;
      }
    >();

    // Initialize map for all students
    students.forEach((s) => {
      studentMap.set(normalizeNim(s.nim), {
        student: s,
        count: 0,
        totalUploads: 0,
        uniqueTargets: new Set<string>(),
        firstUploadTimestamp: null,
        latestUploadTimestamp: null,
      });
    });

    // Process photo records: STRICTLY ONLY ATTRIBUTE TO UPLOADER
    (photoRecords || []).forEach((r) => {
      if (!r.timestamp) return;
      const recDate = new Date(r.timestamp);
      if (isNaN(recDate.getTime())) return;

      const recDateStr = `${recDate.getFullYear()}-${String(recDate.getMonth() + 1).padStart(2, '0')}-${String(recDate.getDate()).padStart(2, '0')}`;

      // Check if record falls in active period
      if (activeDateKey !== 'ALL' && recDateStr !== activeDateKey) {
        return;
      }

      const uploaderNorm = normalizeNim(r.uploaderNim);
      if (uploaderNorm && studentMap.has(uploaderNorm)) {
        const entry = studentMap.get(uploaderNorm)!;
        entry.totalUploads += 1;

        const targetNorm = normalizeNim(r.targetNim);
        if (targetNorm && targetNorm !== uploaderNorm) {
          entry.uniqueTargets.add(targetNorm);
        } else {
          entry.uniqueTargets.add(`photo-${r.id || entry.totalUploads}`);
        }

        entry.count = entry.uniqueTargets.size;

        const timeVal = recDate.getTime();
        if (entry.firstUploadTimestamp === null || timeVal < entry.firstUploadTimestamp) {
          entry.firstUploadTimestamp = timeVal;
        }
        if (entry.latestUploadTimestamp === null || timeVal > entry.latestUploadTimestamp) {
          entry.latestUploadTimestamp = timeVal;
        }
      }
    });

    // Convert map to ranked array
    const list = Array.from(studentMap.values()).map((item) => {
      const percentage = totalTarget > 0 ? Math.round((item.count / totalTarget) * 1000) / 10 : 0;
      return {
        ...item,
        percentage,
      };
    });

    // Sorting:
    // 1. count DESC (progres teman terbanyak yang diupload)
    // 2. totalUploads DESC (total foto diunggah)
    // 3. latestUploadTimestamp ASC (siapa yang menyelesaikan lebih awal pada hari/periode tersebut)
    // 4. nama ASC
    list.sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      if (b.totalUploads !== a.totalUploads) {
        return b.totalUploads - a.totalUploads;
      }
      if (a.count > 0 && b.count > 0) {
        if (a.latestUploadTimestamp && b.latestUploadTimestamp) {
          return a.latestUploadTimestamp - b.latestUploadTimestamp;
        }
      }
      return a.student.namaLengkap.localeCompare(b.student.namaLengkap);
    });

    return list;
  }, [students, photoRecords, activeDateKey, totalTarget]);

  // Filtered by search and group
  const filteredData = useMemo(() => {
    let res = leaderboardData;
    if (selectedGroup !== 'ALL') {
      res = res.filter((item) => item.student.kelompok === selectedGroup);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      res = res.filter(
        (item) =>
          item.student.namaLengkap.toLowerCase().includes(q) ||
          item.student.nim.toLowerCase().includes(q) ||
          item.student.kelompok.toLowerCase().includes(q)
      );
    }
    return res;
  }, [leaderboardData, selectedGroup, searchQuery]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedGroup, filterPeriod, customDate]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredData.length / ITEMS_PER_PAGE));
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredData, currentPage, ITEMS_PER_PAGE]);

  // Top 3 Podium (from active filtered data)
  const top1 = filteredData[0];
  const top2 = filteredData[1];
  const top3 = filteredData[2];

  // Current user's rank in active view
  const currentUserEntry = useMemo(() => {
    if (!currentUser) return null;
    const norm = normalizeNim(currentUser.nim);
    const index = filteredData.findIndex((item) => normalizeNim(item.student.nim) === norm);
    if (index === -1) return null;
    return {
      rank: index + 1,
      ...filteredData[index],
    };
  }, [currentUser, filteredData]);

  // Grand prize evaluation: Check overall (all-time & all-groups) completed 100% users
  const overall100PercentWinners = useMemo(() => {
    return leaderboardData
      .filter((item) => item.count >= totalTarget && totalTarget > 0)
      .slice(0, 3);
  }, [leaderboardData, totalTarget]);

  // Check if current user is qualified for prize claim (Top 3 of all-time with 100% completion)
  const isCurrentUserGrandWinner = useMemo(() => {
    if (!currentUser) return null;
    const userNorm = normalizeNim(currentUser.nim);
    const winnerIndex = overall100PercentWinners.findIndex(
      (w) => normalizeNim(w.student.nim) === userNorm
    );
    return winnerIndex !== -1 ? winnerIndex + 1 : null;
  }, [currentUser, overall100PercentWinners]);

  // Function to build WhatsApp Claim URL
  const getClaimWaUrl = (positionRank: number) => {
    if (!currentUser) return 'https://wa.me/6285738565172';
    const textMessage = `Halo Admin, saya ${currentUser.namaLengkap} (${currentUser.nim}, ${currentUser.kelompok}) pemenang top score & kecepatan upload logika 2026 dengan posisi ke-${positionRank}, ingin klaim hadiah`;
    return `https://wa.me/6285738565172?text=${encodeURIComponent(textMessage)}`;
  };

  // Format display date label
  const formattedPeriodLabel = useMemo(() => {
    if (filterPeriod === 'all') return 'Sepanjang Masa (Akumulasi Total)';
    const dateObj = filterPeriod === 'today' ? new Date() : new Date(customDate);

    if (isNaN(dateObj.getTime())) return 'Hari Ini';
    return dateObj.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [filterPeriod, customDate]);

  // Format time (e.g. 17:56 WITA)
  const formatTime = (ts: number | null) => {
    if (!ts) return '-';
    const d = new Date(ts);
    const timeStr = d.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${timeStr} WITA`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="space-y-4 sm:space-y-6 max-w-5xl mx-auto pb-20"
    >
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 sm:p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95 transition-all cursor-pointer shrink-0"
            title="Kembali"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-200/80">
                <Trophy className="w-3 h-3 text-amber-500" />
                <span>Papan Peringkat</span>
              </span>
              {filterPeriod === 'today' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Flame className="w-3 h-3 text-emerald-500" />
                  <span>Reset Harian</span>
                </span>
              )}
            </div>
            <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight mt-1 truncate">
              Top Score &amp; Kecepatan Upload
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 truncate">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{formattedPeriodLabel}</span>
            </p>
          </div>
        </div>

        {/* Button Accordion Toggle: Ketentuan Capaian Papan Peringkat */}
        <div className="shrink-0">
          <button
            id="btn-toggle-rules-panel"
            type="button"
            onClick={() => setIsRulesOpen((prev) => !prev)}
            className={`w-full sm:w-auto inline-flex items-center justify-between sm:justify-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer border shadow-2xs ${
              isRulesOpen
                ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-500/20'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/90'
            }`}
            title="Lihat Ketentuan Capaian Papan Peringkat"
          >
            <span className="flex items-center gap-2">
              <ShieldCheck className={`w-4 h-4 ${isRulesOpen ? 'text-white' : 'text-blue-600'}`} />
              <span>Ketentuan Capaian Papan Peringkat</span>
            </span>
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                isRulesOpen ? 'rotate-180 text-white' : 'text-slate-400'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Collapsible Panel: Ketentuan Capaian Papan Peringkat (Minimalist & Clean) */}
      <AnimatePresence>
        {isRulesOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-slate-50 border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Aturan &amp; Ketentuan Penghitungan Skor</span>
                </h4>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  Sistem Validasi Uploader
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs text-slate-700">
                <div className="p-3 bg-white rounded-2xl border border-slate-200/80 space-y-1 shadow-2xs">
                  <p className="font-bold text-slate-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Dihitung dari Unggahan Anda Sendiri</span>
                  </p>
                  <p className="text-[11px] text-slate-600 leading-relaxed pl-5">
                    Hanya foto yang diunggah langsung oleh akun Anda (sebagai uploader dengan NIM Anda) yang dihitung sebagai capaian progres.
                  </p>
                </div>

                <div className="p-3 bg-white rounded-2xl border border-slate-200/80 space-y-1 shadow-2xs">
                  <p className="font-bold text-slate-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Objek Foto Tidak Menambah Poin Anda</span>
                  </p>
                  <p className="text-[11px] text-slate-600 leading-relaxed pl-5">
                    Jika Anda difoto oleh teman lain, foto tersebut menjadi capaian uploader yang mengunggah, bukan untuk akun Anda.
                  </p>
                </div>

                <div className="p-3 bg-white rounded-2xl border border-slate-200/80 space-y-1 shadow-2xs">
                  <p className="font-bold text-slate-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Prioritas Urutan &amp; Waktu Tercepat</span>
                  </p>
                  <p className="text-[11px] text-slate-600 leading-relaxed pl-5">
                    Peringkat diurutkan dari progres teman unik terbanyak, total foto diunggah, dan jam upload terakhir paling cepat (WITA).
                  </p>
                </div>

                <div className="p-3 bg-white rounded-2xl border border-slate-200/80 space-y-1 shadow-2xs">
                  <p className="font-bold text-slate-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Klaim Hadiah 100% (Semua Waktu)</span>
                  </p>
                  <p className="text-[11px] text-slate-600 leading-relaxed pl-5">
                    Tiga peserta pertama yang mencapai 100% ({totalTarget} foto) di filter Semua Waktu akan terkunci permanen dan dapat langsung mengklaim hadiah ke Admin.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Period Filter Tabs & Date Picker ("Filter Hari" placed immediately BEFORE the Date Picker) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/90 rounded-2xl p-2.5 sm:p-3 shadow-2xs">
        {/* Period Buttons */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
          <button
            id="btn-filter-period-today"
            type="button"
            onClick={() => setFilterPeriod('today')}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              filterPeriod === 'today'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Hari Ini</span>
          </button>

          <button
            id="btn-filter-period-all"
            type="button"
            onClick={() => setFilterPeriod('all')}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              filterPeriod === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Semua Waktu</span>
          </button>
        </div>

        {/* "Filter Hari" title placed BEFORE the Date Picker */}
        <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          <div className="flex items-center gap-1 text-xs font-bold text-slate-700 shrink-0">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>Filter Hari:</span>
          </div>
          <CustomDatePicker
            value={filterPeriod === 'custom' ? customDate : todayStr}
            onChange={(newDate) => {
              setCustomDate(newDate);
              setFilterPeriod('custom');
            }}
            maxDate={todayStr}
            disabled={filterPeriod === 'all'}
            className="w-full sm:w-auto"
          />
        </div>
      </div>

      {/* User's Own Progress Highlight Card */}
      {currentUserEntry && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-4 sm:p-5 text-white shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10 pointer-events-none">
            <Trophy className="w-40 sm:w-48 h-40 sm:h-48" />
          </div>
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white font-black text-base sm:text-lg border border-white/30 shrink-0">
                #{currentUserEntry.rank}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-[11px] font-bold text-blue-100 uppercase tracking-wider truncate">
                  Posisi Anda {filterPeriod === 'today' ? 'Hari Ini' : ''}
                </p>
                <h3 className="text-sm sm:text-base font-bold truncate max-w-xs sm:max-w-sm">
                  {currentUserEntry.student.namaLengkap}
                </h3>
                <p className="text-xs text-blue-100 truncate">
                  {currentUserEntry.student.kelompok} • {currentUserEntry.student.nim}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:flex items-center gap-2 sm:gap-4 bg-white/10 backdrop-blur-xs p-2.5 sm:px-4 sm:py-2.5 rounded-2xl border border-white/20">
              <div className="text-center sm:text-left">
                <p className="text-[9px] sm:text-[10px] text-blue-100 uppercase font-bold truncate">Teman Difoto</p>
                <p className="text-base sm:text-lg font-black leading-none mt-1">
                  {currentUserEntry.count}{' '}
                  <span className="text-[10px] sm:text-xs font-normal opacity-80">/ {totalTarget}</span>
                </p>
              </div>
              <div className="hidden sm:block h-8 w-px bg-white/20" />
              <div className="text-center sm:text-left border-x border-white/20 sm:border-0 px-2 sm:px-0">
                <p className="text-[9px] sm:text-[10px] text-blue-100 uppercase font-bold truncate">Progres</p>
                <p className="text-base sm:text-lg font-black leading-none mt-1 text-amber-300">
                  {currentUserEntry.percentage}%
                </p>
              </div>
              {currentUserEntry.latestUploadTimestamp && (
                <>
                  <div className="hidden sm:block h-8 w-px bg-white/20" />
                  <div className="text-center sm:text-left">
                    <p className="text-[9px] sm:text-[10px] text-blue-100 uppercase font-bold truncate">Terakhir</p>
                    <p className="text-[11px] sm:text-sm font-bold leading-none mt-1 flex items-center justify-center sm:justify-start gap-1">
                      <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-200 shrink-0" />
                      <span className="truncate">{formatTime(currentUserEntry.latestUploadTimestamp)}</span>
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TOP 3 PODIUM */}
      {top1 && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-3.5 sm:p-6 md:p-8 shadow-xs">
          <div className="text-center mb-5 sm:mb-8">
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center justify-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <span>Podium Juara</span>
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Dihitung berdasarkan jumlah foto yang diunggah langsung oleh mahasiswa (Uploader) dan waktu unggah tercepat
            </p>
          </div>

          <div className="grid grid-cols-3 gap-1.5 sm:gap-4 md:gap-6 items-end max-w-2xl mx-auto pt-6 pb-2">
            {/* 2ND PLACE PODIUM (SILVER - LEFT) */}
            <div className="flex flex-col items-center min-w-0">
              {top2 && top2.count > 0 ? (
                <div className="flex flex-col items-center w-full min-w-0">
                  <div className="relative mb-1.5 sm:mb-2 flex flex-col items-center">
                    <div className="w-11 sm:w-16 h-11 sm:h-16 rounded-xl sm:rounded-2xl bg-slate-100 border-2 border-slate-300 text-slate-700 flex items-center justify-center font-black text-base sm:text-xl shadow-xs">
                      {top2.student.namaLengkap.charAt(0)}
                    </div>
                    <span className="absolute -top-2.5 sm:-top-3 px-1.5 sm:px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 border border-slate-300 text-[9px] sm:text-[10px] font-extrabold flex items-center gap-0.5 shadow-2xs">
                      <Medal className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-500" />
                      <span>#2</span>
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm font-bold text-slate-900 text-center truncate w-full px-0.5">
                    {top2.student.namaPanggilan || top2.student.namaLengkap.split(' ')[0]}
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-slate-500 truncate w-full text-center px-0.5">
                    {top2.student.kelompok}
                  </p>

                  <div className="mt-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[8px] sm:text-[10px] font-bold text-center w-full max-w-[95px] sm:max-w-none truncate">
                    <span>{top2.count}/{totalTarget}</span>
                    <span className="opacity-75 font-normal ml-0.5">({top2.percentage}%)</span>
                  </div>

                  {/* 100% Locked badge if applicable */}
                  {top2.count >= totalTarget && totalTarget > 0 && (
                    <span className="mt-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[8px] font-extrabold shadow-2xs">
                      <Lock className="w-2.5 h-2.5" />
                      <span>100% Terkunci</span>
                    </span>
                  )}

                  {top2.latestUploadTimestamp && (
                    <span className="inline-flex items-center justify-center gap-0.5 sm:gap-1 text-[8px] sm:text-[9px] text-slate-500 font-medium mt-1 w-full truncate px-0.5">
                      <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{formatTime(top2.latestUploadTimestamp)}</span>
                    </span>
                  )}

                  {/* Pedestal #2 */}
                  <div className="w-full mt-2.5 sm:mt-3 h-24 sm:h-36 rounded-t-xl sm:rounded-t-2xl bg-gradient-to-b from-slate-200 to-slate-300 flex flex-col items-center justify-center text-slate-700 shadow-inner border-t border-x border-slate-300">
                    <span className="text-xl sm:text-4xl font-black text-slate-500">2</span>
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-tight sm:tracking-wider text-slate-600">Perak</span>
                  </div>
                </div>
              ) : (
                <div className="h-24 sm:h-28 w-full border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-slate-300 text-[10px] sm:text-xs font-bold text-center p-2">
                  Belum Ada
                </div>
              )}
            </div>

            {/* 1ST PLACE PODIUM (GOLD - CENTER) */}
            <div className="flex flex-col items-center min-w-0">
              {top1.count > 0 ? (
                <div className="flex flex-col items-center w-full min-w-0">
                  <div className="relative mb-1.5 sm:mb-2 flex flex-col items-center">
                    <div className="w-14 sm:w-20 h-14 sm:h-20 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-200 border-2 border-amber-400 text-amber-950 flex items-center justify-center font-black text-lg sm:text-2xl shadow-md ring-2 sm:ring-4 ring-amber-100">
                      {top1.student.namaLengkap.charAt(0)}
                    </div>
                    <span className="absolute -top-3 sm:-top-3.5 px-2 sm:px-2.5 py-0.5 rounded-full bg-amber-500 text-white border border-amber-300 text-[10px] sm:text-xs font-black flex items-center gap-1 shadow-sm">
                      <Crown className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-amber-200" />
                      <span>#1</span>
                    </span>
                  </div>

                  <p className="text-xs sm:text-base font-black text-slate-900 text-center truncate w-full px-0.5">
                    {top1.student.namaPanggilan || top1.student.namaLengkap.split(' ')[0]}
                  </p>
                  <p className="text-[9px] sm:text-xs text-amber-700 font-semibold truncate w-full text-center px-0.5">
                    {top1.student.kelompok}
                  </p>

                  <div className="mt-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-[8px] sm:text-xs font-extrabold shadow-2xs text-center w-full max-w-[105px] sm:max-w-none truncate">
                    <span>{top1.count}/{totalTarget}</span>
                    <span className="opacity-80 font-semibold ml-0.5 sm:ml-1">({top1.percentage}%)</span>
                  </div>

                  {/* 100% Locked badge if applicable */}
                  {top1.count >= totalTarget && totalTarget > 0 && (
                    <span className="mt-1 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[8px] sm:text-[9px] font-extrabold shadow-2xs">
                      <Lock className="w-2.5 h-2.5" />
                      <span>100% Terkunci</span>
                    </span>
                  )}

                  {top1.latestUploadTimestamp && (
                    <span className="inline-flex items-center justify-center gap-0.5 sm:gap-1 text-[8px] sm:text-[9px] text-amber-800 font-semibold mt-1 w-full truncate px-0.5">
                      <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-600 shrink-0" />
                      <span className="truncate">{formatTime(top1.latestUploadTimestamp)}</span>
                    </span>
                  )}

                  {/* Pedestal #1 */}
                  <div className="w-full mt-2.5 sm:mt-3 h-32 sm:h-48 rounded-t-xl sm:rounded-t-2xl bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 flex flex-col items-center justify-center text-amber-950 shadow-inner border-t border-x border-amber-400 ring-2 ring-amber-300/50">
                    <Trophy className="w-6 h-6 sm:w-10 sm:h-10 text-amber-800 drop-shadow-sm mb-0.5 sm:mb-1" />
                    <span className="text-2xl sm:text-5xl font-black text-amber-950">1</span>
                    <span className="text-[9px] sm:text-xs font-black uppercase tracking-tight sm:tracking-wider text-amber-900">Juara 1</span>
                  </div>
                </div>
              ) : (
                <div className="h-32 sm:h-36 w-full border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 text-[10px] sm:text-xs font-bold text-center p-2">
                  Belum ada uploader pada periode ini
                </div>
              )}
            </div>

            {/* 3RD PLACE PODIUM (BRONZE - RIGHT) */}
            <div className="flex flex-col items-center min-w-0">
              {top3 && top3.count > 0 ? (
                <div className="flex flex-col items-center w-full min-w-0">
                  <div className="relative mb-1.5 sm:mb-2 flex flex-col items-center">
                    <div className="w-11 sm:w-16 h-11 sm:h-16 rounded-xl sm:rounded-2xl bg-amber-50 border-2 border-amber-600/40 text-amber-900 flex items-center justify-center font-black text-base sm:text-xl shadow-xs">
                      {top3.student.namaLengkap.charAt(0)}
                    </div>
                    <span className="absolute -top-2.5 sm:-top-3 px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-700 text-white border border-amber-800 text-[9px] sm:text-[10px] font-extrabold flex items-center gap-0.5 shadow-2xs">
                      <Medal className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-300" />
                      <span>#3</span>
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm font-bold text-slate-900 text-center truncate w-full px-0.5">
                    {top3.student.namaPanggilan || top3.student.namaLengkap.split(' ')[0]}
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-slate-500 truncate w-full text-center px-0.5">
                    {top3.student.kelompok}
                  </p>

                  <div className="mt-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[8px] sm:text-[10px] font-bold text-center w-full max-w-[95px] sm:max-w-none truncate">
                    <span>{top3.count}/{totalTarget}</span>
                    <span className="opacity-75 font-normal ml-0.5">({top3.percentage}%)</span>
                  </div>

                  {/* 100% Locked badge if applicable */}
                  {top3.count >= totalTarget && totalTarget > 0 && (
                    <span className="mt-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[8px] font-extrabold shadow-2xs">
                      <Lock className="w-2.5 h-2.5" />
                      <span>100% Terkunci</span>
                    </span>
                  )}

                  {top3.latestUploadTimestamp && (
                    <span className="inline-flex items-center justify-center gap-0.5 sm:gap-1 text-[8px] sm:text-[9px] text-slate-500 font-medium mt-1 w-full truncate px-0.5">
                      <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{formatTime(top3.latestUploadTimestamp)}</span>
                    </span>
                  )}

                  {/* Pedestal #3 */}
                  <div className="w-full mt-2.5 sm:mt-3 h-18 sm:h-28 rounded-t-xl sm:rounded-t-2xl bg-gradient-to-b from-amber-600 to-amber-700 flex flex-col items-center justify-center text-amber-100 shadow-inner border-t border-x border-amber-700">
                    <span className="text-xl sm:text-3xl font-black text-amber-200">3</span>
                    <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-tight sm:tracking-wider text-amber-200 truncate px-0.5">Perunggu</span>
                  </div>
                </div>
              ) : (
                <div className="h-18 sm:h-20 w-full border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-slate-300 text-[10px] sm:text-xs font-bold text-center p-2">
                  Belum Ada
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PENJELASAN DI BAWAH PODIUM & KLAIM HADIAH (MINIMALIS TANPA EMOJI) */}
      {filterPeriod === 'all' ? (
        <div className="space-y-3">
          {/* Winner Banner: Automatically appears when current user is in Top 3 with 100% */}
          {isCurrentUserGrandWinner && (
            <div className="p-4 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
              <div className="space-y-0.5">
                <p className="text-xs sm:text-sm font-bold text-white">
                  Selamat! Anda berhasil meraih posisi ke-{isCurrentUserGrandWinner}, silahkan menghubungi admin untuk proses klaim hadiah.
                </p>
                <p className="text-[11px] text-emerald-100">
                  Target 100% ({totalTarget} foto) telah tercapai dan posisi Anda telah terkunci.
                </p>
              </div>

              <a
                id="btn-klaim-hadiah-wa"
                href={getClaimWaUrl(isCurrentUserGrandWinner)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-emerald-50 active:scale-95 text-emerald-900 font-bold text-xs rounded-xl shadow-sm transition-all shrink-0 cursor-pointer"
              >
                <WhatsAppIcon className="w-4 h-4 text-emerald-600" />
                <span>Klaim Hadiah</span>
              </a>
            </div>
          )}

          {/* Minimalist Info Card */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="space-y-0.5">
              <p className="font-bold text-slate-900">
                Ketentuan Pemenang Utama (100% Selesai)
              </p>
              <p className="text-[11px] text-slate-600">
                Peringkat 1, 2, dan 3 dikunci permanen berdasarkan urutan peserta yang pertama kali menyelesaikan {totalTarget} foto (100%).
              </p>
            </div>
            <div className="text-[11px] font-bold text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shrink-0 self-start sm:self-auto shadow-2xs">
              {overall100PercentWinners.length}/3 Juara Terkunci
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 text-xs text-slate-700 flex items-center justify-between gap-2">
          <div className="space-y-0.5">
            <p className="font-bold text-slate-900">
              Statistik Upload Harian
            </p>
            <p className="text-[11px] text-slate-600">
              Menampilkan peringkat foto yang diunggah khusus pada {formattedPeriodLabel}.
            </p>
          </div>
          <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
            Pilih &ldquo;Semua Waktu&rdquo; untuk akumulasi 100%
          </span>
        </div>
      )}

      {/* SEARCH AND CUSTOM DROPDOWN FILTER BAR */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-leaderboard"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama mahasiswa atau NIM di ranking..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-medium transition-all shadow-2xs"
          />
        </div>

        {/* Custom Kelompok Dropdown */}
        <div className="w-full sm:w-60">
          <CustomSelect
            id="select-kelompok-leaderboard"
            value={selectedGroup}
            onChange={setSelectedGroup}
            options={customGroupSelectOptions}
            size="md"
            fullWidth={true}
          />
        </div>
      </div>

      {/* LIST RANKING WITH PAGINATION */}
      <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs">
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <span>Daftar Peringkat ({filteredData.length} Mahasiswa)</span>
          </h3>
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">
            Urutan: Uploader Terbanyak &amp; Jam Tercepat
          </span>
        </div>

        {filteredData.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs font-medium">
            Tidak ada data mahasiswa untuk pencarian ini.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {paginatedData.map((item, index) => {
              // Calculate actual rank across all filtered results
              const rank = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
              const isCurrentUser =
                currentUser && normalizeNim(currentUser.nim) === normalizeNim(item.student.nim);

              return (
                <div
                  key={item.student.id || item.student.nim}
                  className={`p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    isCurrentUser
                      ? 'bg-blue-50/80 border-l-4 border-blue-600 ring-1 ring-blue-200/70 shadow-2xs'
                      : rank <= 3 && item.count > 0
                        ? 'bg-amber-50/30'
                        : 'hover:bg-slate-50'
                  }`}
                >
                  {/* Rank & Student Info */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-2xs ${
                        isCurrentUser
                          ? 'bg-blue-600 text-white ring-2 ring-blue-300'
                          : rank === 1 && item.count > 0
                            ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-300'
                            : rank === 2 && item.count > 0
                              ? 'bg-slate-200 text-slate-800'
                              : rank === 3 && item.count > 0
                                ? 'bg-amber-600 text-white'
                                : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      #{rank}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className={`text-sm font-bold truncate ${
                            isCurrentUser ? 'text-blue-950 font-black' : 'text-slate-900'
                          }`}
                        >
                          {item.student.namaLengkap}
                        </p>
                        {isCurrentUser && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-black uppercase tracking-wider shadow-2xs">
                            Anda
                          </span>
                        )}
                        {item.count >= totalTarget && totalTarget > 0 && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5 text-emerald-600" />
                            <span>100%</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 truncate">
                        <span className="font-mono">{item.student.nim}</span>
                        <span>•</span>
                        <span className="font-semibold text-slate-700">{item.student.kelompok}</span>
                      </p>
                    </div>
                  </div>

                  {/* Progress & Speed Stats */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-5 pl-11 sm:pl-0">
                    {/* Time of latest upload */}
                    <div className="text-left sm:text-right shrink-0">
                      <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase">Upload Terakhir</p>
                      <p className="text-[11px] sm:text-xs font-semibold text-slate-700 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{formatTime(item.latestUploadTimestamp)}</span>
                      </p>
                    </div>

                    {/* Count & Progress bar */}
                    <div className="w-28 sm:w-44 shrink-0">
                      <div className="flex items-center justify-between text-[11px] sm:text-xs mb-1">
                        <span className="font-black text-slate-900">
                          {item.count}{' '}
                          <span className="text-[9px] sm:text-[10px] text-slate-400 font-normal">/ {totalTarget}</span>
                        </span>
                        <span
                          className={`font-black text-[11px] sm:text-xs ${
                            item.percentage > 0 ? 'text-blue-600' : 'text-slate-400'
                          }`}
                        >
                          {item.percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 sm:h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isCurrentUser
                              ? 'bg-blue-600'
                              : rank === 1 && item.count > 0
                                ? 'bg-amber-400'
                                : rank === 2 && item.count > 0
                                  ? 'bg-slate-400'
                                  : rank === 3 && item.count > 0
                                    ? 'bg-amber-600'
                                    : 'bg-blue-600'
                          }`}
                          style={{ width: `${Math.min(item.percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Minimalist Pagination Bar */}
        {filteredData.length > ITEMS_PER_PAGE && (
          <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-slate-500 font-medium">
              Menampilkan {(currentPage - 1) * ITEMS_PER_PAGE + 1} -{' '}
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)} dari {filteredData.length} mahasiswa
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Sebelumnya</span>
              </button>

              <span className="px-2.5 py-1 rounded-xl bg-slate-200/70 text-slate-800 font-black text-xs">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
              >
                <span>Selanjutnya</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
