import {Platform, PermissionsAndroid} from 'react-native';
import notifee, {AndroidImportance} from '@notifee/react-native';

const CHANNEL = 'qtime-alerts';

let ready = false;

export async function ensureNotify(): Promise<boolean> {
  try {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) return false;
    }
    if (!ready) {
      await notifee.createChannel({
        id: CHANNEL,
        name: 'QTime queue alerts',
        importance: AndroidImportance.HIGH,
        vibration: true,
      });
      ready = true;
    }
    const settings = await notifee.getNotificationSettings();
    return settings.authorizationStatus >= 1;
  } catch {
    return false;
  }
}

async function buzz(id: string, title: string, body: string) {
  const ok = await ensureNotify();
  if (!ok) return;
  await notifee.displayNotification({
    id,
    title,
    body,
    android: {channelId: CHANNEL, pressAction: {id: 'open'}, vibrationPattern: [300, 500, 300]},
  });
}

export const buzzComeBack = (n: number) =>
  buzz('comeback', 'QTime: your turn is close', `Only ${n} patients ahead — head back to the hall.`);
export const buzzCalled = () =>
  buzz('called', 'QTime: you are being called', 'Go in — the doctor is ready for you.');
export const buzzRoom = (room: number) =>
  buzz('room', 'QTime: room changed', `Your doctor moved to Room ${room}.`);
export const buzzPaused = (reason: string) =>
  buzz('paused', 'QTime: queue paused', reason || 'Queue paused — ETA frozen.');
export const buzzResumed = () =>
  buzz('resumed', 'QTime: queue resumed', 'Waiting estimates are updating again.');
