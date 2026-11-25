import React from 'react';
import { 
  Gift, 
  TreePine, 
  Sparkles, 
  PartyPopper, 
  Flame, 
  Moon, 
  Sun, 
  Flag, 
  Heart, 
  Palette, 
  Building2,
  CalendarCheck
} from 'lucide-react';

export type HolidayOccasion = 
  | 'christmas'
  | 'new_year'
  | 'diwali'
  | 'eid'
  | 'thanksgiving'
  | 'patriotic'
  | 'halloween'
  | 'holi'
  | 'easter'
  | 'override'
  | 'company';

export interface HolidayTheme {
  key: HolidayOccasion;
  label: string;
  festiveTag: string;
  iconName: string;
  accentColor: string;
  bannerGradient: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  cellGlow: string;
  cellBorderHover: string;
  iconBg: string;
  iconColor: string;
  defaultGreeting: string;
  ambientGlow: string;
}

export const HOLIDAY_THEMES: Record<HolidayOccasion, HolidayTheme> = {
  christmas: {
    key: 'christmas',
    label: 'Christmas Celebration',
    festiveTag: '🎄 Christmas Holiday',
    iconName: 'Gift',
    accentColor: '#EF4444',
    bannerGradient: 'from-rose-600/35 via-red-950/40 to-emerald-950/40',
    badgeBg: 'bg-gradient-to-r from-rose-500/25 to-emerald-500/15',
    badgeBorder: 'border-rose-500/40',
    badgeText: 'text-rose-300',
    cellGlow: 'bg-rose-500/[0.07] border-rose-500/35',
    cellBorderHover: 'hover:border-rose-500/60',
    iconBg: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
    iconColor: '#F87171',
    defaultGreeting: 'Wishing our entire team, partners, and clients a warm, joyful Christmas and a cheerful holiday season!',
    ambientGlow: 'shadow-[0_0_24px_rgba(244,63,94,0.18)]'
  },
  new_year: {
    key: 'new_year',
    label: 'New Year Celebration',
    festiveTag: '🎆 New Year Celebration',
    iconName: 'PartyPopper',
    accentColor: '#F59E0B',
    bannerGradient: 'from-amber-500/35 via-purple-900/40 to-indigo-950/45',
    badgeBg: 'bg-gradient-to-r from-amber-500/25 via-purple-500/20 to-indigo-500/20',
    badgeBorder: 'border-amber-500/45',
    badgeText: 'text-amber-300',
    cellGlow: 'bg-amber-500/[0.07] border-amber-500/35',
    cellBorderHover: 'hover:border-amber-500/60',
    iconBg: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    iconColor: '#FBBF24',
    defaultGreeting: 'Cheers to new beginnings! Wishing everyone a prosperous, healthy, and high-impact New Year!',
    ambientGlow: 'shadow-[0_0_24px_rgba(245,158,11,0.2)]'
  },
  diwali: {
    key: 'diwali',
    label: 'Diwali (Festival of Lights)',
    festiveTag: '🪔 Diwali (Festival of Lights)',
    iconName: 'Flame',
    accentColor: '#F97316',
    bannerGradient: 'from-amber-600/40 via-orange-600/30 to-yellow-600/25',
    badgeBg: 'bg-gradient-to-r from-amber-500/30 to-orange-500/25',
    badgeBorder: 'border-amber-500/50',
    badgeText: 'text-amber-200',
    cellGlow: 'bg-amber-500/[0.08] border-amber-500/40',
    cellBorderHover: 'hover:border-amber-500/70',
    iconBg: 'bg-amber-500/25 text-amber-300 border border-amber-500/40',
    iconColor: '#F59E0B',
    defaultGreeting: 'May the glorious divine light of Diwali illuminate your life with infinite prosperity, wisdom, and joy!',
    ambientGlow: 'shadow-[0_0_28px_rgba(245,158,11,0.25)]'
  },
  eid: {
    key: 'eid',
    label: 'Eid Mubarak',
    festiveTag: '🌙 Eid Mubarak',
    iconName: 'Moon',
    accentColor: '#10B981',
    bannerGradient: 'from-emerald-700/40 via-teal-900/40 to-cyan-950/40',
    badgeBg: 'bg-gradient-to-r from-emerald-500/30 to-teal-500/20',
    badgeBorder: 'border-emerald-500/50',
    badgeText: 'text-emerald-300',
    cellGlow: 'bg-emerald-500/[0.07] border-emerald-500/35',
    cellBorderHover: 'hover:border-emerald-500/60',
    iconBg: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/35',
    iconColor: '#34D399',
    defaultGreeting: 'Eid Mubarak! May this blessed celebration bring peace, happiness, and heartfelt harmony to you and your loved ones.',
    ambientGlow: 'shadow-[0_0_24px_rgba(16,185,129,0.2)]'
  },
  thanksgiving: {
    key: 'thanksgiving',
    label: 'Thanksgiving Holiday',
    festiveTag: '🦃 Thanksgiving',
    iconName: 'Sun',
    accentColor: '#D97706',
    bannerGradient: 'from-amber-700/40 via-orange-900/40 to-stone-900/40',
    badgeBg: 'bg-gradient-to-r from-amber-600/25 to-orange-600/20',
    badgeBorder: 'border-amber-600/40',
    badgeText: 'text-amber-200',
    cellGlow: 'bg-amber-600/[0.07] border-amber-600/35',
    cellBorderHover: 'hover:border-amber-600/60',
    iconBg: 'bg-amber-600/20 text-amber-300 border border-amber-600/35',
    iconColor: '#FBBF24',
    defaultGreeting: 'Giving thanks for our incredible community, clients, and team. Wishing you a warm and bountiful Thanksgiving!',
    ambientGlow: 'shadow-[0_0_24px_rgba(217,119,6,0.18)]'
  },
  patriotic: {
    key: 'patriotic',
    label: 'National Observance',
    festiveTag: '🇺🇸 National Holiday',
    iconName: 'Flag',
    accentColor: '#3B82F6',
    bannerGradient: 'from-blue-700/40 via-indigo-950/45 to-rose-950/40',
    badgeBg: 'bg-gradient-to-r from-blue-600/25 via-indigo-600/20 to-rose-600/25',
    badgeBorder: 'border-blue-500/45',
    badgeText: 'text-blue-300',
    cellGlow: 'bg-blue-500/[0.07] border-blue-500/35',
    cellBorderHover: 'hover:border-blue-500/60',
    iconBg: 'bg-blue-500/20 text-blue-400 border border-blue-500/35',
    iconColor: '#60A5FA',
    defaultGreeting: 'In honor and commemoration of this national holiday. Office closed for scheduled observance.',
    ambientGlow: 'shadow-[0_0_24px_rgba(59,130,246,0.2)]'
  },
  halloween: {
    key: 'halloween',
    label: 'Halloween Holiday',
    festiveTag: '🎃 Halloween Celebration',
    iconName: 'Sparkles',
    accentColor: '#EA580C',
    bannerGradient: 'from-orange-600/40 via-purple-950/50 to-neutral-950/50',
    badgeBg: 'bg-gradient-to-r from-orange-500/30 to-purple-600/25',
    badgeBorder: 'border-orange-500/50',
    badgeText: 'text-orange-200',
    cellGlow: 'bg-orange-500/[0.07] border-orange-500/35',
    cellBorderHover: 'hover:border-orange-500/60',
    iconBg: 'bg-orange-500/20 text-orange-400 border border-orange-500/35',
    iconColor: '#FB923C',
    defaultGreeting: 'Wishing everyone a fun, safe, and thrilling Halloween celebration!',
    ambientGlow: 'shadow-[0_0_24px_rgba(234,88,12,0.22)]'
  },
  holi: {
    key: 'holi',
    label: 'Holi (Festival of Colors)',
    festiveTag: '🎨 Holi (Festival of Colors)',
    iconName: 'Palette',
    accentColor: '#EC4899',
    bannerGradient: 'from-pink-600/40 via-purple-600/30 to-cyan-700/35',
    badgeBg: 'bg-gradient-to-r from-pink-500/30 via-purple-500/25 to-cyan-500/25',
    badgeBorder: 'border-pink-500/50',
    badgeText: 'text-pink-200',
    cellGlow: 'bg-pink-500/[0.07] border-pink-500/35',
    cellBorderHover: 'hover:border-pink-500/60',
    iconBg: 'bg-pink-500/20 text-pink-300 border border-pink-500/35',
    iconColor: '#F472B6',
    defaultGreeting: 'May this Festival of Colors bring vibrant energy, joyous memories, and radiant prosperity into your life!',
    ambientGlow: 'shadow-[0_0_28px_rgba(236,72,153,0.25)]'
  },
  easter: {
    key: 'easter',
    label: 'Easter / Spring Observance',
    festiveTag: '🕊️ Easter Observance',
    iconName: 'Heart',
    accentColor: '#8B5CF6',
    bannerGradient: 'from-violet-700/35 via-purple-950/40 to-pink-950/30',
    badgeBg: 'bg-gradient-to-r from-violet-500/25 to-pink-500/20',
    badgeBorder: 'border-violet-500/40',
    badgeText: 'text-violet-300',
    cellGlow: 'bg-violet-500/[0.07] border-violet-500/35',
    cellBorderHover: 'hover:border-violet-500/60',
    iconBg: 'bg-violet-500/20 text-violet-400 border border-violet-500/30',
    iconColor: '#A78BFA',
    defaultGreeting: 'Wishing you peace, renewal, and wonderful moments of joy this Easter season.',
    ambientGlow: 'shadow-[0_0_24px_rgba(139,92,246,0.2)]'
  },
  override: {
    key: 'override',
    label: 'Special Working Day',
    festiveTag: '⚡ Special Working Day',
    iconName: 'CalendarCheck',
    accentColor: '#10B981',
    bannerGradient: 'from-emerald-600/35 via-teal-900/40 to-slate-900/45',
    badgeBg: 'bg-gradient-to-r from-emerald-500/30 to-teal-500/20',
    badgeBorder: 'border-emerald-500/50',
    badgeText: 'text-emerald-300',
    cellGlow: 'bg-emerald-500/[0.08] border-emerald-500/40',
    cellBorderHover: 'hover:border-emerald-500/70',
    iconBg: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
    iconColor: '#34D399',
    defaultGreeting: 'Special working day active: office operations, candidate interviews, and booking schedules are fully operational.',
    ambientGlow: 'shadow-[0_0_24px_rgba(16,185,129,0.22)]'
  },
  company: {
    key: 'company',
    label: 'Office Holiday / Closure',
    festiveTag: '🏢 Official Holiday',
    iconName: 'Building2',
    accentColor: '#6366F1',
    bannerGradient: 'from-indigo-700/35 via-blue-950/40 to-slate-900/50',
    badgeBg: 'bg-gradient-to-r from-rose-500/20 via-indigo-500/15 to-purple-500/20',
    badgeBorder: 'border-rose-500/40',
    badgeText: 'text-rose-300',
    cellGlow: 'bg-rose-500/[0.06] border-rose-500/30',
    cellBorderHover: 'hover:border-accent-blue/60',
    iconBg: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
    iconColor: '#818CF8',
    defaultGreeting: 'Office closed for scheduled holiday / maintenance. Interview bookings are temporarily blocked.',
    ambientGlow: 'shadow-[0_0_24px_rgba(99,102,241,0.18)]'
  }
};

