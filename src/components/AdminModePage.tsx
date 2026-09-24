import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Database,
  Download,
  Edit2,
  FileText,
  Filter,
  HelpCircle,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Table as TableIcon,
  Trash2,
  Users,
  X
} from 'lucide-react';
import { getSupabaseClient } from '../lib/supabase';
import { Mahasiswa } from '../types';

interface AdminModePageProps {
  currentUser?: Mahasiswa | null;
  onBack: () => void;
  onDataChanged?: () => void;
}

type TableName =
  | 'profiles'
  | 'photo_logs'
  | 'photo_tracking'
  | 'payment_logs'
  | 'report_requests'
  | 'groups';

export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equal'
  | 'less_than_or_equal'
  | 'is_true'
  | 'is_false'
  | 'is_empty'
  | 'is_not_empty';

export interface FilterRule {
  id: string;
  column: string;
  operator: FilterOperator;
  value: string;
}

const OPERATOR_OPTIONS: {
  value: FilterOperator;
  label: string;
  symbol: string;
  needsValue: boolean;
}[] = [
  { value: 'contains', label: 'Mengandung teks (contains)', symbol: '∋', needsValue: true },
  { value: 'equals', label: 'Sama dengan (=)', symbol: '=', needsValue: true },
  { value: 'not_equals', label: 'Tidak sama dengan (!=)', symbol: '≠', needsValue: true },
  { value: 'starts_with', label: 'Diawali dengan (starts with)', symbol: '^=', needsValue: true },
  { value: 'ends_with', label: 'Diakhiri dengan (ends with)', symbol: '$=', needsValue: true },
  { value: 'greater_than', label: 'Lebih besar dari (>)', symbol: '>', needsValue: true },
  { value: 'less_than', label: 'Lebih kecil dari (<)', symbol: '<', needsValue: true },
  { value: 'greater_than_or_equal', label: 'Lebih besar atau sama (>=)', symbol: '≥', needsValue: true },
  { value: 'less_than_or_equal', label: 'Lebih kecil atau sama (<=)', symbol: '≤', needsValue: true },
  { value: 'is_true', label: 'Bernilai TRUE', symbol: '✓', needsValue: false },
  { value: 'is_false', label: 'Bernilai FALSE', symbol: '✕', needsValue: false },
  { value: 'is_empty', label: 'Kosong / NULL (is empty)', symbol: '∅', needsValue: false },
  { value: 'is_not_empty', label: 'Tidak Kosong (is not empty)', symbol: '∄∅', needsValue: false },
];

interface TableMeta {
  name: TableName;
  label: string;
  description: string;
  primaryKey: string;
  icon: typeof Database;
  columns: {
    key: string;
    label: string;
    type: 'text' | 'number' | 'boolean' | 'datetime' | 'json';
    required?: boolean;
    defaultValue?: unknown;
    options?: { label: string; value: string | number | boolean }[];
  }[];
}

