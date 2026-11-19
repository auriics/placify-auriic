import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, MessageSquare, Save, Loader2, AlertCircle } from 'lucide-react';
import { Candidate } from '../types';
import { updateCandidateBasicDetails } from '../services/storage';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

interface EditCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: Candidate | null;
  onSuccess?: (updated: { full_name: string; email: string; phone: string; whatsapp: string }) => void;
}

export const EditCandidateModal: React.FC<EditCandidateModalProps> = ({
  isOpen,
  onClose,
  candidate,
  onSuccess
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (candidate) {
      setFullName(candidate.full_name || '');
      setEmail(candidate.email || '');
      setPhone(candidate.phone || '');
      setWhatsapp(candidate.whatsapp || candidate.phone || '');
      setErrorMessage(null);
    }
  }, [candidate, isOpen]);

  if (!isOpen || !candidate) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    const trimmedWhatsapp = whatsapp.trim() || trimmedPhone;

    if (!trimmedName) {
      setErrorMessage('Candidate Name is required.');
      return;
    }

    if (!trimmedEmail) {
      setErrorMessage('Email Address is required.');
      return;
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!trimmedPhone) {
      setErrorMessage('Phone Number is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedData = await updateCandidateBasicDetails(
        candidate.id,
        {
          full_name: trimmedName,
          email: trimmedEmail,
          phone: trimmedPhone,
          whatsapp: trimmedWhatsapp
        },
        user || { id: '', role: '' }
      );

      showToast('Candidate contact details updated successfully', 'success');
      if (onSuccess) {
        onSuccess(updatedData);
      }
      onClose();
    } catch (err: any) {
      console.error('Failed to update candidate basic details:', err);
      const msg = err.message || 'Failed to update candidate contact details';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-bg-secondary border border-border-primary rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-border-primary flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-text-primary">Edit Candidate Information</h3>
            <p className="text-xs text-text-muted mt-0.5">
              Editing contact details for <span className="font-semibold text-text-primary">{candidate.full_name || 'Candidate'}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-text-muted hover:text-text-primary rounded-xl hover:bg-bg-tertiary transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error message banner */}
        {errorMessage && (
          <div className="mx-6 mt-5 p-3 rounded-xl bg-accent-red/10 border border-accent-red/20 flex items-center gap-2.5 text-xs text-accent-red font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Body - Exactly 4 fields */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 1. Candidate Full Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1">
              Candidate Full Name <span className="text-accent-red">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Chaitanya Krishna Reddy Kukkala"
                disabled={isSubmitting}
                className="w-full pl-10 pr-4 py-2.5 bg-bg-tertiary border border-border-primary rounded-xl text-sm text-text-primary font-medium placeholder:text-text-muted/60 focus:outline-none focus:border-accent-blue transition-colors disabled:opacity-50"
              />
            </div>
          </div>

          {/* 2. Email Address */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1">
              Email Address <span className="text-accent-red">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. candidate@example.com"
                disabled={isSubmitting}
                className="w-full pl-10 pr-4 py-2.5 bg-bg-tertiary border border-border-primary rounded-xl text-sm text-text-primary font-medium placeholder:text-text-muted/60 focus:outline-none focus:border-accent-blue transition-colors disabled:opacity-50"
              />
            </div>
          </div>

          {/* 3. Phone Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1">
              Phone Number <span className="text-accent-red">*</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +1 (555) 000-0000"
                disabled={isSubmitting}
                className="w-full pl-10 pr-4 py-2.5 bg-bg-tertiary border border-border-primary rounded-xl text-sm text-text-primary font-medium placeholder:text-text-muted/60 focus:outline-none focus:border-accent-blue transition-colors disabled:opacity-50"
              />
            </div>
          </div>

          {/* 4. WhatsApp Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1">
              WhatsApp Number
            </label>
            <div className="relative">
              <MessageSquare className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="e.g. +1 (555) 000-0000 (defaults to phone if empty)"
                disabled={isSubmitting}
                className="w-full pl-10 pr-4 py-2.5 bg-bg-tertiary border border-border-primary rounded-xl text-sm text-text-primary font-medium placeholder:text-text-muted/60 focus:outline-none focus:border-accent-blue transition-colors disabled:opacity-50"
              />
            </div>
            <p className="text-[10px] text-text-muted">If left blank, will automatically sync with Phone Number.</p>
          </div>

          {/* Info note */}
          <div className="p-3 bg-bg-tertiary/60 border border-border-primary/60 rounded-xl text-[11px] text-text-secondary leading-relaxed">
            Only contact details are editable. Existing candidate stage, team assignments, history, and workflows remain completely intact.
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 bg-bg-tertiary hover:bg-bg-tertiary/80 text-text-secondary hover:text-text-primary text-xs font-bold rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 bg-accent-blue hover:bg-accent-blue/90 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-accent-blue/20 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
