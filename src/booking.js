import { storageKeys, weeklySchedule } from "./data";

export function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

export function formatDate(dateString) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(`${dateString}T00:00:00`));
}

export function parseDate(dateString) {
  return dateString ? new Date(`${dateString}T12:00:00`) : null;
}

export function getDaySchedule(dateString) {
  const date = parseDate(dateString);
  return date ? weeklySchedule[date.getDay()] : null;
}

export function timeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes) {
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const minutes = String(totalMinutes % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function getAvailableSlots({ date, service, professional, bookings }) {
  const schedule = getDaySchedule(date);
  if (!schedule || !service || !professional) {
    return [];
  }

  const open = timeToMinutes(schedule.open);
  const close = timeToMinutes(schedule.close);
  const lastStart = close - service.duration;
  const dayBookings = bookings.filter(
    (booking) => booking.date === date && booking.professional === professional
  );

  const slots = [];
  for (let minutes = open; minutes <= lastStart; minutes += 30) {
    const slotStart = minutes;
    const slotEnd = minutes + service.duration;
    const overlaps = dayBookings.some((booking) => {
      const bookedStart = timeToMinutes(booking.time);
      const bookedEnd = bookedStart + booking.duration;
      return slotStart < bookedEnd && slotEnd > bookedStart;
    });

    slots.push({
      time: minutesToTime(minutes),
      available: !overlaps
    });
  }

  return slots;
}

export function createBooking({ formData, selectedProfessional, selectedService, currentUser }) {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`,
    userId: currentUser?.id ?? null,
    userEmail: currentUser?.email ?? null,
    name: formData.nome.trim(),
    service: selectedService.name,
    price: selectedService.price,
    duration: selectedService.duration,
    professional: selectedProfessional.name,
    date: formData.data,
    time: formData.hora,
    createdAt: new Date().toISOString()
  };
}

export function sortBookings(bookings) {
  return [...bookings].sort((left, right) => {
    const leftKey = `${left.date}T${left.time}:00`;
    const rightKey = `${right.date}T${right.time}:00`;
    return leftKey.localeCompare(rightKey);
  });
}

export function loadBookings() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(storageKeys.bookings);
    return raw ? sortBookings(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

export function saveBookings(bookings) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKeys.bookings, JSON.stringify(sortBookings(bookings)));
}

export function getUpcomingBookings(bookings, currentUser) {
  if (!currentUser) {
    return [];
  }

  return sortBookings(bookings).filter(
    (booking) => booking.userId === currentUser.id || booking.userEmail === currentUser.email
  );
}

export function saveLastService(serviceName) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKeys.lastService, serviceName);
}

export function loadLastService() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(storageKeys.lastService) ?? "";
}
