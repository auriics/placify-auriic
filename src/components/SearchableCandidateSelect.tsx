import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X, User, Briefcase, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Candidate } from '../types';
import { cn } from '../lib/utils';
import { FreeTrialBadge } from './FreeTrialBadge';

interface SearchableCandidateSelectProps {
  candidates: Candidate[];
  value: string;
  onChange: (candidateId: string, candidate?: Candidate) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  id?: string;
}

export const SearchableCandidateSelect: React.FC<SearchableCandidateSelectProps> = ({
  candidates,
  value,
  onChange,
  label = 'Select Candidate',
  placeholder = 'Search and select candidate...',
  required = false,
  disabled = false,
  error,
  className,
  id = 'candidate-search-select'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedCandidate = useMemo(() => {
    return candidates.find(c => String(c.id) === String(value));
  }, [candidates, value]);

  const filteredCandidates = useMemo(() => {
    if (!searchTerm.trim()) return candidates;
    const term = searchTerm.toLowerCase().trim();
    return candidates.filter(c => {
      const name = (c.full_name || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      const skills = (c.skills || '').toLowerCase();
      const phone = (c.phone || '').toLowerCase();
      const domain = (c.domain_interested || c.job_interest || '').toLowerCase();
      const company = (c.current_company || '').toLowerCase();
      return (
        name.includes(term) ||
        email.includes(term) ||
        skills.includes(term) ||
        phone.includes(term) ||
        domain.includes(term) ||
        company.includes(term)
      );
    });
  }, [candidates, searchTerm]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset highlighted index when search results change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchTerm]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  const handleSelect = (candidate: Candidate) => {
    onChange(candidate.id, candidate);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', undefined);
    setSearchTerm('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => 
        prev < filteredCandidates.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => 
        prev > 0 ? prev - 1 : filteredCandidates.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCandidates.length > 0 && filteredCandidates[highlightedIndex]) {
        handleSelect(filteredCandidates[highlightedIndex]);
      }
    }
  };

  return (
    <div className={cn("space-y-1.5 relative", className)} ref={containerRef}>
      {label && (
        <label htmlFor={id} className="block text-xs font-bold text-text-primary uppercase tracking-wider px-1">
          {label} {required && <span className="text-accent-red">*</span>}
        </label>
      )}

      {/* Hidden input for HTML form validation if required */}
      <input
        type="text"
        id={id}
        value={value}
        onChange={() => {}}
        required={required}
        tabIndex={-1}
        className="sr-only"
        aria-hidden="true"
      />

      {/* Trigger Button */}
      <div
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        tabIndex={disabled ? -1 : 0}
        onClick={() => {
          if (!disabled) setIsOpen(prev => !prev);
        }}
        onKeyDown={handleKeyDown}
        className={cn(
          "w-full px-4 py-3 bg-bg-tertiary border rounded-2xl flex items-center justify-between gap-2 cursor-pointer transition-all select-none text-left",
          isOpen ? "border-accent-blue ring-2 ring-accent-blue/20 bg-bg-secondary" : "border-border-primary hover:border-text-muted",
          disabled && "opacity-50 cursor-not-allowed",
          error && "border-accent-red ring-2 ring-accent-red/20"
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className={cn(
            "p-2 rounded-xl shrink-0 transition-colors",
            selectedCandidate ? "bg-accent-blue/10 text-accent-blue" : "bg-bg-secondary text-text-muted"
          )}>
            <User className="w-4 h-4" />
          </div>

          {selectedCandidate ? (
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-text-primary truncate">
                  {selectedCandidate.full_name}
                </p>
                {selectedCandidate.is_free_trial && (
                  <FreeTrialBadge 
                    size="sm" 
                    startDate={selectedCandidate.free_trial_start_date}
                    endDate={selectedCandidate.free_trial_end_date}
                  />
                )}
              </div>
              {(selectedCandidate.email || selectedCandidate.domain_interested || selectedCandidate.job_interest) && (
                <p className="text-xs text-text-muted truncate">
                  {selectedCandidate.email || selectedCandidate.domain_interested || selectedCandidate.job_interest}
                </p>
              )}
            </div>
          ) : (
            <span className="text-sm font-medium text-text-muted truncate">
              {placeholder}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {selectedCandidate && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-bg-secondary rounded-lg text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <ChevronDown className={cn(
            "w-4 h-4 text-text-muted transition-transform duration-200",
            isOpen && "rotate-180 text-accent-blue"
          )} />
        </div>
      </div>

      {error && (
        <p className="text-xs text-accent-red font-medium px-1 mt-1">{error}</p>
      )}

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute left-0 right-0 top-full mt-2 bg-bg-secondary border border-border-primary rounded-2xl shadow-2xl z-[99999] overflow-hidden opacity-100"
            style={{ maxHeight: '360px', backgroundColor: 'var(--bg-card, #18181B)' }}
          >
            {/* Search Input Header */}
            <div 
              className="p-3 border-b border-border-primary bg-bg-secondary sticky top-0 z-10"
              style={{ backgroundColor: 'var(--bg-card, #18181B)' }}
            >
              <div className="relative">
                <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type to search candidate name, email, skills..."
                  className="w-full pl-9 pr-8 py-2.5 bg-bg-tertiary border border-border-primary rounded-xl text-xs font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/40 placeholder:text-text-muted"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 hover:bg-bg-tertiary rounded-md text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between px-1 pt-2 text-[11px] text-text-muted font-medium">
                <span>Matching Candidates:</span>
                <span className="font-bold text-accent-blue">{filteredCandidates.length} found</span>
              </div>
            </div>

            {/* Candidate List */}
            <div 
              ref={listRef}
              role="listbox"
              className="max-h-60 overflow-y-auto p-1.5 space-y-1 custom-scrollbar divide-y divide-border-primary/40 bg-bg-secondary"
              style={{ backgroundColor: 'var(--bg-card, #18181B)' }}
            >
              {filteredCandidates.length === 0 ? (
                <div className="p-6 text-center text-text-muted space-y-1">
                  <User className="w-8 h-8 mx-auto stroke-[1.5] text-text-muted/60 mb-2" />
                  <p className="text-xs font-bold text-text-primary">No candidates found</p>
                  <p className="text-[11px] text-text-secondary">
                    {searchTerm ? `No matches for "${searchTerm}"` : 'No candidates available in this view'}
                  </p>
                </div>
              ) : (
                filteredCandidates.map((candidate, idx) => {
                  const isSelected = String(candidate.id) === String(value);
                  const isHighlighted = idx === highlightedIndex;

                  return (
                    <div
                      key={candidate.id}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(candidate)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={cn(
                        "w-full px-3 py-2.5 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-all text-left",
                        isSelected 
                          ? "bg-accent-blue text-white font-bold border border-accent-blue shadow-sm" 
                          : isHighlighted 
                            ? "bg-bg-tertiary text-text-primary border border-border-primary/60" 
                            : "bg-bg-secondary hover:bg-bg-tertiary text-text-primary border border-transparent"
                      )}
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-sm font-bold truncate",
                            isSelected ? "text-white" : "text-text-primary"
                          )}>
                            {candidate.full_name}
                          </span>
                          {candidate.is_free_trial && (
                            <FreeTrialBadge 
                              size="sm" 
                              startDate={candidate.free_trial_start_date}
                              endDate={candidate.free_trial_end_date}
                            />
                          )}
                          {candidate.current_stage && (
                            <span className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded-md uppercase font-bold tracking-wider shrink-0",
                              isSelected ? "bg-white/20 text-white" : "bg-bg-tertiary text-text-muted"
                            )}>
                              {candidate.current_stage.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>

                        <div className={cn(
                          "flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]",
                          isSelected ? "text-white/90" : "text-text-secondary"
                        )}>
                          {candidate.email && (
                            <span className="flex items-center gap-1 truncate max-w-[200px]">
                              <Mail className={cn("w-3 h-3 shrink-0", isSelected ? "text-white/80" : "text-text-muted")} />
                              {candidate.email}
                            </span>
                          )}
                          {(candidate.domain_interested || candidate.job_interest || candidate.skills) && (
                            <span className="flex items-center gap-1 truncate max-w-[200px]">
                              <Briefcase className={cn("w-3 h-3 shrink-0", isSelected ? "text-white/80" : "text-text-muted")} />
                              {candidate.domain_interested || candidate.job_interest || candidate.skills}
                            </span>
                          )}
                        </div>
                      </div>

                      {isSelected && (
                        <div className="p-1 bg-white/25 text-white rounded-lg shrink-0">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
