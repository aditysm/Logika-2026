
import { motion } from 'motion/react';
import { SearchBar } from './SearchBar';
import { StudentCard } from './StudentCard';
import { UserProgressBanner } from './UserProgressBanner';
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, SearchX, Users } from 'lucide-react';
import { Mahasiswa, PhotoRecord } from '../types';

interface MainListViewProps {
  currentUser: Mahasiswa | null;
  students: Mahasiswa[];
  directoryStudents: Mahasiswa[];
  sortedStudents: Mahasiswa[];
  paginatedStudents: Mahasiswa[];
  photoRecords: PhotoRecord[];
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedGroup: string;
  setSelectedGroup: (g: string) => void;
  groups: string[];
  sortBy: 'nama' | 'nim' | 'kelompok';
  setSortBy: (s: 'nama' | 'nim' | 'kelompok') => void;
  filterPhotoStatus: 'ALL' | 'BELUM' | 'SUDAH';
  setFilterPhotoStatus: (s: 'ALL' | 'BELUM' | 'SUDAH') => void;
  currentPage: number;
  setCurrentPage: (p: number | ((prev: number) => number)) => void;
  totalPages: number;
  itemsPerPage: number;
  isLargeScreen: boolean;
  handleSelectStudent: (student: Mahasiswa) => void;
  handleOpenUploadPhoto: (student: Mahasiswa) => void;
  handleOpenPricing: () => void;
  handleGenerateReport: () => void;
  handleFilterPhotoStatusChange: (status: 'ALL' | 'BELUM' | 'SUDAH') => void;
  loadData: () => void;
  hasTakenPhoto: (records: PhotoRecord[], uploaderNim: string, targetNim: string) => boolean;
}

