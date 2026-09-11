import {describe, test, expect} from '@jest/globals';
import {fmtRange, makeClaimPayload, parseClaimPayload, normalizeDisplayName} from '../src/types';
import {t, setLang, getLang} from '../src/i18n';
import {isNetworkError} from '../src/offline';

describe('QTime Core Queue & Translation Engine', () => {
  test('i18n switches between English and Hindi correctly (No Urdu)', () => {
    setLang('en');
    expect(getLang()).toBe('en');
    expect(t('appName')).toBe('QTime');
    expect(t('nowServing')).toBe('Now Serving');

    // Switch to Hindi
    setLang('hi');
    expect(getLang()).toBe('hi');
    expect(t('appName')).toBe('क्यूटाइम (QTime)');
    expect(t('nowServing')).toBe('अभी परामर्श चल रहा है');
    expect(t('queuePaused')).toBe('कतार अस्थायी रूप से रुकी हुई है');

    // Check parameter replacement in Hindi
    const translated = t('youAreNext', {room: 4});
    expect(translated).toContain('कमरा 4');
  });

  test('Claim payload generation and parsing works seamlessly', () => {
    const tokenId = 'd47a3502-8a29-4287-b0c0-a5bff6f90f8f';
    const claimCode = 'c91b5042-36a5-49e2-a447-0b54fca64e52';
    const payload = makeClaimPayload(tokenId, claimCode);

    expect(payload).toBe(`qtime://claim/${tokenId}/${claimCode}`);

    const parsed = parseClaimPayload(payload);
    expect(parsed).not.toBeNull();
    expect(parsed?.id).toBe(tokenId);
    expect(parsed?.code).toBe(claimCode);

    // Invalid payload returns null
    expect(parseClaimPayload('invalid-string')).toBeNull();
  });

  test('ETA range formatting calculates honest human-readable ranges', () => {
    // 600s (10m) to 900s (15m)
    const range = fmtRange(600, 900, 'min');
    expect(range).toBe('10–15 min');

    // 0s to 300s
    const earlyRange = fmtRange(0, 300, 'min');
    expect(earlyRange).toBe('0–5 min');
  });

  test('normalizeDisplayName cleans user-facing labels safely', () => {
    expect(normalizeDisplayName('Dr. Rajesh Kumar Jr.')).toBe('Dr. Rajesh Kumar Jr.');
    expect(normalizeDisplayName('Patient <script>')).toBe('Patient script');
    expect(normalizeDisplayName('A very long name exceeding twenty four chars')).toBe('A very long name exceedi');
    expect(normalizeDisplayName('')).toBe('Patient');
  });

  test('Network error detector identifies offline disconnect patterns', () => {
    expect(isNetworkError(new Error('Network request failed'))).toBe(true);
    expect(isNetworkError(new Error('Failed to fetch'))).toBe(true);
    expect(isNetworkError(new Error('SyntaxError'))).toBe(false);
  });
});
