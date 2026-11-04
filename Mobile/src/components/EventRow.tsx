import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { EventEntry, EventType } from '../types';
import { formatClock, formatDuration } from '../utils/time';
import { measuresText } from '../share';

type Props = {
  event: EventEntry;
  type: EventType;
  now: number;
  onPress: () => void;
};

export function EventRow({ event, type, now, onPress }: Props) {
  const running = type.kind === 'duration' && event.endedAt === null;
  let detail = '';
  if (type.kind === 'duration') {
    detail = running
      ? `En cours · ${formatDuration(now - event.startedAt)}`
      : `Durée : ${formatDuration((event.endedAt as number) - event.startedAt)}`;
  }

  return (
    <Pressable style={[styles.row, running && styles.running]} onPress={onPress}>
      <View style={[styles.icon, { backgroundColor: type.color }]}>
        <MaterialCommunityIcons name={type.icon as any} size={26} color="#fff" />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{type.label}</Text>
        <Text style={styles.sub}>
          {type.kind === 'duration' ? `Début : ${formatClock(event.startedAt)}` : formatClock(event.startedAt)}
          {detail ? `  ·  ${detail}` : ''}
        </Text>
        {!!measuresText(event) && <Text style={styles.measures}>{measuresText(event)}</Text>}
        {!!event.note && <Text style={styles.note}>{event.note}</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 8 },
  running: { borderWidth: 2, borderColor: '#4CAF50' },
  icon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  body: { flex: 1 },
  title: { fontSize: 16, fontWeight: '600', color: '#222' },
  sub: { fontSize: 14, color: '#555', marginTop: 2 },
  note: { fontSize: 14, color: '#333', marginTop: 4, fontStyle: 'italic' },
  measures: { fontSize: 15, color: '#00796B', fontWeight: '600', marginTop: 4 },
});
