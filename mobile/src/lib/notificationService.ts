import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    }),
  });
} catch (e) {
  console.log('Notification handler init error:', e);
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } catch (error) {
    console.warn('Notification permission error:', error);
    return false;
  }
}

export async function triggerJobNotification(techName: string, customerName: string, device: string, district: string) {
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
    console.warn('Could not schedule notification:', error);
  }
}
