/** Build ICS + Google Calendar links for a LinkedIn publish + first-comment reminder. */

export type PublishReminderInput = {
  /** Event start (local timezone of the user's browser). */
  start: Date;
  /** Duration in minutes (default 15). */
  durationMinutes?: number;
  title: string;
  description: string;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Floating local time (no TZ) — interpreted as local by most calendar apps. */
export function formatIcsLocalDateTime(date: Date): string {
  return (
    `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}` +
    `T${pad2(date.getHours())}${pad2(date.getMinutes())}${pad2(date.getSeconds())}`
  );
}

/** UTC for Google Calendar `dates` param. */
export function formatGoogleCalendarUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n/g, "\\n")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function buildPublishReminderIcs(
  input: PublishReminderInput,
  uid = `ucm-${Date.now()}@ultra-content-maker`,
): string {
  const duration = input.durationMinutes ?? 15;
  const end = new Date(input.start.getTime() + duration * 60_000);
  const now = new Date();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ultra Content Maker//Publish Reminder//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatIcsLocalDateTime(now)}`,
    `DTSTART:${formatIcsLocalDateTime(input.start)}`,
    `DTEND:${formatIcsLocalDateTime(end)}`,
    `SUMMARY:${escapeIcsText(input.title)}`,
    `DESCRIPTION:${escapeIcsText(input.description)}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT0M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Reminder",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.join("\r\n")}\r\n`;
}

export function buildGoogleCalendarUrl(input: PublishReminderInput): string {
  const duration = input.durationMinutes ?? 15;
  const end = new Date(input.start.getTime() + duration * 60_000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title,
    dates: `${formatGoogleCalendarUtc(input.start)}/${formatGoogleCalendarUtc(end)}`,
    details: input.description,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function downloadIcsFile(icsContent: string, filename: string): void {
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** `datetime-local` value (YYYY-MM-DDTHH:mm) from a Date in local TZ. */
export function toDatetimeLocalValue(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function parseDatetimeLocalValue(value: string): Date | null {
  if (!value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function defaultScheduleDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d;
}

export function buildFirstCommentReminderDescription(parts: {
  intro: string;
  firstComment: string;
  postLabel: string;
  postExcerpt?: string;
  articleLink?: string;
}): string {
  const blocks = [parts.intro, "", "———", parts.firstComment];
  if (parts.postExcerpt?.trim()) {
    blocks.push("", parts.postLabel, parts.postExcerpt.trim());
  }
  if (parts.articleLink?.trim()) {
    blocks.push("", parts.articleLink.trim());
  }
  return blocks.join("\n");
}
