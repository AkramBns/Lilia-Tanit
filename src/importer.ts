import { EventType } from './types';

export type ParsedEvent = {
  typeId: string;
  startedAt: number;
  endedAt: number | null;
  note: string | null;
  weightKg: number | null;
  heightCm: number | null;
};
export type ParseResult = { events: ParsedEvent[]; errors: string[] };

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

function parseDuration(s: string): number | null {
  const m = /^(?:(\d+)\s*h)?\s*(?:(\d+)\s*min)?\s*(?:(\d+)\s*s)?$/i.exec(s.trim());
  if (!m || (!m[1] && !m[2] && !m[3])) return null;
  return ((+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0)) * 1000;
}

const MEASURES = /^[\d.,]+\s*(kg|cm)(\s*·\s*[\d.,]+\s*(kg|cm))?$/i;

// Parses the text produced by share.ts. Events still "en cours" are skipped.
export function parseEvents(text: string, types: EventType[]): ParseResult {
  const events: ParsedEvent[] = [];
  const errors: string[] = [];
  let day: { y: number; m: number; d: number } | null = null;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;

    const isEventLine = /^[•\-*]/.test(line);
    const dm = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(line);
    if (dm && !isEventLine) {
      day = { d: +dm[1], m: +dm[2], y: +dm[3] };
      continue;
    }

    const lm = /^[•\-*]\s*(\d{1,2}):(\d{2})\s+(.+)$/.exec(line);
    if (!lm) {
      if (!/^tanit/i.test(line)) errors.push(line);
      continue;
    }
    if (!day) {
      errors.push(line);
      continue;
    }

    const [labelPart, ...rest] = lm[3].split(' — ');
    const type = types.find((t) => norm(t.label) === norm(labelPart));
    if (!type) {
      errors.push(line);
      continue;
    }

    const startedAt = new Date(day.y, day.m - 1, day.d, +lm[1], +lm[2]).getTime();
    const ev: ParsedEvent = { typeId: type.id, startedAt, endedAt: null, note: null, weightKg: null, heightCm: null };
    const notes: string[] = [];
    let running = false;

    for (const part of rest) {
      const p = part.trim();
      const dur = parseDuration(p);
      if (type.kind === 'duration' && dur !== null) {
        ev.endedAt = startedAt + dur;
        continue;
      }
      if (type.kind === 'duration' && norm(p) === 'en cours') {
        running = true;
        continue;
      }
      if (type.hasMeasures && MEASURES.test(p)) {
        const w = /([\d.,]+)\s*kg/i.exec(p);
        const h = /([\d.,]+)\s*cm/i.exec(p);
        if (w) ev.weightKg = parseFloat(w[1].replace(',', '.'));
        if (h) ev.heightCm = parseFloat(h[1].replace(',', '.'));
        continue;
      }
      notes.push(p);
    }

    if (running || (type.kind === 'duration' && ev.endedAt === null)) {
      errors.push(line);
      continue;
    }
    ev.note = notes.join(' — ') || null;
    events.push(ev);
  }
  return { events, errors };
}
