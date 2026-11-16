import { Platform, Vibration } from 'react-native';

// Safe dynamic loader to prevent Metro / Expo Go crash on iOS
let Notifications: any = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Notifications = require('expo-notifications');
  if (Notifications && Notifications.setNotificationHandler) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }
} catch (e) {
  // Silently fallback on platforms or Expo Go builds where native notifications are restricted
  Notifications = null;
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web' || !Notifications) return false;
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } catch (error) {
    return false;
  }
}

export async function triggerJobNotification(techName: string, customerName: string, device: string, district: string) {
  // Cihazda titreşim ile fiziksel uyarı ver
  try {
    Vibration.vibrate(Platform.OS === 'android' ? 500 : [0, 400]);
  } catch (e) {
    // ignore
  }

  // Cihaz bildirim servisi varsa yerel bildirim fırlat
  if (Notifications && Notifications.scheduleNotificationAsync) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔔 Yeni Servis İşi Atandı!',
          body: `${customerName} - ${device} (${district}) arızası için göreve atandınız.`,
          data: { customerName, device, district, techName },
          sound: true,
        },
        trigger: null,
      });
    } catch (error) {
      console.warn('Native notification trigger skipped:', error);
    }
  }
}
