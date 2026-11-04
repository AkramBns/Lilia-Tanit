import React, { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { EventType } from '../types';
import { ParseResult, parseEvents } from '../importer';

type Props = {
  visible: boolean;
  types: EventType[];
  onClose: () => void;
  onImport: (events: ParseResult['events']) => Promise<number>;
};

export function ImportModal({ visible, types, onClose, onImport }: Props) {
  const [text, setText] = useState('');
  const [result, setResult] = useState<ParseResult | null>(null);

  const close = () => {
    setText('');
    setResult(null);
    onClose();
  };

  const confirm = async () => {
    if (!result) return;
    const added = await onImport(result.events);
    Alert.alert('Import terminé', `${added} ajouté(s), ${result.events.length - added} déjà présent(s).`);
    close();
  };

  const canImport = !!result && result.events.length > 0;

  return (
    <Modal visible={visible} transparent statusBarTranslucent animationType="fade" onRequestClose={close}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <Text style={s.title}>Importer des événements</Text>
          <TextInput
            style={s.area}
            multiline
            value={text}
            placeholder="Collez ici le texte partagé"
            onChangeText={(v) => {
              setText(v);
              setResult(null);
            }}
          />
          {result && (
            <>
              <Text style={s.info}>
                {result.events.length} événement(s) prêt(s)
                {result.errors.length ? `, ${result.errors.length} ligne(s) ignorée(s)` : ''}
              </Text>
              {result.errors.slice(0, 3).map((l, i) => (
                <Text key={i} style={s.err} numberOfLines={1}>{l}</Text>
              ))}
            </>
          )}
          <View style={s.actions}>
            <Pressable onPress={close}><Text style={s.cancel}>Annuler</Text></Pressable>
            {canImport ? (
              <Pressable style={s.btn} onPress={confirm}><Text style={s.btnText}>Importer</Text></Pressable>
            ) : (
              <Pressable style={s.btn} onPress={() => setResult(parseEvents(text, types))}>
                <Text style={s.btnText}>Analyser</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 12 },
sheet: { backgroundColor: '#fff', padding: 20, borderRadius: 20, maxHeight: '96%' },
area: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, minHeight: 260, maxHeight: 420, textAlignVertical: 'top', fontSize: 15 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  info: { marginTop: 10, color: '#00796B', fontWeight: '600' },
  err: { color: '#D32F2F', fontSize: 12, marginTop: 2 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 16, marginTop: 16 },
  cancel: { fontSize: 16, color: '#37474F', fontWeight: '600', backgroundColor: '#ECEFF1', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, overflow: 'hidden' },
  btn: { backgroundColor: '#E91E63', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
