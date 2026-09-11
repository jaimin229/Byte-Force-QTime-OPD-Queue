import React, {useState, useEffect} from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import {THEME} from './src/theme';
import {t, getLang, initLang, Lang} from './src/i18n';
import {restoreSession} from './src/offline';
import {ErrorBoundary} from './src/components/ErrorBoundary';
import {PatientScreen} from './src/screens/PatientScreen';
import {StaffScreen} from './src/screens/StaffScreen';
import {KioskScreen} from './src/screens/KioskScreen';

type AppTab = 'patient' | 'staff' | 'kiosk';

function MainApp(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const [activeTab, setActiveTab] = useState<AppTab>('patient');
  const [, setLocalLang] = useState<Lang>('en');

  // Initialize language & session on mount
  useEffect(() => {
    (async () => {
      const savedLang = await initLang();
      setLocalLang(savedLang);
      await restoreSession();
    })();
  }, []);

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        activeTab === 'kiosk' ? styles.kioskBg : {backgroundColor: THEME.colors.background},
      ]}>
      <StatusBar
        barStyle={activeTab === 'kiosk' || isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={activeTab === 'kiosk' ? '#090D16' : THEME.colors.surface}
      />

      {/* Screen Body */}
      <View style={styles.body}>
        {activeTab === 'patient' && (
          <PatientScreen
            onSwitchMode={() => setActiveTab('staff')}
            onLanguageChange={() => setLocalLang(getLang())}
          />
        )}
        {activeTab === 'staff' && (
          <StaffScreen
            onSwitchMode={() => setActiveTab('kiosk')}
            onLanguageChange={() => setLocalLang(getLang())}
          />
        )}
        {activeTab === 'kiosk' && (
          <KioskScreen onExitKiosk={() => setActiveTab('patient')} />
        )}
      </View>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'patient' ? styles.navItemActive : null]}
          onPress={() => setActiveTab('patient')}
          activeOpacity={0.8}>
          <Text style={styles.navIcon}>📱</Text>
          <Text style={[styles.navText, activeTab === 'patient' ? styles.navTextActive : null]}>
            {t('iAmPatient')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'staff' ? styles.navItemActive : null]}
          onPress={() => setActiveTab('staff')}
          activeOpacity={0.8}>
          <Text style={styles.navIcon}>👨‍⚕️</Text>
          <Text style={[styles.navText, activeTab === 'staff' ? styles.navTextActive : null]}>
            {t('iAmStaff')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'kiosk' ? styles.navItemActive : null]}
          onPress={() => setActiveTab('kiosk')}
          activeOpacity={0.8}>
          <Text style={styles.navIcon}>📺</Text>
          <Text style={[styles.navText, activeTab === 'kiosk' ? styles.navTextActive : null]}>
            {t('waitingHallKiosk')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default function App(): React.JSX.Element {
  return (
    <ErrorBoundary fallbackTitle="QTime Live OPD Queue">
      <MainApp />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  kioskBg: {
    backgroundColor: '#090D16',
  },
  body: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.surface,
    borderTopWidth: 1.5,
    borderTopColor: THEME.colors.border,
    paddingVertical: 8,
    paddingHorizontal: 12,
    justifyContent: 'space-around',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: THEME.radii.md,
    minHeight: 48,
    flex: 1,
  },
  navItemActive: {
    backgroundColor: THEME.colors.tealBg,
  },
  navIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  navText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  navTextActive: {
    color: THEME.colors.teal,
    fontWeight: '800',
  },
});
