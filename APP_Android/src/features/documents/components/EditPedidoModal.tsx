import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput as RNTextInput } from 'react-native';
import { Text, ActivityIndicator, Portal, Dialog } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { COLORS, RADIUS, SPACING } from '@/shared/theme/colors';
import { DocumentDetails, useUpdateDocumentFields } from '../hooks/useDocumentDetails';

interface Props {
  visible: boolean;
  document: DocumentDetails | null;
  isAdmin: boolean;
  onClose: () => void;
}

const EditPedidoModal = ({ visible, document, isAdmin, onClose }: Props) => {
  const updateFields = useUpdateDocumentFields();

  const [glat, setGlat] = useState('');
  const [glong, setGlong] = useState('');
  const [address, setAddress] = useState('');
  const [postal, setPostal] = useState('');
  const [door, setDoor] = useState('');
  const [floor, setFloor] = useState('');
  const [nut1, setNut1] = useState('');
  const [nut2, setNut2] = useState('');
  const [nut3, setNut3] = useState('');
  const [nut4, setNut4] = useState('');
  const [coordError, setCoordError] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);

  useEffect(() => {
    if (visible && document) {
      setGlat(document.glat != null ? String(document.glat) : '');
      setGlong(document.glong != null ? String(document.glong) : '');
      setAddress(document.address ?? '');
      setPostal(document.postal ?? '');
      setDoor(document.door ?? '');
      setFloor(document.floor ?? '');
      setNut1(document.nut1 ?? '');
      setNut2(document.nut2 ?? '');
      setNut3(document.nut3 ?? '');
      setNut4(document.nut4 ?? '');
      setCoordError('');
    }
  }, [visible, document]);

  const handleUseCurrentLocation = async () => {
    setCoordError('');
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setCoordError('Permissão de localização negada.'); return; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setGlat(String(pos.coords.latitude));
      setGlong(String(pos.coords.longitude));
    } catch {
      setCoordError('Erro ao obter localização atual.');
    } finally {
      setGpsLoading(false);
    }
  };

  const handleSave = () => {
    if (!document) return;
    const lat = glat.trim();
    const lng = glong.trim();
    if (lat !== '' && isNaN(parseFloat(lat))) { setCoordError('Latitude inválida (ex: 41.5512).'); return; }
    if (lng !== '' && isNaN(parseFloat(lng))) { setCoordError('Longitude inválida (ex: -8.4280).'); return; }

    const fields: Record<string, unknown> = {};
    if (lat !== (document.glat != null ? String(document.glat) : '')) fields.glat = lat !== '' ? parseFloat(lat) : null;
    if (lng !== (document.glong != null ? String(document.glong) : '')) fields.glong = lng !== '' ? parseFloat(lng) : null;

    if (isAdmin) {
      const addrMap: [string, string][] = [
        ['address', address], ['postal', postal], ['door', door], ['floor', floor],
        ['nut1', nut1], ['nut2', nut2], ['nut3', nut3], ['nut4', nut4],
      ];
      addrMap.forEach(([key, val]) => {
        if (val !== ((document as any)[key] ?? '')) fields[key] = val || null;
      });
    }

    if (Object.keys(fields).length === 0) { onClose(); return; }
    updateFields.mutate({ id: document.pk, fields }, { onSuccess: onClose });
  };

  if (!document) return null;

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onClose} style={epm.dialog}>
        <View style={epm.header}>
          <MaterialIcons name="edit" size={17} color={COLORS.primary} />
          <View style={{ flex: 1 }}>
            <Text style={epm.title}>Editar Pedido</Text>
            <Text style={epm.subtitle}>{document.regnumber}</Text>
          </View>
          <View style={[epm.profileChip, { borderColor: isAdmin ? COLORS.primary : COLORS.info }]}>
            <MaterialIcons name={isAdmin ? 'admin-panel-settings' : 'gps-fixed'} size={12} color={isAdmin ? COLORS.primary : COLORS.info} />
            <Text style={[epm.profileChipText, { color: isAdmin ? COLORS.primary : COLORS.info }]}>
              {isAdmin ? 'Admin — Coords + Morada' : 'Edição de coordenadas'}
            </Text>
          </View>
        </View>

        <Dialog.ScrollArea style={{ maxHeight: 480 }}>
          <ScrollView contentContainerStyle={epm.content} keyboardShouldPersistTaps="handled">
            {coordError ? <Text style={epm.errorText}>{coordError}</Text> : null}

            <Text style={epm.sectionLabel}>Coordenadas GPS</Text>
            <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
              <RNTextInput
                style={[epm.input, { flex: 1 }]} value={glat} onChangeText={setGlat}
                placeholder="Latitude" placeholderTextColor={COLORS.textDisabled} keyboardType="numeric"
              />
              <RNTextInput
                style={[epm.input, { flex: 1 }]} value={glong} onChangeText={setGlong}
                placeholder="Longitude" placeholderTextColor={COLORS.textDisabled} keyboardType="numeric"
              />
            </View>
            <TouchableOpacity style={epm.gpsBtn} onPress={handleUseCurrentLocation} disabled={gpsLoading}>
              {gpsLoading ? <ActivityIndicator size="small" color={COLORS.info} /> : <MaterialIcons name="my-location" size={16} color={COLORS.info} />}
              <Text style={epm.gpsBtnText}>{gpsLoading ? 'A obter...' : 'Usar localização atual'}</Text>
            </TouchableOpacity>

            {isAdmin && (
              <>
                <Text style={[epm.sectionLabel, { marginTop: SPACING.sm }]}>Morada (Admin)</Text>
                <RNTextInput style={epm.input} value={address} onChangeText={setAddress} placeholder="Morada" placeholderTextColor={COLORS.textDisabled} />
                <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                  <RNTextInput style={[epm.input, { flex: 1 }]} value={postal} onChangeText={setPostal} placeholder="Código postal" placeholderTextColor={COLORS.textDisabled} />
                  <RNTextInput style={[epm.input, { flex: 1 }]} value={door} onChangeText={setDoor} placeholder="Porta" placeholderTextColor={COLORS.textDisabled} />
                  <RNTextInput style={[epm.input, { flex: 1 }]} value={floor} onChangeText={setFloor} placeholder="Andar" placeholderTextColor={COLORS.textDisabled} />
                </View>
                <RNTextInput style={epm.input} value={nut4} onChangeText={setNut4} placeholder="Localidade (NUT4)" placeholderTextColor={COLORS.textDisabled} />
                <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                  <RNTextInput style={[epm.input, { flex: 1 }]} value={nut3} onChangeText={setNut3} placeholder="Freguesia" placeholderTextColor={COLORS.textDisabled} />
                  <RNTextInput style={[epm.input, { flex: 1 }]} value={nut2} onChangeText={setNut2} placeholder="Concelho" placeholderTextColor={COLORS.textDisabled} />
                  <RNTextInput style={[epm.input, { flex: 1 }]} value={nut1} onChangeText={setNut1} placeholder="Distrito" placeholderTextColor={COLORS.textDisabled} />
                </View>
              </>
            )}
          </ScrollView>
        </Dialog.ScrollArea>

        <View style={epm.actions}>
          <TouchableOpacity onPress={onClose} style={epm.cancelBtn} disabled={updateFields.isPending}>
            <Text style={epm.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSave} style={epm.saveBtn} disabled={updateFields.isPending}>
            {updateFields.isPending ? <ActivityIndicator size="small" color="#fff" /> : <MaterialIcons name="save" size={15} color="#fff" />}
            <Text style={epm.saveBtnText}>{updateFields.isPending ? 'A guardar...' : 'Guardar Alterações'}</Text>
          </TouchableOpacity>
        </View>
      </Dialog>
    </Portal>
  );
};

