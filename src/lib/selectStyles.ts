import type { StylesConfig } from 'react-select';

/**
 * Shared theme-aware styles for react-select components in Placify CRM.
 * Seamlessly adapts to Dark Mode (default) and Light Mode using CSS theme variables.
 */
export const sharedSelectStyles: StylesConfig<any, boolean> = {
  control: (provided, state) => ({
    ...provided,
    backgroundColor: 'var(--bg-tertiary, #27272A)',
    borderColor: state.isFocused ? 'var(--brand-primary, #0F7664)' : 'var(--border, rgba(255, 255, 255, 0.12))',
    borderRadius: '16px',
    padding: '2px 8px',
    fontSize: '0.875rem',
    fontWeight: 500,
    boxShadow: state.isFocused ? '0 0 0 2px rgba(15, 118, 100, 0.25)' : 'none',
    borderWidth: '1px',
    transition: 'all 0.2s ease',
    opacity: 1,
    '&:hover': {
      borderColor: 'var(--brand-primary, #0F7664)',
    },
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: 'var(--bg-card, #18181B)',
    border: '1px solid var(--border, rgba(255, 255, 255, 0.15))',
    borderRadius: '16px',
    boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    zIndex: 99999,
    padding: '6px',
    opacity: 1,
  }),
  menuList: (provided) => ({
    ...provided,
    backgroundColor: 'var(--bg-card, #18181B)',
    padding: '4px',
    borderRadius: '12px',
    maxHeight: '260px',
    opacity: 1,
  }),
  menuPortal: (provided) => ({
    ...provided,
    zIndex: 99999,
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected
      ? 'var(--brand-primary, #0F7664)'
      : state.isFocused
        ? 'var(--bg-muted, #27272A)'
        : 'var(--bg-card, #18181B)',
    color: state.isSelected ? '#FFFFFF' : 'var(--text-primary, #FAFAFA)',
    borderRadius: '10px',
    cursor: state.isDisabled ? 'not-allowed' : 'pointer',
    fontSize: '0.875rem',
    fontWeight: state.isSelected ? 600 : 400,
    padding: '10px 14px',
    margin: '2px 0',
    transition: 'background-color 0.15s ease, color 0.15s ease',
    opacity: state.isDisabled ? 0.5 : 1,
    '&:active': {
      backgroundColor: 'var(--brand-primary, #0F7664)',
      color: '#FFFFFF',
    },
    '&:hover': {
      backgroundColor: state.isSelected ? 'var(--brand-primary, #0F7664)' : 'var(--bg-muted, #27272A)',
      color: state.isSelected ? '#FFFFFF' : 'var(--text-primary, #FAFAFA)',
    },
  }),
  singleValue: (provided) => ({
    ...provided,
    color: 'var(--text-primary, #FAFAFA)',
    fontWeight: 500,
    opacity: 1,
  }),
  multiValue: (provided) => ({
    ...provided,
    backgroundColor: 'var(--brand-primary, #0F7664)',
    borderRadius: '8px',
    padding: '2px 6px',
    opacity: 1,
  }),
  multiValueLabel: (provided) => ({
    ...provided,
    color: '#FFFFFF',
    fontWeight: 700,
    fontSize: '0.75rem',
  }),
  multiValueRemove: (provided) => ({
    ...provided,
    color: '#FFFFFF',
    borderRadius: '4px',
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.25)',
      color: '#FFFFFF',
    },
  }),
  input: (provided) => ({
    ...provided,
    color: 'var(--text-primary, #FAFAFA)',
    opacity: 1,
  }),
  placeholder: (provided) => ({
    ...provided,
    color: 'var(--text-muted, #71717A)',
    fontSize: '0.875rem',
    opacity: 1,
  }),
  indicatorSeparator: (provided) => ({
    ...provided,
    backgroundColor: 'var(--border, rgba(255, 255, 255, 0.12))',
  }),
  dropdownIndicator: (provided, state) => ({
    ...provided,
    color: state.isFocused ? 'var(--brand-primary, #0F7664)' : 'var(--text-muted, #71717A)',
    opacity: 1,
    '&:hover': {
      color: 'var(--text-primary, #FAFAFA)',
    },
  }),
  clearIndicator: (provided) => ({
    ...provided,
    color: 'var(--text-muted, #71717A)',
    cursor: 'pointer',
    opacity: 1,
    '&:hover': {
      color: 'var(--color-accent-red, #EF4444)',
    },
  }),
  noOptionsMessage: (provided) => ({
    ...provided,
    color: 'var(--text-muted, #71717A)',
    backgroundColor: 'var(--bg-card, #18181B)',
    fontSize: '0.875rem',
    padding: '12px',
    opacity: 1,
  }),
  loadingMessage: (provided) => ({
    ...provided,
    color: 'var(--text-muted, #71717A)',
    backgroundColor: 'var(--bg-card, #18181B)',
    fontSize: '0.875rem',
    padding: '12px',
    opacity: 1,
  }),
};
