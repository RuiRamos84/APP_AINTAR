import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Dialog, Portal, Button, Text, IconButton, Divider, ActivityIndicator } from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '@/shared/theme/colors';
import { useFaltasAnexos } from '@/features/rh/hooks/useFaltasAnexos';
import type { Falta } from '@/features/rh/hooks/useFaltas';

const ALLOWED_TYPES = [
  'application/pdf', 'image/jpeg', 'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_FILES = 10;

const fmtBytes = (b?: number) => {
  if (!b) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
};

const fileIcon = (name: string): React.ComponentProps<typeof MaterialIcons>['name'] => {
  const ext = name.toLowerCase();
  if (ext.endsWith('.pdf')) return 'picture-as-pdf';
  if (ext.endsWith('.doc') || ext.endsWith('.docx')) return 'description';
  return 'image';
};

interface FaltasAnexosModalProps {
  visible: boolean;
  onDismiss: () => void;
  falta: Falta | null;
  onError: (msg: string) => void;
}

const FaltasAnexosModal = ({ visible, onDismiss, falta, onError }: FaltasAnexosModalProps) => {
  const { upload, isUploading, remove, isRemoving, download } = useFaltasAnexos(falta?.pk);
  const [removingFile, setRemovingFile] = useState<string | null>(null);

  if (!falta) return null;
  const documentos = falta.documentos || [];

  const handlePick = async () => {
    if (documentos.length >= MAX_FILES) {
      onError(`Máximo de ${MAX_FILES} anexos.`);
      return;
    }
    const result = await DocumentPicker.getDocumentAsync({
      type: ALLOWED_TYPES,
      copyToCacheDirectory: true,
      multiple: true,
    });
    if (result.canceled) return;
    const assets = result.assets.slice(0, MAX_FILES - documentos.length);
    try {
      const res = await upload(assets.map((a) => ({ uri: a.uri, name: a.name, mimeType: a.mimeType })));
      if (res.erros?.length) onError(res.erros.join('\n'));
    } catch (err: any) {
      onError(err?.response?.data?.error ?? 'Erro ao carregar anexos.');
    }
  };

  const handleDownload = async (filename: string, nomeOriginal: string) => {
    try {
      await download(filename, nomeOriginal);
    } catch {
      onError('Erro ao descarregar ficheiro.');
    }
  };

  const handleRemove = (filename: string) => {
    Alert.alert('Remover anexo', 'Tem a certeza que quer remover este anexo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          setRemovingFile(filename);
          try {
            await remove(filename);
          } catch {
            onError('Erro ao remover anexo.');
          } finally {
            setRemovingFile(null);
          }
        },
      },
    ]);
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title style={styles.title}>Anexos da Falta</Dialog.Title>
        <Dialog.Content>
          <Text style={styles.subtitle}>
            {falta.colaborador_nome} · {falta.tipo_descr}
          </Text>

          <Button
            icon="upload"
            mode="outlined"
            onPress={handlePick}
            loading={isUploading}
            disabled={isUploading || documentos.length >= MAX_FILES}
            style={styles.uploadBtn}
          >
            {isUploading ? 'A carregar…' : 'Carregar ficheiros'}
          </Button>
          <Text style={styles.hint}>PDF, JPEG, PNG, DOCX — máx. {MAX_FILES} ficheiros</Text>

          {documentos.length === 0 ? (
            <Text style={styles.empty}>Sem anexos.</Text>
          ) : (
            documentos.map((doc, i) => (
              <View key={doc.pk ?? doc.filename}>
                {i > 0 && <Divider />}
                <View style={styles.row}>
                  <MaterialIcons name={fileIcon(doc.filename)} size={20} color={COLORS.textSecondary} />
                  <View style={styles.rowBody}>
                    <Text style={styles.filename} numberOfLines={1}>{doc.nome_original || doc.filename}</Text>
                    <Text style={styles.meta}>{fmtBytes(doc.tamanho)}</Text>
                  </View>
                  <IconButton icon="download" size={18} onPress={() => handleDownload(doc.filename, doc.nome_original)} />
                  {removingFile === doc.filename && isRemoving ? (
                    <ActivityIndicator size={18} style={{ marginHorizontal: SPACING.sm }} />
                  ) : (
                    <IconButton icon="delete-outline" size={18} iconColor={COLORS.error} onPress={() => handleRemove(doc.filename)} />
                  )}
                </View>
              </View>
            ))
          )}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Fechar</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialog: { borderRadius: RADIUS.xl },
  title: { fontWeight: '700', color: COLORS.textPrimary },
  subtitle: { color: COLORS.textSecondary, marginBottom: SPACING.sm },
  uploadBtn: { marginBottom: SPACING.xs, borderRadius: RADIUS.md },
  hint: { fontSize: 11, color: COLORS.textDisabled, marginBottom: SPACING.sm },
  empty: { color: COLORS.textDisabled, paddingVertical: SPACING.sm },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.xs, gap: SPACING.sm },
  rowBody: { flex: 1 },
  filename: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  meta: { fontSize: 11, color: COLORS.textDisabled },
});

export default FaltasAnexosModal;
