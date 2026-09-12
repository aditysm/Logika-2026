import { ArrowUpDown, Filter, Search, X } from 'lucide-react';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedGroup: string;
  onGroupChange: (group: string) => void;
  groups: string[];
  sortBy: 'nama' | 'nim' | 'kelompok' | 'asal';
  onSortChange: (sort: 'nama' | 'nim' | 'kelompok' | 'asal') => void;
  totalFiltered: number;
  totalAll: number;
}

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
    <div className="w-full space-y-3">
      {/* Primary Search Input */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
          <Search className="w-5 h-5" />
        </div>
        <input
          id="input-search-student"
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Cari nama lengkap, panggilan, NIM, asal rumah, atau hobi..."
          className="w-full pl-11 pr-10 py-3.5 bg-white border border-slate-300 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base shadow-sm transition-all"
        />
        {searchQuery && (
          <button
            id="btn-clear-search"
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
            title="Hapus pencarian"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filters & Sorting Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
        {/* Group Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 sm:pb-0 scrollbar-thin text-xs text-slate-600">
          <div className="flex items-center gap-1 text-slate-500 mr-1 pl-1">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-medium">Kelompok:</span>
          </div>

          <button
            id="chip-group-all"
            type="button"
            onClick={() => onGroupChange('ALL')}
            className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all ${
              selectedGroup === 'ALL'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
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
              className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all ${
                selectedGroup === grp
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {grp}
            </button>
          ))}
        </div>

        {/* Sort & Count */}
        <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-auto w-full sm:w-auto">
          <span className="text-xs text-slate-500 font-medium">
            {totalFiltered === totalAll ? (
              <span>Menampilkan {totalAll} mahasiswa</span>
            ) : (
              <span>
                Ditemukan <strong className="text-indigo-600">{totalFiltered}</strong> dari{' '}
                {totalAll}
              </span>
            )}
          </span>

          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 hidden md:inline">Urutkan:</span>
            <select
              id="select-sort-students"
              value={sortBy}
              onChange={(e) =>
                onSortChange(e.target.value as 'nama' | 'nim' | 'kelompok' | 'asal')
              }
              className="bg-transparent text-slate-800 font-medium focus:outline-none cursor-pointer pr-1"
            >
              <option value="nama">Nama (A-Z)</option>
              <option value="nim">NIM</option>
              <option value="kelompok">Kelompok</option>
              <option value="asal">Asal Rumah</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
