import { useCallback, useEffect, useState } from 'react';
import { EventEntry, EventType } from './types';
import * as db from './db';
import { clearRunning, setupNotifications, showRunning, syncRunning } from './notifications';

export function useEvents() {
  const [types, setTypes] = useState<EventType[]>([]);
  const [events, setEvents] = useState<EventEntry[]>([]);
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    const [t, e] = await Promise.all([db.loadTypes(), db.loadEvents()]);
    setTypes(t);
    setEvents(e);
    return { t, e };
  }, []);

  useEffect(() => {
    (async () => {
      await setupNotifications();
      const { t, e } = await reload();
      await syncRunning(e, t);
      setReady(true);
    })();
  }, [reload]);

  const start = useCallback(async (type: EventType) => {
    const startedAt = Date.now();
    const id = await db.insertEvent(type.id, startedAt, null, null);
    await showRunning({ id, typeId: type.id, startedAt, endedAt: null, note: null, weightKg: null, heightCm: null }, type);
    await reload();
  }, [reload]);

  const stop = useCallback(async (event: EventEntry) => {
    await db.endEvent(event.id, Date.now());
    await clearRunning(event.id);
    await reload();
  }, [reload]);

  const addInstant = useCallback(async (type: EventType, at: number, note: string, weightKg: number | null, heightCm: number | null) => {
    await db.insertEvent(type.id, at, null, note.trim() || null, weightKg, heightCm);
    await reload();
  }, [reload]);

  const update = useCallback(async (event: EventEntry, startedAt: number, endedAt: number | null, note: string, weightKg: number | null, heightCm: number | null) => {
    await db.updateEvent(event.id, startedAt, endedAt, note.trim() || null, weightKg, heightCm);
    if (endedAt !== null) await clearRunning(event.id);
    await reload();
  }, [reload]);

  const remove = useCallback(async (event: EventEntry) => {
    await db.deleteEvent(event.id);
    await clearRunning(event.id);
    await reload();
  }, [reload]);

  const importMany = useCallback(async (list: Parameters<typeof db.importEvents>[0]) => {
    const added = await db.importEvents(list);
    await reload();
    return added;
  }, [reload]);

  return { types, events, ready, start, stop, addInstant, update, remove, importMany };
}
