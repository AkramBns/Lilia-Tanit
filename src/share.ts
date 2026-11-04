import { Share } from 'react-native';
import { EventEntry, EventType } from './types';
import { dayKey, formatClock, formatDayLabel, formatDuration } from './utils/time';

export function measuresText(e: EventEntry): string {
  return [
    e.weightKg != null ? `${e.weightKg} kg` : null,
    e.heightCm != null ? `${e.heightCm} cm` : null,
  ].filter(Boolean).join(' · ');
}

// Includes the absolute date so the text can be re-imported later
const dayHeader = (ts: number) => `${formatDayLabel(ts)} (${new Date(ts).toLocaleDateString('fr-FR')})`;

export function eventLine(e: EventEntry, t: EventType): string {
  const parts = [`${formatClock(e.startedAt)} ${t.label}`];
  if (t.kind === 'duration') {
    parts.push(e.endedAt === null ? 'en cours' : formatDuration(e.endedAt - e.startedAt));
  }
  const m = measuresText(e);
  if (m) parts.push(m);
  if (e.note) parts.push(e.note);
  return parts.join(' — ');
}

export async function shareEvent(e: EventEntry, t: EventType) {
  await Share.share({ message: `${dayHeader(e.startedAt)}\n• ${eventLine(e, t)}` });
}

export async function shareEvents(events: EventEntry[], types: EventType[], days = 7) {
  const typeById = new Map(types.map((t) => [t.id, t]));
  const since = Date.now() - days * 86400000;
  const recent = events.filter((e) => e.startedAt >= since).sort((a, b) => a.startedAt - b.startedAt);
  if (recent.length === 0) return false;

  const lines: string[] = [];
  let current = '';
  for (const e of recent) {
    const t = typeById.get(e.typeId);
    if (!t) continue;
    const k = dayKey(e.startedAt);
    if (k !== current) {
      current = k;
      if (lines.length) lines.push('');
      lines.push(dayHeader(e.startedAt));
    }
    lines.push(`• ${eventLine(e, t)}`);
  }
  await Share.share({ title: 'Tanit', message: `Tanit — ${days} derniers jours\n\n${lines.join('\n')}` });
  return true;
}
