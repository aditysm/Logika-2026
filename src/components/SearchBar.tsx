import { ArrowUpDown, Filter, Search, X } from 'lucide-react';
import { CustomSelect, CustomSelectOption } from './CustomSelect';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedGroup: string;
  onGroupChange: (group: string) => void;
  groups: string[];
  sortBy: 'nama' | 'nim' | 'kelompok';
  onSortChange: (sort: 'nama' | 'nim' | 'kelompok') => void;
  totalFiltered: number;
  totalAll: number;
}

const SORT_OPTIONS: CustomSelectOption<'nama' | 'nim' | 'kelompok'>[] = [
  { value: 'kelompok', label: 'Kelompok Logika' },
  { value: 'nama', label: 'Nama (A-Z)' },
  { value: 'nim', label: 'NIM' },
];

export function SearchBar({
  searchQuery,
  onSearchChange,
  selectedGroup,
  onGroupChange,
  groups,
  sortBy,
  onSortChange,
  totalFiltered,
  totalAll,
}: SearchBarProps) {
  return (
    <div className="w-full space-y-3.5">
      {/* Search Input, Count & Dropdown Filter Row */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Primary Search Input */}
        <div className="relative group flex-1">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
            <Search className="w-5 h-5" />
          </div>
          <input
            id="input-search-student"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari nama lengkap, panggilan, NIM, atau kelompok..."
            className="w-full pl-11 pr-10 py-3 bg-white border border-slate-300 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base shadow-xs transition-all"
          />
          {searchQuery && (
            <button
              id="btn-clear-search"
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              title="Hapus pencarian"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Count & Dropdown Filter beside Search Bar on desktop, or aligned nicely on small screens */}
        <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
          <span className="text-xs sm:text-sm text-slate-500 font-medium whitespace-nowrap">
            {totalFiltered === totalAll ? (
              <span>
                Menampilkan <strong className="text-slate-900 font-bold">{totalAll}</strong> mahasiswa
              </span>
            ) : (
              <span>
                Ditemukan <strong className="text-blue-600 font-bold">{totalFiltered}</strong> dari{' '}
                {totalAll}
              </span>
            )}
          </span>

          <div className="w-[145px] sm:w-[170px] md:min-w-[180px]">
            <CustomSelect
              id="select-sort-students"
              value={sortBy}
              onChange={onSortChange}
              options={SORT_OPTIONS}
              size="md"
              buttonClassName="bg-white rounded-2xl border-slate-300 py-2.5 sm:py-3 shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Group Filter Chips - Dedicated Full Width Row */}
      <div className="w-full flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin text-xs text-slate-600">
        <div className="flex items-center gap-1.5 text-slate-500 mr-1 pl-0.5 shrink-0">
          <Filter className="w-3.5 h-3.5 text-blue-600" />
          <span className="font-semibold">Kelompok:</span>
        </div>

        <button
          id="chip-group-all"
          type="button"
          onClick={() => onGroupChange('ALL')}
          className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
            selectedGroup === 'ALL'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
          }`}
        >
          Semua ({totalAll})
        </button>

        {groups.map((grp) => (
          <button
            key={grp}
            id={`chip-group-${grp.replace(/\s+/g, '-').toLowerCase()}`}
            type="button"
            onClick={() => onGroupChange(grp)}
            className={`px-3.5 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer ${
              selectedGroup === grp
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
            }`}
          >
            {grp}
          </button>
        ))}
      </div>
    </div>
  );
}
