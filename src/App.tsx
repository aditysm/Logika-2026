/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Routes, Route, useNavigate, useLocation, Navigate, useParams } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { LoginPage } from './components/LoginPage';
import { SearchBar } from './components/SearchBar';
import { StudentCard } from './components/StudentCard';
import { StudentDetailView } from './components/StudentDetailView';
import { UserProgressBanner } from './components/UserProgressBanner';
import { UploadPhotoPage } from './components/UploadPhotoPage';
import { EditProfilePage } from './components/EditProfilePage';
import { PhotoViewerModal } from './components/PhotoViewerModal';
import { LogoutConfirmModal } from './components/LogoutConfirmModal';
import { ScrollToTopButton } from './components/ScrollToTopButton';
import { PricingPage } from './components/PricingPage';
import { TrackingPage } from './components/TrackingPage';
import { MainListView } from './components/MainListView';
import { TierWarningBanner } from './components/TierWarningBanner';
import { generateStudentReport } from './lib/reportGenerator';
import { ConnectionStatus, Mahasiswa, PhotoRecord } from './types';
import {
  fetchStudentsFromSupabase,
  fetchPhotoLogsFromSupabase,
  savePhotoLogToSupabase,
  upsertPhotoTrackingInSupabase,
  saveProfileToSupabase,
  subscribeToSupabaseRealtime,
  getActiveSupabaseConfig,
  DEFAULT_GROUPS,
} from './lib/supabase';
import {
  getPhotoRecords,
  loadPhotoRecordsFromStorage,
  savePhotoRecord,
  setMemoryPhotoRecords,
  syncToLocalStorage,
  mergePhotoRecords,
  hasTakenPhoto,
  getPhotoWithTarget,
  getCurrentUserNim,
  setCurrentUserNim,
  findStudentInList,
  normalizeNim,
  applyProfileOverrides,
  saveProfileOverride,
  clearProfileOverrides,
} from './lib/photoStorage';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  SearchX,
  Users,
  X,
  AlertCircle,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { getIntuitiveErrorMessage } from './lib/errorHandler';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [students, setStudents] = useState<Mahasiswa[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'nama' | 'nim' | 'kelompok'>('kelompok');

  // Dedicated Views & Sub-pages
  const [pendingUploadTarget, setPendingUploadTarget] = useState<Mahasiswa | null>(null);
  const [viewingPhotoRecord, setViewingPhotoRecord] = useState<PhotoRecord | null>(null);

  // Know Each Other & Photo Progress States
  const [currentUserNim, setCurrentUserNimState] = useState<string | null>(() => getCurrentUserNim());
  const [isGuestMode, setIsGuestMode] = useState<boolean>(false);
  const [photoRecords, setPhotoRecords] = useState<PhotoRecord[]>(() => getPhotoRecords());
  const [filterPhotoStatus, setFilterPhotoStatus] = useState<'ALL' | 'BELUM' | 'SUDAH'>('ALL');
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title?: string;
  } | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (
      message: string,
      type: 'success' | 'error' | 'warning' | 'info' = 'success',
      duration = 4000,
      title?: string
    ) => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      setToast({ message, type, title });
      if (duration > 0) {
        toastTimeoutRef.current = setTimeout(() => {
          setToast(null);
        }, duration);
      }
    },
    []
  );

  const setToastMessage = useCallback(
    (msg: string | null, type: 'success' | 'error' | 'warning' | 'info' = 'success', duration = 3500) => {
      if (!msg) {
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        setToast(null);
        return;
      }
      showToast(msg, type, duration);
    },
    [showToast]
  );

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState<boolean>(false);

  // Online / Offline intuitive connection status notification
  useEffect(() => {
    const handleOffline = () => {
      showToast(
        'Koneksi internet terputus. Pastikan perangkat Anda terhubung ke internet dan coba lagi nanti.',
        'warning',
        6000,
        'Jaringan Offline'
      );
    };
    const handleOnline = () => {
      showToast('Koneksi internet kembali aktif.', 'success', 3000, 'Online');
    };
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [showToast]);

  // Track search page scroll position to restore upon returning
  const searchScrollPosRef = useRef<number>(0);
  // Track scroll position when opening sub-pages (upload photo / edit profile) to restore upon returning
  const formReturnScrollPosRef = useRef<number>(0);

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    isCustomConfig: false,
    tableName: 'Logika 2026',
    totalLoaded: 0,
  });

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>(searchQuery);

  // Layar lebar (desktop / >= 1024px) menampilkan 12 data, layar kecil menampilkan 10 data
  const [isLargeScreen, setIsLargeScreen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  // Derived state from URL
  const selectedStudent = useMemo(() => {
    const match = location.pathname.match(/^\/mhs\/([^/]+)$/);
    if (!match) return null;
    const nim = decodeURIComponent(match[1]);
    return students.find(s => s.nim === nim || s.id === nim) || null;
  }, [location.pathname, students]);

  const uploadTargetStudent = useMemo(() => {
    const match = location.pathname.match(/^\/upload\/([^/]+)$/);
    if (!match) return null;
    const nim = decodeURIComponent(match[1]);
    return students.find(s => s.nim === nim || s.id === nim) || null;
  }, [location.pathname, students]);

  useEffect(() => {
    const handleResize = () => {
      setIsLargeScreen(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const itemsPerPage = isLargeScreen ? 12 : 10;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Auto-scroll logic for Detail/Upload return
  useEffect(() => {
    if (location.pathname === '/' && searchScrollPosRef.current > 0) {
      const savedPos = searchScrollPosRef.current;
      requestAnimationFrame(() => {
        window.scrollTo({ top: savedPos, behavior: 'instant' });
        document.documentElement.scrollTop = savedPos;
        document.body.scrollTop = savedPos;
        searchScrollPosRef.current = 0;
      });
    }
  }, [location.pathname]);

  const loadData = useCallback(async (options: { force?: boolean; silent?: boolean } = {}) => {
    const { force = false, silent = false } = options;
    if (!silent) setIsLoading(true);
    try {
      if (force) {
        clearProfileOverrides();
        setMemoryPhotoRecords([]);
      }

      const activeConfig = getActiveSupabaseConfig();
      const result = await fetchStudentsFromSupabase(activeConfig);
      const enhancedStudents = applyProfileOverrides(result.data);

      setStudents(enhancedStudents);

      setConnectionStatus({
        isConnected: result.isRealData,
        isCustomConfig: Boolean(activeConfig.url && activeConfig.anonKey),
        tableName: result.sourceTable,
        errorMessage: result.error,
        totalLoaded: enhancedStudents.length,
      });

      // Merge local storage records with remote photo_logs from Supabase
      const localRecords = await loadPhotoRecordsFromStorage();
      const remoteLogs = await fetchPhotoLogsFromSupabase(activeConfig, enhancedStudents);
      const combined = mergePhotoRecords(localRecords || [], remoteLogs || []);

      setPhotoRecords(combined);
      setMemoryPhotoRecords(combined);
      syncToLocalStorage(combined);
      
      // Increment refreshKey to trigger re-fetches in child components
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Validate session when student list is loaded
  useEffect(() => {
    if (!isLoading && students.length > 0 && currentUserNim) {
      const found = findStudentInList(students, currentUserNim);
      if (!found) {
        // If stored NIM does not exist in loaded student list, clear invalid session
        setCurrentUserNim(null);
        setCurrentUserNimState(null);
      }
    }
  }, [isLoading, students, currentUserNim]);

  useEffect(() => {
    loadData();
  }, []);

  // Realtime Supabase synchronization
  useEffect(() => {
    const unsubscribe = subscribeToSupabaseRealtime(
      () => {
        // Profiles changed remotely - refresh silently
        loadData({ silent: true });
      },
      () => {
        // Photo logs changed remotely
        fetchPhotoLogsFromSupabase().then((logs) => {
          if (logs !== null) {
            setPhotoRecords((current) => {
              const merged = mergePhotoRecords(current, logs);
              setMemoryPhotoRecords(merged);
              return merged;
            });
          }
        });
      },
      () => {
        // Payment logs changed remotely - refresh silently
        loadData({ silent: true });
      },
      () => {
        // Photo tracking changed remotely - increment refreshKey to trigger re-fetch in TrackingPage
        setRefreshKey(prev => prev + 1);
      }
    );

    return () => unsubscribe();
  }, [loadData]);

  // Helper to extract student ID or NIM from URL
  const getRequestedStudentIdFromUrl = (): string | null => {
    const path = location.pathname;
    if (path.startsWith('/mhs/')) return decodeURIComponent(path.replace('/mhs/', '').trim());
    if (path.startsWith('/upload/')) return decodeURIComponent(path.replace('/upload/', '').trim());
    return null;
  };

  // Sync pending upload target when students are loaded from URL
  useEffect(() => {
    if (students.length > 0) {
      const params = new URLSearchParams(location.search);
      const returnTo = params.get('return');
      const returnNim = params.get('nim');

      if (returnTo === 'upload' && returnNim && !pendingUploadTarget) {
        const found = findStudentInList(students, returnNim);
        if (found) setPendingUploadTarget(found);
      }
    }
  }, [students, location.search, pendingUploadTarget]);

  const handleOpenLogin = () => {
    navigate('/login');
  };

  const handleContinueWithoutAccount = () => {
    setCurrentUserNim(null);
    setCurrentUserNimState(null);
    setIsGuestMode(true);
    navigate('/');
  };

  const handleSelectStudent = (student: Mahasiswa) => {
    searchScrollPosRef.current = window.scrollY || document.documentElement.scrollTop || 0;
    navigate(`/mhs/${encodeURIComponent(student.nim || student.id)}`);
  };

  const handleBackToList = () => {
    if (!currentUserNim) {
      setIsGuestMode(true);
    }
    navigate('/');
  };

  const handleGoHomeLogo = () => {
    searchScrollPosRef.current = 0;
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setSelectedGroup('ALL');
    setFilterPhotoStatus('ALL');
    setSortBy('nama');
    setCurrentPage(1);
    if (!currentUserNim && !isGuestMode) {
      navigate('/login');
    } else {
      navigate('/');
    }
  };

  const handleOpenPricing = () => {
    navigate('/pricing');
  };

  const handleClosePricing = () => {
    navigate(-1);
  };

  const handleOpenTracking = () => {
    navigate('/tracking');
  };

  const handleCloseTracking = () => {
    navigate(-1);
  };

  const handleOpenUploadPhoto = (student: Mahasiswa) => {
    if (!currentUserNim) {
      setPendingUploadTarget(student);
      setToastMessage(`Silakan login untuk mengunggah foto bersama ${student.namaPanggilan || student.namaLengkap}.`);
      navigate(`/login?return=upload&nim=${encodeURIComponent(student.nim || student.id)}`);
      return;
    }

    if (currentUser && (student.nim === currentUser.nim || student.id === currentUser.id)) {
      setToastMessage('Ini profil Anda sendiri.');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    if (currentUser) {
      const existingRecord = getPhotoWithTarget(photoRecords, currentUser.nim, student.nim);
      if (existingRecord) {
        setViewingPhotoRecord(existingRecord);
        setToastMessage(`Foto bersama ${student.namaPanggilan || student.namaLengkap} sudah ada.`);
        setTimeout(() => setToastMessage(null), 3000);
        return;
      }

      if ((currentUser.tier || 'free') === 'free') {
        navigate('/pricing');
        setToastMessage('Unggah foto memerlukan Paket Dasar. Silakan upgrade!');
        setTimeout(() => setToastMessage(null), 3000);
        return;
      }
    }

    navigate(`/upload/${encodeURIComponent(student.nim || student.id)}`);
  };

  const handleCloseUploadPhoto = () => {
    navigate(-1);
  };

  const handleOpenEditProfile = () => {
    navigate('/profile');
  };

  const handleCloseEditProfile = () => {
    navigate(-1);
  };

  // Current active logged-in user
  const currentUser = useMemo(() => {
    if (!currentUserNim || students.length === 0) return null;
    const baseUser = findStudentInList(students, currentUserNim);
    if (!baseUser) return null;
    return {
      ...baseUser,
      tier: baseUser.tier || 'free',
    };
  }, [currentUserNim, students]);

  const handleLoginNim = (nim: string) => {
    setIsGuestMode(false);
    setCurrentUserNim(nim);
    setCurrentUserNimState(nim);

    // Ambil ulang photo logs dari Supabase secara langsung setiap kali login
    fetchPhotoLogsFromSupabase().then(async (remoteLogs) => {
      if (remoteLogs !== null) {
        const localRecords = await loadPhotoRecordsFromStorage();
        const merged = mergePhotoRecords(localRecords || [], remoteLogs);
        setPhotoRecords(merged);
        setMemoryPhotoRecords(merged);
      }
    });

    const found = findStudentInList(students, nim);
    const name = found ? (found.namaPanggilan || found.namaLengkap) : nim;

    // Check if there was a pending upload target before login
    if (pendingUploadTarget) {
      const target = pendingUploadTarget;
      setPendingUploadTarget(null);

      // Check if logged in user is the same as the target
      if (found && (found.nim === target.nim || found.id === target.id)) {
        navigate('/');
        setToastMessage(`Selamat datang, ${name}! Ini profil Anda sendiri.`);
        setTimeout(() => setToastMessage(null), 3500);
      } else if (found && hasTakenPhoto(photoRecords, found.nim, target.nim)) {
        const existingRecord = getPhotoWithTarget(photoRecords, found.nim, target.nim);
        if (existingRecord) {
          setViewingPhotoRecord(existingRecord);
        }
        navigate('/');
        setToastMessage(`Selamat datang, ${name}! Foto bersama ${target.namaPanggilan || target.namaLengkap} sudah ada.`);
        setTimeout(() => setToastMessage(null), 4000);
      } else {
        const effectiveTier = found?.tier || 'free';
        if (effectiveTier === 'free') {
          navigate('/pricing');
          setToastMessage(`Selamat datang, ${name}! Akun Free tidak dapat mengunggah foto.`);
          setTimeout(() => setToastMessage(null), 5000);
        } else {
          navigate(`/upload/${encodeURIComponent(target.nim || target.id)}`);
          setToastMessage(`Selamat datang, ${name}! Melanjutkan unggah foto bersama ${target.namaPanggilan || target.namaLengkap}...`);
          setTimeout(() => setToastMessage(null), 4000);
        }
      }
    } else {
      navigate('/');
      setToastMessage(`Selamat datang, ${name}!`);
      setTimeout(() => setToastMessage(null), 3500);
    }

    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleLogout = () => {
    setCurrentUserNim(null);
    setCurrentUserNimState(null);
    setIsGuestMode(false);
    setFilterPhotoStatus('ALL');
    navigate('/login');
    setToastMessage('Sesi akun berhasil diakhiri.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSavePhoto = (recordData: Omit<PhotoRecord, 'id' | 'timestamp'>) => {
    const saved = savePhotoRecord(recordData);
    setPhotoRecords(getPhotoRecords());
    handleCloseUploadPhoto();
    setToastMessage(`Foto bersama ${saved.targetNama} berhasil disimpan ke Drive & dicatat!`);
    setTimeout(() => setToastMessage(null), 4000);

    // Save to Supabase photo_logs in background
    if (recordData.uploaderNim && recordData.targetNim) {
      // 1. Save the photo log
      savePhotoLogToSupabase(
        recordData.uploaderNim,
        recordData.targetNim,
        recordData.photoUrl
      ).catch((e) => console.warn('Supabase photo log background save error:', e));

      // 2. Automatically mark as finished in tracking (Trigger "Sudah Selesai")
      upsertPhotoTrackingInSupabase(
        recordData.uploaderNim,
        recordData.targetNim,
        true
      ).catch((e) => console.warn('Supabase auto-tracking background update error:', e));
    }
  };

  const handleSaveProfile = (updatedData: Partial<Mahasiswa>) => {
    if (!currentUser) return;
    saveProfileOverride(currentUser.nim, updatedData);
    const updatedList = applyProfileOverrides(
      students.map((s) => (normalizeNim(s.nim) === normalizeNim(currentUser.nim) ? { ...s, ...updatedData } : s))
    );
    setStudents(updatedList);
    handleCloseEditProfile();

    // No manual update needed for selectedStudent as it is derived from URL

    setToastMessage('Data profil Anda berhasil diperbarui!');
    setTimeout(() => setToastMessage(null), 3500);

    // Save to Supabase profiles in background
    saveProfileToSupabase(currentUser.nim, updatedData).catch((e) =>
      console.warn('Supabase profile background save error:', e)
    );
  };

  const handleFilterPhotoStatusChange = (status: 'ALL' | 'BELUM' | 'SUDAH') => {
    setFilterPhotoStatus(status);
    requestAnimationFrame(() => {
      const searchSection = document.getElementById('section-pencarian-mahasiswa');
      if (searchSection) {
        searchSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  };

  const handleGenerateReport = async () => {
    if (!currentUser) return;
    try {
      showToast('Sedang menyiapkan dokumen laporan biodata (.docx)...', 'info', 4000);
      const targetFriends = students.filter(
        (s) => currentUser && normalizeNim(s.nim) !== normalizeNim(currentUser.nim)
      );
      await generateStudentReport(currentUser, targetFriends, photoRecords);
      showToast('Laporan (.docx) berhasil dibuat dan diunduh!', 'success', 4000, 'Berhasil Diunduh');
    } catch (err: unknown) {
      console.error('Error generating report:', err);
      const msg = getIntuitiveErrorMessage(err, 'Gagal mengunduh berkas laporan.');
      showToast(msg, 'error', 6000, 'Gagal Mengunduh Laporan');
    }
  };

  // Extract distinct groups for filtering (Kelompok 1 - 10)
  const groups = useMemo(() => {
    const set = new Set<string>();

    // Include default seed groups from DEFAULT_GROUPS (1-10)
    Object.values(DEFAULT_GROUPS).forEach((g) => set.add(g));

    // Also include any custom/unique group names from fetched students data
    students.forEach((s) => {
      if (s.kelompok && s.kelompok !== '-' && s.kelompok !== 'Belum Ada Kelompok') {
        set.add(s.kelompok);
      }
    });

    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [students]);

  // Directory students including everyone (logged-in user now shown)
  const directoryStudents = useMemo(() => {
    return students;
  }, [students]);

  // Filter & Search
  const filteredStudents = useMemo(() => {
    const q = debouncedSearchQuery.toLowerCase().trim();

    return directoryStudents.filter((student) => {
      // Group filter
      if (selectedGroup !== 'ALL' && student.kelompok !== selectedGroup) {
        return false;
      }

      // Photo status filter
      if (filterPhotoStatus !== 'ALL' && currentUser) {
        const isSelf = normalizeNim(student.nim) === normalizeNim(currentUser.nim);
        const isTaken = hasTakenPhoto(photoRecords, currentUser.nim, student.nim);

        if (filterPhotoStatus === 'BELUM') {
          if (isSelf || isTaken) return false;
        } else if (filterPhotoStatus === 'SUDAH') {
          if (!isTaken) return false;
        }
      }

      // Search query filter
      if (!q) return true;

      const namaLengkap = (student.namaLengkap || '').toLowerCase();
      const namaPanggilan = (student.namaPanggilan || '').toLowerCase();
      const nim = (student.nim || '').toLowerCase();
      const kelompok = (student.kelompok || '').toLowerCase();
      const asalDaerah = (student.asalDaerah || '').toLowerCase();
      const hobi = (student.hobi || '').toLowerCase();

      return (
        namaLengkap.includes(q) ||
        namaPanggilan.includes(q) ||
        nim.includes(q) ||
        kelompok.includes(q) ||
        asalDaerah.includes(q) ||
        hobi.includes(q)
      );
    });
  }, [directoryStudents, debouncedSearchQuery, selectedGroup, filterPhotoStatus, currentUser, photoRecords]);

  // Sorting: Place completed photo students at the bottom, then sort by selected criterion
  const sortedStudents = useMemo(() => {
    return [...filteredStudents].sort((a, b) => {
      // 1. Completed photo status check:
      // Students who have already taken a photo ("SUDAH") are placed at the very bottom
      if (currentUser) {
        const aTaken = hasTakenPhoto(photoRecords, currentUser.nim, a.nim);
        const bTaken = hasTakenPhoto(photoRecords, currentUser.nim, b.nim);

        if (aTaken !== bTaken) {
          return aTaken ? 1 : -1;
        }
      }

      // 2. Sort within the same photo status group
      // Default: Kelompok -> Nama -> NIM
      if (sortBy === 'kelompok') {
        const groupA = a.kelompok || '';
        const groupB = b.kelompok || '';
        const groupCompare = groupA.localeCompare(groupB, undefined, { numeric: true });
        if (groupCompare !== 0) return groupCompare;
        
        const nameA = a.namaLengkap || '';
        const nameB = b.namaLengkap || '';
        const nameCompare = nameA.localeCompare(nameB);
        if (nameCompare !== 0) return nameCompare;
        
        return (a.nim || '').localeCompare(b.nim || '');
      }

      if (sortBy === 'nama') {
        const nameA = a.namaLengkap || '';
        const nameB = b.namaLengkap || '';
        const nameCompare = nameA.localeCompare(nameB);
        if (nameCompare !== 0) return nameCompare;

        const groupA = a.kelompok || '';
        const groupB = b.kelompok || '';
        const groupCompare = groupA.localeCompare(groupB, undefined, { numeric: true });
        if (groupCompare !== 0) return groupCompare;

        return (a.nim || '').localeCompare(b.nim || '');
      }

      if (sortBy === 'nim') {
        return (a.nim || '').localeCompare(b.nim || '');
      }

      return 0;
    });
  }, [filteredStudents, sortBy, selectedGroup, currentUser, photoRecords]);

  // Pagination & totalPages
  const totalPages = Math.ceil(sortedStudents.length / itemsPerPage) || 1;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [totalPages, currentPage]);

  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedStudents.slice(start, start + itemsPerPage);
  }, [sortedStudents, currentPage, itemsPerPage]);

  // If user is currently on the login view route (/login), handled by Routes below

  return (
    <div className="min-h-[100dvh] flex flex-col bg-slate-50 pt-16">
      {/* Top Fixed Navigation */}
      <Navbar
        onRefresh={() => loadData({ force: true })}
        isLoading={isLoading}
        totalStudents={currentUser ? Math.max(0, students.length - 1) : students.length}
        onGoHome={handleGoHomeLogo}
        isDetailPage={Boolean(selectedStudent)}
        currentUser={currentUser}
        onViewProfile={() => currentUser && handleSelectStudent(currentUser)}
        onLogout={() => setIsLogoutModalOpen(true)}
        onOpenLogin={handleOpenLogin}
        onOpenPremiumModal={handleOpenPricing}
        onOpenTracking={handleOpenTracking}
        isLoginPage={location.pathname === '/login'}
        onContinueWithoutAccount={handleContinueWithoutAccount}
      />

      {/* Top Banner Warning / Tip for Account Tier */}
      {location.pathname !== '/login' && location.pathname !== '/pricing' && currentUser && (
        <TierWarningBanner
          currentUser={currentUser}
          onOpenPricing={handleOpenPricing}
        />
      )}

      {/* Main Content Area */}
      <main className={`flex-1 w-full mx-auto ${location.pathname === '/login' ? 'max-w-md px-3 py-1 sm:py-4 flex flex-col justify-center' : 'max-w-6xl px-4 sm:px-6 py-6 sm:py-8'}`}>
        <AnimatePresence mode="wait">
          <Routes location={location}>
            <Route
              path="/"
              element={
                !currentUserNim && !isGuestMode ? (
                  <Navigate to="/login" replace />
                ) : (
                  <MainListView
                    currentUser={currentUser}
                    students={students}
                    directoryStudents={directoryStudents}
                    sortedStudents={sortedStudents}
                    paginatedStudents={paginatedStudents}
                    photoRecords={photoRecords}
                    isLoading={isLoading}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    selectedGroup={selectedGroup}
                    setSelectedGroup={setSelectedGroup}
                    groups={groups}
                    sortBy={sortBy}
                    setSortBy={setSortBy}
                    filterPhotoStatus={filterPhotoStatus}
                    setFilterPhotoStatus={setFilterPhotoStatus}
                    currentPage={currentPage}
                    setCurrentPage={setCurrentPage}
                    totalPages={totalPages}
                    itemsPerPage={itemsPerPage}
                    isLargeScreen={isLargeScreen}
                    handleSelectStudent={handleSelectStudent}
                    handleOpenUploadPhoto={handleOpenUploadPhoto}
                    handleOpenPricing={handleOpenPricing}
                    handleGenerateReport={handleGenerateReport}
                    handleFilterPhotoStatusChange={handleFilterPhotoStatusChange}
                    loadData={loadData}
                    hasTakenPhoto={hasTakenPhoto}
                  />
                )
              }
            />
            <Route
              path="/login"
              element={
                currentUserNim ? (
                  <Navigate to="/" replace />
                ) : (
                  <motion.div
                    key="login"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  >
                    <LoginPage
                      onLogin={handleLoginNim}
                      onContinueWithoutAccount={handleContinueWithoutAccount}
                      students={students}
                      isLoading={isLoading}
                    />
                  </motion.div>
                )
              }
            />
            <Route
              path="/mhs/:nim"
              element={
                selectedStudent ? (
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
                      totalStudents={students}
                      onBack={handleBackToList}
                      onSelectStudent={handleSelectStudent}
                      currentUser={currentUser}
                      photoRecords={photoRecords}
                      photoRecord={
                        currentUser
                          ? getPhotoWithTarget(photoRecords, currentUser.nim, selectedStudent.nim)
                          : undefined
                      }
                      refreshKey={refreshKey}
                      onOpenUploadModal={handleOpenUploadPhoto}
                      onViewPhoto={(rec) => setViewingPhotoRecord(rec)}
                      onEditProfile={handleOpenEditProfile}
                      onOpenPremiumModal={handleOpenPricing}
                      onGenerateReport={handleGenerateReport}
                    />
                  </motion.div>
                ) : isLoading ? (
                  <div className="flex flex-col items-center justify-center py-24 gap-3">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    <p className="text-xs text-slate-500 font-medium">Memuat data mahasiswa...</p>
                  </div>
                ) : (
                  <Navigate to={currentUserNim || isGuestMode ? '/' : '/login'} replace />
                )
              }
            />
            <Route
              path="/upload/:nim"
              element={
                currentUser && uploadTargetStudent ? (
                  <motion.div
                    key={`upload-photo-${uploadTargetStudent.id}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                  >
                    <UploadPhotoPage
                      currentUser={currentUser}
                      targetStudent={uploadTargetStudent}
                      photoRecords={photoRecords}
                      onSavePhoto={handleSavePhoto}
                      onBack={handleCloseUploadPhoto}
                    />
                  </motion.div>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="/profile"
              element={
                currentUser ? (
                  <motion.div
                    key="edit-profile"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                  >
                    <EditProfilePage
                      currentUser={currentUser}
                      groups={groups}
                      onSaveProfile={handleSaveProfile}
                      onBack={handleCloseEditProfile}
                    />
                  </motion.div>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="/pricing"
              element={
                currentUser ? (
                  <motion.div
                    key="pricing-page"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                  >
                    <PricingPage
                      currentUser={currentUser}
                      refreshKey={refreshKey}
                      onBack={handleClosePricing}
                      onRefreshProfileStatus={() => loadData({ force: true })}
                    />
                  </motion.div>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="/tracking"
              element={
                currentUser ? (
                  <motion.div
                    key="tracking-page"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                  >
                    <TrackingPage
                      currentUser={currentUser}
                      students={students}
                      photoRecords={photoRecords}
                      refreshKey={refreshKey}
                      onBack={handleCloseTracking}
                    />
                  </motion.div>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className={`mt-auto border-t border-slate-200 bg-white/80 text-center text-xs text-slate-500 ${location.pathname === '/login' ? 'py-3' : 'py-5 sm:py-6'}`}>
        <div className="w-full px-4 flex flex-col items-center justify-center gap-1.5 text-center">
          <p className="font-medium text-slate-600">
            Data Peserta Logika 2026 &bull; Powered by{' '}
            <a
              href="https://www.instagram.com/dity.storee"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-slate-800 underline hover:text-blue-600 transition-colors"
            >
              Dity Store
            </a>
          </p>
        </div>
      </footer>

      {/* Photo Viewer Modal Lightbox */}
      <PhotoViewerModal
        photoRecord={viewingPhotoRecord}
        currentUser={currentUser}
        onClose={() => setViewingPhotoRecord(null)}
      />

      {/* Floating Scroll To Top Button */}
      {location.pathname !== '/login' && <ScrollToTopButton />}

      {/* Logout Confirmation Custom Modal */}
      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        currentUser={currentUser}
        onConfirm={handleLogout}
        onClose={() => setIsLogoutModalOpen(false)}
      />



      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl shadow-2xl flex items-start gap-3 border text-xs font-medium max-w-md w-[92%] sm:w-auto sm:min-w-[340px] backdrop-blur-xl ${
              toast.type === 'error'
                ? 'bg-slate-900/95 border-rose-500/40 text-rose-50 shadow-rose-950/30'
                : toast.type === 'warning'
                ? 'bg-slate-900/95 border-amber-500/40 text-amber-50 shadow-amber-950/30'
                : toast.type === 'info'
                ? 'bg-slate-900/95 border-blue-500/40 text-blue-50 shadow-blue-950/30'
                : 'bg-slate-900/95 border-emerald-500/40 text-emerald-50 shadow-emerald-950/30'
            }`}
          >
            {toast.type === 'error' && (
              <div className="w-6 h-6 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0 mt-0.5 border border-rose-500/20">
                <AlertCircle className="w-4 h-4 text-rose-400" />
              </div>
            )}
            {toast.type === 'warning' && (
              <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5 border border-amber-500/20">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
            )}
            {toast.type === 'info' && (
              <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5 border border-blue-500/20">
                <Info className="w-4 h-4 text-blue-400" />
              </div>
            )}
            {toast.type === 'success' && (
              <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
            )}

            <div className="flex-1 min-w-0 pr-1">
              {toast.title && (
                <p className={`text-xs font-semibold mb-0.5 ${
                  toast.type === 'error'
                    ? 'text-rose-300'
                    : toast.type === 'warning'
                    ? 'text-amber-300'
                    : toast.type === 'info'
                    ? 'text-blue-300'
                    : 'text-emerald-300'
                }`}>
                  {toast.title}
                </p>
              )}
              <p className="text-slate-200 leading-relaxed font-normal text-xs">{toast.message}</p>
            </div>

            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Tutup notifikasi"
              className="p-1 -mr-1 -mt-0.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
