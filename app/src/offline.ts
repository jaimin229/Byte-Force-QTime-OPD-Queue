import AsyncStorage from '@react-native-async-storage/async-storage';
import {supa} from './supa';

/** L1 offline-first: last-known snapshots + mutation outbox, replayed on reconnect. */

const K = {
  queue: (doctorId: string) => `qt:cache:queue:${doctorId}`,
  myToken: 'qt:cache:mytoken',
  board: (clinicId: string) => `qt:cache:board:${clinicId}`,
  outbox: 'qt:outbox',
  session: 'qt:session',
  lang: 'qt:lang',
};

export async function cacheSet(key: string, value: unknown) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify({v: value, at: Date.now()}));
  } catch {
    /* storage full/blocked — cache is best-effort */
  }
}

export async function cacheGet<T>(key: string): Promise<{v: T; at: number} | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as {v: T; at: number}) : null;
  } catch {
    return null;
  }
}

export const cacheKeys = K;

export function isNetworkError(e: unknown): boolean {
  const m = String((e as Error)?.message || e || '').toLowerCase();
  return (
    m.includes('failed to fetch') ||
    m.includes('network request failed') ||
    m.includes('networkerror') ||
    m.includes('timeout') ||
    m.includes('econnrefused') ||
    m.includes('enotfound')
  );
}

export interface OutboxOp {
  kind: 'transition' | 'event' | 'pause' | 'room' | 'notice';
  args: Record<string, unknown>;
  ts: number;
}

export async function enqueueOp(op: Omit<OutboxOp, 'ts'>) {
  const raw = await AsyncStorage.getItem(K.outbox);
  const list: OutboxOp[] = raw ? JSON.parse(raw) : [];
  list.push({...op, ts: Date.now()});
  await AsyncStorage.setItem(K.outbox, JSON.stringify(list));
}

export async function outboxCount(): Promise<number> {
  const raw = await AsyncStorage.getItem(K.outbox);
  return raw ? (JSON.parse(raw) as OutboxOp[]).length : 0;
}

async function runOp(op: OutboxOp) {
  const a = op.args;
  if (op.kind === 'transition') {
    await supa.from('tokens').update({status: a.to}).eq('id', String(a.tokenId));
  } else if (op.kind === 'event') {
    await supa.from('queue_events').insert({
      token_id: (a.tokenId as string) ?? null,
      clinic_id: String(a.clinicId),
      actor: a.actor,
      event: a.event,
      payload: (a.payload as Record<string, unknown>) ?? {},
    });
  } else if (op.kind === 'pause') {
    await supa
      .from('clinics')
      .update({
        is_paused: a.paused,
        pause_reason: (a.reason as string) || null,
        paused_at: a.paused ? new Date().toISOString() : null,
      })
      .eq('id', String(a.clinicId));
  } else if (op.kind === 'room') {
    await supa.from('doctors').update({room: Number(a.room)}).eq('id', String(a.doctorId));
  } else if (op.kind === 'notice') {
    await supa.from('queue_events').insert({
      token_id: null,
      clinic_id: String(a.clinicId),
      actor: 'staff',
      event: 'delay_notice',
      payload: {text: String(a.text)},
    });
  }
}

/** Replay queued staff mutations in FIFO order. Returns remaining count. */
export async function replayOutbox(): Promise<number> {
  const raw = await AsyncStorage.getItem(K.outbox);
  const list: OutboxOp[] = raw ? JSON.parse(raw) : [];
  if (list.length === 0) return 0;
  const remaining: OutboxOp[] = [];
  for (const op of list) {
    try {
      await runOp(op);
    } catch (e) {
      if (isNetworkError(e)) {
        remaining.push(op, ...list.slice(list.indexOf(op) + 1));
        break;
      }
      // non-network error (e.g. invalid transition already applied) — drop, it's stale
    }
  }
  await AsyncStorage.setItem(K.outbox, JSON.stringify(remaining));
  return remaining.length;
}

// ---------- manual session persist (works for anon + staff) ----------
export async function saveSession() {
  const {data} = await supa.auth.getSession();
  if (data.session) {
    await AsyncStorage.setItem(K.session, JSON.stringify(data.session));
  }
}

export async function restoreSession(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(K.session);
    if (!raw) return false;
    const session = JSON.parse(raw);
    const {error} = await supa.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    return !error;
  } catch {
    return false;
  }
}

export async function clearSession() {
  await AsyncStorage.removeItem(K.session);
}
