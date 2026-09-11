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
  Modal,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import {THEME, commonStyles} from '../theme';
import {t, getLang, setLang, Lang} from '../i18n';
import {
  fetchClinics,
  fetchDoctors,
  fetchQueue,
  issueToken,
  transitionToken,
  setPaused,
  setRoom,
  broadcastNotice,
  subscribeTokens,
  staffSignIn,
  joinClinic,
  signOut,
  myClinicId,
} from '../queue';
import {makeClaimPayload} from '../types';
import {AlertTriangleIcon} from '../components/Icons';
import type {Clinic, Doctor, QueueRow, TokenSource, Token} from '../types';

interface StaffScreenProps {
  onSwitchMode?: () => void;
  onLanguageChange?: () => void;
}

export function StaffScreen({onSwitchMode, onLanguageChange}: StaffScreenProps) {
  const [lang, setLocalLang] = useState<Lang>(getLang());
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [emailInput, setEmailInput] = useState('opd.staff@district-hospital.org');
  const [passwordInput, setPasswordInput] = useState('HospitalStaff2026!');
  const [currentClinic, setCurrentClinic] = useState<Clinic | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [queue, setQueue] = useState<QueueRow[]>([]);

  // Action Modals
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [issuedResult, setIssuedResult] = useState<{token: Token; claimCode: string} | null>(null);

  // Form Inputs
  const [patientLabel, setPatientLabel] = useState('');
  const [tokenSource, setTokenSource] = useState<TokenSource>('walk_in');
  const [isPriority, setIsPriority] = useState(false);
  const [priorityReason, setPriorityReason] = useState('');
  const [pauseReasonInput, setPauseReasonInput] = useState('');
  const [newRoomInput, setNewRoomInput] = useState('');
  const [broadcastInput, setBroadcastInput] = useState('');

  const toggleLanguage = () => {
    const next: Lang = lang === 'en' ? 'hi' : 'en';
    setLang(next);
    setLocalLang(next);
    onLanguageChange?.();
  };

  // Initial load: check session & clinic
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const clList = await fetchClinics();
        if (clList.length > 0) {
          setCurrentClinic(clList[0]);
          const docList = await fetchDoctors(clList[0].id);
          setDoctors(docList);
          if (docList.length > 0) {
            setSelectedDoctor(docList[0]);
          }
        }
        const cid = await myClinicId();
        if (cid) {
          setIsAuthenticated(true);
        }
      } catch (err: unknown) {
        Alert.alert(t('error'), (err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSignIn = async () => {
    if (!emailInput.trim() || !passwordInput.trim()) {
      Alert.alert(t('error'), 'Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      await staffSignIn(emailInput.trim(), passwordInput.trim());
      if (currentClinic) {
        await joinClinic(currentClinic.staff_join_code);
      }
      setIsAuthenticated(true);
    } catch (err: unknown) {
      Alert.alert(t('error'), (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async () => {
    setLoading(true);
    try {
      await staffSignIn('opd.staff@district-hospital.org', 'HospitalStaff2026!');
      const clList = await fetchClinics();
      if (clList.length > 0) {
        await joinClinic(clList[0].staff_join_code);
        setCurrentClinic(clList[0]);
        const docList = await fetchDoctors(clList[0].id);
        setDoctors(docList);
        if (docList.length > 0) {
          setSelectedDoctor(docList[0]);
        }
      }
      setIsAuthenticated(true);
    } catch (e: unknown) {
      Alert.alert(t('error'), (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setIsAuthenticated(false);
  };

  const loadQueue = useCallback(async (docId: string) => {
    try {
      const q = await fetchQueue(docId);
      setQueue(q);
    } catch {
      // queue fetch error handling
    }
  }, []);

  // Update queue when selected doctor changes
  useEffect(() => {
    if (!selectedDoctor || !isAuthenticated) return;
    loadQueue(selectedDoctor.id);

    const sub = subscribeTokens(selectedDoctor.id, () => {
      loadQueue(selectedDoctor.id);
    });

    return () => {
      sub.unsubscribe();
    };
  }, [selectedDoctor, isAuthenticated, loadQueue]);

  // Handle Calling Next Patient
  const handleCallNext = async (tokenRow: QueueRow) => {
    setLoading(true);
    try {
      await transitionToken(tokenRow, 'called', 'called');
      if (selectedDoctor) {
        await loadQueue(selectedDoctor.id);
      }
    } catch (err: unknown) {
      Alert.alert(t('error'), (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Mark Served
  const handleMarkServed = async (tokenRow: QueueRow) => {
    setLoading(true);
    try {
      await transitionToken(tokenRow, 'served', 'served');
      if (selectedDoctor) {
        await loadQueue(selectedDoctor.id);
        // Refresh doctor consult stats
        if (currentClinic) {
          const docList = await fetchDoctors(currentClinic.id);
          setDoctors(docList);
          const updatedDoc = docList.find(d => d.id === selectedDoctor.id);
          if (updatedDoc) setSelectedDoctor(updatedDoc);
        }
      }
    } catch (err: unknown) {
      Alert.alert(t('error'), (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Skip
  const handleSkip = async (tokenRow: QueueRow) => {
    setLoading(true);
    try {
      await transitionToken(tokenRow, 'skipped', 'skipped');
      if (selectedDoctor) {
        await loadQueue(selectedDoctor.id);
      }
    } catch (err: unknown) {
      Alert.alert(t('error'), (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Token Issuance
  const handleIssueSubmit = async () => {
    if (!currentClinic || !selectedDoctor) return;
    setLoading(true);
    try {
      const result = await issueToken({
        clinicId: currentClinic.id,
        doctorId: selectedDoctor.id,
        source: tokenSource,
        isPriority,
        reason: priorityReason,
        label: patientLabel.trim() || 'Patient',
      });
      setIssuedResult(result);
      setPatientLabel('');
      setIsPriority(false);
      setPriorityReason('');
      await loadQueue(selectedDoctor.id);
    } catch (err: unknown) {
      Alert.alert(t('error'), (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Clinic Pause / Resume
  const handleTogglePause = async () => {
    if (!currentClinic) return;
    setLoading(true);
    try {
      const willPause = !currentClinic.is_paused;
      await setPaused(currentClinic.id, willPause, pauseReasonInput.trim());
      setCurrentClinic({
        ...currentClinic,
        is_paused: willPause,
        pause_reason: willPause ? pauseReasonInput.trim() : null,
      });
      setShowPauseModal(false);
      setPauseReasonInput('');
    } catch (err: unknown) {
      Alert.alert(t('error'), (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Room Change
  const handleSetRoomSubmit = async () => {
    if (!selectedDoctor || !currentClinic) return;
    const rm = parseInt(newRoomInput, 10);
    if (isNaN(rm) || rm <= 0) {
      Alert.alert(t('error'), 'Enter a valid room number');
      return;
    }
    setLoading(true);
    try {
      await setRoom(selectedDoctor.id, currentClinic.id, rm);
      setSelectedDoctor({...selectedDoctor, room: rm});
      setShowRoomModal(false);
      setNewRoomInput('');
    } catch (err: unknown) {
      Alert.alert(t('error'), (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Broadcast Notice
  const handleBroadcastSubmit = async () => {
    if (!currentClinic || !broadcastInput.trim()) return;
    setLoading(true);
    try {
      await broadcastNotice(currentClinic.id, broadcastInput.trim());
      setShowNoticeModal(false);
      setBroadcastInput('');
      Alert.alert('QTime', 'Notice broadcasted to all waiting patients & kiosk.');
    } catch (err: unknown) {
      Alert.alert(t('error'), (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const currentlyCalled = queue.find(q => q.status === 'called');
  const waitingList = queue.filter(q => q.status === 'issued' || q.status === 'requeued');
  const avgMins = selectedDoctor ? Math.round(selectedDoctor.avg_consult_secs / 60) : 7;

  if (!isAuthenticated) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.clinicTitle}>{t('staffSignIn')}</Text>
            <Text style={styles.clinicSub}>{currentClinic?.hospital || 'District Hospital'}</Text>
          </View>
          <View style={styles.headerControls}>
            <TouchableOpacity style={styles.langToggle} onPress={toggleLanguage} activeOpacity={0.8}>
              <Text style={styles.langText}>{t('lang')}</Text>
            </TouchableOpacity>
            {onSwitchMode && (
              <TouchableOpacity style={styles.switchPill} onPress={onSwitchMode} activeOpacity={0.8}>
                <Text style={styles.switchPillText}>{t('waitingHallKiosk')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={[commonStyles.card, {marginTop: THEME.spacing.lg}]}>
          <Text style={styles.modalTitle}>{t('staffSignIn')}</Text>
          <Text style={styles.modalSubtitle}>
            Sign in to call next patients, manage doctor consultation lanes, and issue tokens.
          </Text>

          <Text style={styles.inputLabel}>{t('email')}</Text>
          <TextInput
            style={styles.modalInput}
            value={emailInput}
            onChangeText={setEmailInput}
            autoCapitalize="none"
            placeholder="staff@district-hospital.org"
            placeholderTextColor={THEME.colors.textMuted}
          />

          <Text style={[styles.inputLabel, {marginTop: THEME.spacing.md}]}>{t('password')}</Text>
          <TextInput
            style={styles.modalInput}
            value={passwordInput}
            onChangeText={setPasswordInput}
            secureTextEntry
            placeholder="Password"
            placeholderTextColor={THEME.colors.textMuted}
          />

          <TouchableOpacity
            style={[commonStyles.primaryButton, {marginTop: THEME.spacing.lg}]}
            onPress={handleSignIn}
            disabled={loading}
            activeOpacity={0.8}>
            {loading ? (
              <ActivityIndicator color={THEME.colors.textInverse} />
            ) : (
              <Text style={commonStyles.primaryButtonText}>{t('signIn')}</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR QUICK DEMO ACCESS</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[commonStyles.secondaryButton, {borderColor: THEME.colors.teal}]}
            onPress={handleQuickDemoLogin}
            disabled={loading}
            activeOpacity={0.8}>
            <Text style={[commonStyles.secondaryButtonText, {color: THEME.colors.teal}]}>
              1-Tap Quick Staff Demo Login
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header Bar */}
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.clinicTitle}>{currentClinic?.hospital || 'District Hospital'}</Text>
          <Text style={styles.clinicSub}>{currentClinic?.name || 'Staff OPD Console'}</Text>
        </View>
        <View style={styles.headerControls}>
          <TouchableOpacity style={styles.langToggle} onPress={toggleLanguage} activeOpacity={0.8}>
            <Text style={styles.langText}>{t('lang')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.signOutPill} onPress={handleSignOut} activeOpacity={0.8}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
          {onSwitchMode && (
            <TouchableOpacity style={styles.switchPill} onPress={onSwitchMode} activeOpacity={0.8}>
              <Text style={styles.switchPillText}>{t('waitingHallKiosk')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Doctor Lane Selector */}
      <View style={styles.doctorSelectorWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.doctorTabs}>
          {doctors.map(doc => {
            const isSelected = selectedDoctor?.id === doc.id;
            return (
              <TouchableOpacity
                key={doc.id}
                style={[styles.doctorTab, isSelected ? styles.doctorTabSelected : null]}
                onPress={() => setSelectedDoctor(doc)}
                activeOpacity={0.8}>
                <Text style={[styles.docTabName, isSelected ? styles.docTabNameSelected : null]}>
                  {doc.name}
                </Text>
                <Text style={[styles.docTabRoom, isSelected ? styles.docTabRoomSelected : null]}>
                  {t('room')} {doc.room}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Quick Action Toolbar */}
      <View style={styles.actionToolbar}>
        <TouchableOpacity
          style={[commonStyles.primaryButton, styles.toolButton]}
          onPress={() => {
            setIssuedResult(null);
            setShowIssueModal(true);
          }}
          activeOpacity={0.8}>
          <Text style={commonStyles.primaryButtonText}>+ {t('issueToken')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.pauseToolButton,
            currentClinic?.is_paused ? styles.resumeButton : null,
          ]}
          onPress={() => {
            if (currentClinic?.is_paused) {
              handleTogglePause();
            } else {
              setShowPauseModal(true);
            }
          }}
          activeOpacity={0.8}>
          <Text style={styles.pauseToolText}>
            {currentClinic?.is_paused ? t('resume') : t('pause')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryToolButton}
          onPress={() => setShowNoticeModal(true)}
          activeOpacity={0.8}>
          <Text style={styles.secondaryToolText}>{t('sendNotice')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryToolButton}
          onPress={() => setShowRoomModal(true)}
          activeOpacity={0.8}>
          <Text style={styles.secondaryToolText}>{t('changeRoom')}</Text>
        </TouchableOpacity>
      </View>

      {/* Emergency Notice Banner if Paused */}
      {currentClinic?.is_paused && (
        <View style={styles.alertBanner}>
          <AlertTriangleIcon size={18} color={THEME.colors.warning} />
          <View style={{flex: 1}}>
            <Text style={styles.alertTitle}>{t('queuePaused')}</Text>
            <Text style={styles.alertSubtitle}>
              {currentClinic.pause_reason || t('pausedReason')}
            </Text>
          </View>
        </View>
      )}

      {/* Doctor Operational Stats */}
      <View style={[commonStyles.card, styles.statsRow]}>
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>{t('nowServing')}</Text>
          <Text style={styles.statValue}>
            {currentlyCalled ? `#${currentlyCalled.number}` : 'None'}
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>{t('activeTokens')}</Text>
          <Text style={styles.statValue}>{waitingList.length}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>{t('avgPace')}</Text>
          <Text style={styles.statValue}>~{avgMins} {t('min')}</Text>
        </View>
      </View>

      {/* NOW SERVING CARD */}
      {currentlyCalled ? (
        <View style={[commonStyles.card, styles.nowServingCard]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.liveIndicator}>
              <View style={styles.pulsingDot} />
              <Text style={styles.liveText}>{t('nowServing')}</Text>
            </View>
            <Text style={styles.doctorRoomBadge}>
              {t('room')} {selectedDoctor?.room}
            </Text>
          </View>

          <View style={styles.servingTokenWrap}>
            <Text style={styles.servingNumber}>#{currentlyCalled.number}</Text>
            <View>
              <Text style={styles.servingLabel}>{currentlyCalled.display_label}</Text>
              <Text style={styles.servingSource}>{currentlyCalled.source.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.servingActions}>
            <TouchableOpacity
              style={[commonStyles.primaryButton, styles.serveButton]}
              onPress={() => handleMarkServed(currentlyCalled)}
              disabled={loading}
              activeOpacity={0.8}>
              <Text style={commonStyles.primaryButtonText}>{t('serve')} (Complete)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[commonStyles.secondaryButton, styles.skipButton]}
              onPress={() => handleSkip(currentlyCalled)}
              disabled={loading}
              activeOpacity={0.8}>
              <Text style={styles.skipButtonText}>{t('skip')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={[commonStyles.card, styles.emptyServingCard]}>
          <Text style={styles.emptyServingText}>No patient currently in consultation.</Text>
          {waitingList.length > 0 && (
            <TouchableOpacity
              style={[commonStyles.primaryButton, {marginTop: THEME.spacing.md}]}
              onPress={() => handleCallNext(waitingList[0])}
              disabled={loading}
              activeOpacity={0.8}>
              <Text style={commonStyles.primaryButtonText}>
                {t('call')} Next Patient (#{waitingList[0].number})
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* WAITING LIST */}
      <View style={styles.listHeaderRow}>
        <Text style={styles.listTitle}>{t('nextUp')} ({waitingList.length})</Text>
      </View>

      {waitingList.length === 0 ? (
        <View style={[commonStyles.card, styles.emptyCard]}>
          <Text style={styles.emptyText}>{t('queueEmpty')}</Text>
        </View>
      ) : (
        waitingList.map((item, idx) => (
          <View key={item.id} style={[commonStyles.card, styles.queueItemCard]}>
            <View style={styles.itemLeft}>
              <Text style={styles.itemPosition}>{idx + 1}</Text>
              <View>
                <View style={styles.itemTitleRow}>
                  <Text style={styles.itemNumber}>#{item.number}</Text>
                  <Text style={styles.itemName}>{item.display_label}</Text>
                  {item.is_priority && (
                    <View style={styles.urgentTag}>
                      <Text style={styles.urgentTagText}>PRIORITY</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.itemMeta}>
                  {item.source} · {item.stepped_out ? 'Stepped out' : 'Waiting in hall'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.itemCallButton}
              onPress={() => handleCallNext(item)}
              disabled={loading}
              activeOpacity={0.8}>
              <Text style={styles.itemCallText}>{t('call')}</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      {/* ISSUE TOKEN MODAL */}
      <Modal visible={showIssueModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('issueToken')}</Text>

            {issuedResult ? (
              <View style={styles.issuedResultContent}>
                <Text style={styles.issuedSuccessTitle}>Token #{issuedResult.token.number} Issued</Text>
                <View style={styles.qrContainer}>
                  <QRCode
                    value={makeClaimPayload(issuedResult.token.id, issuedResult.claimCode)}
                    size={180}
                  />
                </View>
                <Text style={styles.claimCodeDisplay}>
                  Claim Code: <Text style={{fontWeight: '800'}}>{issuedResult.claimCode.slice(0, 8)}</Text>
                </Text>
                <Text style={styles.qrHelp}>{t('showQR')}</Text>
                <TouchableOpacity
                  style={[commonStyles.primaryButton, {marginTop: THEME.spacing.lg, width: '100%'}]}
                  onPress={() => {
                    setShowIssueModal(false);
                    setIssuedResult(null);
                  }}>
                  <Text style={commonStyles.primaryButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.modalForm}>
                <Text style={styles.inputLabel}>{t('patientName')}</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Ramesh Kumar"
                  placeholderTextColor={THEME.colors.textMuted}
                  value={patientLabel}
                  onChangeText={setPatientLabel}
                />

                <Text style={styles.inputLabel}>Patient Category</Text>
                <View style={styles.sourcePills}>
                  {(['walk_in', 'appointment', 'referral', 'follow_up', 'diagnostic'] as TokenSource[]).map(src => (
                    <TouchableOpacity
                      key={src}
                      style={[styles.sourcePill, tokenSource === src ? styles.sourcePillActive : null]}
                      onPress={() => setTokenSource(src)}>
                      <Text style={[styles.sourcePillText, tokenSource === src ? styles.sourcePillTextActive : null]}>
                        {src.replace('_', ' ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.priorityCheckRow}
                  onPress={() => setIsPriority(!isPriority)}
                  activeOpacity={0.8}>
                  <View style={[styles.checkbox, isPriority ? styles.checkboxActive : null]} />
                  <Text style={styles.priorityCheckLabel}>{t('priority')}</Text>
                </TouchableOpacity>

                {isPriority && (
                  <TextInput
                    style={[styles.modalInput, {marginTop: THEME.spacing.sm}]}
                    placeholder={t('priorityWhy')}
                    placeholderTextColor={THEME.colors.textMuted}
                    value={priorityReason}
                    onChangeText={setPriorityReason}
                  />
                )}

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[commonStyles.secondaryButton, {flex: 1}]}
                    onPress={() => setShowIssueModal(false)}>
                    <Text style={commonStyles.secondaryButtonText}>{t('close')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[commonStyles.primaryButton, {flex: 1}]}
                    onPress={handleIssueSubmit}
                    disabled={loading}>
                    {loading ? (
                      <ActivityIndicator color={THEME.colors.textInverse} />
                    ) : (
                      <Text style={commonStyles.primaryButtonText}>{t('issueToken')}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* PAUSE MODAL */}
      <Modal visible={showPauseModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('pause')}</Text>
            <Text style={styles.modalSubtitle}>{t('pauseReason')}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Doctor called to ICU emergency"
              placeholderTextColor={THEME.colors.textMuted}
              value={pauseReasonInput}
              onChangeText={setPauseReasonInput}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[commonStyles.secondaryButton, {flex: 1}]}
                onPress={() => setShowPauseModal(false)}>
                <Text style={commonStyles.secondaryButtonText}>{t('close')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pauseSubmitButton, {flex: 1}]}
                onPress={handleTogglePause}
                disabled={loading}>
                <Text style={styles.pauseSubmitText}>{t('pause')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ROOM MODAL */}
      <Modal visible={showRoomModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('changeRoom')}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="New Room # (e.g. 5)"
              placeholderTextColor={THEME.colors.textMuted}
              keyboardType="numeric"
              value={newRoomInput}
              onChangeText={setNewRoomInput}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[commonStyles.secondaryButton, {flex: 1}]}
                onPress={() => setShowRoomModal(false)}>
                <Text style={commonStyles.secondaryButtonText}>{t('close')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[commonStyles.primaryButton, {flex: 1}]}
                onPress={handleSetRoomSubmit}
                disabled={loading}>
                <Text style={commonStyles.primaryButtonText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* NOTICE MODAL */}
      <Modal visible={showNoticeModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('sendNotice')}</Text>
            <Text style={styles.modalSubtitle}>{t('noticeText')}</Text>
            <TextInput
              style={[styles.modalInput, {height: 80, textAlignVertical: 'top'}]}
              placeholder="e.g. OPD running ~15 min behind due to heavy diagnostic load."
              placeholderTextColor={THEME.colors.textMuted}
              multiline
              value={broadcastInput}
              onChangeText={setBroadcastInput}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[commonStyles.secondaryButton, {flex: 1}]}
                onPress={() => setShowNoticeModal(false)}>
                <Text style={commonStyles.secondaryButtonText}>{t('close')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[commonStyles.primaryButton, {flex: 1}]}
                onPress={handleBroadcastSubmit}
                disabled={loading}>
                <Text style={commonStyles.primaryButtonText}>{t('send')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
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
    marginBottom: THEME.spacing.md,
  },
  clinicTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  clinicSub: {
    fontSize: 14,
    color: THEME.colors.textMuted,
    fontWeight: '500',
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.sm,
  },
  langToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radii.md,
    backgroundColor: THEME.colors.tealBg,
    borderWidth: 1,
    borderColor: THEME.colors.tealLight,
  },
  langText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.teal,
  },
  switchPill: {
    backgroundColor: THEME.colors.surfaceSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radii.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  switchPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  doctorSelectorWrap: {
    marginBottom: THEME.spacing.md,
  },
  doctorTabs: {
    gap: THEME.spacing.sm,
    paddingVertical: 4,
  },
  doctorTab: {
    backgroundColor: THEME.colors.surface,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: THEME.radii.md,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
  },
  doctorTabSelected: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  docTabName: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  docTabNameSelected: {
    color: THEME.colors.textInverse,
  },
  docTabRoom: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  docTabRoomSelected: {
    color: THEME.colors.tealLight,
  },
  actionToolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: THEME.spacing.sm,
    marginBottom: THEME.spacing.lg,
  },
  toolButton: {
    flex: 1,
    minWidth: 120,
  },
  pauseToolButton: {
    backgroundColor: THEME.colors.warningBg,
    borderWidth: 1.5,
    borderColor: THEME.colors.warningBorder,
    borderRadius: THEME.radii.md,
    paddingHorizontal: 14,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumeButton: {
    backgroundColor: THEME.colors.successBg,
    borderColor: THEME.colors.successBorder,
  },
  pauseToolText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.warning,
  },
  secondaryToolButton: {
    backgroundColor: THEME.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: THEME.colors.borderStrong,
    borderRadius: THEME.radii.md,
    paddingHorizontal: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryToolText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  alertBanner: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.warningBg,
    borderColor: THEME.colors.warningBorder,
    borderWidth: 1.5,
    borderRadius: THEME.radii.md,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.lg,
    alignItems: 'center',
  },
  alertIcon: {
    fontSize: 22,
    marginRight: THEME.spacing.md,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.warning,
  },
  alertSubtitle: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: THEME.spacing.md,
    marginBottom: THEME.spacing.lg,
  },
  statCol: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.primary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: THEME.colors.border,
  },
  nowServingCard: {
    borderColor: THEME.colors.success,
    borderWidth: 2,
    backgroundColor: THEME.colors.surface,
    marginBottom: THEME.spacing.lg,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.success,
    marginRight: 6,
  },
  liveText: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.success,
    letterSpacing: 0.5,
  },
  doctorRoomBadge: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    backgroundColor: THEME.colors.surfaceSecondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.radii.sm,
  },
  servingTokenWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.lg,
    marginVertical: THEME.spacing.sm,
  },
  servingNumber: {
    fontSize: 52,
    fontWeight: '900',
    color: THEME.colors.primary,
  },
  servingLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  servingSource: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.teal,
    marginTop: 2,
  },
  servingActions: {
    flexDirection: 'row',
    gap: THEME.spacing.md,
    marginTop: THEME.spacing.lg,
  },
  serveButton: {
    flex: 2,
    backgroundColor: THEME.colors.success,
  },
  skipButton: {
    flex: 1,
  },
  skipButtonText: {
    color: THEME.colors.urgent,
    fontWeight: '700',
    fontSize: 14,
  },
  emptyServingCard: {
    alignItems: 'center',
    paddingVertical: THEME.spacing.xl,
    marginBottom: THEME.spacing.lg,
  },
  emptyServingText: {
    fontSize: 15,
    color: THEME.colors.textMuted,
    fontWeight: '500',
  },
  listHeaderRow: {
    marginBottom: THEME.spacing.md,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: THEME.spacing.xl,
  },
  emptyText: {
    fontSize: 15,
    color: THEME.colors.textMuted,
  },
  queueItemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: THEME.spacing.md,
    marginBottom: THEME.spacing.sm,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.md,
    flex: 1,
  },
  itemPosition: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    width: 24,
    textAlign: 'center',
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  urgentTag: {
    backgroundColor: THEME.colors.urgentBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: THEME.radii.sm,
  },
  urgentTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.urgent,
  },
  itemMeta: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  itemCallButton: {
    backgroundColor: THEME.colors.teal,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: THEME.radii.md,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemCallText: {
    color: THEME.colors.textInverse,
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.lg,
  },
  modalCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radii.xl,
    padding: THEME.spacing.xl,
    width: '100%',
    maxWidth: 420,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginBottom: THEME.spacing.xs,
  },
  modalSubtitle: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.md,
  },
  modalForm: {
    gap: THEME.spacing.md,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  modalInput: {
    backgroundColor: THEME.colors.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: THEME.colors.borderStrong,
    borderRadius: THEME.radii.md,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    color: THEME.colors.textPrimary,
  },
  sourcePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  sourcePill: {
    backgroundColor: THEME.colors.surfaceSecondary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.radii.full,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  sourcePillActive: {
    backgroundColor: THEME.colors.teal,
    borderColor: THEME.colors.teal,
  },
  sourcePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
    textTransform: 'capitalize',
  },
  sourcePillTextActive: {
    color: THEME.colors.textInverse,
  },
  priorityCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: THEME.colors.borderStrong,
  },
  checkboxActive: {
    backgroundColor: THEME.colors.urgent,
    borderColor: THEME.colors.urgent,
  },
  priorityCheckLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.urgent,
  },
  modalActions: {
    flexDirection: 'row',
    gap: THEME.spacing.md,
    marginTop: THEME.spacing.md,
  },
  issuedResultContent: {
    alignItems: 'center',
    paddingVertical: THEME.spacing.md,
  },
  issuedSuccessTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.success,
    marginBottom: THEME.spacing.md,
  },
  qrContainer: {
    padding: THEME.spacing.lg,
    backgroundColor: '#FFFFFF',
    borderRadius: THEME.radii.lg,
    borderWidth: 2,
    borderColor: THEME.colors.border,
  },
  claimCodeDisplay: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.md,
  },
  qrHelp: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 4,
  },
  pauseSubmitButton: {
    backgroundColor: THEME.colors.warning,
    minHeight: 48,
    borderRadius: THEME.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseSubmitText: {
    color: THEME.colors.textInverse,
    fontSize: 15,
    fontWeight: '700',
  },
  signOutPill: {
    backgroundColor: THEME.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: THEME.colors.borderStrong,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.radii.md,
  },
  signOutText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
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
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
});
