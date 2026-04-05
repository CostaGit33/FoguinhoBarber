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

export function loadApiSession() {
  return safeRead(storageKeys.apiSession, null);
}

export function saveApiSession(session) {
  safeWrite(storageKeys.apiSession, session);
}

export function clearApiSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(storageKeys.apiSession);
}
