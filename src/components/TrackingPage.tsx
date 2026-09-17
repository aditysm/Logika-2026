import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Circle, 
  Users, 
  Search,
  User,
  Camera,
  Check,
  ChevronDown
} from 'lucide-react';
import { Mahasiswa, PhotoRecord } from '../types';
import { 
  fetchPhotoTrackingFromSupabase, 
  upsertPhotoTrackingInSupabase 
} from '../lib/supabase';
import { CustomSelect } from './CustomSelect';

interface TrackingPageProps {
  currentUser: Mahasiswa | null;
  students: Mahasiswa[];
  photoRecords: PhotoRecord[];
  onBack: () => void;
  refreshKey?: number;
}

export function TrackingPage({ 
  currentUser, 
  students, 
  photoRecords, 
  onBack,
  refreshKey = 0
}: TrackingPageProps) {
  const [trackingMap, setTrackingMap] = useState<Record<string, boolean>>({});
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Get current user NIM - matching new schema where user_id references profiles.nim
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

  const handleToggle = async (targetNim: string, currentState: boolean) => {
    if (!userKey || targetNim === currentUser?.nim) {
      console.warn("Toggle ignored: userKey missing or target is self", { userKey, targetNim });
      return;
    }
    
    const newState = !currentState;
    
    // Optimistic update
    setTrackingMap(prev => ({ ...prev, [targetNim]: newState }));
    
    const success = await upsertPhotoTrackingInSupabase(userKey, targetNim, newState);
    if (!success) {
      // Rollback on failure
      setTrackingMap(prev => ({ ...prev, [targetNim]: currentState }));
    }
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

  // Check if photo is actually uploaded in photo_logs
  const isUploaded = (targetNim: string) => {
    if (!currentUser?.nim) return false;
    return photoRecords.some(r => 
      (r.uploaderNim === currentUser.nim && r.targetNim === targetNim) ||
      (r.uploaderNim === targetNim && r.targetNim === currentUser.nim)
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pb-20 space-y-5">
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

        <div className="flex items-end justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-0.5">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Photo Tracking</h1>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">Progress Checklist Anda</p>
          </div>
          
          <div className="bg-blue-600 text-white px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-wider">
              {Object.values(trackingMap).filter(v => v).length} / {students.length - 1}
            </span>
          </div>
        </div>
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
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-bold"
            />
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
                  const isMe = student.nim === currentUser?.nim;
                  const checked = trackingMap[student.nim] || false;
                  const uploaded = isUploaded(student.nim);

                  return (
                    <motion.div 
                      key={student.nim}
                      layout="position"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => !isMe && handleToggle(student.nim, checked)}
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
                          <span className="text-slate-400 font-medium text-[11px]">({student.namaPanggilan})</span>
                          {isMe && (
                            <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[8px] font-black uppercase rounded-md tracking-wider shrink-0">SAYA</span>
                          )}
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">
                          {student.nim}
                        </p>
                      </div>

                      {/* Status Column - Compact */}
                      <div className="flex items-center gap-3 pr-1 shrink-0">
                        {uploaded ? (
                          <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-lg border border-emerald-100" title="Foto Terupload">
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
                              : checked 
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
                                : 'bg-slate-50 border border-slate-200 text-slate-300'
                          }`}
                        >
                          {checked ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
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
      
      {/* Redesigned Legend - More Intuitive */}
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
                <Camera className="w-3 h-3" />
              </div>
              <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Status Upload</span>
            </div>
          </div>
          <div className="hidden sm:block text-right">
             <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Status Progres</p>
             <p className="text-[10px] font-black text-slate-900 uppercase">Foto = Progres</p>
          </div>
        </div>
      </div>
    </div>
  );
}



