import { useState, useMemo } from 'react';
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  FileCheck,
  FileText,
  Filter,
  Layers,
  Percent,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingUp,
  Users,
  UserX,
  Lock,
} from 'lucide-react';
import { Mahasiswa, PhotoRecord, ReportRequest } from '../types';
import { isWithdrawnStudent, normalizeNim } from '../lib/photoStorage';

interface AdminStatsViewProps {
  students: Mahasiswa[];
  photoRecords: PhotoRecord[];
  reportRequests: ReportRequest[];
  onBack: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function AdminStatsView({
  students,
  photoRecords,
  reportRequests,
  onBack,
  onRefresh,
  isLoading = false,
}: AdminStatsViewProps) {
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState<'overview' | 'groups' | 'reports' | 'students'>('overview');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Group calculations & Statistics
  const stats = useMemo(() => {
    const totalStudents = students.length;
    const withdrawnStudents = students.filter((s) => isWithdrawnStudent(s));
    const withdrawnCount = withdrawnStudents.length;
    const activeStudents = students.filter((s) => !isWithdrawnStudent(s));
    const activeCount = activeStudents.length;

    // Set of unique uploaders (students who uploaded at least 1 direct photo)
    const uniqueUploadersSet = new Set<string>();
    photoRecords.forEach((rec) => {
      if (rec.uploaderNim) {
        uniqueUploadersSet.add(normalizeNim(rec.uploaderNim));
      }
    });
    const uploaderCount = uniqueUploadersSet.size;

    // Build companion photo count for every student
    // Each pair_key or record connects uploader and target
    const studentTakenMap = new Map<string, Set<string>>();
    students.forEach((s) => {
      studentTakenMap.set(normalizeNim(s.nim), new Set());
    });

    photoRecords.forEach((rec) => {
      const a = normalizeNim(rec.uploaderNim);
      const b = normalizeNim(rec.targetNim);
      if (a && b && a !== b) {
        // Exclude withdrawn friends from progress if applicable
        if (!isWithdrawnStudent(b)) {
          studentTakenMap.get(a)?.add(b);
        }
        if (!isWithdrawnStudent(a)) {
          studentTakenMap.get(b)?.add(a);
        }
      }
    });

    // Required target per active student (all other active students = activeCount - 1, e.g. 131)
    const companionTarget = Math.max(activeCount - 1, 1);

    // Calculate progress for each student
    let count100Percent = 0;
    let count75to99 = 0;
    let count50to74 = 0;
    let count25to49 = 0;
    let countUnder25 = 0;
    let countZero = 0;
    let totalTakenSum = 0;

    const studentProgressList = students.map((s) => {
      const norm = normalizeNim(s.nim);
      const takenSet = studentTakenMap.get(norm) || new Set();
      const takenCount = takenSet.size;
      const isWithdrawn = isWithdrawnStudent(s);
      const percentage = isWithdrawn
        ? 0
        : Math.min(100, Math.round((takenCount / companionTarget) * 100));

      if (!isWithdrawn) {
        totalTakenSum += takenCount;
        if (takenCount >= companionTarget) {
          count100Percent++;
        } else if (percentage >= 75) {
          count75to99++;
        } else if (percentage >= 50) {
          count50to74++;
        } else if (percentage >= 25) {
          count25to49++;
        } else if (takenCount > 0) {
          countUnder25++;
        } else {
          countZero++;
        }
      }

      // Check report request status
      const rep = reportRequests.find(
        (r) => normalizeNim(r.nim) === norm
      );

      return {
        student: s,
        takenCount,
        targetCount: companionTarget,
        percentage,
        is100Percent: !isWithdrawn && takenCount >= companionTarget,
        isWithdrawn,
        hasUploaded: uniqueUploadersSet.has(norm),
        reportRequest: rep,
        reportStatus: rep ? rep.status : 'none',
      };
    });

    // Report requests stats
    const reportRequestedSet = new Set<string>();
    let reportsCompleted = 0;
    let reportsProcessing = 0;
    let reportsFailed = 0;

    reportRequests.forEach((r) => {
      if (r.nim) {
        const norm = normalizeNim(r.nim);
        reportRequestedSet.add(norm);
        if (r.status === 'completed') reportsCompleted++;
        else if (r.status === 'processing' || r.status === 'pending') reportsProcessing++;
        else if (r.status === 'failed') reportsFailed++;
      }
    });

    const reportRequestedCount = reportRequestedSet.size;

    // Tier distribution
    let tierFree = 0;
    let tierBasic = 0;
    let tierPro = 0;
    students.forEach((s) => {
      const t = s.tier || 'free';
      if (t === 'pro') tierPro++;
      else if (t === 'basic') tierBasic++;
      else tierFree++;
    });

    // Group breakdown
    const groupMap = new Map<
      string,
      {
        name: string;
        members: typeof studentProgressList;
        totalTaken: number;
        completedCount: number;
        leader?: Mahasiswa;
      }
    >();

    studentProgressList.forEach((item) => {
      const gName = item.student.kelompok || 'Tanpa Kelompok';
      if (!groupMap.has(gName)) {
        groupMap.set(gName, {
          name: gName,
          members: [],
          totalTaken: 0,
          completedCount: 0,
        });
      }
      const g = groupMap.get(gName)!;
      g.members.push(item);
      if (!item.isWithdrawn) {
        g.totalTaken += item.takenCount;
        if (item.is100Percent) {
          g.completedCount++;
        }
      }
      if (item.student.isLeader) {
        g.leader = item.student;
      }
    });

    const groupStats = Array.from(groupMap.values()).map((g) => {
      const activeMembers = g.members.filter((m) => !m.isWithdrawn);
      const avgPhotos =
        activeMembers.length > 0 ? Math.round(g.totalTaken / activeMembers.length) : 0;
      const avgPct =
        activeMembers.length > 0
          ? Math.round(
              activeMembers.reduce((acc, cur) => acc + cur.percentage, 0) / activeMembers.length
            )
          : 0;
      return {
        ...g,
        activeMemberCount: activeMembers.length,
        avgPhotos,
        avgPct,
      };
    });

    // Sort groups logically (Kelompok 1, Kelompok 2, ...)
    groupStats.sort((a, b) => {
      const numA = parseInt(a.name.match(/\d+/)?.[0] || '999', 10);
      const numB = parseInt(b.name.match(/\d+/)?.[0] || '999', 10);
      return numA - numB;
    });

    // Total possible unique pair connections: activeCount * (activeCount - 1) / 2
    const totalMaxPossiblePairs = (activeCount * (activeCount - 1)) / 2;
    const currentUniquePairs = Math.round(photoRecords.length);

    return {
      totalStudents,
      withdrawnCount,
      withdrawnStudents,
      activeCount,
      companionTarget,
      uploaderCount,
      currentUniquePairs,
      totalMaxPossiblePairs,
      count100Percent,
      count75to99,
      count50to74,
      count25to49,
      countUnder25,
      countZero,
      totalTakenSum,
      avgTakenPerActive: activeCount > 0 ? Math.round(totalTakenSum / activeCount) : 0,
      reportRequestedCount,
      reportsCompleted,
      reportsProcessing,
      reportsFailed,
      tierFree,
      tierBasic,
      tierPro,
      groupStats,
      studentProgressList,
    };
  }, [students, photoRecords, reportRequests]);

  // Current formatted Indonesian date for executive report
  const currentDateStr = useMemo(() => {
    const d = new Date();
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Makassar',
    }).format(d);
  }, []);

  // Plain Text Report Generator without Emojis
  const generatePlainTextReport = useMemo(() => {
    const pct100 = Math.round((stats.count100Percent / Math.max(stats.activeCount, 1)) * 100);
    const pctReport = Math.round((stats.reportRequestedCount / Math.max(stats.activeCount, 1)) * 100);
    const pctUploader = Math.round((stats.uploaderCount / Math.max(stats.activeCount, 1)) * 100);

    let text = `Update Website Logika per ${currentDateStr}:\n`;
    text += `1. Jumlah peserta aktif: ${stats.activeCount} orang*\n`;
    text += `2. Jumlah uploader: ${stats.uploaderCount} orang (${pctUploader}%)\n`;
    text += `3. Jumlah foto terupload: ${stats.currentUniquePairs.toLocaleString('id-ID')} foto\n`;
    text += `4. Jumlah yang telah mencapai progress 100%: ${stats.count100Percent}/${stats.activeCount} orang* (${pct100}%)\n`;
    text += `5. Jumlah yang telah mengajukan file laporan: ${stats.reportRequestedCount}/${stats.activeCount} orang* (${pctReport}%)\n`;
    text += `6. Jumlah laporan selesai diproses: ${stats.reportsCompleted} dokumen\n`;
    text += `7. Rincian status tier akun:\n`;
    text += `   - Akun Free: ${stats.tierFree} peserta\n`;
    text += `   - Akun Basic: ${stats.tierBasic} peserta\n`;
    text += `   - Akun Pro: ${stats.tierPro} peserta\n\n`;

    text += `Ringkasan Progres per Kelompok:\n`;
    stats.groupStats.forEach((g, idx) => {
      text += `   ${idx + 1}. ${g.name}: Rata-rata ${g.avgPhotos} foto/peserta (${g.completedCount}/${g.activeMemberCount} peserta 100% selesai)\n`;
    });

    text += `\n*Catatan: 1 orang mengundurkan diri dari kepesertaan Logika 2026 (NIM: F1D02610112)`;
    return text;
  }, [stats, currentDateStr]);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(generatePlainTextReport);
      setCopyFeedback('Format teks laporan berhasil disalin ke clipboard.');
      setTimeout(() => setCopyFeedback(null), 3500);
    } catch {
      setCopyFeedback('Gagal menyalin teks ke clipboard.');
      setTimeout(() => setCopyFeedback(null), 3500);
    }
  };

  const handleDownloadTxt = () => {
    try {
      const element = document.createElement('a');
      const file = new Blob([generatePlainTextReport], { type: 'text/plain;charset=utf-8' });
      element.href = URL.createObjectURL(file);
      element.download = `Laporan_Statistik_Logika_2026_${Date.now()}.txt`;
      document.body.appendChild(element);
      element.click();
      element.remove();
      setCopyFeedback('Berkas teks laporan berhasil diunduh.');
      setTimeout(() => setCopyFeedback(null), 3500);
    } catch {
      setCopyFeedback('Gagal mengunduh berkas teks.');
      setTimeout(() => setCopyFeedback(null), 3500);
    }
  };

  // Filtered student list for student tab
  const filteredStudents = useMemo(() => {
    return stats.studentProgressList.filter((item) => {
      if (selectedGroupFilter !== 'ALL' && item.student.kelompok !== selectedGroupFilter) {
        return false;
      }
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase().trim();
        const matchName = item.student.namaLengkap.toLowerCase().includes(q);
        const matchNim = item.student.nim.toLowerCase().includes(q);
        const matchKelompok = (item.student.kelompok || '').toLowerCase().includes(q);
        return matchName || matchNim || matchKelompok;
      }
      return true;
    });
  }, [stats.studentProgressList, selectedGroupFilter, searchFilter]);

  return (
    <div className="w-full space-y-6 pb-12 font-sans">
      {/* Top Navigation & Action Header */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs relative">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onBack}
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                title="Kembali"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold uppercase tracking-wider shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Panel Statistik Eksekutif (Admin NIM: F1D02610029)</span>
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Statistik &amp; Rekapitulasi Website Logika 2026
            </h1>
            <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
              Pemantauan data menyeluruh, performa pengunggahan foto antar mahasiswa, progres 100%,
              dan antrean pembuatan berkas laporan secara real-time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : 'text-slate-600'}`} />
                <span>Segarkan Data</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyText}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="Salin ringkasan laporan ke teks"
            >
              <Copy className="w-4 h-4" />
              <span>Salin Format Teks</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadTxt}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-98 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="Unduh berkas teks"
            >
              <Download className="w-4 h-4" />
              <span>Unduh .TXT</span>
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {copyFeedback && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{copyFeedback}</span>
          </div>
        )}
      </div>

      {/* Main Metric Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* Metric 1: Peserta Aktif */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Peserta Aktif</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">{stats.activeCount}</span>
            <span className="text-xs font-semibold text-slate-500">orang*</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-tight">
            Dari total {stats.totalStudents} terdaftar (1 mengundurkan diri)
          </p>
        </div>

        {/* Metric 2: Uploader */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Jumlah Uploader</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-700">{stats.uploaderCount}</span>
            <span className="text-xs font-semibold text-slate-500">orang</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-tight">
            {Math.round((stats.uploaderCount / Math.max(stats.activeCount, 1)) * 100)}% dari seluruh peserta aktif
          </p>
        </div>

        {/* Metric 3: Foto Terupload */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Foto Terupload</span>
            <BarChart3 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">{stats.currentUniquePairs.toLocaleString('id-ID')}</span>
            <span className="text-xs font-semibold text-slate-500">foto</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-tight">
            Rata-rata {stats.avgTakenPerActive} foto per peserta aktif
          </p>
        </div>

        {/* Metric 4: Progress 100% */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Progress 100%</span>
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-teal-700">{stats.count100Percent}</span>
            <span className="text-xs font-semibold text-slate-500">/{stats.activeCount}*</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-tight">
            {Math.round((stats.count100Percent / Math.max(stats.activeCount, 1)) * 100)}% peserta telah tuntas 131 teman
          </p>
        </div>

        {/* Metric 5: Pengajuan Laporan */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pengajuan Laporan</span>
            <FileText className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-amber-800">{stats.reportRequestedCount}</span>
            <span className="text-xs font-semibold text-slate-500">/{stats.activeCount}*</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-tight">
            {Math.round((stats.reportRequestedCount / Math.max(stats.activeCount, 1)) * 100)}% telah masuk antrean laporan
          </p>
        </div>

        {/* Metric 6: Laporan Selesai */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Laporan Selesai</span>
            <FileCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-700">{stats.reportsCompleted}</span>
            <span className="text-xs font-semibold text-slate-500">dokumen</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-tight">
            Berkas Word (.docx) siap diunduh peserta
          </p>
        </div>
      </div>

      {/* Visual Progress Breakdown & Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Progress Bracket Chart */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Distribusi Progres Foto Mahasiswa</h2>
              <p className="text-xs text-slate-500">Persentase kelengkapan foto bersama teman (Target: {stats.companionTarget} teman)</p>
            </div>
            <Percent className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-3.5 text-xs">
            {/* 100% */}
            <div>
              <div className="flex justify-between font-semibold text-slate-800 mb-1">
                <span className="inline-flex items-center gap-1.5 text-emerald-700">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                  100% Tuntas ({stats.companionTarget} teman)
                </span>
                <span>
                  {stats.count100Percent} mahasiswa ({Math.round((stats.count100Percent / Math.max(stats.activeCount, 1)) * 100)}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${(stats.count100Percent / Math.max(stats.activeCount, 1)) * 100}%` }}
                />
              </div>
            </div>

            {/* 75% - 99% */}
            <div>
              <div className="flex justify-between font-semibold text-slate-800 mb-1">
                <span className="inline-flex items-center gap-1.5 text-blue-700">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" />
                  75% - 99% Progres (98 - {stats.companionTarget - 1} teman)
                </span>
                <span>
                  {stats.count75to99} mahasiswa ({Math.round((stats.count75to99 / Math.max(stats.activeCount, 1)) * 100)}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${(stats.count75to99 / Math.max(stats.activeCount, 1)) * 100}%` }}
                />
              </div>
            </div>

            {/* 50% - 74% */}
            <div>
              <div className="flex justify-between font-semibold text-slate-800 mb-1">
                <span className="inline-flex items-center gap-1.5 text-indigo-700">
                  <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 inline-block" />
                  50% - 74% Progres (66 - 97 teman)
                </span>
                <span>
                  {stats.count50to74} mahasiswa ({Math.round((stats.count50to74 / Math.max(stats.activeCount, 1)) * 100)}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${(stats.count50to74 / Math.max(stats.activeCount, 1)) * 100}%` }}
                />
              </div>
            </div>

            {/* 25% - 49% */}
            <div>
              <div className="flex justify-between font-semibold text-slate-800 mb-1">
                <span className="inline-flex items-center gap-1.5 text-amber-700">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
                  25% - 49% Progres (33 - 65 teman)
                </span>
                <span>
                  {stats.count25to49} mahasiswa ({Math.round((stats.count25to49 / Math.max(stats.activeCount, 1)) * 100)}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${(stats.count25to49 / Math.max(stats.activeCount, 1)) * 100}%` }}
                />
              </div>
            </div>

            {/* < 25% */}
            <div>
              <div className="flex justify-between font-semibold text-slate-800 mb-1">
                <span className="inline-flex items-center gap-1.5 text-rose-700">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-400 inline-block" />
                  &lt; 25% Progres (1 - 32 teman)
                </span>
                <span>
                  {stats.countUnder25} mahasiswa ({Math.round((stats.countUnder25 / Math.max(stats.activeCount, 1)) * 100)}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-400 rounded-full transition-all duration-500"
                  style={{ width: `${(stats.countUnder25 / Math.max(stats.activeCount, 1)) * 100}%` }}
                />
              </div>
            </div>

            {/* Belum mengunggah */}
            <div>
              <div className="flex justify-between font-semibold text-slate-600 mb-1">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-slate-300 inline-block" />
                  Belum Ada Foto (0 teman)
                </span>
                <span>
                  {stats.countZero} mahasiswa ({Math.round((stats.countZero / Math.max(stats.activeCount, 1)) * 100)}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-300 rounded-full transition-all duration-500"
                  style={{ width: `${(stats.countZero / Math.max(stats.activeCount, 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tier & Report Status Breakdown */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Distribusi Akun &amp; Antrean Laporan</h2>
              <p className="text-xs text-slate-500">Status tier pengguna dan pemrosesan dokumen Word</p>
            </div>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Distribusi Tier Akun
              </h3>
              <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Akun Free</p>
                  <p className="text-xl font-black text-slate-800 mt-0.5">{stats.tierFree}</p>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                  <p className="text-[10px] text-emerald-700 font-bold uppercase">Akun Basic</p>
                  <p className="text-xl font-black text-emerald-800 mt-0.5">{stats.tierBasic}</p>
                </div>
                <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200">
                  <p className="text-[10px] text-amber-700 font-bold uppercase">Akun Pro</p>
                  <p className="text-xl font-black text-amber-800 mt-0.5">{stats.tierPro}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Status Antrean Laporan (request_reports)
              </h3>
              <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold">
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <p className="text-[10px] text-emerald-700 font-bold uppercase">Selesai (Completed)</p>
                  <p className="text-xl font-black text-emerald-800 mt-0.5">{stats.reportsCompleted}</p>
                </div>
                <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200">
                  <p className="text-[10px] text-blue-700 font-bold uppercase">Sedang Diproses</p>
                  <p className="text-xl font-black text-blue-800 mt-0.5">{stats.reportsProcessing}</p>
                </div>
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200">
                  <p className="text-[10px] text-rose-700 font-bold uppercase">Kendala / Gagal</p>
                  <p className="text-xl font-black text-rose-800 mt-0.5">{stats.reportsFailed}</p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 space-y-1">
              <p className="font-bold text-slate-800">Catatan Peserta Mengundurkan Diri:</p>
              <p className="text-[11px]">
                1 mahasiswa telah mengundurkan diri (NIM: <strong>F1D02610112</strong>). Target foto
                diperbarui menjadi <strong>131 teman</strong> dan tidak dihitung sebagai kewajiban foto bagi peserta lain.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs for Detailed Breakdown */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Rekap Kelompok ({stats.groupStats.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('students')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'students'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Daftar Mahasiswa &amp; Status Laporan ({stats.studentProgressList.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('reports')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'reports'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Antrean Laporan ({reportRequests.length})
            </button>
          </div>

          {activeTab === 'students' && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Cari NIM / Nama..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div className="relative">
                <select
                  value={selectedGroupFilter}
                  onChange={(e) => setSelectedGroupFilter(e.target.value)}
                  className="pl-3 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-bold appearance-none cursor-pointer"
                >
                  <option value="ALL">Semua Kelompok</option>
                  {stats.groupStats.map((g) => (
                    <option key={g.name} value={g.name}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          )}
        </div>

        {/* Tab 1: Rekap Kelompok */}
        {activeTab === 'overview' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                  <th className="py-2.5 px-3">No</th>
                  <th className="py-2.5 px-3">Kelompok</th>
                  <th className="py-2.5 px-3">Ketua Kelompok</th>
                  <th className="py-2.5 px-3 text-center">Anggota Aktif</th>
                  <th className="py-2.5 px-3 text-center">Peserta 100%</th>
                  <th className="py-2.5 px-3 text-center">Rata-rata Foto</th>
                  <th className="py-2.5 px-3 text-right">Rata-rata Progres</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {stats.groupStats.map((g, idx) => (
                  <tr key={g.name} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{g.name}</td>
                    <td className="py-3 px-3 text-slate-700">
                      {g.leader ? (
                        <span className="font-semibold text-amber-800">
                          {g.leader.namaLengkap}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-800">
                      {g.activeMemberCount} orang
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-100">
                        {g.completedCount} / {g.activeMemberCount}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">
                      {g.avgPhotos} foto
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                          <div
                            className="h-full bg-blue-600 rounded-full"
                            style={{ width: `${g.avgPct}%` }}
                          />
                        </div>
                        <span className="font-black text-slate-900 font-mono">{g.avgPct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Daftar Mahasiswa & Status Laporan */}
        {activeTab === 'students' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                  <th className="py-2.5 px-3">No</th>
                  <th className="py-2.5 px-3">NIM</th>
                  <th className="py-2.5 px-3">Nama Mahasiswa</th>
                  <th className="py-2.5 px-3">Kelompok</th>
                  <th className="py-2.5 px-3 text-center">Tier</th>
                  <th className="py-2.5 px-3 text-center">Foto Terkumpul</th>
                  <th className="py-2.5 px-3 text-center">Progres</th>
                  <th className="py-2.5 px-3 text-right">Status Laporan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredStudents.map((item, idx) => (
                  <tr key={item.student.id || item.student.nim} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-800">{item.student.nim}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900">{item.student.namaLengkap}</span>
                        {item.isWithdrawn && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-300 text-[9px] font-bold">
                            Mengundurkan Diri
                          </span>
                        )}
                        {item.reportStatus === 'completed' && (
                          <span className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 text-[9px] font-bold">
                            Laporan Selesai
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{item.student.kelompok}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        item.student.tier === 'pro'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : item.student.tier === 'basic'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {item.student.tier || 'free'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                      {item.takenCount} / {item.targetCount}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-black">
                      {item.isWithdrawn ? (
                        <span className="text-slate-400">-</span>
                      ) : item.is100Percent ? (
                        <span className="text-emerald-600">100%</span>
                      ) : (
                        <span className="text-slate-700">{item.percentage}%</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold">
                      {item.reportStatus === 'completed' ? (
                        <span className="text-teal-700 font-bold">Selesai (Completed)</span>
                      ) : item.reportStatus === 'processing' || item.reportStatus === 'pending' ? (
                        <span className="text-blue-700 font-bold">Dalam Antrean</span>
                      ) : item.reportStatus === 'failed' ? (
                        <span className="text-rose-700 font-bold">Gagal</span>
                      ) : (
                        <span className="text-slate-400">Belum Mengajukan</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Antrean Laporan */}
        {activeTab === 'reports' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                  <th className="py-2.5 px-3">No</th>
                  <th className="py-2.5 px-3">NIM</th>
                  <th className="py-2.5 px-3">Nama Mahasiswa</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Waktu Dibuat</th>
                  <th className="py-2.5 px-3 text-right">Tautan Dokumen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {reportRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-semibold">
                      Belum ada permintaan pembuatan laporan yang tercatat.
                    </td>
                  </tr>
                ) : (
                  reportRequests.map((r, idx) => (
                    <tr key={r.id || idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-800">{r.nim}</td>
                      <td className="py-3 px-3 font-semibold text-slate-900">{r.nama_lengkap || '-'}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          r.status === 'completed'
                            ? 'bg-teal-50 text-teal-800 border border-teal-200'
                            : r.status === 'processing' || r.status === 'pending'
                            ? 'bg-blue-50 text-blue-800 border border-blue-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                        {r.created_at || '-'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {r.pdf_url ? (
                          <a
                            href={r.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1"
                          >
                            <span>Buka Google Drive</span>
                          </a>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Raw Plain Text Export Preview */}
      <div className="bg-slate-900 text-slate-100 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white">Pratinjau Teks Ekspor Format Rekap</h3>
            <p className="text-xs text-slate-400">Format teks bersih tanpa emoji untuk laporan update berkala</p>
          </div>
          <button
            type="button"
            onClick={handleCopyText}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <Copy className="w-3.5 h-3.5 text-slate-400" />
            <span>Salin</span>
          </button>
        </div>

        <pre className="p-4 bg-slate-950 rounded-2xl border border-slate-800/80 font-mono text-xs text-emerald-400 overflow-x-auto whitespace-pre leading-relaxed">
          {generatePlainTextReport}
        </pre>
      </div>
    </div>
  );
}
