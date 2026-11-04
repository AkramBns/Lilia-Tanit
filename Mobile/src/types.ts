export type EventKind = 'duration' | 'instant';

export type EventType = {
  id: string;
  label: string;
  icon: string; // MaterialCommunityIcons name
  color: string;
  kind: EventKind;
  builtIn: boolean;
  hasMeasures: boolean; // weight / height fields
};

export type EventEntry = {
  id: number;
  typeId: string;
  startedAt: number; // epoch ms
  endedAt: number | null; // null = running (duration events only)
  note: string | null;
  weightKg: number | null;
  heightCm: number | null;
};