const TABLES: TableMeta[] = [
  {
    name: 'profiles',
    label: 'profiles',
    description: 'Data biodata, akun, kelompok, dan status tier mahasiswa',
    primaryKey: 'nim',
    icon: Users,
    columns: [
      { key: 'nim', label: 'nim', type: 'text', required: true },
      { key: 'nama_lengkap', label: 'nama_lengkap', type: 'text', required: true },
      { key: 'nama_panggilan', label: 'nama_panggilan', type: 'text' },
      { key: 'email', label: 'email', type: 'text' },
      { key: 'no_wa', label: 'no_wa', type: 'text' },
      { key: 'asal_rumah', label: 'asal_rumah', type: 'text' },
      { key: 'alamat_domisili', label: 'alamat_domisili', type: 'text' },
      { key: 'hobi', label: 'hobi', type: 'text' },
      { key: 'group_id', label: 'group_id', type: 'number' },
      { key: 'is_leader', label: 'is_leader', type: 'boolean', defaultValue: false },
      {
        key: 'tier',
        label: 'tier',
        type: 'text',
        defaultValue: 'free',
        options: [
          { label: 'free', value: 'free' },
          { label: 'basic', value: 'basic' },
          { label: 'pro', value: 'pro' },
        ],
      },
      { key: 'drive_folder_url', label: 'drive_folder_url', type: 'text' },
      { key: 'drive_folder_id', label: 'drive_folder_id', type: 'text' },
      { key: 'created_at', label: 'created_at', type: 'datetime' },
    ],
  },
  {
    name: 'photo_logs',
    label: 'photo_logs',
    description: 'Pencatatan riwayat foto bersama antar mahasiswa',
    primaryKey: 'id',
    icon: Camera,
    columns: [
      { key: 'id', label: 'id', type: 'number', required: false },
      { key: 'pair_key', label: 'pair_key', type: 'text', required: true },
      { key: 'user_a_nim', label: 'user_a_nim', type: 'text', required: true },
      { key: 'user_b_nim', label: 'user_b_nim', type: 'text', required: true },
      { key: 'drive_file_id_a', label: 'drive_file_id_a', type: 'text' },
      { key: 'drive_file_id_b', label: 'drive_file_id_b', type: 'text' },
      { key: 'photo_url_a', label: 'photo_url_a', type: 'text' },
      { key: 'photo_url_b', label: 'photo_url_b', type: 'text' },
      { key: 'created_at', label: 'created_at', type: 'datetime' },
    ],
  },
  {
    name: 'photo_tracking',
    label: 'photo_tracking',
    description: 'Status checklist pelacakan foto antar mahasiswa',
    primaryKey: 'id',
    icon: CheckCircle2,
    columns: [
      { key: 'id', label: 'id', type: 'number', required: false },
      { key: 'user_id', label: 'user_id', type: 'text', required: true },
      { key: 'target_nim', label: 'target_nim', type: 'text', required: true },
      { key: 'is_checked', label: 'is_checked', type: 'boolean', defaultValue: true },
      { key: 'updated_at', label: 'updated_at', type: 'datetime' },
      { key: 'created_at', label: 'created_at', type: 'datetime' },
    ],
  },
  {
    name: 'payment_logs',
    label: 'payment_logs',
    description: 'Catatan pengajuan pembayaran dan verifikasi tier akun',
    primaryKey: 'id',
    icon: CreditCard,
    columns: [
      { key: 'id', label: 'id', type: 'number', required: false },
      { key: 'user_nim', label: 'user_nim', type: 'text', required: true },
      { key: 'amount', label: 'amount', type: 'number', required: true },
      {
        key: 'target_tier',
        label: 'target_tier',
        type: 'text',
        required: true,
        options: [
          { label: 'basic', value: 'basic' },
          { label: 'pro', value: 'pro' },
        ],
      },
      { key: 'payment_proof_url', label: 'payment_proof_url', type: 'text' },
      {
        key: 'status',
        label: 'status',
        type: 'text',
        required: true,
        defaultValue: 'pending',
        options: [
          { label: 'pending', value: 'pending' },
          { label: 'approved', value: 'approved' },
          { label: 'rejected', value: 'rejected' },
        ],
      },
      { key: 'created_at', label: 'created_at', type: 'datetime' },
      { key: 'verified_at', label: 'verified_at', type: 'datetime' },
    ],
  },
  {
    name: 'report_requests',
    label: 'report_requests',
    description: 'Daftar permintaan pembuatan dan pengunduhan berkas laporan Word (.docx)',
    primaryKey: 'id',
    icon: FileText,
    columns: [
      { key: 'id', label: 'id', type: 'text', required: true },
      { key: 'user_id', label: 'user_id', type: 'text', required: true },
      { key: 'nim', label: 'nim', type: 'text', required: true },
      {
        key: 'status',
        label: 'status',
        type: 'text',
        required: true,
        defaultValue: 'processing',
        options: [
          { label: 'processing', value: 'processing' },
          { label: 'completed', value: 'completed' },
          { label: 'failed', value: 'failed' },
        ],
      },
      { key: 'download_url', label: 'download_url', type: 'text' },
      { key: 'error_message', label: 'error_message', type: 'text' },
      { key: 'created_at', label: 'created_at', type: 'datetime' },
      { key: 'updated_at', label: 'updated_at', type: 'datetime' },
    ],
  },
  {
    name: 'groups',
    label: 'groups',
    description: 'Daftar nama kelompok praktikum',
    primaryKey: 'id',
    icon: Layers,
    columns: [
      { key: 'id', label: 'id', type: 'number', required: true },
      { key: 'name', label: 'name', type: 'text', required: true },
      { key: 'created_at', label: 'created_at', type: 'datetime' },
    ],
  },
];

function evaluateRule(
  row: Record<string, unknown>,
  rule: FilterRule,
  columnMeta?: TableMeta['columns'][0]
): boolean {
  const rawValue = row[rule.column];
  const op = rule.operator;
  const targetVal = rule.value.trim().toLowerCase();

  if (op === 'is_empty') {
    return rawValue === null || rawValue === undefined || String(rawValue).trim() === '';
  }
  if (op === 'is_not_empty') {
    return rawValue !== null && rawValue !== undefined && String(rawValue).trim() !== '';
  }
  if (op === 'is_true') {
    return rawValue === true || String(rawValue).toLowerCase() === 'true' || rawValue === 1;
  }
  if (op === 'is_false') {
    return rawValue === false || String(rawValue).toLowerCase() === 'false' || rawValue === 0;
  }

  if (rawValue === null || rawValue === undefined) {
    return false;
  }

  // Number comparison
  if (
    columnMeta?.type === 'number' ||
    (!isNaN(Number(rawValue)) &&
      !isNaN(Number(targetVal)) &&
      ['greater_than', 'less_than', 'greater_than_or_equal', 'less_than_or_equal'].includes(op))
  ) {
    const numRaw = Number(rawValue);
    const numTarget = Number(targetVal);

    if (!isNaN(numRaw) && !isNaN(numTarget)) {
      switch (op) {
        case 'equals':
          return numRaw === numTarget;
        case 'not_equals':
          return numRaw !== numTarget;
        case 'greater_than':
          return numRaw > numTarget;
        case 'less_than':
          return numRaw < numTarget;
        case 'greater_than_or_equal':
          return numRaw >= numTarget;
        case 'less_than_or_equal':
          return numRaw <= numTarget;
      }
    }
  }

  // Date comparison if datetime
  if (columnMeta?.type === 'datetime' && targetVal) {
    const dateRaw = new Date(String(rawValue)).getTime();
    const dateTarget = new Date(targetVal).getTime();
    if (!isNaN(dateRaw) && !isNaN(dateTarget)) {
      switch (op) {
        case 'equals':
          return String(rawValue).toLowerCase().includes(targetVal);
        case 'greater_than':
          return dateRaw > dateTarget;
        case 'less_than':
          return dateRaw < dateTarget;
        case 'greater_than_or_equal':
          return dateRaw >= dateTarget;
        case 'less_than_or_equal':
          return dateRaw <= dateTarget;
      }
    }
  }

  // String / general comparisons
  const strRaw = String(rawValue).toLowerCase();
  switch (op) {
    case 'equals':
      return strRaw === targetVal;
    case 'not_equals':
      return strRaw !== targetVal;
    case 'contains':
      return strRaw.includes(targetVal);
    case 'starts_with':
      return strRaw.startsWith(targetVal);
    case 'ends_with':
      return strRaw.endsWith(targetVal);
    case 'greater_than':
      return strRaw > targetVal;
    case 'less_than':
      return strRaw < targetVal;
    case 'greater_than_or_equal':
      return strRaw >= targetVal;
    case 'less_than_or_equal':
      return strRaw <= targetVal;
    default:
      return true;
  }
}

