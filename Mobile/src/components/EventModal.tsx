import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView ,Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { EventEntry, EventType } from '../types';

type Props = {
  visible: boolean;
  type: EventType | null;
  event: EventEntry | null; // null = creating a new instant event
  onClose: () => void;
  onSave: (startedAt: number, endedAt: number | null, note: string, weightKg: number | null, heightCm: number | null) => void;
  onDelete?: () => void;
  onShare?: () => void;
};

function pickDateTime(value: number, onPicked: (ts: number) => void) {
  DateTimePickerAndroid.open({
    value: new Date(value),
    mode: 'date',
    maximumDate: new Date(),
    onChange: (e, date) => {
      if (e.type !== 'set' || !date) return;
      // Let the date dialog finish closing before opening the time dialog
      setTimeout(() => {
        DateTimePickerAndroid.open({
          value: new Date(value), // starts on the event's current time
          mode: 'time',
          is24Hour: true,
          onChange: (e2, time) => {
            if (e2.type !== 'set' || !time) return;
            const result = new Date(date);
            result.setHours(time.getHours(), time.getMinutes(), 0, 0);
            onPicked(result.getTime());
          },
        });
      }, 300);
    },
  });
}

const fmt = (ts: number) =>
  new Date(ts).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

const parseNum = (s: string) => {
  const v = parseFloat(s.replace(',', '.'));
  return isNaN(v) ? null : v;
};

export function EventModal({ visible, type, event, onClose, onSave, onDelete, onShare }: Props) {
  const [start, setStart] = useState(Date.now());
  const [end, setEnd] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');

  useEffect(() => {
    if (!visible) return;
    setStart(event?.startedAt ?? Date.now());
    setEnd(event?.endedAt ?? null);
    setNote(event?.note ?? '');
    setWeight(event?.weightKg != null ? String(event.weightKg) : '');
    setHeight(event?.heightCm != null ? String(event.heightCm) : '');
  }, [visible, event]);

  if (!type) return null;
  const isDuration = type.kind === 'duration';

  const save = () => {
    if (isDuration && end !== null && end < start) {
      Alert.alert('Heures invalides', 'La fin doit être après le début.');
      return;
    }
    const w = type.hasMeasures ? parseNum(weight) : null;
    const h = type.hasMeasures ? parseNum(height) : null;
    if (type.hasMeasures && w === null && h === null) {
      Alert.alert('Mesure manquante', 'Saisissez un poids ou une taille.');
      return;
    }
    onSave(start, isDuration ? end : null, note, w, h);
  };

  const confirmDelete = () =>
    Alert.alert('Supprimer', 'Supprimer cet événement ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: onDelete },
    ]);

  return (
    <Modal visible={visible} transparent statusBarTranslucent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{type.label}{event ? ' — modifier' : ''}</Text>
          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">

          <Text style={styles.label}>{isDuration ? 'Début' : 'Date et heure'}</Text>
          <Pressable style={styles.field} onPress={() => pickDateTime(start, setStart)}>
            <Text style={styles.fieldText}>{fmt(start)}</Text>
          </Pressable>

          {isDuration && event && (
            <>
              <Text style={styles.label}>Fin</Text>
              {end === null ? (
                <View style={styles.runningRow}>
                  <Text style={styles.hint}>En cours</Text>
                  <Pressable style={styles.finish} onPress={() => setEnd(Date.now())}>
                    <Text style={styles.finishText}>Terminer maintenant</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable style={styles.field} onPress={() => pickDateTime(end, setEnd)}>
                  <Text style={styles.fieldText}>{fmt(end)}</Text>
                </Pressable>
              )}
            </>
          )}

          {type.hasMeasures && (
            <>
              <Text style={styles.label}>Poids (kg)</Text>
              <TextInput style={[styles.field, styles.fieldText]} keyboardType="decimal-pad" value={weight} onChangeText={setWeight} placeholder="ex. 4.250" />
              <Text style={styles.label}>Taille (cm)</Text>
              <TextInput style={[styles.field, styles.fieldText]} keyboardType="decimal-pad" value={height} onChangeText={setHeight} placeholder="ex. 54" />
            </>
          )}

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.field, styles.input]}
            value={note}
            onChangeText={setNote}
            placeholder="Optionnel"
            multiline
          />

          </ScrollView>

          <View style={styles.footer}>
            {event && onDelete && (
              <View style={styles.footerRow}>
                <Pressable style={[styles.btn, styles.btnDelete]} onPress={confirmDelete}>
                  <Text style={styles.btnDeleteText}>Supprimer</Text>
                </Pressable>
                {onShare && (
                  <Pressable style={[styles.btn, styles.btnShare]} onPress={onShare}>
                    <Text style={styles.btnShareText}>Partager</Text>
                  </Pressable>
                )}
              </View>
            )}
            <View style={styles.footerRow}>
              <Pressable style={[styles.btn, styles.btnCancel]} onPress={onClose}>
                <Text style={styles.btnCancelText}>Annuler</Text>
              </Pressable>
              <Pressable style={[styles.btn, styles.btnSave]} onPress={save}>
                <Text style={styles.btnSaveText}>Enregistrer</Text>
              </Pressable>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 12 },
  kav: { maxHeight: '96%' },
  sheet: { backgroundColor: '#fff', padding: 20, borderRadius: 20, flexShrink: 1 },
  body: { flexGrow: 0, flexShrink: 1 },
  footer: { marginTop: 16, gap: 10 },
  footerRow: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  btnSave: { backgroundColor: '#E91E63' },
  btnSaveText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  btnCancel: { backgroundColor: '#ECEFF1' },
  btnCancelText: { color: '#37474F', fontSize: 16, fontWeight: '600' },
  btnDelete: { backgroundColor: '#FDECEA' },
  btnDeleteText: { color: '#D32F2F', fontSize: 16, fontWeight: '600' },
  btnShare: { backgroundColor: '#E3F2FD' },
  btnShareText: { color: '#1976D2', fontSize: 16, fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  label: { fontSize: 13, color: '#666', marginTop: 12, marginBottom: 4 },
  field: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12 },
  fieldText: { fontSize: 16 },
  input: { minHeight: 70, textAlignVertical: 'top', fontSize: 16 },
  hint: { fontSize: 16, color: '#4CAF50' },
  runningRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  finish: { backgroundColor: '#4CAF50', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  finishText: { color: '#fff', fontWeight: '600' },
  share: { fontSize: 16, color: '#1976D2' },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
  actionsRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  cancel: { fontSize: 16, color: '#555' },
  delete: { fontSize: 16, color: '#D32F2F' },
  save: { backgroundColor: '#E91E63', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
