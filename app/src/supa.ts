import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import {createClient} from '@supabase/supabase-js';
import {SUPABASE_URL, SUPABASE_ANON_KEY} from './config';

export const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: undefined, // sessions persist via AsyncStorage below (wired in storage adapter)
    autoRefreshToken: true,
    persistSession: false, // manual persist — keeps anon + staff sessions in our offline cache
    detectSessionInUrl: false,
  },
  realtime: {params: {eventsPerSecond: 10}},
});

/** Ensure an anonymous session exists (patients & caregivers). Safe to call repeatedly. */
export async function ensureAnonSession() {
  const {data} = await supa.auth.getSession();
  if (data.session) return data.session;
  const {data: created, error} = await supa.auth.signInAnonymously();
  if (error) throw error;
  return created.session!;
}
