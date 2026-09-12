import { useState, useRef, useEffect, ReactNode } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface CustomSelectOption<T extends string = string> {
  value: T;
  label: string;
  badge?: string | number;
  description?: string;
  icon?: ReactNode;
}

interface CustomSelectProps<T extends string = string> {
  id?: string;
  value: T;
  onChange: (value: T) => void;
  options: CustomSelectOption<T>[];
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export function CustomSelect<T extends string = string>({
  id,
  value,
  onChange,
  options,
  placeholder = 'Pilih opsi...',
  className = '',
  buttonClassName = '',
  menuClassName = '',
  disabled = false,
  size = 'md',
  fullWidth = true,
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs rounded-xl',
    md: 'px-3.5 py-2.5 text-xs sm:text-sm rounded-xl',
    lg: 'px-4 py-3 text-sm sm:text-base rounded-2xl',
  };

  return (
    <div
      ref={containerRef}
      className={`relative ${fullWidth ? 'w-full' : 'inline-block'} ${className}`}
    >
      {/* Trigger Button */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between gap-2.5 bg-slate-50 hover:bg-slate-100/80 border text-left transition-all cursor-pointer font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
          isOpen
            ? 'border-blue-500 ring-2 ring-blue-500/20 bg-white'
            : 'border-slate-200 hover:border-slate-300'
        } ${sizeClasses[size]} ${buttonClassName}`}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedOption?.icon && (
            <span className="shrink-0 text-slate-500">{selectedOption.icon}</span>
          )}
          {selectedOption ? (
            <span className="truncate text-slate-900 font-semibold">{selectedOption.label}</span>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
          {selectedOption?.badge !== undefined && (
            <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded-full shrink-0">
              {selectedOption.badge}
            </span>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-blue-600' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          className={`absolute z-50 mt-1.5 w-full min-w-[180px] bg-white border border-slate-200/90 rounded-2xl shadow-lg p-1.5 max-h-64 overflow-y-auto space-y-0.5 animate-in fade-in-0 zoom-in-95 duration-100 ${menuClassName}`}
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left text-xs sm:text-sm font-medium transition-colors cursor-pointer group ${
                  isSelected
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {option.icon && (
                    <span
                      className={`shrink-0 ${
                        isSelected ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    >
                      {option.icon}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate leading-tight">{option.label}</p>
                    {option.description && (
                      <p className="text-[11px] text-slate-400 font-normal truncate mt-0.5">
                        {option.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {option.badge !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        isSelected
                          ? 'bg-blue-200/80 text-blue-800'
                          : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                      }`}
                    >
                      {option.badge}
                    </span>
                  )}
                  {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
