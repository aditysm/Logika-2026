/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
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
import { generateStudentReport } from './lib/reportGenerator';
import { ConnectionStatus, Mahasiswa, PhotoRecord } from './types';
import {
  fetchStudentsFromSupabase,
  fetchPhotoLogsFromSupabase,
  savePhotoLogToSupabase,
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
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, RefreshCw, SearchX, Users, X } from 'lucide-react';

export default function App() {
  const [students, setStudents] = useState<Mahasiswa[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'nama' | 'nim' | 'kelompok'>('kelompok');
  const [selectedStudent, setSelectedStudent] = useState<Mahasiswa | null>(null);

  // Dedicated Views & Sub-pages
  const [uploadTargetStudent, setUploadTargetStudent] = useState<Mahasiswa | null>(null);
  const [pendingUploadTarget, setPendingUploadTarget] = useState<Mahasiswa | null>(null);
  const [isEditProfileView, setIsEditProfileView] = useState<boolean>(false);
  const [viewingPhotoRecord, setViewingPhotoRecord] = useState<PhotoRecord | null>(null);

  // Know Each Other & Photo Progress States
  const [currentUserNim, setCurrentUserNimState] = useState<string | null>(() => getCurrentUserNim());
  const [photoRecords, setPhotoRecords] = useState<PhotoRecord[]>(() => getPhotoRecords());
  const [filterPhotoStatus, setFilterPhotoStatus] = useState<'ALL' | 'BELUM' | 'SUDAH'>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState<boolean>(false);
  const [isPricingView, setIsPricingView] = useState<boolean>(false);

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

  const loadData = async (force = false) => {
    setIsLoading(true);
    try {
      if (force) {
        clearProfileOverrides();
        // Also clear memory photo cache to force remote fetch
        setMemoryPhotoRecords([]);
      }

      const activeConfig = getActiveSupabaseConfig();
      const result = await fetchStudentsFromSupabase(activeConfig);
      const enhancedStudents = applyProfileOverrides(result.data);

      setStudents(enhancedStudents);
      
      // Update selectedStudent if it exists to point to the fresh data
      if (selectedStudent) {
        const freshStudent = enhancedStudents.find(
          (s) => s.id === selectedStudent.id || (s.nim && s.nim === selectedStudent.nim)
        );
        if (freshStudent) {
          setSelectedStudent(freshStudent);
        }
      }

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
  };

  useEffect(() => {
    loadData();
  }, []);

  // Realtime Supabase synchronization
  useEffect(() => {
    const unsubscribe = subscribeToSupabaseRealtime(
      () => {
        // Profiles changed remotely
        fetchStudentsFromSupabase().then((res) => {
          if (res.data && res.data.length > 0) {
            setStudents((currentStudents) => applyProfileOverrides(res.data));
          }
        });
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
        // Payment logs changed remotely
        loadData();
      }
    );

    return () => unsubscribe();
  }, []);

  // Helper to extract student ID or NIM from URL (hash, search params, or pathname)
  const getRequestedStudentIdFromUrl = (): string | null => {
    const path = window.location.pathname.replace(/\/$/, '');
    const hash = window.location.hash;
    const params = new URLSearchParams(window.location.search);

    // 1. Direct path /detail/NIM or /upload/NIM or /mhs/NIM
    if (path.startsWith('/detail/')) {
      return decodeURIComponent(path.replace('/detail/', '').trim());
    }
    if (path.startsWith('/mhs/')) {
      return decodeURIComponent(path.replace('/mhs/', '').trim());
    }
    if (path.startsWith('/upload/')) {
      return decodeURIComponent(path.replace('/upload/', '').trim());
    }

    // 2. Hash based
    if (hash) {
      if (hash.startsWith('#login') || hash.startsWith('#/login')) {
        return null;
      }
      if (hash.startsWith('#mhs=')) {
        return decodeURIComponent(hash.replace('#mhs=', '').trim());
      }
      if (hash.startsWith('#detail=')) {
        return decodeURIComponent(hash.replace('#detail=', '').trim());
      }
      if (hash.startsWith('#upload=')) {
        return decodeURIComponent(hash.replace('#upload=', '').trim());
      }
      if (hash.startsWith('#nim=')) {
        return decodeURIComponent(hash.replace('#nim=', '').trim());
      }
      if (hash.startsWith('#id=')) {
        return decodeURIComponent(hash.replace('#id=', '').trim());
      }
      if (hash.startsWith('#/mhs/')) {
        return decodeURIComponent(hash.replace('#/mhs/', '').trim());
      }
      if (hash.startsWith('#/detail/')) {
        return decodeURIComponent(hash.replace('#/detail/', '').trim());
      }
      if (hash.startsWith('#/upload/')) {
        return decodeURIComponent(hash.replace('#/upload/', '').trim());
      }
      const rawHash = hash.replace(/^#\/?/, '').trim();
      if (rawHash && !rawHash.includes('&') && !rawHash.includes('=')) {
        return decodeURIComponent(rawHash);
      }
    }

    // 3. Search query params (?nim=..., ?mhs=..., ?id=..., ?detail=...)
    const mhsParam = params.get('mhs') || params.get('id') || params.get('nim') || params.get('detail');
    if (mhsParam) return mhsParam.trim();

    return null;
  };

  const isLoginPathOrHash = () => {
    const path = window.location.pathname.replace(/\/$/, '');
    const hash = window.location.hash;
    return path === '/login' || hash === '#login' || hash === '#/login' || hash.startsWith('#login') || hash.startsWith('#/login');
  };

  const [isLoginView, setIsLoginView] = useState<boolean>(() => isLoginPathOrHash());

  useEffect(() => {
    loadData();

    // Check if initial route has return params for upload
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    const hashParams = hash.includes('?') ? new URLSearchParams(hash.split('?')[1]) : null;
    const returnTo = params.get('return') || hashParams?.get('return');
    const returnNim = params.get('nim') || hashParams?.get('nim');

    if (isLoginPathOrHash()) {
      setIsLoginView(true);
    } else if (window.location.hash === '#pricing' || window.location.hash === '#/pricing') {
      setIsPricingView(true);
    } else {
      const requestedId = getRequestedStudentIdFromUrl();
      if (requestedId) {
        // Do nothing here, wait for students to load in the second useEffect
      }
    }

    const handlePopState = (e: PopStateEvent) => {
      const hash = window.location.hash;
      if (isLoginPathOrHash()) {
        setIsLoginView(true);
        setSelectedStudent(null);
        setUploadTargetStudent(null);
        setIsEditProfileView(false);
        setIsPricingView(false);
      } else if (hash === '#pricing' || hash === '#/pricing' || (e.state && e.state.view === 'pricing')) {
        setIsLoginView(false);
        setSelectedStudent(null);
        setUploadTargetStudent(null);
        setIsEditProfileView(false);
        setIsPricingView(true);
      } else if (e.state && e.state.view === 'upload' && e.state.studentId) {
        setIsLoginView(false);
        setIsPricingView(false);
        setStudents((currentStudents) => {
          const match = findStudentInList(currentStudents, e.state.studentId);
          if (match) setUploadTargetStudent(match);
          return currentStudents;
        });
      } else if (e.state && e.state.view === 'detail' && e.state.studentId) {
        setIsLoginView(false);
        setIsPricingView(false);
        setUploadTargetStudent(null);
        setIsEditProfileView(false);
        setStudents((currentStudents) => {
          const match = findStudentInList(currentStudents, e.state.studentId);
          if (match) setSelectedStudent(match);
          return currentStudents;
        });
      } else {
        setIsLoginView(false);
        setSelectedStudent(null);
        setUploadTargetStudent(null);
        setIsEditProfileView(false);
        setIsPricingView(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync selectedStudent or pending upload target when students are loaded from URL
  useEffect(() => {
    if (students.length > 0) {
      // Check for pending upload target requested in login query
      const params = new URLSearchParams(window.location.search);
      const hash = window.location.hash;
      const hashParams = hash.includes('?') ? new URLSearchParams(hash.split('?')[1]) : null;
      const returnTo = params.get('return') || hashParams?.get('return');
      const returnNim = params.get('nim') || hashParams?.get('nim');

      if (returnTo === 'upload' && returnNim && !pendingUploadTarget) {
        const found = findStudentInList(students, returnNim);
        if (found) setPendingUploadTarget(found);
      }

      if (!selectedStudent && !isLoginView && !uploadTargetStudent) {
        const requestedId = getRequestedStudentIdFromUrl();
        if (requestedId) {
          const found = findStudentInList(students, requestedId);
          if (found) {
            const path = window.location.pathname;
            if (path.startsWith('/upload') || hash.startsWith('#upload')) {
              // Direct upload route
              if (currentUserNim) {
                setUploadTargetStudent(found);
              } else {
                setPendingUploadTarget(found);
                setIsLoginView(true);
              }
            } else {
              setSelectedStudent(found);
              window.history.replaceState(
                { view: 'detail', studentId: found.id || found.nim },
                '',
                `#mhs=${encodeURIComponent(found.nim || found.id)}`
              );
            }
          }
        }
      }
    }
  }, [students, selectedStudent, isLoginView, uploadTargetStudent, currentUserNim, pendingUploadTarget]);

  const handleOpenLogin = () => {
    setSelectedStudent(null);
    setUploadTargetStudent(null);
    setIsLoginView(true);
    window.history.pushState({ view: 'login' }, '', '#/login');
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  const handleContinueWithoutAccount = () => {
    setPendingUploadTarget(null);
    setIsLoginView(false);
    window.history.pushState({ view: 'list' }, '', window.location.pathname);
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  const handleSelectStudent = (student: Mahasiswa) => {
    if (!selectedStudent) {
      searchScrollPosRef.current = window.scrollY || document.documentElement.scrollTop || 0;
    }

    setSelectedStudent(student);
    setUploadTargetStudent(null);
    setIsLoginView(false);
    setIsPricingView(false);

    const targetId = student.nim || student.id;
    window.history.pushState(
      { view: 'detail', studentId: targetId },
      '',
      `#mhs=${encodeURIComponent(targetId)}`
    );

    window.scrollTo({ top: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  const handleBackToList = () => {
    setSelectedStudent(null);

    if (window.location.hash.startsWith('#mhs=') || window.location.hash.startsWith('#detail=') || window.location.hash) {
      window.history.pushState({ view: 'list' }, '', window.location.pathname);
    }

    const savedPos = searchScrollPosRef.current;
    requestAnimationFrame(() => {
      window.scrollTo({ top: savedPos, behavior: 'instant' });
      document.documentElement.scrollTop = savedPos;
      document.body.scrollTop = savedPos;
    });
  };

  // Logo "Logika 2026" clicked: Return to search list and reset scroll to 0, filters, and pagination
  const handleGoHomeLogo = () => {
    setSelectedStudent(null);
    setUploadTargetStudent(null);
    setPendingUploadTarget(null);
    setIsEditProfileView(false);
    setIsLoginView(false);
    setIsPricingView(false);
    searchScrollPosRef.current = 0;

    // Reset filters
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setSelectedGroup('ALL');
    setFilterPhotoStatus('ALL');
    setSortBy('nama');

    // Reset pagination
    setCurrentPage(1);

    if (window.location.hash) {
      window.history.pushState({ view: 'list' }, '', window.location.pathname);
    }

    window.scrollTo({ top: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  // Dedicated Open & Close handlers for sub-pages with scroll reset to 0 and position restoration upon return
  const handleOpenPricing = () => {
    setIsPricingView(true);
    setSelectedStudent(null);
    setUploadTargetStudent(null);
    setIsEditProfileView(false);
    setIsLoginView(false);
    window.history.pushState({ view: 'pricing' }, '', '#/pricing');
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  const handleClosePricing = () => {
    setIsPricingView(false);
    window.history.pushState({ view: 'list' }, '', window.location.pathname);
  };

  const handleOpenUploadPhoto = (student: Mahasiswa) => {
    formReturnScrollPosRef.current = window.scrollY || document.documentElement.scrollTop || 0;

    // Check if user is logged in
    if (!currentUserNim) {
      setPendingUploadTarget(student);
      setSelectedStudent(null);
      setIsLoginView(true);
      setToastMessage(
        `Silakan pilih akun Anda terlebih dahulu untuk mengunggah foto bersama ${student.namaPanggilan || student.namaLengkap}.`
      );
      const targetIdentifier = student.nim || student.id;
      window.history.pushState(
        { view: 'login', returnTo: 'upload', studentId: targetIdentifier },
        '',
        `#/login?return=upload&nim=${encodeURIComponent(targetIdentifier)}`
      );
      window.scrollTo({ top: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      return;
    }

    // Check if user is trying to upload photo with themselves
    if (currentUser && (student.nim === currentUser.nim || student.id === currentUser.id)) {
      setToastMessage('Ini adalah profil Anda sendiri. Anda dapat mengunggah foto bersama teman lainnya.');
      setTimeout(() => setToastMessage(null), 3500);
      return;
    }

    // Check if user has ALREADY uploaded photo with this target student
    if (currentUser) {
      const existingRecord = getPhotoWithTarget(photoRecords, currentUser.nim, student.nim);
      if (existingRecord) {
        setViewingPhotoRecord(existingRecord);
        setToastMessage(
          `Foto bersama ${student.namaPanggilan || student.namaLengkap} sudah pernah diunggah & tersimpan di Drive.`
        );
        setTimeout(() => setToastMessage(null), 3500);
        return;
      }

      // Check tier limit: Free tier (Rp0) is blocked from uploading photos
      const effectiveTier = currentUser.tier || 'free';
      if (effectiveTier === 'free') {
        handleOpenPricing();
        setToastMessage('Unggah foto bersama memerlukan akses Paket Dasar (Rp2.000). Silakan upgrade terlebih dahulu!');
        setTimeout(() => setToastMessage(null), 3500);
        return;
      }
    }

    setUploadTargetStudent(student);
    const targetIdentifier = student.nim || student.id;
    window.history.pushState(
      { view: 'upload', studentId: targetIdentifier },
      '',
      `#/upload?nim=${encodeURIComponent(targetIdentifier)}`
    );
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  const handleCloseUploadPhoto = () => {
    setUploadTargetStudent(null);
    setPendingUploadTarget(null);

    // If we were on detail view of this student, keep detail view URL; otherwise go to list
    if (selectedStudent) {
      window.history.pushState(
        { view: 'detail', studentId: selectedStudent.nim || selectedStudent.id },
        '',
        `#mhs=${encodeURIComponent(selectedStudent.nim || selectedStudent.id)}`
      );
    } else {
      window.history.pushState({ view: 'list' }, '', window.location.pathname);
    }

    const savedPos = formReturnScrollPosRef.current;
    requestAnimationFrame(() => {
      window.scrollTo({ top: savedPos, behavior: 'instant' });
      document.documentElement.scrollTop = savedPos;
      document.body.scrollTop = savedPos;
    });
  };

  const handleOpenEditProfile = () => {
    formReturnScrollPosRef.current = window.scrollY || document.documentElement.scrollTop || 0;
    setIsEditProfileView(true);
    window.history.pushState({ view: 'edit-profile' }, '', '#/profile');
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  const handleCloseEditProfile = () => {
    setIsEditProfileView(false);

    if (selectedStudent) {
      window.history.pushState(
        { view: 'detail', studentId: selectedStudent.nim || selectedStudent.id },
        '',
        `#mhs=${encodeURIComponent(selectedStudent.nim || selectedStudent.id)}`
      );
    } else {
      window.history.pushState({ view: 'list' }, '', window.location.pathname);
    }

    const savedPos = formReturnScrollPosRef.current;
    requestAnimationFrame(() => {
      window.scrollTo({ top: savedPos, behavior: 'instant' });
      document.documentElement.scrollTop = savedPos;
      document.body.scrollTop = savedPos;
    });
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
    setCurrentUserNim(nim);
    setCurrentUserNimState(nim);
    setIsLoginView(false);

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
        setUploadTargetStudent(null);
        setSelectedStudent(null);
        window.history.pushState({ view: 'list' }, '', window.location.pathname);
        setToastMessage(`Selamat datang, ${name}! Ini profil Anda sendiri.`);
        setTimeout(() => setToastMessage(null), 3500);
      } else if (found && hasTakenPhoto(photoRecords, found.nim, target.nim)) {
        // Logged-in user has already uploaded photo with target student!
        setUploadTargetStudent(null);
        const existingRecord = getPhotoWithTarget(photoRecords, found.nim, target.nim);
        if (existingRecord) {
          setViewingPhotoRecord(existingRecord);
        }
        setToastMessage(
          `Selamat datang, ${name}! Foto bersama ${target.namaPanggilan || target.namaLengkap} sudah pernah diunggah & tersimpan di Drive.`
        );
        setTimeout(() => setToastMessage(null), 4000);
      } else {
        // Check effective tier for redirecting
        const effectiveTier = found.tier || 'free';

        if (effectiveTier === 'free') {
          setUploadTargetStudent(null);
          setSelectedStudent(null);
          setIsPricingView(true);
          window.history.pushState({ view: 'pricing' }, '', '#/pricing');
          setToastMessage(
            `Selamat datang, ${name}! Akun Free tidak dapat mengunggah foto. Silakan pilih paket Basic atau Pro.`
          );
          setTimeout(() => setToastMessage(null), 5000);
        } else {
          // Automatically redirect to upload photo for the pending target!
          setSelectedStudent(null);
          setUploadTargetStudent(target);
          const targetIdentifier = target.nim || target.id;
          window.history.pushState(
            { view: 'upload', studentId: targetIdentifier },
            '',
            `#/upload?nim=${encodeURIComponent(targetIdentifier)}`
          );
          setToastMessage(
            `Selamat datang, ${name}! Melanjutkan unggah foto bersama ${target.namaPanggilan || target.namaLengkap}...`
          );
          setTimeout(() => setToastMessage(null), 4000);
        }
      }
    } else {
      setSelectedStudent(null);
      window.history.pushState({ view: 'list' }, '', window.location.pathname);
      setToastMessage(`Selamat datang, ${name}!`);
      setTimeout(() => setToastMessage(null), 3500);
    }

    // Otomatis scroll ke paling atas saat login
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  const handleLogout = () => {
    setCurrentUserNim(null);
    setCurrentUserNimState(null);
    setSelectedStudent(null);
    setUploadTargetStudent(null);
    setPendingUploadTarget(null);
    setFilterPhotoStatus('ALL');
    window.history.pushState({ view: 'list' }, '', window.location.pathname);
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
      savePhotoLogToSupabase(
        recordData.uploaderNim,
        recordData.targetNim,
        recordData.photoUrl
      ).catch((e) => console.warn('Supabase photo log background save error:', e));
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

    // Also update selectedStudent if user was viewing their own profile
    if (selectedStudent && normalizeNim(selectedStudent.nim) === normalizeNim(currentUser.nim)) {
      setSelectedStudent((prev) => (prev ? { ...prev, ...updatedData } : null));
    }

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
      setToastMessage('Sedang menyiapkan dokumen laporan (.docx)...');
      const targetFriends = students.filter(
        (s) => currentUser && normalizeNim(s.nim) !== normalizeNim(currentUser.nim)
      );
      await generateStudentReport(currentUser, targetFriends, photoRecords);
      setToastMessage('Laporan (.docx) berhasil digenerate & diunduh!');
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err: any) {
      console.error('Error generating report:', err);
      setToastMessage(`Gagal mengunduh laporan: ${err?.message || err}`);
      setTimeout(() => setToastMessage(null), 3500);
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

  // Directory students excluding logged-in user
  const directoryStudents = useMemo(() => {
    return students.filter((student) => {
      if (currentUser && normalizeNim(student.nim) === normalizeNim(currentUser.nim)) {
        return false;
      }
      return true;
    });
  }, [students, currentUser]);

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

  // If user is currently on the login view route (/login or toggled), show the minimalist LoginPage
  if (isLoginView) {
    return (
      <>
        <LoginPage
          students={students}
          isLoading={isLoading}
          onLogin={handleLoginNim}
          onContinueWithoutAccount={handleContinueWithoutAccount}
          targetStudentForUpload={pendingUploadTarget}
        />

        {/* Floating Toast Notification */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-700/80 text-xs font-medium max-w-md w-[90%] backdrop-blur-md"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="flex-1">{toastMessage}</span>
              <button
                type="button"
                onClick={() => setToastMessage(null)}
                className="p-1 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 pt-16">
      {/* Top Fixed Navigation */}
      <Navbar
        onRefresh={() => loadData(true)}
        isLoading={isLoading}
        totalStudents={currentUser ? Math.max(0, students.length - 1) : students.length}
        onGoHome={handleGoHomeLogo}
        isDetailPage={Boolean(selectedStudent)}
        currentUser={currentUser}
        onViewProfile={() => currentUser && handleSelectStudent(currentUser)}
        onLogout={() => setIsLogoutModalOpen(true)}
        onOpenLogin={handleOpenLogin}
        onOpenPremiumModal={handleOpenPricing}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <AnimatePresence mode="wait">
          {isLoading && !selectedStudent && Boolean(getRequestedStudentIdFromUrl()) ? (
            <motion.div
              key="loading-detail"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-12 text-center max-w-lg mx-auto shadow-xs my-8"
            >
              <div className="w-14 h-14 bg-blue-50 border border-blue-100 rounded-2xl mx-auto mb-4 flex items-center justify-center text-blue-600 shadow-2xs">
                <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1">
                Sedang Menyiapkan Data Mahasiswa...
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Mohon tunggu sebentar, sedang menampilkan profil dan direktori peserta.
              </p>
            </motion.div>
          ) : currentUser && uploadTargetStudent ? (
            /* Dedicated Upload Photo Page */
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
          ) : currentUser && isEditProfileView ? (
            /* Dedicated Edit Profile Page */
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
          ) : isPricingView ? (
            /* Dedicated Pricing & Monetization Page */
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
                onRefreshProfileStatus={async () => {
                  await loadData();
                }}
              />
            </motion.div>
          ) : selectedStudent ? (
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
                onOpenUploadModal={(student) => {
                  handleOpenUploadPhoto(student);
                }}
                onViewPhoto={(rec) => setViewingPhotoRecord(rec)}
                onEditProfile={handleOpenEditProfile}
                onOpenPremiumModal={handleOpenPricing}
                onGenerateReport={handleGenerateReport}
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

                  {/* Interactive Search Bar & Group Filter */}
                  <SearchBar
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
                  /* Skeleton Loading Grid */
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
                  /* Student Cards Grid & Pagination */
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {paginatedStudents.map((student) => (
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
                        />
                      ))}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
                        <div className="text-xs sm:text-sm text-slate-600">
                          Menampilkan <span className="font-bold text-slate-900">{sortedStudents.length}</span> mahasiswa
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
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                              .filter((num) => {
                                return num === 1 || num === totalPages || Math.abs(num - currentPage) <= 1;
                              })
                              .map((num, idx, arr) => {
                                const prevNum = arr[idx - 1];
                                const showEllipsis = prevNum && num - prevNum > 1;

                                return (
                                  <div key={num} className="flex items-center gap-1">
                                    {showEllipsis && <span className="text-slate-400 px-1">...</span>}
                                    <button
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
                                  </div>
                                );
                              })}
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
                  /* Intuitive Layperson Empty State */
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
                  /* Empty Search Result */
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
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col items-center justify-center gap-1.5 text-center">
          <p className="font-medium text-slate-600">
            Data Peserta Logika 2026 &bull; Powered by <span className="font-bold text-slate-800">Dity Store</span>
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
      <ScrollToTopButton />

      {/* Logout Confirmation Custom Modal */}
      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        currentUser={currentUser}
        onConfirm={handleLogout}
        onClose={() => setIsLogoutModalOpen(false)}
      />



      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-700/80 text-xs font-medium max-w-md w-[90%] backdrop-blur-md"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="flex-1">{toastMessage}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="p-1 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
