import * as SQLite from 'expo-sqlite';
import { EventEntry, EventType } from './types';

const DEFAULT_TYPES: EventType[] = [
  { id: 'allaitement', label: 'Allaitement', icon: 'baby-bottle-outline', color: '#E91E63', kind: 'duration', builtIn: true, hasMeasures: false },
  { id: 'dodo', label: 'Dodo', icon: 'sleep', color: '#3F51B5', kind: 'duration', builtIn: true, hasMeasures: false },
  { id: 'caca', label: 'Caca', icon: 'emoticon-poop', color: '#8D6E63', kind: 'instant', builtIn: true, hasMeasures: false },
  { id: 'pesee', label: 'Pesée', icon: 'scale-bathroom', color: '#009688', kind: 'instant', builtIn: true, hasMeasures: true },
];

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('tanit.db');
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;
        CREATE TABLE IF NOT EXISTS event_types (
          id TEXT PRIMARY KEY NOT NULL,
          label TEXT NOT NULL,
          icon TEXT NOT NULL,
          color TEXT NOT NULL,
          kind TEXT NOT NULL CHECK(kind IN ('duration','instant')),
          built_in INTEGER NOT NULL DEFAULT 0,
          archived INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type_id TEXT NOT NULL REFERENCES event_types(id),
          started_at INTEGER NOT NULL,
          ended_at INTEGER,
          note TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_events_started ON events(started_at DESC);
      `);
      // Migrations for databases created before measures existed
      for (const sql of [
        'ALTER TABLE events ADD COLUMN weight_kg REAL',
        'ALTER TABLE events ADD COLUMN height_cm REAL',
        'ALTER TABLE event_types ADD COLUMN has_measures INTEGER NOT NULL DEFAULT 0',
      ]) {
        try { await db.execAsync(sql); } catch { /* column already exists */ }
      }
      for (const t of DEFAULT_TYPES) {
        await db.runAsync(
          'INSERT OR IGNORE INTO event_types (id, label, icon, color, kind, built_in, has_measures) VALUES (?, ?, ?, ?, ?, 1, ?)',
          t.id, t.label, t.icon, t.color, t.kind, t.hasMeasures ? 1 : 0
        );
      }
      return db;
    })();
  }
  return dbPromise;
}

export async function loadTypes(): Promise<EventType[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM event_types WHERE archived = 0 ORDER BY rowid');
  return rows.map((r) => ({
    id: r.id, label: r.label, icon: r.icon, color: r.color, kind: r.kind, builtIn: !!r.built_in, hasMeasures: !!r.has_measures,
  }));
}

export async function loadEvents(): Promise<EventEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM events ORDER BY started_at DESC');
  return rows.map((r) => ({
    id: r.id, typeId: r.type_id, startedAt: r.started_at, endedAt: r.ended_at, note: r.note,
    weightKg: r.weight_kg, heightCm: r.height_cm,
  }));
}

export async function insertEvent(
  typeId: string, startedAt: number, endedAt: number | null, note: string | null,
  weightKg: number | null = null, heightCm: number | null = null
) {
  const db = await getDb();
  const res = await db.runAsync(
    'INSERT INTO events (type_id, started_at, ended_at, note, weight_kg, height_cm) VALUES (?, ?, ?, ?, ?, ?)',
    typeId, startedAt, endedAt, note, weightKg, heightCm
  );
  return res.lastInsertRowId;
}

export async function endEvent(id: number, endedAt: number) {
  const db = await getDb();
  await db.runAsync('UPDATE events SET ended_at = ? WHERE id = ?', endedAt, id);
}

export async function updateEvent(
  id: number, startedAt: number, endedAt: number | null, note: string | null,
  weightKg: number | null, heightCm: number | null
) {
  const db = await getDb();
  await db.runAsync(
    'UPDATE events SET started_at = ?, ended_at = ?, note = ?, weight_kg = ?, height_cm = ? WHERE id = ?',
    startedAt, endedAt, note, weightKg, heightCm, id
  );
}

// Skips events whose type and start time already exist
export async function importEvents(
  list: { typeId: string; startedAt: number; endedAt: number | null; note: string | null; weightKg: number | null; heightCm: number | null }[]
) {
  const db = await getDb();
  let added = 0;
  await db.withTransactionAsync(async () => {
    for (const e of list) {
      const dup = await db.getFirstAsync('SELECT 1 FROM events WHERE type_id = ? AND started_at = ?', e.typeId, e.startedAt);
      if (dup) continue;
      await db.runAsync(
        'INSERT INTO events (type_id, started_at, ended_at, note, weight_kg, height_cm) VALUES (?, ?, ?, ?, ?, ?)',
        e.typeId, e.startedAt, e.endedAt, e.note, e.weightKg, e.heightCm
      );
      added++;
    }
  });
  return added;
}

export async function deleteEvent(id: number) {
  const db = await getDb();
  await db.runAsync('DELETE FROM events WHERE id = ?', id);
}
