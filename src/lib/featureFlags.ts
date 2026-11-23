/**
 * Centralized Feature Flags
 * 
 * Controlled exclusively via .env variables:
 * - DISABLE_OFFER_STAGE: boolean (true/false)
 * - DISABLE_COMPLETED_STAGE: boolean (true/false)
 * - DISABLE_PAYMENTS_REVENUE: boolean (true/false)
 * - DISABLE_PIPELINE_APP_TRACKING / DISABLE_APP_TRACKING_STAGE: boolean (true/false)
 * - DISABLE_AURRUM_CAREERS_FOR_RAJ: boolean (true/false)
 * 
 * Works seamlessly across both Vite client-side (import.meta.env)
 * and Node.js server environments (process.env).
 */

const parseBool = (val: unknown): boolean => {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    const trimmed = val.trim().toLowerCase();
    return trimmed === 'true' || trimmed === '1' || trimmed === 'yes';
  }
  return false;
};

const getEnvVar = (name: string): unknown => {
  // 1. Try import.meta.env (Vite client)
  try {
    const metaEnv = (import.meta as any)?.env;
    if (metaEnv && (metaEnv[name] !== undefined || metaEnv[`VITE_${name}`] !== undefined)) {
      return metaEnv[name] ?? metaEnv[`VITE_${name}`];
    }
  } catch {}

  // 2. Try process.env (Node.js backend or test runner)
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env[name] ?? process.env[`VITE_${name}`];
    }
  } catch {}

  return undefined;
};

/**
 * Checks whether the Offer stage is disabled via .env
 */
export const isOfferStageDisabled = (): boolean => {
  return parseBool(getEnvVar('DISABLE_OFFER_STAGE'));
};

/**
 * Checks whether the Completed stage is disabled via .env
 */
export const isCompletedStageDisabled = (): boolean => {
  return parseBool(getEnvVar('DISABLE_COMPLETED_STAGE'));
};

/**
 * Checks whether Payments and Revenue functionality is disabled via .env
 */
export const isPaymentsRevenueDisabled = (): boolean => {
  return parseBool(getEnvVar('DISABLE_PAYMENTS_REVENUE'));
};

/**
 * Checks whether Application Tracking should be hidden from the Pipeline board via .env.
 * Supported variables:
 * - DISABLE_PIPELINE_APP_TRACKING: boolean (true/false) - explicitly toggles pipeline visibility
 * - DISABLE_APP_TRACKING_STAGE: boolean (true/false) - stage-level toggle
 */
export const isPipelineAppTrackingDisabled = (): boolean => {
  return parseBool(getEnvVar('DISABLE_PIPELINE_APP_TRACKING')) || parseBool(getEnvVar('DISABLE_APP_TRACKING_STAGE'));
};

/**
 * Checks whether Application Tracking stage is disabled system-wide via .env
 */
export const isAppTrackingStageDisabled = (): boolean => {
  return parseBool(getEnvVar('DISABLE_APP_TRACKING_STAGE'));
};

/**
 * Checks whether Aurrum Careers is disabled for Raj Lal (raj.lal@auriic.co) via .env
 */
export const isAurrumDisabledForRaj = (): boolean => {
  return parseBool(getEnvVar('DISABLE_AURRUM_CAREERS_FOR_RAJ'));
};

/**
 * Checks whether Aurrum Careers functionality should be restricted for a specific user
 * (Active only when DISABLE_AURRUM_CAREERS_FOR_RAJ=true and the user account is raj.lal@auriic.co)
 */
export const isAurrumRestrictedForUser = (
  userOrEmail?: string | { email?: string | null; username?: string | null } | null
): boolean => {
  if (!isAurrumDisabledForRaj()) return false;
  if (!userOrEmail) return false;
  const email = typeof userOrEmail === 'string'
    ? userOrEmail
    : (userOrEmail.email || userOrEmail.username || '');
  return email.toLowerCase().trim() === 'raj.lal@auriic.co';
};

/**
 * Checks whether a specific stage is disabled by active feature flags
 */
export const isStageDisabled = (stageKey: string): boolean => {
  if (stageKey === 'offer' && isOfferStageDisabled()) return true;
  if (stageKey === 'completed' && isCompletedStageDisabled()) return true;
  if (stageKey === 'application_tracking' && isAppTrackingStageDisabled()) return true;
  return false;
};
