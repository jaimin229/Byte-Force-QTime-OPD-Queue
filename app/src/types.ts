export type TokenStatus =
  | 'issued'
  | 'called'
  | 'served'
  | 'skipped'
  | 'requeued'
  | 'cancelled';
export type TokenSource =
  | 'walk_in'
  | 'appointment'
  | 'referral'
  | 'follow_up'
  | 'diagnostic';
export type EventType =
  | 'issued'
  | 'called'
  | 'served'
  | 'skipped'
  | 'requeued'
  | 'room_changed'
  | 'paused'
  | 'resumed'
  | 'delay_notice'
  | 'confirmed';

export interface Clinic {
  id: string;
  name: string;
  hospital: string;
  default_consult_secs: number;
  is_paused: boolean;
  pause_reason: string | null;
  staff_join_code: string;
}

export interface Doctor {
  id: string;
  clinic_id: string;
  name: string;
  room: number;
  avg_consult_secs: number;
  consult_samples: number;
  is_active: boolean;
}

export interface QueueRow {
  id: string;
  clinic_id: string;
  doctor_id: string;
  number: number;
  status: TokenStatus;
  source: TokenSource;
  is_priority: boolean;
  priority_reason: string | null;
  display_label: string;
  stepped_out: boolean;
  issued_at: string;
  called_at: string | null;
  position: number;
}

export interface Token extends QueueRow {
  claim_code: string;
  claimed_by: string | null;
  served_at: string | null;
  updated_at: string;
}

export interface Eta {
  eta_low_secs: number;
  eta_high_secs: number;
  ahead: number;
  paused: boolean;
}

export interface ClinicEvent {
  id: number;
  token_id: string | null;
  clinic_id: string;
  actor: 'staff' | 'patient' | 'system';
  event: EventType;
  payload: Record<string, unknown>;
  occurred_at: string;
}

export const CLAIM_PREFIX = 'qtime://claim/';

export function makeClaimPayload(tokenId: string, claimCode: string): string {
  return `${CLAIM_PREFIX}${tokenId}/${claimCode}`;
}

export function parseClaimPayload(raw: string): {id: string; code: string} | null {
  if (!raw.startsWith(CLAIM_PREFIX)) return null;
  const rest = raw.slice(CLAIM_PREFIX.length).split('/');
  if (rest.length !== 2 || !rest[0] || !rest[1]) return null;
  return {id: rest[0], code: rest[1]};
}

export function fmtRange(lowSecs: number, highSecs: number, minLabel: string): string {
  const lo = Math.max(0, Math.round(lowSecs / 60));
  const hi = Math.max(lo, Math.round(highSecs / 60));
  return `${lo}–${hi} ${minLabel}`;
}

/**
 * Display names render in normal Latin/English script only (kiosk + board
 * legibility). Strips anything outside letters, digits and basic punctuation.
 */
export function normalizeDisplayName(raw: string): string {
  const clean = (raw || '')
    .replace(/[^A-Za-z0-9 .'\-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 24);
  return clean || 'Patient';
}