export function AdminModePage({
  onBack,
  onDataChanged,
}: AdminModePageProps) {
  const [selectedTable, setSelectedTable] = useState<TableName>('profiles');
  const [tableData, setTableData] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tableCounts, setTableCounts] = useState<Record<TableName, number>>({
    profiles: 0,
    photo_logs: 0,
    photo_tracking: 0,
    payment_logs: 0,
    report_requests: 0,
    groups: 0,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Filter Builder State
  const [filterRules, setFilterRules] = useState<FilterRule[]>([]);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Modals state
  const [isInsertModalOpen, setIsInsertModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<Record<string, unknown> | null>(null);
  const [isConfirmEditModalOpen, setIsConfirmEditModalOpen] = useState(false);
  const [deletingRow, setDeletingRow] = useState<Record<string, unknown> | null>(null);
  const [deleteConfirmChecked, setDeleteConfirmChecked] = useState(false);
  const [modalFormData, setModalFormData] = useState<Record<string, unknown>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  const activeTableMeta = useMemo(() => {
    return TABLES.find((t) => t.name === selectedTable) || TABLES[0];
  }, [selectedTable]);

  const showFeedback = (text: string, isError = false) => {
    setFeedbackMessage({ text, isError });
    setTimeout(() => {
      setFeedbackMessage((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  // Fetch count for all tables
  const refreshCounts = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    for (const table of TABLES) {
      try {
        const { count, error } = await supabase
          .from(table.name)
          .select('*', { count: 'exact', head: true });
        if (!error && typeof count === 'number') {
          setTableCounts((prev) => ({ ...prev, [table.name]: count }));
        }
      } catch {
        // Ignore silent count errors
      }
    }
  }, []);

  // Fetch data for selected table
  const fetchTableData = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      showFeedback('Klien database belum terkonfigurasi.', true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const meta = TABLES.find((t) => t.name === selectedTable) || TABLES[0];
      const allTableRows: Record<string, unknown>[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        let query = supabase.from(selectedTable).select('*');
        if (meta.primaryKey) {
          query = query.order(meta.primaryKey, { ascending: false });
        }
        const { data, error } = await query.range(from, from + batchSize - 1);
        if (error) {
          if (from === 0) {
            showFeedback(`Gagal memuat tabel ${selectedTable}: ${error.message}`, true);
            setTableData([]);
          }
          break;
        }
        if (data && data.length > 0) {
          allTableRows.push(...data);
          if (data.length < batchSize) {
            hasMore = false;
          } else {
            from += batchSize;
          }
        } else {
          hasMore = false;
        }
      }

      setTableData(allTableRows);
      setTableCounts((prev) => ({ ...prev, [selectedTable]: allTableRows.length }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kendala saat membaca data.';
      showFeedback(msg, true);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTable]);

  useEffect(() => {
    fetchTableData();
    refreshCounts();
    setCurrentPage(1);
    setSearchQuery('');
    setFilterRules([]);
    setIsFilterPanelOpen(false);
  }, [selectedTable, fetchTableData, refreshCounts]);

  // Filter management helpers
  const handleAddFilter = () => {
    const defaultCol = activeTableMeta.columns[0]?.key || 'nim';
    const newRule: FilterRule = {
      id: `filter-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      column: defaultCol,
      operator: 'contains',
      value: '',
    };
    setFilterRules((prev) => [...prev, newRule]);
    setIsFilterPanelOpen(true);
  };

  const handleUpdateFilter = (id: string, updates: Partial<FilterRule>) => {
    setFilterRules((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const updated = { ...r, ...updates };
          // If operator changed to one that doesn't need value, clear value
          const opMeta = OPERATOR_OPTIONS.find((o) => o.value === updated.operator);
          if (opMeta && !opMeta.needsValue) {
            updated.value = '';
          }
          return updated;
        }
        return r;
      })
    );
  };

  const handleRemoveFilter = (id: string) => {
    setFilterRules((prev) => prev.filter((r) => r.id !== id));
  };

  const handleClearAllFilters = () => {
    setFilterRules([]);
    setSearchQuery('');
  };

  // Filter and sort data
  const filteredData = useMemo(() => {
    let result = [...tableData];

    // 1. Multi-Rule Custom Filters
    if (filterRules.length > 0) {
      result = result.filter((row) => {
        return filterRules.every((rule) => {
          const colMeta = activeTableMeta.columns.find((c) => c.key === rule.column);
          const opMeta = OPERATOR_OPTIONS.find((o) => o.value === rule.operator);
          // If operator requires value and value is empty, skip evaluation
          if (opMeta?.needsValue && !rule.value.trim()) {
            return true;
          }
          return evaluateRule(row, rule, colMeta);
        });
      });
    }

    // 2. Global Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((row) => {
        return Object.values(row).some((val) => {
          if (val === null || val === undefined) return false;
          if (typeof val === 'object') return JSON.stringify(val).toLowerCase().includes(q);
          return String(val).toLowerCase().includes(q);
        });
      });
    }

    // 3. Column Sorting
    if (sortColumn) {
      result.sort((a, b) => {
        const valA = a[sortColumn];
        const valB = b[sortColumn];

        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }

        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        return sortDirection === 'asc'
          ? strA.localeCompare(strB)
          : strB.localeCompare(strA);
      });
    }

    return result;
  }, [tableData, filterRules, searchQuery, sortColumn, sortDirection, activeTableMeta]);

  // Pagination
  const totalRows = filteredData.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredData.slice(start, start + rowsPerPage);
  }, [filteredData, currentPage, rowsPerPage]);

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  // Open Insert Modal
  const handleOpenInsert = () => {
    const initial: Record<string, unknown> = {};
    activeTableMeta.columns.forEach((col) => {
      if (col.defaultValue !== undefined) {
        initial[col.key] = col.defaultValue;
      } else if (col.type === 'boolean') {
        initial[col.key] = false;
      } else {
        initial[col.key] = '';
      }
    });

    setModalFormData(initial);
    setIsInsertModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (row: Record<string, unknown>) => {
    setEditingRow(row);
    setModalFormData({ ...row });
    setIsConfirmEditModalOpen(false);
  };

  // Open Delete Prompt
  const handleOpenDelete = (row: Record<string, unknown>) => {
    setDeletingRow(row);
    setDeleteConfirmChecked(false);
  };

  // Check diffs for edit confirmation
  const editDiffs = useMemo(() => {
    if (!editingRow) return [];
    const diffs: {
      key: string;
      label: string;
      oldVal: unknown;
      newVal: unknown;
    }[] = [];

    activeTableMeta.columns.forEach((col) => {
      if (col.key === activeTableMeta.primaryKey) return;
      const oldV = editingRow[col.key];
      const newV = modalFormData[col.key];

      const oldFormatted = oldV === null || oldV === undefined ? '' : String(oldV);
      const newFormatted = newV === null || newV === undefined ? '' : String(newV);

      if (oldFormatted !== newFormatted) {
        diffs.push({
          key: col.key,
          label: col.label,
          oldVal: oldV,
          newVal: newV,
        });
      }
    });

    return diffs;
  }, [editingRow, modalFormData, activeTableMeta]);

  // Request Edit Confirmation
  const handleRequestSaveEdit = () => {
    if (!editingRow) return;
    if (editDiffs.length === 0) {
      showFeedback('Tidak ada perubahan nilai pada baris ini.', true);
      return;
    }
    setIsConfirmEditModalOpen(true);
  };

  // Submit Insert
  const handleSaveInsert = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {};

      activeTableMeta.columns.forEach((col) => {
        const rawVal = modalFormData[col.key];
        if (rawVal === undefined || rawVal === '') {
          if (col.key !== activeTableMeta.primaryKey || col.type === 'text') {
            if (rawVal === '') {
              payload[col.key] = col.type === 'text' ? '' : null;
            }
          }
          return;
        }

        if (col.type === 'number') {
          payload[col.key] = rawVal !== '' ? Number(rawVal) : null;
        } else if (col.type === 'boolean') {
          payload[col.key] = Boolean(rawVal);
        } else if (col.type === 'datetime') {
          payload[col.key] = rawVal ? new Date(String(rawVal)).toISOString() : new Date().toISOString();
        } else {
          payload[col.key] = String(rawVal).trim();
        }
      });

      if (activeTableMeta.columns.some((c) => c.key === 'created_at') && !payload.created_at) {
        payload.created_at = new Date().toISOString();
      }

      const { error } = await supabase.from(selectedTable).insert([payload]);
      if (error) {
        showFeedback(`Gagal menyisipkan baris: ${error.message}`, true);
      } else {
        showFeedback(`Berhasil menambahkan baris ke tabel ${selectedTable}.`);
        setIsInsertModalOpen(false);
        fetchTableData();
        refreshCounts();
        onDataChanged?.();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kendala saat menyimpan data.';
      showFeedback(msg, true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Update after Confirmation
  const handleConfirmSaveEdit = async () => {
    const supabase = getSupabaseClient();
    if (!supabase || !editingRow) return;

    setIsSubmitting(true);
    try {
      const pk = activeTableMeta.primaryKey;
      const pkValue = editingRow[pk];

      if (pkValue === undefined || pkValue === null) {
        showFeedback('Kunci baris data tidak ditemukan.', true);
        setIsSubmitting(false);
        return;
      }

      const payload: Record<string, unknown> = {};
      activeTableMeta.columns.forEach((col) => {
        if (col.key === pk) return;

        const rawVal = modalFormData[col.key];
        if (rawVal === undefined) return;

        if (col.type === 'number') {
          payload[col.key] = rawVal !== '' && rawVal !== null ? Number(rawVal) : null;
        } else if (col.type === 'boolean') {
          payload[col.key] = Boolean(rawVal);
        } else if (col.type === 'datetime') {
          payload[col.key] = rawVal ? new Date(String(rawVal)).toISOString() : null;
        } else {
          payload[col.key] = rawVal !== null ? String(rawVal).trim() : null;
        }
      });

      if (activeTableMeta.columns.some((c) => c.key === 'updated_at')) {
        payload.updated_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from(selectedTable)
        .update(payload)
        .eq(pk, pkValue);

      if (error) {
        showFeedback(`Gagal memperbarui data: ${error.message}`, true);
      } else {
        showFeedback(`Data berhasil diperbarui pada tabel ${selectedTable}.`);
        setIsConfirmEditModalOpen(false);
        setEditingRow(null);
        fetchTableData();
        onDataChanged?.();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kendala saat memperbarui data.';
      showFeedback(msg, true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Delete after Confirmation
  const handleConfirmDelete = async () => {
    const supabase = getSupabaseClient();
    if (!supabase || !deletingRow) return;

    setIsSubmitting(true);
    try {
      const pk = activeTableMeta.primaryKey;
      const pkValue = deletingRow[pk];

      if (pkValue === undefined || pkValue === null) {
        showFeedback('Kunci baris data tidak valid.', true);
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from(selectedTable)
        .delete()
        .eq(pk, pkValue);

      if (error) {
        showFeedback(`Gagal menghapus data: ${error.message}`, true);
      } else {
        showFeedback(`Baris data berhasil dihapus dari tabel ${selectedTable}.`);
        setDeletingRow(null);
        fetchTableData();
        refreshCounts();
        onDataChanged?.();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kendala saat menghapus data.';
      showFeedback(msg, true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export JSON
  const handleExportJSON = () => {
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `${selectedTable}_export_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showFeedback(`Berhasil mengunduh data ${selectedTable}.json.`);
    } catch {
      showFeedback('Gagal mengekspor data.', true);
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] flex flex-col bg-slate-900 text-slate-100 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden font-sans">
      {/* Toast Notification */}
      <AnimatePresence>
        {feedbackMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-20 right-6 z-50 px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-3 text-xs font-medium backdrop-blur-md border ${
              feedbackMessage.isError
                ? 'bg-rose-950/90 text-rose-200 border-rose-800'
                : 'bg-emerald-950/90 text-emerald-200 border-emerald-800'
            }`}
          >
            <span>{feedbackMessage.text}</span>
            <button
              type="button"
              onClick={() => setFeedbackMessage(null)}
              className="p-1 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Supabase Top Bar Header */}
      <div className="h-14 bg-slate-950 border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
            title="Kembali ke Aplikasi Utama"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center gap-2 text-xs font-mono">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-400">database</span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-400">public</span>
            <span className="text-slate-600">/</span>
            <span className="text-emerald-400 font-bold">{selectedTable}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportJSON}
            disabled={isLoading || tableData.length === 0}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Ekspor JSON</span>
          </button>

          <button
            type="button"
            onClick={() => {
              fetchTableData();
              refreshCounts();
            }}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors cursor-pointer"
            title="Segarkan data tabel"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">Segarkan</span>
          </button>

          <button
            type="button"
            onClick={handleOpenInsert}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm transition-all active:scale-98 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Data</span>
          </button>
        </div>
      </div>

      {/* Main Content: Sidebar + Table View */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        {/* Left Table Navigation Sidebar */}
        <aside className="w-full md:w-64 bg-slate-950/60 border-b md:border-b-0 md:border-r border-slate-800 p-3 sm:p-4 flex md:flex-col gap-1.5 overflow-x-auto md:overflow-y-auto shrink-0">
          <div className="hidden md:flex items-center justify-between px-2 py-1 mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <span>Daftar Tabel</span>
            <span>{TABLES.length}</span>
          </div>

          {TABLES.map((table) => {
            const Icon = table.icon;
            const isSelected = selectedTable === table.name;
            const count = tableCounts[table.name];

            return (
              <button
                key={table.name}
                type="button"
                onClick={() => setSelectedTable(table.name)}
                className={`flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all shrink-0 md:shrink md:w-full text-left cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span className="font-mono truncate">{table.name}</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400">
                  {count}
                </span>
              </button>
            );
          })}
        </aside>

        {/* Right Content Area: Data Table */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-900 overflow-hidden">
          {/* Controls Bar: Search & Filter Trigger */}
          <div className="p-3 sm:p-4 border-b border-slate-800 flex flex-col gap-3 bg-slate-900/90">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 flex-1 max-w-xl">
                {/* Search Box */}
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder={`Cari dalam tabel ${selectedTable}...`}
                    className="w-full pl-9 pr-8 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Toggle Button */}
                <button
                  type="button"
                  onClick={() => setIsFilterPanelOpen((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all border cursor-pointer ${
                    filterRules.length > 0
                      ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60'
                      : isFilterPanelOpen
                      ? 'bg-slate-800 border-slate-700 text-slate-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Filter</span>
                  {filterRules.length > 0 && (
                    <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-bold flex items-center justify-center ml-0.5">
                      {filterRules.length}
                    </span>
                  )}
                  <ChevronDown className={`w-3 h-3 transition-transform ${isFilterPanelOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-400 font-mono self-end sm:self-auto">
                <span>{filteredData.length} baris data ditemukan</span>
              </div>
            </div>

            {/* Expandable Multi-Rule Filter Panel */}
            <AnimatePresence>
              {isFilterPanelOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden bg-slate-950 border border-slate-800 rounded-xl p-3 sm:p-4 space-y-3 shadow-lg"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                    <div className="flex items-center gap-2 text-xs font-mono font-semibold text-slate-300">
                      <Filter className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Aturan Filter Kolom ({selectedTable})</span>
                    </div>
                    {filterRules.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAllFilters}
                        className="text-[11px] font-mono text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        Bersihkan Semua Filter
                      </button>
                    )}
                  </div>

                  {filterRules.length === 0 ? (
                    <div className="py-2 text-center text-xs font-mono text-slate-500">
                      Belum ada filter kolom aktif. Klik &quot;Tambah Filter&quot; di bawah untuk menyaring data.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {filterRules.map((rule, idx) => {
                        const colMeta = activeTableMeta.columns.find((c) => c.key === rule.column);
                        const opMeta = OPERATOR_OPTIONS.find((o) => o.value === rule.operator);
                        const needsVal = opMeta?.needsValue ?? true;

                        return (
                          <div
                            key={rule.id}
                            className="flex flex-wrap items-center gap-2 bg-slate-900/90 p-2 rounded-lg border border-slate-800"
                          >
                            <span className="text-[10px] font-mono text-slate-600 px-1.5 py-0.5 bg-slate-950 rounded">
                              {idx === 0 ? 'WHERE' : 'AND'}
                            </span>

                            {/* Column Selection */}
                            <select
                              value={rule.column}
                              onChange={(e) => handleUpdateFilter(rule.id, { column: e.target.value })}
                              className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-md text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                            >
                              {activeTableMeta.columns.map((c) => (
                                <option key={c.key} value={c.key}>
                                  {c.label} ({c.type})
                                </option>
                              ))}
                            </select>

                            {/* Operator Selection */}
                            <select
                              value={rule.operator}
                              onChange={(e) =>
                                handleUpdateFilter(rule.id, { operator: e.target.value as FilterOperator })
                              }
                              className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-md text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
                            >
                              {OPERATOR_OPTIONS.map((op) => (
                                <option key={op.value} value={op.value}>
                                  {op.label}
                                </option>
                              ))}
                            </select>

                            {/* Value Input (if operator requires value) */}
                            {needsVal && (
                              <div className="flex-1 min-w-[140px]">
                                {colMeta?.options ? (
                                  <select
                                    value={rule.value}
                                    onChange={(e) => handleUpdateFilter(rule.id, { value: e.target.value })}
                                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-md text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                                  >
                                    <option value="">-- Pilih Nilai --</option>
                                    {colMeta.options.map((opt) => (
                                      <option key={String(opt.value)} value={String(opt.value)}>
                                        {opt.label}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type={colMeta?.type === 'number' ? 'number' : 'text'}
                                    value={rule.value}
                                    onChange={(e) => handleUpdateFilter(rule.id, { value: e.target.value })}
                                    placeholder={`Nilai ${colMeta?.label || 'pencarian'}...`}
                                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-md text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                                  />
                                )}
                              </div>
                            )}

                            {/* Delete Rule Button */}
                            <button
                              type="button"
                              onClick={() => handleRemoveFilter(rule.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                              title="Hapus filter ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={handleAddFilter}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-emerald-400 text-xs font-mono font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Filter</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Active Filters Pill Bar (when panel closed but filters applied) */}
            {filterRules.length > 0 && !isFilterPanelOpen && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-mono text-slate-500">Filter Aktif:</span>
                {filterRules.map((rule) => {
                  const op = OPERATOR_OPTIONS.find((o) => o.value === rule.operator);
                  return (
                    <span
                      key={rule.id}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 rounded-md text-[11px] font-mono"
                    >
                      <span>
                        {rule.column} {op?.symbol} {op?.needsValue ? `"${rule.value || '...'}"` : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFilter(rule.id)}
                        className="text-emerald-400 hover:text-white cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  className="text-[11px] font-mono text-slate-500 hover:text-rose-400 transition-colors ml-1 cursor-pointer"
                >
                  Reset
                </button>
              </div>
            )}
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-auto bg-slate-950/40 relative">
            {isLoading ? (
              <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="w-7 h-7 text-emerald-500 animate-spin" />
                <p className="text-xs font-mono">Memuat data tabel {selectedTable}...</p>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-500">
                <TableIcon className="w-8 h-8 text-slate-700" />
                <p className="text-xs font-medium font-mono">Tidak ada baris data yang cocok dengan kriteria.</p>
                {(filterRules.length > 0 || searchQuery) && (
                  <button
                    type="button"
                    onClick={handleClearAllFilters}
                    className="mt-1 text-xs text-emerald-400 hover:underline font-mono cursor-pointer"
                  >
                    Hapus semua filter pencarian
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs font-mono">
                {/* Table Header */}
                <thead className="sticky top-0 z-10 bg-slate-950 text-slate-400 border-b border-slate-800 select-none shadow-sm">
                  <tr>
                    <th className="p-3 text-center w-12 font-semibold text-slate-600 border-r border-slate-800/60">
                      #
                    </th>
                    {activeTableMeta.columns.map((col) => (
                      <th
                        key={col.key}
                        onClick={() => handleSort(col.key)}
                        className="p-3 font-semibold text-slate-300 border-r border-slate-800/60 hover:bg-slate-900/60 cursor-pointer transition-colors whitespace-nowrap"
                      >
                        <div className="flex items-center gap-2">
                          <span>{col.label}</span>
                          <span className="text-[10px] font-normal text-slate-500 uppercase px-1 py-0.2 bg-slate-900 border border-slate-800 rounded">
                            {col.type}
                          </span>
                          {sortColumn === col.key && (
                            <span className="text-emerald-400">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="p-3 text-center w-24 font-semibold text-slate-400 sticky right-0 bg-slate-950 border-l border-slate-800 shadow-sm">
                      Aksi
                    </th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="divide-y divide-slate-800/60">
                  {paginatedRows.map((row, index) => {
                    const rowNumber = (currentPage - 1) * rowsPerPage + index + 1;
                    return (
                      <tr
                        key={`row-${index}-${row[activeTableMeta.primaryKey] || index}`}
                        className="hover:bg-slate-800/40 transition-colors group"
                      >
                        <td className="p-2.5 text-center text-slate-600 border-r border-slate-800/40 tabular-nums">
                          {rowNumber}
                        </td>
                        {activeTableMeta.columns.map((col) => {
                          const val = row[col.key];
                          const isNull = val === null || val === undefined;

                          return (
                            <td
                              key={col.key}
                              className="p-2.5 border-r border-slate-800/40 text-slate-300 max-w-xs truncate"
                              title={isNull ? 'NULL' : String(val)}
                            >
                              {isNull ? (
                                <span className="text-slate-600 italic">NULL</span>
                              ) : typeof val === 'boolean' ? (
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    val
                                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/80'
                                      : 'bg-slate-900 text-slate-500 border border-slate-800'
                                  }`}
                                >
                                  {val ? 'TRUE' : 'FALSE'}
                                </span>
                              ) : col.key === 'tier' ? (
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    val === 'pro'
                                      ? 'bg-amber-950 text-amber-400 border border-amber-800/80'
                                      : val === 'basic'
                                      ? 'bg-blue-950 text-blue-400 border border-blue-800/80'
                                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                                  }`}
                                >
                                  {String(val)}
                                </span>
                              ) : col.key.includes('url') && typeof val === 'string' && val.startsWith('http') ? (
                                <a
                                  href={val}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:text-blue-300 underline"
                                >
                                  {val.slice(0, 32)}...
                                </a>
                              ) : (
                                <span>{String(val)}</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="p-2 text-center sticky right-0 bg-slate-950 group-hover:bg-slate-900 border-l border-slate-800 shadow-sm whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(row)}
                              className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                              title="Ubah data baris ini"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenDelete(row)}
                              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                              title="Hapus data baris ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Bottom Pagination Bar */}
          <div className="p-3 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <span>Baris per halaman:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <span>
                Halaman {currentPage} dari {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded border border-slate-800 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded border border-slate-800 transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* MODAL: Insert Row */}
      <AnimatePresence>
        {isInsertModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-slate-950 border border-slate-800 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col text-slate-200"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 font-mono text-sm font-bold text-slate-100">
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>Tambah Baris Baru ke `{selectedTable}`</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsInsertModalOpen(false)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 font-mono text-xs">
                {activeTableMeta.columns.map((col) => {
                  const val = modalFormData[col.key];

                  return (
                    <div key={col.key} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                          <span>{col.label}</span>
                          {col.required && <span className="text-rose-400">*</span>}
                        </label>
                        <span className="text-[10px] text-slate-500 uppercase">{col.type}</span>
                      </div>

                      {col.options ? (
                        <select
                          value={String(val ?? '')}
                          onChange={(e) =>
                            setModalFormData((prev) => ({ ...prev, [col.key]: e.target.value }))
                          }
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
                        >
                          <option value="">-- Pilih {col.label} --</option>
                          {col.options.map((opt) => (
                            <option key={String(opt.value)} value={String(opt.value)}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : col.type === 'boolean' ? (
                        <div className="flex items-center gap-4 py-1">
                          <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                            <input
                              type="radio"
                              name={`insert-${col.key}`}
                              checked={val === true}
                              onChange={() =>
                                setModalFormData((prev) => ({ ...prev, [col.key]: true }))
                              }
                            />
                            <span>TRUE</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                            <input
                              type="radio"
                              name={`insert-${col.key}`}
                              checked={val === false}
                              onChange={() =>
                                setModalFormData((prev) => ({ ...prev, [col.key]: false }))
                              }
                            />
                            <span>FALSE</span>
                          </label>
                        </div>
                      ) : (
                        <input
                          type={col.type === 'number' ? 'number' : 'text'}
                          value={val !== null && val !== undefined ? String(val) : ''}
                          onChange={(e) =>
                            setModalFormData((prev) => ({
                              ...prev,
                              [col.key]: col.type === 'number' ? e.target.value : e.target.value,
                            }))
                          }
                          placeholder={`Nilai untuk ${col.label}...`}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-slate-800 pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsInsertModalOpen(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSaveInsert}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Simpan Baris</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 1: Edit Row Form */}
      <AnimatePresence>
        {editingRow && !isConfirmEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-slate-950 border border-slate-800 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col text-slate-200"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 font-mono text-sm font-bold text-slate-100">
                  <Edit2 className="w-4 h-4 text-emerald-400" />
                  <span>
                    Ubah Baris `{selectedTable}` ({activeTableMeta.primaryKey}: {String(editingRow[activeTableMeta.primaryKey])})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingRow(null)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 font-mono text-xs">
                {activeTableMeta.columns.map((col) => {
                  const val = modalFormData[col.key];
                  const isPk = col.key === activeTableMeta.primaryKey;

                  return (
                    <div key={col.key} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                          <span>{col.label}</span>
                          {isPk && <span className="text-amber-400 text-[10px]">(Kunci Utama - Tidak dapat diubah)</span>}
                        </label>
                        <span className="text-[10px] text-slate-500 uppercase">{col.type}</span>
                      </div>

                      {col.options ? (
                        <select
                          disabled={isPk}
                          value={String(val ?? '')}
                          onChange={(e) =>
                            setModalFormData((prev) => ({ ...prev, [col.key]: e.target.value }))
                          }
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                        >
                          <option value="">-- Pilih {col.label} --</option>
                          {col.options.map((opt) => (
                            <option key={String(opt.value)} value={String(opt.value)}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : col.type === 'boolean' ? (
                        <div className="flex items-center gap-4 py-1">
                          <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                            <input
                              type="radio"
                              name={`edit-${col.key}`}
                              checked={val === true || val === 'true'}
                              onChange={() =>
                                setModalFormData((prev) => ({ ...prev, [col.key]: true }))
                              }
                            />
                            <span>TRUE</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                            <input
                              type="radio"
                              name={`edit-${col.key}`}
                              checked={val === false || val === 'false'}
                              onChange={() =>
                                setModalFormData((prev) => ({ ...prev, [col.key]: false }))
                              }
                            />
                            <span>FALSE</span>
                          </label>
                        </div>
                      ) : (
                        <input
                          type={col.type === 'number' ? 'number' : 'text'}
                          disabled={isPk}
                          value={val !== null && val !== undefined ? String(val) : ''}
                          onChange={(e) =>
                            setModalFormData((prev) => ({
                              ...prev,
                              [col.key]: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-slate-800 pt-3 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-mono">
                  {editDiffs.length} field diubah
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingRow(null)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleRequestSaveEdit}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-sm"
                  >
                    <span>Lanjutkan Simpan</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Edit Security Confirmation Protection */}
      <AnimatePresence>
        {isConfirmEditModalOpen && editingRow && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-slate-950 border border-amber-500/40 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 text-slate-200"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-950/80 text-amber-400 flex items-center justify-center border border-amber-800/80 shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-slate-100 font-mono">
                    Konfirmasi Pembaruan Data
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">
                    Tabel: <span className="text-emerald-400">{selectedTable}</span> | {activeTableMeta.primaryKey}:{' '}
                    <span className="text-amber-300 font-bold">{String(editingRow[activeTableMeta.primaryKey])}</span>
                  </p>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
                <div className="text-[11px] font-mono font-semibold text-slate-400 border-b border-slate-800 pb-1 flex justify-between">
                  <span>Daftar Perubahan Kolom ({editDiffs.length}):</span>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1 font-mono text-xs">
                  {editDiffs.map((diff) => (
                    <div key={diff.key} className="bg-slate-950 p-2 rounded border border-slate-800 space-y-1">
                      <div className="text-emerald-400 font-bold text-[11px]">{diff.label}</div>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div className="text-slate-500 bg-slate-900/60 p-1 rounded">
                          <span className="block text-[9px] uppercase text-slate-600">Sebelum</span>
                          <span className="truncate block">{diff.oldVal === null || diff.oldVal === undefined ? 'NULL' : String(diff.oldVal)}</span>
                        </div>
                        <div className="text-emerald-300 bg-emerald-950/40 p-1 rounded border border-emerald-900/50">
                          <span className="block text-[9px] uppercase text-emerald-600">Sesudah</span>
                          <span className="truncate block font-bold">{diff.newVal === null || diff.newVal === undefined ? 'NULL' : String(diff.newVal)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsConfirmEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Kembali Edit
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleConfirmSaveEdit}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Ya, Terapkan Perubahan</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: Delete Security Confirmation Protection */}
      <AnimatePresence>
        {deletingRow && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-slate-950 border border-rose-900/60 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-200"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-950 text-rose-400 flex items-center justify-center border border-rose-900/80 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-100 font-mono">
                    Hapus Baris Data Secara Permanen?
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed font-mono">
                    Data pada tabel <span className="text-rose-400 font-bold">{selectedTable}</span> dengan kunci{' '}
                    <span className="text-white font-bold bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                      {String(deletingRow[activeTableMeta.primaryKey])}
                    </span>{' '}
                    akan dihapus permanen dari Supabase.
                  </p>
                </div>
              </div>

              {/* Safety Checkbox Protection */}
              <div className="bg-rose-950/30 border border-rose-900/40 rounded-xl p-3">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs font-mono text-rose-200 select-none">
                  <input
                    type="checkbox"
                    checked={deleteConfirmChecked}
                    onChange={(e) => setDeleteConfirmChecked(e.target.value === 'on' || e.target.checked)}
                    className="mt-0.5 rounded border-rose-800 text-rose-600 focus:ring-rose-500"
                  />
                  <span>
                    Saya memahami bahwa data ini tidak dapat dipulihkan kembali setelah dihapus.
                  </span>
                </label>
              </div>

              <div className="border-t border-slate-800 pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setDeletingRow(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSubmitting || !deleteConfirmChecked}
                  onClick={handleConfirmDelete}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:hover:bg-rose-600 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>Hapus Data</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
