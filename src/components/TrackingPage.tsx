import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Bug,
  CheckCircle2, 
  Circle, 
  Users, 
  Search,
  User,
  Camera,
  Check,
  ChevronDown,
  QrCode,
  Scan,
  UserCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { Mahasiswa, PhotoRecord } from '../types';
import { 
  fetchPhotoTrackingFromSupabase, 
  upsertPhotoTrackingInSupabase 
} from '../lib/supabase';
import { hasTakenPhoto, normalizeNim } from '../lib/photoStorage';
import { CustomSelect } from './CustomSelect';
import { QRScannerModal } from './QRScannerModal';

interface TrackingPageProps {
  currentUser: Mahasiswa | null;
  students: Mahasiswa[];
  photoRecords: PhotoRecord[];
  onBack: () => void;
  refreshKey?: number;
  onSelectStudent?: (student: Mahasiswa) => void;
}

export function TrackingPage({ 
  currentUser, 
  students, 
  photoRecords, 
  onBack,
  refreshKey = 0,
  onSelectStudent,
}: TrackingPageProps) {
  const [trackingMap, setTrackingMap] = useState<Record<string, boolean>>({});
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // QR Modal States
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isShowingOwnQrInitial, setIsShowingOwnQrInitial] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Get current user NIM - matching schema where user_id references profiles.nim
  const userKey = currentUser?.nim;

  const loadTracking = async (showSkeleton = false) => {
    if (!userKey) return;
    if (showSkeleton) setIsLoading(true);
    try {
      const data = await fetchPhotoTrackingFromSupabase(userKey);
      setTrackingMap(data);
    } catch (err) {
      console.error("Error loading tracking:", err);
    } finally {
      if (showSkeleton) setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadTracking(true);
  }, [userKey]);

  // Background refresh (from realtime or manual)
  useEffect(() => {
    if (refreshKey > 0) {
      loadTracking(false);
    }
  }, [refreshKey]);

  const isUploaded = (targetNim: string) => {
    if (!currentUser?.nim || !targetNim) return false;
    return hasTakenPhoto(photoRecords, currentUser.nim, targetNim);
  };

  const isStudentCompleted = (studentNim: string) => {
    if (!currentUser?.nim || !studentNim) return false;
    if (normalizeNim(studentNim) === normalizeNim(currentUser.nim)) return false;
    const cleanNim = normalizeNim(studentNim);
    const checkedInMap = Boolean(
      trackingMap[studentNim] ||
      trackingMap[cleanNim] ||
      trackingMap[studentNim.trim()] ||
      trackingMap[studentNim.trim().toUpperCase()]
    );
    const uploaded = isUploaded(studentNim);
    return checkedInMap || uploaded;
  };

  const handleToggle = async (targetNim: string, currentState: boolean) => {
    if (!userKey || !targetNim) return;
    if (normalizeNim(targetNim) === normalizeNim(currentUser?.nim)) {
      console.warn("Toggle ignored: target is self", { userKey, targetNim });
      return;
    }
    
    const newState = !currentState;
    const cleanTarget = targetNim.trim();
    const normTarget = normalizeNim(cleanTarget);
    
    // Optimistic update
    setTrackingMap(prev => ({
      ...prev,
      [targetNim]: newState,
      [cleanTarget]: newState,
      [normTarget]: newState,
    }));
    
    const success = await upsertPhotoTrackingInSupabase(userKey, targetNim, newState);
    if (!success) {
      // Rollback on failure
      setTrackingMap(prev => ({
        ...prev,
        [targetNim]: currentState,
        [cleanTarget]: currentState,
        [normTarget]: currentState,
      }));
    }
  };

  // Handler saat mahasiswa di-scan via QR di Tracking
  const handleChecklistFromQr = async (scannedStudent: Mahasiswa) => {
    if (!userKey || !scannedStudent.nim) return;
    if (normalizeNim(scannedStudent.nim) === normalizeNim(currentUser?.nim)) return;

    const currentCompleted = isStudentCompleted(scannedStudent.nim);
    const newState = !currentCompleted;
    const cleanNim = scannedStudent.nim.trim();
    const normNim = normalizeNim(cleanNim);

    // Auto-update filter kelompok ke kelompok mahasiswa yang baru discan & dichecklist
    if (scannedStudent.kelompok) {
      setSelectedGroup(scannedStudent.kelompok);
    }

    // Optimistic update
    setTrackingMap(prev => ({
      ...prev,
      [scannedStudent.nim]: newState,
      [cleanNim]: newState,
      [normNim]: newState,
    }));

    const success = await upsertPhotoTrackingInSupabase(userKey, scannedStudent.nim, newState);
    if (success) {
      const msg = newState
        ? `✅ Berhasil checklist foto bersama ${scannedStudent.namaLengkap} (${scannedStudent.kelompok || 'Kelompok'})!`
        : `Checklist foto bersama ${scannedStudent.namaLengkap} telah dibatalkan.`;
      
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 4000);
    } else {
      // Rollback
      setTrackingMap(prev => ({
        ...prev,
        [scannedStudent.nim]: currentCompleted,
        [cleanNim]: currentCompleted,
        [normNim]: currentCompleted,
      }));
    }
  };

  const openQrScanner = () => {
    setIsShowingOwnQrInitial(false);
    setIsScannerOpen(true);
  };

  const openMyQr = () => {
    setIsShowingOwnQrInitial(true);
    setIsScannerOpen(true);
  };

  const groupOptions = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => {
      if (s.kelompok) set.add(s.kelompok);
    });
    
    const sortedGroups = Array.from(set).sort((a, b) => {
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });

    return sortedGroups.map(g => ({ value: g, label: g }));
  }, [students]);

  // Initial group if not set
  useEffect(() => {
    if (!selectedGroup && groupOptions.length > 0) {
      setSelectedGroup(groupOptions[0].value);
    }
  }, [groupOptions]);

  const filteredStudents = useMemo(() => {
    return students
      .filter(s => {
        const matchesGroup = !selectedGroup || selectedGroup === 'ALL' || s.kelompok === selectedGroup;
        const matchesSearch = 
          s.namaLengkap.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.nim.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesGroup && matchesSearch;
      })
      .sort((a, b) => a.namaLengkap.localeCompare(b.namaLengkap)); // Always A-Z
  }, [students, selectedGroup, searchQuery]);

  const peerStudents = useMemo(() => {
    if (!currentUser?.nim) return students;
    const myNorm = normalizeNim(currentUser.nim);
    return students.filter((s) => normalizeNim(s.nim) !== myNorm);
  }, [students, currentUser]);

  const checkedCount = useMemo(() => {
    return peerStudents.filter((s) => isStudentCompleted(s.nim)).length;
  }, [peerStudents, trackingMap, photoRecords, currentUser]);

  const totalTarget = Math.max(1, peerStudents.length);
  const progressPercent = totalTarget > 0 ? Math.round((checkedCount / totalTarget) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 pb-20 space-y-5">
      {/* Toast Notification Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-5 left-4 right-4 sm:left-auto sm:right-6 z-[9999] max-w-md bg-slate-950/95 border border-emerald-500/40 text-white px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-slate-100 truncate">{toastMessage}</p>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-950 transition-colors w-fit group"
        >
          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-all">
            <ArrowLeft className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider">Beranda</span>
        </button>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="space-y-0.5">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Photo Tracking</h1>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">
              Progress Checklist Foto Bersama ({progressPercent}%)
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 text-white px-3.5 py-1.5 rounded-xl flex items-center gap-2 shadow-md shadow-blue-200">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs font-black uppercase tracking-wider">
                {checkedCount} / {totalTarget}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick QR Action Bar (Scan QR & QR Saya) */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {/* Tombol 1: Scan QR */}
        <button
          type="button"
          onClick={openQrScanner}
          className="flex items-center justify-center gap-2.5 p-3 sm:p-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl shadow-md shadow-blue-500/20 font-black text-xs sm:text-sm transition-all active:scale-[0.98] cursor-pointer"
        >
          <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center">
            <Scan className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <div className="leading-tight">Scan QR</div>
            <div className="text-[10px] font-medium text-blue-100 leading-tight">Checklist Cepat</div>
          </div>
        </button>

        {/* Tombol 2: Tampilkan QR Saya */}
        <button
          type="button"
          onClick={openMyQr}
          className="flex items-center justify-center gap-2.5 p-3 sm:p-3.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-2xl shadow-xs font-black text-xs sm:text-sm transition-all active:scale-[0.98] cursor-pointer"
        >
          <div className="w-7 h-7 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <QrCode className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-left">
            <div className="leading-tight">QR Saya</div>
            <div className="text-[10px] font-medium text-slate-400 leading-tight">Buka Kode QR</div>
          </div>
        </button>
      </div>

      {/* Group Navigation & Search */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="relative">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Filter Kelompok</p>
          <CustomSelect
            value={selectedGroup}
            onChange={setSelectedGroup}
            options={groupOptions}
            placeholder="Pilih Kelompok"
          />
        </div>

        <div className="relative group self-end">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Pencarian Cepat</p>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="Cari nama atau NIM..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-24 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-bold"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-1.5 gap-1">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
                  title="Hapus pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={openQrScanner}
                className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-all border border-blue-100 text-[10px] font-black uppercase cursor-pointer"
                title="Pindai QR"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Pindai</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* List - Minimalist Style */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm min-h-[400px]">
        <div className="w-full">
          <div className="divide-y divide-slate-50">
            <AnimatePresence mode="popLayout">
              {isLoading ? (
                // Skeleton loading to prevent glitch
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3.5 animate-pulse">
                    <div className="w-6 h-3 bg-slate-100 rounded" />
                    <div className="flex-1 space-y-2">
                      <div className="w-32 h-4 bg-slate-100 rounded" />
                      <div className="w-20 h-2 bg-slate-50 rounded" />
                    </div>
                    <div className="w-8 h-8 bg-slate-100 rounded-xl" />
                  </div>
                ))
              ) : filteredStudents.length > 0 ? (
                filteredStudents.map((student, idx) => {
                  const isMe = normalizeNim(student.nim) === normalizeNim(currentUser?.nim);
                  const isCompleted = isStudentCompleted(student.nim);
                  const uploaded = isUploaded(student.nim);

                  return (
                    <motion.div 
                      key={student.nim}
                      layout="position"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => !isMe && handleToggle(student.nim, isCompleted)}
                      className={`flex items-center gap-3 p-3.5 transition-all active:scale-[0.99] active:bg-slate-100 select-none border-b border-slate-50 last:border-0 ${
                        isMe ? 'bg-blue-50/50' : 'hover:bg-slate-50/50 cursor-pointer'
                      }`}
                    >
                      <div className="w-6 text-[10px] font-black text-slate-300 text-center shrink-0">{idx + 1}</div>
                      
                      <div className="flex-1 min-w-0 py-0.5">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <p className={`text-sm font-black leading-tight ${isMe ? 'text-blue-700' : 'text-slate-900'}`}>
                            {student.namaLengkap}
                          </p>
                          {student.namaPanggilan && (
                            <span className="text-slate-400 font-medium text-[11px]">({student.namaPanggilan})</span>
                          )}
                          {student.nim && student.nim.replace(/[\/\s]/g, '').toUpperCase() === 'F1D02610090' && (
                            <span className="px-1.5 py-0.5 bg-purple-50 text-purple-800 border border-purple-200 text-[8px] font-bold uppercase rounded-md tracking-wider shrink-0 inline-flex items-center gap-0.5 shadow-2xs">
                              <Bug className="w-2.5 h-2.5 text-purple-600" />
                              <span>Bug Hunter</span>
                            </span>
                          )}
                          {isMe && (
                            <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[8px] font-black uppercase rounded-md tracking-wider shrink-0">SAYA</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                            {student.nim}
                          </p>
                        </div>
                      </div>

                      {/* Status Column - Compact */}
                      <div className="flex items-center gap-3 pr-1 shrink-0">
                        {uploaded ? (
                          <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-lg border border-emerald-100" title="Foto Terupload ke Drive / Supabase">
                            <Camera className="w-3.5 h-3.5" />
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        ) : (
                          <div className="w-7 flex justify-center text-slate-200">
                             <Camera className="w-4 h-4 opacity-30" />
                          </div>
                        )}

                        <div
                          className={`w-8 h-8 rounded-xl transition-all flex items-center justify-center ${
                            isMe 
                              ? 'opacity-20 bg-slate-200' 
                              : isCompleted 
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
                                : 'bg-slate-50 border border-slate-200 text-slate-300'
                          }`}
                        >
                          {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="py-24 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-300">
                    <Users className="w-10 h-10 opacity-20" />
                    <p className="text-xs font-bold uppercase tracking-widest">Tidak ada mahasiswa</p>
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                <CheckCircle2 className="w-3 h-3" />
              </div>
              <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Tanda Checklist</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 bg-emerald-500 rounded-lg flex items-center justify-center text-white shadow-sm">
                <Camera className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Status Upload Drive</span>
            </div>
          </div>
          <div className="hidden sm:block text-right">
             <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Checklist Cepat</p>
             <p className="text-[10px] font-black text-blue-600 uppercase">Gunakan Scan QR untuk Efisiensi</p>
          </div>
        </div>
      </div>

      {/* QR Scanner Modal for Tracking */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        students={students}
        currentUser={currentUser}
        mode="tracking"
        trackingMap={trackingMap}
        onChecklistStudent={handleChecklistFromQr}
        onSelectStudent={(student) => {
          if (student.kelompok) {
            setSelectedGroup(student.kelompok);
          }
          if (onSelectStudent) {
            onSelectStudent(student);
          }
        }}
        initialShowOwnQr={isShowingOwnQrInitial}
      />
    </div>
  );
}
