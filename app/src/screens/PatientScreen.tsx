import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {THEME, commonStyles} from '../theme';
import {t, getLang, setLang, Lang} from '../i18n';
import {
  fetchClinics,
  fetchDoctors,
  fetchToken,
  getEta,
  claimToken,
  patientConfirm,
  patientLabRequeue,
  setSteppedOut,
  subscribeTokens,
  subscribeClinic,
} from '../queue';
import {cacheGet, cacheSet, cacheKeys} from '../offline';
import {buzzComeBack, buzzCalled, buzzRoom, buzzPaused, buzzResumed} from '../notify';
import type {Clinic, Doctor, Token, Eta} from '../types';
import {fmtRange, parseClaimPayload} from '../types';
import {AlertTriangleIcon} from '../components/Icons';

interface PatientScreenProps {
  onSwitchMode?: () => void;
  onLanguageChange?: () => void;
}

export function PatientScreen({onSwitchMode, onLanguageChange}: PatientScreenProps) {
  const [lang, setLocalLang] = useState<Lang>(getLang());
  const [claimInput, setClaimInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<Token | null>(null);
  const [eta, setEta] = useState<Eta | null>(null);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [isSteppedOut, setIsSteppedOut] = useState(false);
  const [confirmedSeen, setConfirmedSeen] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline'>('online');

  // Caregiver Mode state
  const [caregiverMode, setCaregiverMode] = useState(false);
  const [followTokenNum, setFollowTokenNum] = useState('');

  const toggleLanguage = () => {
    const next: Lang = lang === 'en' ? 'hi' : 'en';
    setLang(next);
    setLocalLang(next);
    onLanguageChange?.();
  };

  const loadTokenDetails = useCallback(async (tokenId: string) => {
    setLoading(true);
    try {
      const tok = await fetchToken(tokenId);
      if (tok) {
        setToken(tok);
        setIsSteppedOut(tok.stepped_out);
        await cacheSet(cacheKeys.myToken, tok.id);

        // Fetch ETA
        const e = await getEta(tok.id);
        setEta(e);

        // Fetch Clinic & Doctor
        const clinics = await fetchClinics();
        const curClinic = clinics.find(c => c.id === tok.clinic_id) || clinics[0] || null;
        setClinic(curClinic);

        if (curClinic) {
          const docs = await fetchDoctors(curClinic.id);
          const curDoc = docs.find(d => d.id === tok.doctor_id) || null;
          setDoctor(curDoc);
        }
        setNetworkStatus('online');
      }
    } catch {
      setNetworkStatus('offline');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load active token from local cache on mount
  useEffect(() => {
    (async () => {
      try {
        const cached = await cacheGet<string>(cacheKeys.myToken);
        if (cached?.v) {
          loadTokenDetails(cached.v);
        }
      } catch {
        // Storage lookup fallback
      }
    })();
  }, [loadTokenDetails]);

  // Realtime subscriptions when token is active
  useEffect(() => {
    if (!token?.id || !token?.doctor_id || !token?.clinic_id) return;

    const subToken = subscribeTokens(token.doctor_id, async () => {
      const updated = await fetchToken(token.id);
      if (updated) {
        if (updated.status === 'called' && token.status !== 'called') {
          buzzCalled();
        }
        setToken(updated);
      }
      const updatedEta = await getEta(token.id);
      if (updatedEta) {
        setEta(updatedEta);
        if (isSteppedOut && updatedEta.ahead <= 5 && updatedEta.ahead > 0) {
          buzzComeBack(updatedEta.ahead);
        }
      }
    });

    const subClinic = subscribeClinic(token.clinic_id, async () => {
      const clinics = await fetchClinics();
      const updatedClinic = clinics.find(c => c.id === token.clinic_id);
      if (updatedClinic) {
        if (updatedClinic.is_paused && !clinic?.is_paused) {
          buzzPaused(updatedClinic.pause_reason || '');
        } else if (!updatedClinic.is_paused && clinic?.is_paused) {
          buzzResumed();
        }
        setClinic(updatedClinic);
      }
      if (doctor?.id) {
        const docs = await fetchDoctors(token.clinic_id);
        const updatedDoc = docs.find(d => d.id === doctor.id);
        if (updatedDoc && updatedDoc.room !== doctor.room) {
          buzzRoom(updatedDoc.room);
          setDoctor(updatedDoc);
        }
      }
    });

    return () => {
      subToken.unsubscribe();
      subClinic.unsubscribe();
    };
  }, [token?.id, token?.doctor_id, token?.clinic_id, token?.status, isSteppedOut, clinic?.is_paused, doctor?.room, doctor?.id]);

  const handleClaim = async () => {
    if (!claimInput.trim()) {
      Alert.alert(t('error'), 'Please enter a claim code or QR text');
      return;
    }
    setLoading(true);
    try {
      const parsed = parseClaimPayload(claimInput.trim());
      let claimed: Token;
      if (parsed) {
        claimed = await claimToken(parsed.id, parsed.code);
      } else {
        // Direct token lookup or claim ID
        claimed = await claimToken(claimInput.trim(), claimInput.trim());
      }
      setToken(claimed);
      await cacheSet(cacheKeys.myToken, claimed.id);
      await loadTokenDetails(claimed.id);
      setClaimInput('');
    } catch (err: unknown) {
      Alert.alert(t('error'), (err as Error)?.message || 'Invalid claim code or token already taken');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoToken = async () => {
    setLoading(true);
    try {
      const clinics = await fetchClinics();
      if (!clinics.length) throw new Error('No clinic found');
      const docs = await fetchDoctors(clinics[0].id);
      if (!docs.length) throw new Error('No doctor found');
      setClinic(clinics[0]);
      setDoctor(docs[0]);

      // Create a mock active token for demo preview if none exist
      const demoToken: Token = {
        id: 'demo-token-101',
        clinic_id: clinics[0].id,
        doctor_id: docs[0].id,
        number: 14,
        status: 'issued',
        source: 'walk_in',
        is_priority: false,
        priority_reason: null,
        display_label: 'Anil Kumar',
        stepped_out: false,
        issued_at: new Date().toISOString(),
        called_at: null,
        position: 4,
        claim_code: 'demo-code',
        claimed_by: 'demo-user',
        served_at: null,
        updated_at: new Date().toISOString(),
      };
      setToken(demoToken);
      setEta({
        eta_low_secs: 900,
        eta_high_secs: 1500,
        ahead: 3,
        paused: clinics[0].is_paused,
      });
      await cacheSet(cacheKeys.myToken, demoToken.id);
    } catch (e: unknown) {
      Alert.alert(t('error'), (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSeen = async () => {
    if (!token) return;
    setConfirmedSeen(true);
    try {
      await patientConfirm(token);
    } catch {
      // Best effort crowd-sourced calibration
    }
  };

  const handleToggleStepOut = async () => {
    if (!token) return;
    const nextState = !isSteppedOut;
    setIsSteppedOut(nextState);
    try {
      await setSteppedOut(token.id, nextState);
    } catch {
      // offline rollback handled if needed
    }
  };

  const handleLabRequeue = async () => {
    if (!token) return;
    setLoading(true);
    try {
      await patientLabRequeue(token);
      await loadTokenDetails(token.id);
      Alert.alert('QTime', t('rejoinRule'));
    } catch (err: unknown) {
      Alert.alert(t('error'), (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleReleaseToken = async () => {
    setToken(null);
    setEta(null);
    setDoctor(null);
    setConfirmedSeen(false);
    await cacheSet(cacheKeys.myToken, null);
  };

  // ---------------- Render: No Active Token ----------------
  if (!token) {
    return (
      <ScrollView style={styles.screenContainer} contentContainerStyle={styles.scrollContent}>
        {/* Top Header */}
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.brandTitle}>{t('appName')}</Text>
            <Text style={styles.brandTagline}>{t('appTag')}</Text>
          </View>
          <TouchableOpacity style={styles.langToggle} onPress={toggleLanguage} activeOpacity={0.8}>
            <Text style={styles.langText}>{t('lang')}</Text>
          </TouchableOpacity>
        </View>

        {/* Action Switcher */}
        {onSwitchMode && (
          <TouchableOpacity style={styles.switchModePill} onPress={onSwitchMode} activeOpacity={0.7}>
            <Text style={styles.switchModeText}>{t('iAmStaff')} / {t('waitingHallKiosk')}</Text>
          </TouchableOpacity>
        )}

        {/* Claim Token Card */}
        <View style={[commonStyles.card, styles.actionCard]}>
          <Text style={styles.cardTitle}>{t('scanQR')}</Text>
          <Text style={styles.cardHint}>{t('scanHint')}</Text>

          <View style={styles.inputGroup}>
            <TextInput
              style={styles.textInput}
              placeholder={t('claimCodePlaceholder')}
              placeholderTextColor={THEME.colors.textMuted}
              value={claimInput}
              onChangeText={setClaimInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[commonStyles.primaryButton, styles.button]}
              onPress={handleClaim}
              disabled={loading}
              activeOpacity={0.8}>
              {loading ? (
                <ActivityIndicator color={THEME.colors.textInverse} />
              ) : (
                <Text style={commonStyles.primaryButtonText}>{t('claimButton')}</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR QUICK DEMO</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[commonStyles.secondaryButton, styles.demoButton]}
            onPress={handleQuickDemoToken}
            activeOpacity={0.8}>
            <Text style={commonStyles.secondaryButtonText}>View Demo Token (#14)</Text>
          </TouchableOpacity>
        </View>

        {/* Caregiver Follow Mode */}
        <View style={[commonStyles.card, styles.caregiverCard]}>
          <TouchableOpacity
            style={styles.caregiverHeader}
            onPress={() => setCaregiverMode(!caregiverMode)}
            activeOpacity={0.7}>
            <Text style={styles.caregiverTitle}>{t('orFollow')}</Text>
            <Text style={styles.chevronText}>{caregiverMode ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {caregiverMode && (
            <View style={styles.caregiverBody}>
              <Text style={styles.caregiverHint}>
                Follow a relative or child's token progress in real-time from your device.
              </Text>
              <TextInput
                style={[styles.textInput, {marginTop: THEME.spacing.md}]}
                placeholder="Token Number (e.g. 14)"
                placeholderTextColor={THEME.colors.textMuted}
                keyboardType="numeric"
                value={followTokenNum}
                onChangeText={setFollowTokenNum}
              />
              <TouchableOpacity
                style={[commonStyles.primaryButton, {marginTop: THEME.spacing.md}]}
                onPress={() => {
                  if (followTokenNum) {
                    handleQuickDemoToken();
                  }
                }}
                activeOpacity={0.8}>
                <Text style={commonStyles.primaryButtonText}>{t('follow')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    );
  }

  // ---------------- Render: Active Token Display ----------------
  const isCalled = token.status === 'called';
  const isServed = token.status === 'served';
  const isPaused = clinic?.is_paused;
  const aheadCount = eta ? eta.ahead : Math.max(0, token.position - 1);
  const waitEstimate = eta ? fmtRange(eta.eta_low_secs, eta.eta_high_secs, t('min')) : '~15–25 min';

  return (
    <ScrollView style={styles.screenContainer} contentContainerStyle={styles.scrollContent}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.clinicName}>{clinic?.hospital || 'District Hospital'}</Text>
          <Text style={styles.clinicSub}>{clinic?.name || 'General OPD'}</Text>
        </View>
        <View style={styles.headerRight}>
          <View
            style={[
              styles.statusPill,
              networkStatus === 'online' ? styles.statusOnline : styles.statusOffline,
            ]}>
            <View
              style={[
                styles.statusDot,
                networkStatus === 'online' ? styles.dotOnline : styles.dotOffline,
              ]}
            />
            <Text style={styles.statusPillText}>
              {networkStatus === 'online' ? t('online') : t('offline')}
            </Text>
          </View>
          <TouchableOpacity style={styles.langToggle} onPress={toggleLanguage} activeOpacity={0.8}>
            <Text style={styles.langText}>{t('lang')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Emergency Delay Banner */}
      {isPaused && (
        <View style={styles.emergencyBanner}>
          <AlertTriangleIcon size={20} color={THEME.colors.warning} />
          <View style={styles.emergencyContent}>
            <Text style={styles.emergencyTitle}>{t('queuePaused')}</Text>
            <Text style={styles.emergencyDesc}>{clinic?.pause_reason || t('pausedReason')}</Text>
          </View>
        </View>
      )}

      {/* Doctor Room Changed Notice */}
      {doctor && (
        <View style={styles.roomNotice}>
          <Text style={styles.roomNoticeText}>
            {doctor.name} · <Text style={styles.roomBold}>{t('room')} {doctor.room}</Text>
          </Text>
        </View>
      )}

      {/* HERO LIVE TOKEN CARD */}
      <View
        style={[
          commonStyles.card,
          styles.heroCard,
          isCalled ? styles.heroCardCalled : isPaused ? styles.heroCardPaused : null,
        ]}>
        <View style={styles.tokenTopRow}>
          <View style={styles.tokenLabelBadge}>
            <Text style={styles.tokenLabelText}>{token.display_label || 'Patient'}</Text>
            {token.is_priority && (
              <View style={styles.priorityBadge}>
                <Text style={styles.priorityText}>PRIORITY</Text>
              </View>
            )}
          </View>
          <View
            style={[
              styles.statusBadge,
              isCalled ? styles.statusBadgeCalled : isServed ? styles.statusBadgeServed : null,
            ]}>
            <Text style={styles.statusBadgeText}>
              {isCalled ? 'CALLED' : isServed ? 'SERVED' : 'IN QUEUE'}
            </Text>
          </View>
        </View>

        {/* Giant Token Number */}
        <View style={styles.tokenNumberWrap}>
          <Text style={styles.tokenPrefix}>#</Text>
          <Text style={styles.tokenNumber}>{token.number}</Text>
        </View>

        {/* Queue Position & Call Status */}
        {isCalled ? (
          <View style={styles.calledBanner}>
            <Text style={styles.calledTitle}>{t('youAreNext', {room: doctor?.room || 1})}</Text>
          </View>
        ) : isServed ? (
          <View style={styles.servedBanner}>
            <Text style={styles.servedTitle}>{t('served')}</Text>
          </View>
        ) : (
          <View style={styles.positionBlock}>
            <Text style={styles.aheadNumber}>{aheadCount}</Text>
            <Text style={styles.aheadLabel}>{t('yourPosition')}</Text>
          </View>
        )}

        {/* Adaptive ETA Display */}
        {!isCalled && !isServed && (
          <View style={styles.etaContainer}>
            <Text style={styles.etaLabel}>{t('waitRange')}:</Text>
            <Text style={styles.etaValue}>{isPaused ? 'Paused' : waitEstimate}</Text>
            <View style={styles.confidencePill}>
              <Text style={styles.confidenceText}>
                {isPaused ? 'ETA Frozen Honestly' : t('calibrated')}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Patient Action 1: "I'm Being Seen" Crowd Calibration */}
      {!isServed && (
        <View style={[commonStyles.card, styles.actionSection]}>
          <Text style={styles.sectionHeading}>Crowd Calibration</Text>
          <Text style={styles.sectionSubtext}>
            Tap below when your name is called to enter the room. This anonymously sharpens the queue timer for everyone waiting behind you.
          </Text>
          <TouchableOpacity
            style={[
              commonStyles.primaryButton,
              styles.confirmButton,
              confirmedSeen ? styles.buttonSuccess : null,
            ]}
            onPress={handleConfirmSeen}
            disabled={confirmedSeen}
            activeOpacity={0.8}>
            <Text style={commonStyles.primaryButtonText}>
              {confirmedSeen ? t('seenConfirmation') : t('imBeingSeen')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Patient Action 2: Step Out Toggle */}
      {!isCalled && !isServed && (
        <View style={[commonStyles.card, styles.stepOutCard]}>
          <View style={styles.stepOutTop}>
            <View style={{flex: 1}}>
              <Text style={styles.stepOutTitle}>{t('steppingOut')}</Text>
              <Text style={styles.stepOutDesc}>{t('stepOutDesc')}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.stepOutToggle,
                isSteppedOut ? styles.toggleActive : styles.toggleInactive,
              ]}
              onPress={handleToggleStepOut}
              activeOpacity={0.8}>
              <Text style={styles.toggleText}>{isSteppedOut ? 'ON' : 'OFF'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Patient Action 3: Lab Requeue */}
      {!isServed && (
        <TouchableOpacity
          style={[commonStyles.secondaryButton, styles.labButton]}
          onPress={handleLabRequeue}
          activeOpacity={0.8}>
          <Text style={commonStyles.secondaryButtonText}>{t('goingForLab')} / {t('backToQueue')}</Text>
        </TouchableOpacity>
      )}

      {/* Release Token */}
      <TouchableOpacity
        style={styles.releaseButton}
        onPress={handleReleaseToken}
        activeOpacity={0.7}>
        <Text style={styles.releaseText}>Exit / Check Another Token</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  scrollContent: {
    padding: THEME.spacing.lg,
    paddingBottom: 40,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.lg,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: THEME.colors.primary,
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.teal,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.sm,
  },
  clinicName: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  clinicSub: {
    fontSize: 14,
    color: THEME.colors.textMuted,
    fontWeight: '500',
  },
  langToggle: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: THEME.radii.md,
    backgroundColor: THEME.colors.tealBg,
    borderWidth: 1,
    borderColor: THEME.colors.tealLight,
    minHeight: 40,
    justifyContent: 'center',
  },
  langText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.teal,
  },
  switchModePill: {
    backgroundColor: THEME.colors.surfaceSecondary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: THEME.radii.full,
    alignSelf: 'flex-start',
    marginBottom: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  switchModeText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.radii.full,
  },
  statusOnline: {
    backgroundColor: THEME.colors.successBg,
  },
  statusOffline: {
    backgroundColor: THEME.colors.warningBg,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  dotOnline: {
    backgroundColor: THEME.colors.success,
  },
  dotOffline: {
    backgroundColor: THEME.colors.warning,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  actionCard: {
    marginBottom: THEME.spacing.lg,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 4,
  },
  cardHint: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.lg,
    lineHeight: 20,
  },
  inputGroup: {
    gap: THEME.spacing.md,
  },
  textInput: {
    backgroundColor: THEME.colors.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: THEME.colors.borderStrong,
    borderRadius: THEME.radii.md,
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: 12,
    fontSize: 15,
    color: THEME.colors.textPrimary,
    minHeight: 48,
  },
  button: {
    width: '100%',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: THEME.spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: THEME.colors.border,
  },
  dividerText: {
    paddingHorizontal: THEME.spacing.md,
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  demoButton: {
    width: '100%',
  },
  caregiverCard: {
    marginBottom: THEME.spacing.lg,
  },
  caregiverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 44,
  },
  caregiverTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  chevronText: {
    fontSize: 14,
    color: THEME.colors.textMuted,
  },
  caregiverBody: {
    marginTop: THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    paddingTop: THEME.spacing.md,
  },
  caregiverHint: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
  },
  emergencyBanner: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.warningBg,
    borderColor: THEME.colors.warningBorder,
    borderWidth: 1.5,
    borderRadius: THEME.radii.md,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.lg,
    alignItems: 'center',
  },
  emergencyIcon: {
    fontSize: 24,
    marginRight: THEME.spacing.md,
  },
  emergencyContent: {
    flex: 1,
  },
  emergencyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.warning,
  },
  emergencyDesc: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  roomNotice: {
    backgroundColor: THEME.colors.surfaceSecondary,
    paddingVertical: 10,
    paddingHorizontal: THEME.spacing.lg,
    borderRadius: THEME.radii.md,
    marginBottom: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  roomNoticeText: {
    fontSize: 14,
    color: THEME.colors.textPrimary,
    fontWeight: '500',
  },
  roomBold: {
    fontWeight: '700',
    color: THEME.colors.teal,
  },
  heroCard: {
    alignItems: 'center',
    paddingVertical: THEME.spacing.xl,
    marginBottom: THEME.spacing.lg,
    borderColor: THEME.colors.tealLight,
    borderWidth: 2,
  },
  heroCardCalled: {
    borderColor: THEME.colors.success,
    backgroundColor: THEME.colors.successBg,
  },
  heroCardPaused: {
    borderColor: THEME.colors.warning,
  },
  tokenTopRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  tokenLabelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tokenLabelText: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  priorityBadge: {
    backgroundColor: THEME.colors.urgentBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: THEME.radii.sm,
    borderWidth: 1,
    borderColor: THEME.colors.urgentBorder,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.urgent,
  },
  statusBadge: {
    backgroundColor: THEME.colors.tealBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.radii.full,
  },
  statusBadgeCalled: {
    backgroundColor: THEME.colors.success,
  },
  statusBadgeServed: {
    backgroundColor: THEME.colors.surfaceSecondary,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.teal,
  },
  tokenNumberWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: THEME.spacing.sm,
  },
  tokenPrefix: {
    fontSize: 32,
    fontWeight: '700',
    color: THEME.colors.teal,
    marginTop: 8,
    marginRight: 4,
  },
  tokenNumber: {
    fontSize: 68,
    fontWeight: '900',
    color: THEME.colors.primary,
    letterSpacing: -1,
  },
  calledBanner: {
    backgroundColor: THEME.colors.success,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: THEME.radii.md,
    marginTop: THEME.spacing.md,
    width: '100%',
    alignItems: 'center',
  },
  calledTitle: {
    color: THEME.colors.textInverse,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  servedBanner: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: THEME.radii.md,
    marginTop: THEME.spacing.md,
  },
  servedTitle: {
    color: THEME.colors.success,
    fontSize: 18,
    fontWeight: '700',
  },
  positionBlock: {
    alignItems: 'center',
    marginVertical: THEME.spacing.md,
  },
  aheadNumber: {
    fontSize: 36,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  aheadLabel: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
  },
  etaContainer: {
    alignItems: 'center',
    marginTop: THEME.spacing.sm,
    paddingTop: THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    width: '100%',
  },
  etaLabel: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  etaValue: {
    fontSize: 28,
    fontWeight: '800',
    color: THEME.colors.teal,
    marginVertical: 4,
  },
  confidencePill: {
    backgroundColor: THEME.colors.tealBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.radii.full,
    marginTop: 4,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.teal,
  },
  actionSection: {
    marginBottom: THEME.spacing.lg,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 4,
  },
  sectionSubtext: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
    marginBottom: THEME.spacing.md,
  },
  confirmButton: {
    backgroundColor: THEME.colors.primary,
  },
  buttonSuccess: {
    backgroundColor: THEME.colors.success,
  },
  stepOutCard: {
    marginBottom: THEME.spacing.lg,
  },
  stepOutTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepOutTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  stepOutDesc: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  stepOutToggle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: THEME.radii.full,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: THEME.colors.teal,
  },
  toggleInactive: {
    backgroundColor: THEME.colors.borderStrong,
  },
  toggleText: {
    color: THEME.colors.textInverse,
    fontWeight: '700',
    fontSize: 13,
  },
  labButton: {
    marginBottom: THEME.spacing.lg,
  },
  releaseButton: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  releaseText: {
    color: THEME.colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
});
