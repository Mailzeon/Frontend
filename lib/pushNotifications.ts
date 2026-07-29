import { api } from './api';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

/** Whether this browser supports the Push API at all (older Safari, some
 * in-app webviews don't). Always check before showing any push UI. */
export const isPushSupported = (): boolean =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window;

/** Converts the VAPID public key (base64url string) into the raw byte array
 * the Push API's `applicationServerKey` option requires. Standard
 * boilerplate for this API — there's no built-in browser helper for it. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from(Array.from(rawData).map((c) => c.charCodeAt(0)));
}

/** Returns the current subscription for this browser, if any (without
 * prompting for permission) — used to check toggle state on page load. */
export const getExistingSubscription = async (): Promise<PushSubscription | null> => {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return null;
  return registration.pushManager.getSubscription();
};

/**
 * Requests notification permission (if not already granted) and subscribes
 * this browser to push. Sends the subscription to the backend so
 * notificationService.create() (and the new-order broadcast) can reach it.
 * Throws if the user denies permission or the browser doesn't support push
 * — callers should catch and show a friendly message.
 */
export const enablePushNotifications = async (): Promise<void> => {
  if (!isPushSupported()) throw new Error('Push notifications are not supported in this browser.');
  if (!VAPID_PUBLIC_KEY) throw new Error('Push notifications are not configured.');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notification permission was not granted.');

  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true, // Required by the spec — every push must show a visible notification
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
  });

  const raw = subscription.toJSON();
  await api.post('/notifications/push-subscribe', {
    endpoint: raw.endpoint,
    keys: raw.keys,
  });
};

/** Unsubscribes this browser and tells the backend to forget it. */
export const disablePushNotifications = async (): Promise<void> => {
  const subscription = await getExistingSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await api.post('/notifications/push-unsubscribe', { endpoint });
};
