/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Navbar } from './components/Navbar';
import { SearchBar } from './components/SearchBar';
import { StudentCard } from './components/StudentCard';
import { StudentDetailView } from './components/StudentDetailView';
import { SupabaseConfigModal } from './components/SupabaseConfigModal';
import { ConnectionStatus, Mahasiswa } from './types';
import { fetchStudentsFromSupabase, getActiveSupabaseConfig } from './lib/supabase';
import { Database, SearchX } from 'lucide-react';

export default function App() {
  const [students, setStudents] = useState<Mahasiswa[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'nama' | 'nim' | 'kelompok' | 'asal'>('nama');
  const [selectedStudent, setSelectedStudent] = useState<Mahasiswa | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);

  // Track search page scroll position to restore upon returning
  const searchScrollPosRef = useRef<number>(0);

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    isCustomConfig: false,
    tableName: 'Logika 2026',
    totalLoaded: 0,
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const activeConfig = getActiveSupabaseConfig();
      const result = await fetchStudentsFromSupabase();

      setStudents(result.data);
      setConnectionStatus({
        isConnected: result.isRealData,
        isCustomConfig: Boolean(activeConfig.url && activeConfig.anonKey),
        tableName: result.sourceTable,
        errorMessage: result.error,
        totalLoaded: result.data.length,
      });
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // If user arrived directly with a hash on page load, push base state first so pressing back returns to list
    if (window.location.hash.startsWith('#mhs=')) {
      const directHash = window.location.hash;
      window.history.replaceState({ view: 'list' }, '', window.location.pathname);
      window.history.pushState({ view: 'detail' }, '', directHash);
    }
  }, []);

  // Sync with browser back/forward buttons via popstate and hashchange
  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash;
      if (!hash || !hash.startsWith('#mhs=')) {
        setSelectedStudent(null);
        // Restore search position when going back via browser history
        const savedPos = searchScrollPosRef.current;
        requestAnimationFrame(() => {
          window.scrollTo({ top: savedPos, behavior: 'instant' });
          document.documentElement.scrollTop = savedPos;
          document.body.scrollTop = savedPos;
        });
      } else {
        const id = decodeURIComponent(hash.replace('#mhs=', ''));
        const found = students.find((s) => s.id === id || s.nim === id);
        if (found) {
          if (!selectedStudent) {
            searchScrollPosRef.current =
              window.scrollY || document.documentElement.scrollTop || 0;
          }
          setSelectedStudent(found);
          window.scrollTo({ top: 0, behavior: 'instant' });
          document.documentElement.scrollTop = 0;
          document.body.scrollTop = 0;
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, [students, selectedStudent]);

  const handleSelectStudent = (student: Mahasiswa) => {
    // If coming from the search page, record current scroll position
    if (!selectedStudent) {
      searchScrollPosRef.current =
        window.scrollY || document.documentElement.scrollTop || 0;
    }

    setSelectedStudent(student);
    window.history.pushState(
      { view: 'detail', id: student.id },
      '',
      `#mhs=${encodeURIComponent(student.id)}`
    );

    // Set scroll position to 0 immediately when entering detail view
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  const handleBackToList = () => {
    setSelectedStudent(null);

    // If currently on a hash, push base state so browser back returns to list rather than exit
    if (window.location.hash.startsWith('#mhs=')) {
      window.history.pushState({ view: 'list' }, '', window.location.pathname);
    }

    const savedPos = searchScrollPosRef.current;
    // Restore exact scroll position of search page
    requestAnimationFrame(() => {
      window.scrollTo({ top: savedPos, behavior: 'instant' });
      document.documentElement.scrollTop = savedPos;
      document.body.scrollTop = savedPos;
    });
  };

  // Extract distinct groups for filtering
  const groups = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.kelompok && s.kelompok !== '-') {
        set.add(s.kelompok);
      }
    });
    return Array.from(set).sort();
  }, [students]);

  // Filter & Search
  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return students.filter((student) => {
      // Group filter
      if (selectedGroup !== 'ALL' && student.kelompok !== selectedGroup) {
        return false;
      }

      // Keyword search across all user fields
      if (!q) return true;

      const searchableText = [
        student.namaLengkap,
        student.namaPanggilan,
        student.nim,
        student.asalRumah,
        student.alamatRumahDomisili,
        student.hobi,
        student.noWa,
        student.email,
        student.kelompok,
      ]
        .join(' ')
        .toLowerCase();

      return searchableText.includes(q);
    });
  }, [students, searchQuery, selectedGroup]);

  // Sort
  const sortedStudents = useMemo(() => {
    return [...filteredStudents].sort((a, b) => {
      if (sortBy === 'nama') {
        return a.namaLengkap.localeCompare(b.namaLengkap);
      }
      if (sortBy === 'nim') {
        return a.nim.localeCompare(b.nim);
      }
      if (sortBy === 'kelompok') {
        return a.kelompok.localeCompare(b.kelompok);
      }
      if (sortBy === 'asal') {
        return a.asalRumah.localeCompare(b.asalRumah);
      }
      return 0;
    });
  }, [filteredStudents, sortBy]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Sticky Navigation */}
      <Navbar
        connectionStatus={connectionStatus}
        onOpenSettings={() => setIsConfigModalOpen(true)}
        onRefresh={loadData}
        isLoading={isLoading}
        totalStudents={students.length}
        onGoHome={handleBackToList}
        isDetailPage={Boolean(selectedStudent)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <AnimatePresence mode="wait">
          {selectedStudent ? (
            /* Dedicated Detail Page View */
            <motion.div
              key={`detail-${selectedStudent.id}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <StudentDetailView
                student={selectedStudent}
                allStudents={sortedStudents}
                onBack={handleBackToList}
                onSelectStudent={handleSelectStudent}
              />
            </motion.div>
          ) : (
            /* Search & List Page View */
            <motion.div
              key="search-list"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="space-y-6 sm:space-y-8"
            >
              {/* Search Header Section */}
              <section className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
                <div className="absolute -right-16 -top-16 w-56 h-56 bg-indigo-50 rounded-full blur-2xl pointer-events-none -z-0" />

                <div className="relative z-10 max-w-3xl">
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Pencarian Mahasiswa
                  </h2>
                  <p className="text-sm sm:text-base text-slate-600 mt-1 mb-6 leading-relaxed">
                    Temukan teman berdasarkan nama, NIM, asal daerah, atau kelompok belajar.
                    Pilih kartu mahasiswa untuk membuka halaman detail lengkap.
                  </p>

                  {/* Interactive Search Bar & Group Filter */}
                  <SearchBar
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    selectedGroup={selectedGroup}
                    onGroupChange={setSelectedGroup}
                    groups={groups}
                    sortBy={sortBy}
                    onSortChange={setSortBy}
                    totalFiltered={sortedStudents.length}
                    totalAll={students.length}
                  />
                </div>
              </section>

              {/* Results Grid Section */}
              <section>
              {isLoading ? (
                /* Skeleton Loading Grid */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-slate-200 rounded-2xl p-5 animate-pulse space-y-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-slate-200 rounded-xl" />
                        <div className="space-y-1.5 flex-1">
                          <div className="h-3.5 bg-slate-200 rounded w-24" />
                          <div className="h-4 bg-slate-200 rounded w-40" />
                        </div>
                      </div>
                      <div className="space-y-2 pt-2">
                        <div className="h-3 bg-slate-200 rounded w-32" />
                        <div className="h-3 bg-slate-200 rounded w-48" />
                      </div>
                      <div className="pt-3 border-t border-slate-100 flex justify-between">
                        <div className="h-4 bg-slate-200 rounded w-16" />
                        <div className="h-4 bg-slate-200 rounded w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : sortedStudents.length > 0 ? (
                /* Student Cards Grid */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sortedStudents.map((student) => (
                    <StudentCard
                      key={student.id}
                      student={student}
                      onSelect={(mhs) => handleSelectStudent(mhs)}
                    />
                  ))}
                </div>
              ) : (
                /* Empty Search Result */
                <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center max-w-md mx-auto my-6 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <SearchX className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800">
                    Tidak ada mahasiswa yang cocok
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Tidak ditemukan hasil untuk pencarian &quot;{searchQuery}&quot;
                    {selectedGroup !== 'ALL' && ` pada ${selectedGroup}`}. Silakan coba kata kunci
                    lain atau reset filter.
                  </p>
                  <div className="pt-2">
                    <button
                      id="btn-reset-filters"
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedGroup('ALL');
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
                    >
                      Reset Pencarian & Filter
                    </button>
                  </div>
                </div>
              )}
            </section>
          </motion.div>
        )}
      </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white/70 py-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-medium text-slate-600">
            Data Peserta Logika 2026 - Powered by Dity Store
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsConfigModalOpen(true)}
              className="text-indigo-600 hover:underline font-medium"
            >
              Pengaturan Sumber Data
            </button>
            <span>&bull;</span>
            <span className="text-slate-500 font-medium">{students.length} Mahasiswa Terdaftar</span>
          </div>
        </div>
      </footer>

      {/* Supabase Config Modal (Accessible via footer or navbar icon) */}
      <SupabaseConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        onConfigSaved={loadData}
        currentTableName={connectionStatus.tableName}
        isRealData={connectionStatus.isConnected}
        errorMessage={connectionStatus.errorMessage}
      />
    </div>
  );
}
