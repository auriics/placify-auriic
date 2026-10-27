import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface SendWelcomeEmailParams {
  to?: string;              // Recipient email / Gmail ID
  displayName?: string;     // User's full name
  username?: string;        // Login username
  email: string;            // Login email / Gmail ID
  password: string;         // Password
  role?: string;            // User role (e.g. 'jpc_recruiter', 'candidate')
  loginUrl?: string;        // Optional custom portal link
}

export interface SendWelcomeEmailResult {
  success: boolean;
  message?: string;
  error?: string;
  recipient?: string;
}

/**
 * Format role keys into readable human-friendly titles
 */
export function formatRoleName(role?: string): string {
  if (!role) return 'Team Member';
  const mapping: Record<string, string> = {
    'jpc_sales': 'Sales Specialist',
    'jpc_cs': 'Compliance Head',
    'jpc_compliance_person': 'Compliance Person',
    'jpc_marketing': 'Team Leader',
    'jpc_marketing_support': 'Team Leader Support',
    'jpc_recruiter': 'Recruiter',
    'jpc_proxy': 'Proxy Interviewer',
    'jpc_resume': 'Resume Specialist',
    'jpc_lead_gen': 'Lead Generator',
    'jpc_manager': 'Operations Manager',
    'administrator': 'System Administrator',
    'jpc_sysadmin': 'System Administrator',
    'jpc_candidate': 'Candidate Portal',
    'candidate': 'Candidate Portal',
    'aurrum_sales': 'Aurrum Sales Specialist',
    'aurrum_admin': 'Aurrum Administrator',
    'aurrum_team': 'Aurrum Team Member',
  };
  return mapping[role] || role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Sends a branded Auriic Placify welcome email via SMTP containing the user's login ID and password.
 */
export async function sendWelcomeEmail(params: SendWelcomeEmailParams): Promise<SendWelcomeEmailResult> {
  try {
    // 1. Get SMTP settings cache from localStorage or Firestore as reliable client fallback
    let smtpSettings: any = null;
    try {
      const cached = localStorage.getItem('smtp_settings');
      if (cached) {
        smtpSettings = JSON.parse(cached);
      }
    } catch (e) {
      // ignore
    }

    if (!smtpSettings || !smtpSettings.host) {
      try {
        const snap = await getDoc(doc(db, 'jpc_settings', 'smtp_settings'));
        if (snap.exists() && snap.data()?.host) {
          smtpSettings = snap.data();
          try {
            localStorage.setItem('smtp_settings', JSON.stringify(smtpSettings));
          } catch (e) {}
        }
      } catch (e) {
        // ignore
      }
    }

    const payload = {
      ...params,
      loginUrl: params.loginUrl || window.location.origin,
      smtpSettings: smtpSettings || undefined,
    };

    const response = await fetch('/api/user/send-welcome-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({ error: 'Invalid server response' }));

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error || `HTTP error ${response.status}`,
      };
    }

    return {
      success: true,
      message: data.message || 'Welcome email sent successfully',
      recipient: data.recipient || params.to || params.email,
    };
  } catch (err: any) {
    console.error('[sendWelcomeEmail] Request error:', err);
    return {
      success: false,
      error: err.message || 'Failed to dispatch welcome email',
    };
  }
}
