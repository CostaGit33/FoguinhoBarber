import { defaultAdmin, storageKeys } from "./data";

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

export function loadUsers() {
  const users = safeRead(storageKeys.users, []);
  const hasAdmin = users.some((user) => user.email === defaultAdmin.email);

  if (!hasAdmin) {
    const nextUsers = [...users, defaultAdmin];
    safeWrite(storageKeys.users, nextUsers);
    return nextUsers;
  }

  return users;
}

export function saveUsers(users) {
  safeWrite(storageKeys.users, users);
}

export function loadSession() {
  return safeRead(storageKeys.session, null);
}

export function saveSession(session) {
  safeWrite(storageKeys.session, session);
}

export function clearSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(storageKeys.session);
}

export function registerUser({ name, email, phone, password }) {
  const users = loadUsers();
  const normalizedEmail = email.trim().toLowerCase();

  if (users.some((user) => user.email === normalizedEmail)) {
    return { ok: false, message: "Ja existe uma conta com esse e-mail." };
  }

  const newUser = {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`,
    name: name.trim(),
    email: normalizedEmail,
    phone: phone.trim(),
    password,
    role: "client",
    createdAt: new Date().toISOString()
  };

  saveUsers([...users, newUser]);
  saveSession({ id: newUser.id, email: newUser.email });

  return { ok: true, user: newUser };
}

export function loginUser({ email, password }) {
  const users = loadUsers();
  const normalizedEmail = email.trim().toLowerCase();
  const user = users.find((item) => item.email === normalizedEmail && item.password === password);

  if (!user) {
    return { ok: false, message: "E-mail ou senha invalidos." };
  }

  saveSession({ id: user.id, email: user.email });
  return { ok: true, user };
}

export function recoverPassword(email) {
  const users = loadUsers();
  const normalizedEmail = email.trim().toLowerCase();
  const user = users.find((item) => item.email === normalizedEmail);

  if (!user) {
    return { ok: false, message: "Nao encontramos usuario com esse e-mail." };
  }

  return {
    ok: true,
    message: `Recuperacao simulada: a senha atual desta conta e ${user.password}.`
  };
}

export function getCurrentUser() {
  const session = loadSession();
  if (!session) {
    return null;
  }

  const users = loadUsers();
  return users.find((user) => user.id === session.id || user.email === session.email) ?? null;
}

export function logoutUser() {
  clearSession();
}

export function updateUserProfile(userId, updates) {
  const users = loadUsers();
  const nextUsers = users.map((user) => {
    if (user.id !== userId) {
      return user;
    }

    return {
      ...user,
      ...updates,
      email: updates.email ? updates.email.trim().toLowerCase() : user.email,
      name: updates.name ? updates.name.trim() : user.name,
      phone: updates.phone ? updates.phone.trim() : user.phone
    };
  });

  saveUsers(nextUsers);
  return nextUsers.find((user) => user.id === userId) ?? null;
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
