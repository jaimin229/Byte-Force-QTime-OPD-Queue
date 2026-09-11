import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {t, getLang, setLang, Lang} from '../i18n';
import {fetchClinics, fetchDoctors, fetchBoard, subscribeClinic} from '../queue';
import type {Clinic, Doctor, QueueRow} from '../types';
import {AlertTriangleIcon} from '../components/Icons';

interface KioskScreenProps {
  onExitKiosk?: () => void;
}

export function KioskScreen({onExitKiosk}: KioskScreenProps) {
  const [lang, setLocalLang] = useState<Lang>(getLang());
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [boardRows, setBoardRows] = useState<QueueRow[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  // Clock ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Language auto-rotate every 15 seconds for bilingual waiting hall clarity
  useEffect(() => {
    const rotate = setInterval(() => {
      const nextLang = getLang() === 'en' ? 'hi' : 'en';
      setLang(nextLang);
      setLocalLang(nextLang);
    }, 15000);
    return () => clearInterval(rotate);
  }, []);

  const loadKioskData = useCallback(async () => {
    try {
      const clinics = await fetchClinics();
      if (clinics.length > 0) {
        const c = clinics[0];
        setClinic(c);
        const docs = await fetchDoctors(c.id);
        setDoctors(docs);
        const rows = await fetchBoard(c.id);
        setBoardRows(rows);
      }
    } catch {
      // best-effort refresh
    }
  }, []);

  useEffect(() => {
    loadKioskData();
    const interval = setInterval(loadKioskData, 8000);

    let unsub: {unsubscribe: () => void} | null = null;
    (async () => {
      const clinics = await fetchClinics();
      if (clinics.length > 0) {
        unsub = subscribeClinic(clinics[0].id, () => {
          loadKioskData();
        });
      }
    })();

    return () => {
      clearInterval(interval);
      unsub?.unsubscribe();
    };
  }, [loadKioskData]);

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <View style={styles.brandGroup}>
          <Text style={styles.brandTitle}>{clinic?.hospital || 'DISTRICT HQ HOSPITAL'}</Text>
          <Text style={styles.brandSub}>{clinic?.name || 'OUTPATIENT DEPARTMENT (OPD)'}</Text>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.liveBadge}>
            <View style={styles.pulsingDot} />
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
          <Text style={styles.clockText}>{currentTime}</Text>
          {onExitKiosk && (
            <TouchableOpacity style={styles.exitPill} onPress={onExitKiosk} activeOpacity={0.8}>
              <Text style={styles.exitPillText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Emergency Delay Ticker if Paused */}
      {clinic?.is_paused && (
        <View style={styles.emergencyTicker}>
          <AlertTriangleIcon size={20} color="#F59E0B" />
          <Text style={styles.tickerText}>
            {clinic.pause_reason || t('pausedReason')} — {t('queuePaused')}
          </Text>
        </View>
      )}

      {/* Main Board Grid: Doctor Lanes */}
      <ScrollView contentContainerStyle={styles.boardGrid} showsVerticalScrollIndicator={false}>
        {doctors.map(doc => {
          const docQueue = boardRows.filter(r => r.doctor_id === doc.id);
          const activeServing = docQueue.find(r => r.status === 'called');
          const nextInLine = docQueue
            .filter(r => r.status === 'issued' || r.status === 'requeued')
            .slice(0, 4);

          return (
            <View key={doc.id} style={styles.doctorColumn}>
              {/* Doctor Header */}
              <View style={styles.docHeader}>
                <View>
                  <Text style={styles.docName}>{doc.name}</Text>
                  <Text style={styles.docPace}>
                    {t('avgPace')}: ~{Math.round(doc.avg_consult_secs / 60)} {t('min')}
                  </Text>
                </View>
                <View style={styles.roomBadge}>
                  <Text style={styles.roomLabel}>{t('room')}</Text>
                  <Text style={styles.roomNumber}>{doc.room}</Text>
                </View>
              </View>

              {/* Now Serving Big Box */}
              <View style={styles.nowServingBox}>
                <Text style={styles.nowServingHeader}>{t('nowServing')}</Text>
                {activeServing ? (
                  <View style={styles.servingNumberWrap}>
                    <Text style={styles.servingHash}>#</Text>
                    <Text style={styles.servingNumber}>{activeServing.number}</Text>
                  </View>
                ) : (
                  <Text style={styles.servingIdle}>--</Text>
                )}
                {activeServing && (
                  <Text style={styles.servingPatientName} numberOfLines={1}>
                    {activeServing.display_label}
                  </Text>
                )}
              </View>

              {/* Next In Line Rows */}
              <View style={styles.nextSection}>
                <Text style={styles.nextHeader}>{t('nextUp')}</Text>
                {nextInLine.length === 0 ? (
                  <Text style={styles.emptyQueueNotice}>{t('queueEmpty')}</Text>
                ) : (
                  nextInLine.map((item, idx) => (
                    <View key={item.id} style={styles.nextRow}>
                      <View style={styles.nextLeft}>
                        <Text style={styles.nextIndex}>{idx + 1}.</Text>
                        <Text style={styles.nextNumber}>#{item.number}</Text>
                        <Text style={styles.nextLabel} numberOfLines={1}>
                          {item.display_label}
                        </Text>
                      </View>
                      {item.is_priority ? (
                        <View style={styles.priorityPill}>
                          <Text style={styles.priorityPillText}>PRIORITY</Text>
                        </View>
                      ) : (
                        <Text style={styles.etaEstimate}>
                          ~{(idx + 1) * Math.round(doc.avg_consult_secs / 60)} {t('min')}
                        </Text>
                      )}
                    </View>
                  ))
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Bottom Information Ticker */}
      <View style={styles.bottomBar}>
        <Text style={styles.bottomNotice}>
          {lang === 'en' ? 'Scan QR at counter on your phone to track position & step out safely.' : 'अपने फोन पर क्यूआर स्कैन करें और सुरक्षित रूप से प्रतीक्षा करें।'}
        </Text>
      </View>
    </View>
  );
}

const {width} = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16', // Dark high-contrast cinema slate
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 2,
    borderBottomColor: '#1E293B',
    backgroundColor: '#0F172A',
  },
  brandGroup: {
    flex: 1,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  brandSub: {
    fontSize: 13,
    fontWeight: '700',
    color: '#14B8A6',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(22, 163, 74, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#16A34A',
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
    marginRight: 6,
  },
  liveBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#22C55E',
  },
  clockText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    fontVariant: ['tabular-nums'],
  },
  exitPill: {
    backgroundColor: '#334155',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exitPillText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  emergencyTicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#78350F',
    borderBottomWidth: 1,
    borderBottomColor: '#F59E0B',
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  tickerIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  tickerText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FEF3C7',
  },
  boardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 18,
    gap: 18,
    justifyContent: 'center',
  },
  doctorColumn: {
    backgroundColor: '#131B2E',
    borderRadius: 18,
    padding: 20,
    borderWidth: 2,
    borderColor: '#1E293B',
    minWidth: Math.min(width - 36, 360),
    flex: 1,
  },
  docHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  docName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  docPace: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  roomBadge: {
    backgroundColor: '#0D9488',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
  },
  roomLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#CCFBF1',
  },
  roomNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  nowServingBox: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    paddingVertical: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#16A34A',
    marginBottom: 16,
  },
  nowServingHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#22C55E',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  servingNumberWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 4,
  },
  servingHash: {
    fontSize: 36,
    fontWeight: '700',
    color: '#22C55E',
    marginTop: 8,
    marginRight: 4,
  },
  servingNumber: {
    fontSize: 72,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -2,
  },
  servingIdle: {
    fontSize: 54,
    fontWeight: '700',
    color: '#475569',
    marginVertical: 10,
  },
  servingPatientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#94A3B8',
  },
  nextSection: {
    backgroundColor: '#0B1120',
    borderRadius: 12,
    padding: 14,
  },
  nextHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  emptyQueueNotice: {
    fontSize: 14,
    color: '#475569',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  nextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  nextLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  nextIndex: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '700',
  },
  nextNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  nextLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#CBD5E1',
    flex: 1,
  },
  priorityPill: {
    backgroundColor: '#991B1B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  priorityPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FEE2E2',
  },
  etaEstimate: {
    fontSize: 13,
    fontWeight: '700',
    color: '#14B8A6',
  },
  bottomBar: {
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    alignItems: 'center',
  },
  bottomNotice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E2E8F0',
    textAlign: 'center',
  },
});
