import {supa, ensureAnonSession} from './supa';
import type {
  Clinic,
  Doctor,
  QueueRow,
  Token,
  Eta,
  TokenStatus,
  TokenSource,
  EventType,
} from './types';

// ---------- Reads (all work with the anon key) ----------

export async function fetchClinics(): Promise<Clinic[]> {
  const {data, error} = await supa
    .from('clinics')
    .select('id,name,hospital,default_consult_secs,is_paused,pause_reason,staff_join_code')
    .order('created_at');
  if (error) throw error;
  return data as Clinic[];
}

export async function fetchDoctors(clinicId: string): Promise<Doctor[]> {
  const {data, error} = await supa
    .from('doctors')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('is_active', true)
    .order('room');
  if (error) throw error;
  return data as Doctor[];
}

/** Live queue with computed positions (RLS-safe: staff only). */
export async function fetchQueue(doctorId: string): Promise<QueueRow[]> {
  const {data, error} = await supa
    .from('live_queue')
    .select('*')
    .eq('doctor_id', doctorId)
    .order('position');
  if (error) throw error;
  return data as QueueRow[];
}

/** Board/kiosk feed: one call per doctor, merged client-side. */
export async function fetchBoard(clinicId: string): Promise<QueueRow[]> {
  const {data, error} = await supa
    .from('live_queue')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('position');
  if (error) throw error;
  return data as QueueRow[];
}

export async function fetchToken(tokenId: string): Promise<Token | null> {
  const {data, error} = await supa
    .from('tokens')
    .select('*')
    .eq('id', tokenId)
    .maybeSingle();
  if (error) throw error;
  return (data as Token) ?? null;
}

export async function getEta(tokenId: string): Promise<Eta | null> {
  const {data, error} = await supa.rpc('eta_for_token', {p_token_id: tokenId});
  if (error) throw error;
  const row = (data as Eta[] | null)?.[0];
  return row ?? null;
}

// ---------- Patient actions ----------

/** Claim a token via QR scan. Needs an anon session first (server validates claim_code). */
export async function claimToken(tokenId: string, code: string): Promise<Token> {
  const session = await ensureAnonSession();
  const {data, error} = await supa
    .from('tokens')
    .update({claimed_by: session.user.id})
    .eq('id', tokenId)
    .eq('claim_code', code)
    .is('claimed_by', null)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('QR invalid or token already claimed');
  return data as Token;
}

export async function patientConfirm(token: Token): Promise<void> {
  await insertEvent(token.id, token.clinic_id, 'patient', 'confirmed', {});
}

export async function patientLabRequeue(token: Token): Promise<void> {
  const {error} = await supa
    .from('tokens')
    .update({status: 'requeued'})
    .eq('id', token.id);
  if (error) throw error;
  await insertEvent(token.id, token.clinic_id, 'patient', 'requeued', {by: 'patient'});
}

export async function setSteppedOut(tokenId: string, out: boolean): Promise<void> {
  const {error} = await supa.from('tokens').update({stepped_out: out}).eq('id', tokenId);
  if (error) throw error;
}

export async function insertEvent(
  tokenId: string | null,
  clinicId: string,
  actor: 'staff' | 'patient' | 'system',
  event: EventType,
  payload: Record<string, unknown>,
): Promise<void> {
  const {error} = await supa
    .from('queue_events')
    .insert({token_id: tokenId, clinic_id: clinicId, actor, event, payload});
  if (error) throw error;
}

// ---------- Staff actions ----------

export async function issueToken(input: {
  clinicId: string;
  doctorId: string;
  source: TokenSource;
  isPriority: boolean;
  reason?: string;
  label: string;
}): Promise<{token: Token; claimCode: string}> {
  const {data, error} = await supa
    .from('tokens')
    .insert({
      clinic_id: input.clinicId,
      doctor_id: input.doctorId,
      source: input.source,
      is_priority: input.isPriority,
      priority_reason: input.reason || null,
      display_label: input.label,
    })
    .select('*')
    .single();
  if (error) throw error;
  const token = data as Token;
  await insertEvent(token.id, token.clinic_id, 'staff', 'issued', {
    number: token.number,
    source: token.source,
    priority: token.is_priority,
  });
  return {token, claimCode: token.claim_code};
}

export async function transitionToken(
  token: QueueRow | Token,
  to: TokenStatus,
  event: EventType,
  extra: Record<string, unknown> = {},
): Promise<void> {
  const {error} = await supa.from('tokens').update({status: to}).eq('id', token.id);
  if (error) throw error;
  await insertEvent(token.id, token.clinic_id, 'staff', event, {number: token.number, ...extra});
}

export async function setPaused(clinicId: string, paused: boolean, reason?: string): Promise<void> {
  const {error} = await supa
    .from('clinics')
    .update({is_paused: paused, pause_reason: paused ? reason || null : null, paused_at: paused ? new Date().toISOString() : null})
    .eq('id', clinicId);
  if (error) throw error;
  await insertEvent(null, clinicId, 'staff', paused ? 'paused' : 'resumed', {reason: reason || ''});
}

export async function setRoom(doctorId: string, clinicId: string, room: number): Promise<void> {
  const {error} = await supa.from('doctors').update({room}).eq('id', doctorId);
  if (error) throw error;
  await insertEvent(null, clinicId, 'staff', 'room_changed', {room});
}

export async function broadcastNotice(clinicId: string, text: string): Promise<void> {
  await insertEvent(null, clinicId, 'staff', 'delay_notice', {text});
}

// ---------- Staff auth ----------

export async function staffSignIn(email: string, password: string) {
  const {data, error} = await supa.auth.signInWithPassword({email, password});
  if (error) throw error;
  return data;
}

export async function staffSignUp(email: string, password: string, displayName: string) {
  const {data, error} = await supa.auth.signUp({
    email,
    password,
    options: {data: {display_name: displayName}},
  });
  if (error) throw error;
  return data;
}

export async function joinClinic(staffCode: string): Promise<string> {
  const {data, error} = await supa.rpc('join_clinic', {p_code: staffCode});
  if (error) throw error;
  return data as string;
}

export async function myClinicId(): Promise<string | null> {
  const {data: sess} = await supa.auth.getSession();
  if (!sess.session) return null;
  const {data, error} = await supa
    .from('staff_profiles')
    .select('clinic_id')
    .eq('user_id', sess.session.user.id)
    .maybeSingle();
  if (error) throw error;
  return (data as {clinic_id: string} | null)?.clinic_id ?? null;
}

export async function signOut() {
  await supa.auth.signOut();
}

// ---------- Realtime ----------

export function subscribeTokens(doctorId: string, onChange: () => void) {
  return supa
    .channel(`tokens-${doctorId}`)
    .on(
      'postgres_changes',
      {event: '*', schema: 'public', table: 'tokens', filter: `doctor_id=eq.${doctorId}`},
      onChange,
    )
    .subscribe();
}

export function subscribeClinic(clinicId: string, onChange: () => void) {
  const a = supa
    .channel(`clinic-${clinicId}`)
    .on(
      'postgres_changes',
      {event: '*', schema: 'public', table: 'clinics', filter: `id=eq.${clinicId}`},
      onChange,
    )
    .subscribe();
  const b = supa
    .channel(`cev-${clinicId}`)
    .on(
      'postgres_changes',
      {event: 'INSERT', schema: 'public', table: 'queue_events', filter: `clinic_id=eq.${clinicId}`},
      () => onChange(),
    )
    .subscribe();
  void b;
  return {unsubscribe: () => void supa.removeChannel(a)};
}