export function MainListView({
  currentUser,
  students,
  directoryStudents,
  sortedStudents,
  paginatedStudents,
  photoRecords,
  isLoading,
  searchQuery,
  setSearchQuery,
  selectedGroup,
  setSelectedGroup,
  groups,
  sortBy,
  setSortBy,
  filterPhotoStatus,
  setFilterPhotoStatus,
  currentPage,
  setCurrentPage,
  totalPages,
  itemsPerPage,
  isLargeScreen,
  handleSelectStudent,
  handleOpenUploadPhoto,
  handleOpenPricing,
  handleGenerateReport,
  handleFilterPhotoStatusChange,
  loadData,
  hasTakenPhoto,
}: MainListViewProps) {
  return (
    <motion.div
      key="search-list"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="space-y-6 sm:space-y-8"
    >
      {/* User Progress Dashboard (Know Each Other) - Shown if logged in */}
      {currentUser && (
        <UserProgressBanner
          currentUser={currentUser}
          students={students}
          photoRecords={photoRecords}
          filterPhotoStatus={filterPhotoStatus}
          onFilterPhotoStatusChange={handleFilterPhotoStatusChange}
          onOpenPremiumModal={handleOpenPricing}
          onGenerateReport={handleGenerateReport}
        />
      )}

      {/* Search Header Section */}
      <section
        id="section-pencarian-mahasiswa"
        className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs relative scroll-mt-20"
      >
        <div className="absolute -right-16 -top-16 w-56 h-56 bg-blue-50 rounded-full blur-2xl pointer-events-none -z-0" />

        <div className="relative z-10 w-full space-y-6">
          <div className="max-w-3xl">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Pencarian Mahasiswa
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-1 leading-relaxed">
              Temukan teman berdasarkan nama, NIM, asal daerah, atau kelompok logika.
              Pilih kartu mahasiswa untuk membuka halaman detail lengkap dan mengunggah foto bersama.
            </p>
          </div>

          <SearchBar
            currentUser={currentUser}
            students={students}
            onSelectStudent={handleSelectStudent}
            searchQuery={searchQuery}
            onSearchChange={(q) => {
              setSearchQuery(q);
              setCurrentPage(1);
            }}
            selectedGroup={selectedGroup}
            onGroupChange={(grp) => {
              setSelectedGroup(grp);
              setCurrentPage(1);
              if (grp !== 'ALL') {
                setSortBy('nama');
              }
            }}
            groups={groups}
            sortBy={sortBy}
            onSortChange={(sort) => {
              setSortBy(sort);
              setCurrentPage(1);
            }}
            totalFiltered={sortedStudents.length}
            totalAll={directoryStudents.length}
          />
        </div>
      </section>

      {/* Results Grid Section */}
      <section>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: isLargeScreen ? 12 : 6 }).map((_, idx) => (
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
        ) : paginatedStudents.length > 0 ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedStudents.map((student, idx) => {
                const globalIndex = (currentPage - 1) * itemsPerPage + idx + 1;
                return (
                  <StudentCard
                    key={student.id}
                    student={student}
                    onSelect={(mhs) => handleSelectStudent(mhs)}
                    currentUser={currentUser}
                    isPhotoTaken={
                      currentUser
                        ? hasTakenPhoto(photoRecords, currentUser.nim, student.nim)
                        : false
                    }
                    onOpenUploadModal={(target) => {
                      handleOpenUploadPhoto(target);
                    }}
                    index={globalIndex}
                    showIndex={selectedGroup !== 'ALL'}
                  />
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
                <div className="text-xs sm:text-sm text-slate-600">
                  Menampilkan <span className="font-bold text-slate-900">
                    {Math.min(sortedStudents.length, currentPage * itemsPerPage)}
                  </span> dari <span className="font-bold text-slate-900">{sortedStudents.length}</span> mahasiswa
                </div>

                <div className="flex items-center gap-1.5 flex-wrap justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentPage((p) => Math.max(p - 1, 1));
                      const el = document.getElementById('section-pencarian-mahasiswa');
                      if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
                    }}
                    disabled={currentPage === 1}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Sebelumnya</span>
                  </button>

                  <div className="flex items-center gap-1 px-2">
                    {(() => {
                      const pages = [];
                      const blockSize = 3;
                      const currentBlock = Math.floor((currentPage - 1) / blockSize);
                      const startPage = currentBlock * blockSize + 1;
                      const endPage = Math.min(startPage + blockSize - 1, totalPages);

                      for (let i = startPage; i <= endPage; i++) {
                        pages.push(i);
                      }
                      
                      return (
                        <>
                          {pages.map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => {
                                setCurrentPage(num);
                                const el = document.getElementById('section-pencarian-mahasiswa');
                                if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
                              }}
                              className={`w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                                currentPage === num
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'border border-slate-200 text-slate-700 bg-white hover:bg-slate-50'
                              }`}
                            >
                              {num}
                            </button>
                          ))}
                          {endPage < totalPages && (
                            <>
                              <span className="text-slate-400 px-1">...</span>
                              <button
                                key={totalPages}
                                type="button"
                                onClick={() => {
                                  setCurrentPage(totalPages);
                                  const el = document.getElementById('section-pencarian-mahasiswa');
                                  if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
                                }}
                                className={`w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                                  currentPage === totalPages
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'border border-slate-200 text-slate-700 bg-white hover:bg-slate-50'
                                }`}
                              >
                                {totalPages}
                              </button>
                            </>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setCurrentPage((p) => Math.min(p + 1, totalPages));
                      const el = document.getElementById('section-pencarian-mahasiswa');
                      if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
                    }}
                    disabled={currentPage === totalPages}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    <span className="hidden sm:inline">Berikutnya</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : students.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-10 sm:p-14 text-center max-w-lg mx-auto my-6 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mx-auto shadow-2xs">
              <Users className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-slate-800">
                Belum Ada Data Mahasiswa
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
                Daftar mahasiswa saat ini belum tersedia atau sedang disiapkan. Silakan muat ulang untuk memeriksa pembaruan data.
              </p>
            </div>
            <div className="pt-2">
              <button
                id="btn-reload-empty-db"
                type="button"
                onClick={loadData}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Muat Ulang Data</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center max-w-md mx-auto my-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <SearchX className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              Tidak ada mahasiswa yang cocok
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tidak ditemukan hasil
              {searchQuery.trim() ? ` untuk pencarian "${searchQuery.trim()}"` : ''}
              {selectedGroup !== 'ALL' && ` pada ${selectedGroup}`}
              {filterPhotoStatus !== 'ALL' && ` dengan filter "${filterPhotoStatus}"`}. Silakan coba kata kunci lain atau reset filter.
            </p>
            <div className="pt-2">
              <button
                id="btn-reset-filters"
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedGroup('ALL');
                  setFilterPhotoStatus('ALL');
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
              >
                Reset Pencarian & Filter
              </button>
            </div>
          </div>
        )}
      </section>
    </motion.div>
  );
}
