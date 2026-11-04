import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { EventEntry, EventType } from './types';
import { formatClock } from './utils/time';

const CHANNEL_ID = 'running-events';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function setupNotifications() {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Événements en cours',
        importance: Notifications.AndroidImportance.LOW,
      });
    }
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) await Notifications.requestPermissionsAsync();
  } catch {
    // notifications are best-effort
  }
}

const idFor = (eventId: number) => `running-${eventId}`;

export async function showRunning(event: EventEntry, type: EventType) {
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: idFor(event.id),
      content: {
        title: `${type.label} en cours`,
        body: `Commencé à ${formatClock(event.startedAt)}`,
        sticky: true,
        autoDismiss: false,
      } as Notifications.NotificationContentInput,
      trigger: Platform.OS === 'android' ? { channelId: CHANNEL_ID } : null,
    });
  } catch {}
}

export async function clearRunning(eventId: number) {
  try {
    await Notifications.dismissNotificationAsync(idFor(eventId));
  } catch {}
}

// Re-post notifications for events still running (e.g. after app restart)
export async function syncRunning(events: EventEntry[], types: EventType[]) {
  try {
    const shown = new Set((await Notifications.getPresentedNotificationsAsync()).map((n) => n.request.identifier));
    for (const e of events) {
      if (e.endedAt !== null || shown.has(idFor(e.id))) continue;
      const type = types.find((t) => t.id === e.typeId);
      if (type) await showRunning(e, type);
    }
  } catch {}
}
