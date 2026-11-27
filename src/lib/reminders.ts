import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/** Spaced repetition: revise a finished chapter after 3, 7 and 21 days. */
export const REVISION_DAYS = [3, 7, 21];

let ready: Promise<boolean> | null = null;

function setup(): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(false);
  ready ??= (async () => {
    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
      });
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('revision', { name: 'Revision reminders', importance: Notifications.AndroidImportance.DEFAULT });
      }
      const p = await Notifications.requestPermissionsAsync();
      return p.granted;
    } catch {
      return false;
    }
  })();
  return ready;
}

/** Schedules the 3/7/21-day reminders for a chapter at 6 pm. Returns notification ids (empty if not allowed). */
export async function scheduleRevision(chapterName: string, subject: string): Promise<string[]> {
  if (!(await setup())) return [];
  const ids: string[] = [];
  for (const d of REVISION_DAYS) {
    const at = new Date();
    at.setDate(at.getDate() + d);
    at.setHours(18, 0, 0, 0);
    try {
      ids.push(
        await Notifications.scheduleNotificationAsync({
          content: { title: `PIP: time to revise ${chapterName} 🔁`, body: `${subject} · Day ${d} revision. A quick 10-minute look keeps it in memory.` },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: 'revision' },
        }),
      );
    } catch {}
  }
  return ids;
}

/** One notification at a given time (skipped if in the past). Returns its id or null. */
export async function scheduleAt(title: string, body: string, at: Date, channel = 'reminders'): Promise<string | null> {
  if (at.getTime() <= Date.now() + 60e3) return null;
  if (!(await setup())) return null;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(channel, { name: channel === 'reminders' ? 'Important dates' : channel, importance: Notifications.AndroidImportance.HIGH });
    }
    return await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: channel },
    });
  } catch {
    return null;
  }
}

export async function cancelRevision(ids: string[] = []) {
  if (Platform.OS === 'web') return;
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
}
