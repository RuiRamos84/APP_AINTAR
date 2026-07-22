import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Dialog, Portal, IconButton, Text } from 'react-native-paper';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { COLORS, RADIUS, SPACING } from '@/shared/theme/colors';
import { fmtDate, fmtTime } from '@/features/rh/utils/rhUtils';
import { useLocais } from '@/features/rh/hooks/usePontoLocais';
import type { PontoEvento } from '@/features/rh/hooks/usePonto';

interface PontoMapDialogProps {
  registo: PontoEvento | null;
  onClose: () => void;
}

// Mostra a localização GPS de um registo de ponto, com os locais predefinidos
// (áreas de tolerância do geofencing) como referência — equivalente ao
// PontoMapDialog.jsx do frontend-v2 (lá com react-leaflet, aqui com
// react-native-maps, já usado no ecrã de mapa de admin — PontoMapaScreen).
const PontoMapDialog = ({ registo, onClose }: PontoMapDialogProps) => {
  const { locais } = useLocais();

  if (!registo || registo.latitude == null || registo.longitude == null) return null;

  const center = { latitude: registo.latitude, longitude: registo.longitude };

  return (
    <Portal>
      <Dialog visible={!!registo} onDismiss={onClose} style={styles.dialog}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{registo.evento_descr}</Text>
            <Text style={styles.subtitle}>
              {fmtDate(registo.data)} · {fmtTime(registo.ts_registo)}
              {registo.precisao != null ? ` · Precisão ±${registo.precisao}m` : ''}
            </Text>
          </View>
          <IconButton icon="close" size={18} onPress={onClose} />
        </View>

        <View style={styles.mapWrap}>
          <MapView
            style={StyleSheet.absoluteFill}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            initialRegion={{ ...center, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
          >
            {locais.filter((l) => l.ativo).map((l) => (
              <React.Fragment key={`local-${l.pk}`}>
                <Circle
                  center={{ latitude: l.latitude, longitude: l.longitude }}
                  radius={l.raio_metros}
                  strokeColor="#16a34a"
                  fillColor="rgba(22,163,74,0.12)"
                  strokeWidth={2}
                />
                <Marker
                  coordinate={{ latitude: l.latitude, longitude: l.longitude }}
                  title={l.nome}
                  description={l.descr || `Raio de tolerância: ${l.raio_metros}m`}
                  pinColor="green"
                />
              </React.Fragment>
            ))}
            <Marker
              coordinate={center}
              title={registo.evento_descr}
              description={`${fmtDate(registo.data)} ${fmtTime(registo.ts_registo)}`}
            />
          </MapView>
        </View>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialog: { borderRadius: RADIUS.xl, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'flex-start', padding: SPACING.md, paddingBottom: SPACING.xs },
  title: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  subtitle: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  mapWrap: { height: 340 },
});

export default PontoMapDialog;
