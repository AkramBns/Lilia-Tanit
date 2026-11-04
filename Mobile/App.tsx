import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, SafeAreaView, SectionList, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEvents } from './src/useEvents';
import { EventEntry, EventType } from './src/types';
import { EventRow } from './src/components/EventRow';
import { EventModal } from './src/components/EventModal';
import { dayKey, formatDayLabel } from './src/utils/time';
import { shareEvent, shareEvents } from './src/share';
import { ImportModal } from './src/components/ImportModal';

export default function App() {
  const { types, events, ready, start, stop, addInstant, update, remove, importMany } = useEvents();
  const [importVisible, setImportVisible] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [modalType, setModalType] = useState<EventType | null>(null);
  const [editing, setEditing] = useState<EventEntry | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const hasRunning = events.some((e) => e.endedAt === null);
  useEffect(() => {
    if (!hasRunning) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [hasRunning]);

  const typeById = useMemo(() => new Map(types.map((t) => [t.id, t])), [types]);

  const sections = useMemo(() => {
    const map = new Map<string, { title: string; data: EventEntry[] }>();
    for (const e of events) {
      const k = dayKey(e.startedAt);
      if (!map.has(k)) map.set(k, { title: formatDayLabel(e.startedAt), data: [] });
      map.get(k)!.data.push(e);
    }
    return Array.from(map.values());
  }, [events]);

  const runningFor = (t: EventType) => events.find((e) => e.typeId === t.id && e.endedAt === null);

  const onQuickAction = (t: EventType) => {
    if (t.kind === 'instant') {
      setEditing(null);
      setModalType(t);
      setModalVisible(true);
      return;
    }
    const running = runningFor(t);
    if (running) stop(running);
    else start(t);
  };

  const openEdit = (e: EventEntry) => {
    const t = typeById.get(e.typeId);
    if (!t) return;
    setEditing(e);
    setModalType(t);
    setModalVisible(true);
  };

  const close = () => setModalVisible(false);

  const onSave = async (startedAt: number, endedAt: number | null, note: string, weightKg: number | null, heightCm: number | null) => {
    if (!modalType) return;
    if (editing) await update(editing, startedAt, endedAt, note, weightKg, heightCm);
    else await addInstant(modalType, startedAt, note, weightKg, heightCm);
    close();
  };

  const onShareAll = async () => {
    const shared = await shareEvents(events, types, 7);
    if (shared === false) Alert.alert('Rien à partager', 'Aucun événement sur les 7 derniers jours.');
  };

  if (!ready) {
    return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.headerRow}>
        <Text style={styles.header}>Lilia Tanit</Text>
        <View style={styles.headerIcons}>
          <Pressable onPress={() => setImportVisible(true)} hitSlop={10}>
            <MaterialCommunityIcons name="import" size={26} color="#333" />
          </Pressable>
          <Pressable onPress={onShareAll} hitSlop={10}>
            <MaterialCommunityIcons name="share-variant" size={26} color="#333" />
          </Pressable>
        </View>
      </View>

      <View style={styles.actions}>
        {types.map((t) => {
          const running = t.kind === 'duration' && !!runningFor(t);
          return (
            <Pressable
              key={t.id}
              style={[styles.action, { backgroundColor: running ? '#4CAF50' : t.color }]}
              onPress={() => onQuickAction(t)}
            >
              <MaterialCommunityIcons name={(running ? 'stop' : t.icon) as any} size={30} color="#fff" />
              <Text style={styles.actionLabel}>{t.label}</Text>
              <Text style={styles.actionSub}>
                {t.kind === 'instant' ? 'Ajouter' : running ? 'Arrêter' : 'Démarrer'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(e) => String(e.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Aucun événement pour le moment.</Text>}
        renderSectionHeader={({ section }) => <Text style={styles.section}>{section.title}</Text>}
        renderItem={({ item }) => {
          const t = typeById.get(item.typeId);
          return t ? <EventRow event={item} type={t} now={now} onPress={() => openEdit(item)} /> : null;
        }}
      />

      <EventModal
        visible={modalVisible}
        type={modalType}
        event={editing}
        onClose={close}
        onSave={onSave}
        onDelete={editing ? async () => { await remove(editing); close(); } : undefined}
        onShare={editing && modalType ? () => shareEvent(editing, modalType) : undefined}
      />
      <ImportModal
        visible={importVisible}
        types={types}
        onClose={() => setImportVisible(false)}
        onImport={importMany}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F8', paddingTop: 36 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { fontSize: 26, fontWeight: '800' },
  headerIcons: { flexDirection: 'row', gap: 18 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  actions: { flexDirection: 'row', paddingHorizontal: 12, gap: 6 },
  action: { flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  actionLabel: { color: '#fff', fontWeight: '700', marginTop: 4, fontSize: 12 },
  actionSub: { color: '#fff', fontSize: 12, opacity: 0.9 },
  list: { padding: 16, paddingBottom: 40 },
  section: { fontSize: 14, fontWeight: '700', color: '#666', textTransform: 'capitalize', marginTop: 8, marginBottom: 8 },
  empty: { textAlign: 'center', color: '#888', marginTop: 40 },
});