const epm = StyleSheet.create({
  dialog: { borderRadius: RADIUS.xl },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm,
  },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  subtitle: { fontSize: 12, color: COLORS.textSecondary },
  profileChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderWidth: 1, borderRadius: RADIUS.pill, paddingHorizontal: SPACING.sm, paddingVertical: 3,
  },
  profileChipText: { fontSize: 10, fontWeight: '700' },
  content: { paddingVertical: SPACING.sm, gap: 2 },
  sectionLabel: {
    fontSize: 11, fontWeight: '600', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: SPACING.xs,
  },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm, paddingVertical: 8, fontSize: 13, color: COLORS.textPrimary,
    backgroundColor: COLORS.background, marginBottom: SPACING.xs,
  },
  gpsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, alignSelf: 'flex-start',
    backgroundColor: COLORS.infoSurface, borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm, paddingVertical: 6, marginBottom: SPACING.xs,
  },
  gpsBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.info },
  errorText: { fontSize: 12, color: COLORS.error, marginBottom: SPACING.xs },
  actions: {
    flexDirection: 'row', justifyContent: 'flex-end', gap: SPACING.sm,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderTopWidth: 1, borderTopColor: COLORS.divider,
  },
  cancelBtn: { paddingHorizontal: SPACING.md, paddingVertical: 9, justifyContent: 'center' },
  cancelBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md, paddingVertical: 9,
  },
  saveBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});

export default EditPedidoModal;
