import { storageKeys } from "./data";

function safeRead(key, fallback) {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite(key, value) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

export function loadFavorites() {
  return safeRead(storageKeys.favorites, {});
}

export function saveFavorites(favorites) {
  safeWrite(storageKeys.favorites, favorites);
}

export function loadNotifications() {
  return safeRead(storageKeys.notifications, []);
}

export function saveNotifications(notifications) {
  safeWrite(storageKeys.notifications, notifications);
}

export function loadSettings() {
  return safeRead(storageKeys.settings, {
    reminderHours: 2,
    publicBookingEnabled: true,
    installBannerEnabled: true
  });
}

export function saveSettings(settings) {
  safeWrite(storageKeys.settings, settings);
}