/**
 * Resolves a holiday theme from the closure title, event type, or working day override status.
 */
export function getHolidayTheme(title?: string, eventType?: string, isOpenOverride?: boolean): HolidayTheme {
  if (isOpenOverride) {
    return HOLIDAY_THEMES.override;
  }

  const raw = `${title || ''} ${eventType || ''}`.toLowerCase();

  // Christmas keywords
  if (
    raw.includes('christmas') ||
    raw.includes('xmas') ||
    raw.includes('boxing day') ||
    raw.includes('noel') ||
    raw.includes('santa') ||
    raw.includes('yule')
  ) {
    return HOLIDAY_THEMES.christmas;
  }

  // New Year keywords
  if (
    raw.includes('new year') ||
    raw.includes('new years') ||
    raw.includes("new year's") ||
    raw.includes('nye') ||
    raw.includes('jan 1') ||
    raw.includes('january 1')
  ) {
    return HOLIDAY_THEMES.new_year;
  }

  // Diwali / Festival of Lights keywords
  if (
    raw.includes('diwali') ||
    raw.includes('deepavali') ||
    raw.includes('festival of light') ||
    raw.includes('dhanteras') ||
    raw.includes('laxmi') ||
    raw.includes('bhai dooj')
  ) {
    return HOLIDAY_THEMES.diwali;
  }

  // Eid / Islamic holidays
  if (
    raw.includes('eid') ||
    raw.includes('ramadan') ||
    raw.includes('fitr') ||
    raw.includes('adha') ||
    raw.includes('muharram') ||
    raw.includes('bakrid')
  ) {
    return HOLIDAY_THEMES.eid;
  }

  // Thanksgiving / Harvest
  if (
    raw.includes('thanksgiving') ||
    raw.includes('harvest') ||
    raw.includes('black friday')
  ) {
    return HOLIDAY_THEMES.thanksgiving;
  }

  // National / Patriotic holidays
  if (
    raw.includes('independence') ||
    raw.includes('republic') ||
    raw.includes('4th of july') ||
    raw.includes('fourth of july') ||
    raw.includes('memorial') ||
    raw.includes('veteran') ||
    raw.includes('labor day') ||
    raw.includes('labour day') ||
    raw.includes('presidents') ||
    raw.includes('martin luther') ||
    raw.includes('mlk') ||
    raw.includes('columbus') ||
    raw.includes('constitution') ||
    raw.includes('gandhi') ||
    raw.includes('patriot')
  ) {
    return HOLIDAY_THEMES.patriotic;
  }

  // Halloween
  if (raw.includes('halloween') || raw.includes('hallows')) {
    return HOLIDAY_THEMES.halloween;
  }

  // Holi / Spring Colors
  if (raw.includes('holi') || raw.includes('dhulandi') || raw.includes('festival of color') || raw.includes('festival of colour')) {
    return HOLIDAY_THEMES.holi;
  }

  // Easter / Good Friday
  if (raw.includes('easter') || raw.includes('good friday') || raw.includes('ash wednesday')) {
    return HOLIDAY_THEMES.easter;
  }

  // Default company holiday
  return HOLIDAY_THEMES.company;
}

/**
 * Renders the matching Lucide icon for a given iconName string.
 */
export const renderHolidayIcon = (iconName: string, className = 'w-4 h-4'): React.ReactNode => {
  switch (iconName) {
    case 'Gift':
      return <Gift className={className} />;
    case 'TreePine':
      return <TreePine className={className} />;
    case 'PartyPopper':
      return <PartyPopper className={className} />;
    case 'Flame':
      return <Flame className={className} />;
    case 'Moon':
      return <Moon className={className} />;
    case 'Sun':
      return <Sun className={className} />;
    case 'Flag':
      return <Flag className={className} />;
    case 'Sparkles':
      return <Sparkles className={className} />;
    case 'Palette':
      return <Palette className={className} />;
    case 'Heart':
      return <Heart className={className} />;
    case 'CalendarCheck':
      return <CalendarCheck className={className} />;
    case 'Building2':
    default:
      return <Building2 className={className} />;
  }
};
