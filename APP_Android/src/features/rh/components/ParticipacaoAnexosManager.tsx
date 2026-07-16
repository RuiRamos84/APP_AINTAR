import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Dialog, Portal, Button, Text, IconButton, Divider } from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '@/shared/theme/colors';
import { useParticipacaoAnexos } from '@/features/rh/hooks/useParticipacaoAnexos';
import type { Participacao } from '@/features/rh/hooks/useParticipacoes';

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_FILES = 5;

const fmtBytes = (b?: number) => {
  if (!b) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
};

interface ParticipacaoAnexosManagerProps {
  visible: boolean;
  onDismiss: () => void;
  participacao: Participacao | null;
  onError: (msg: string) => void;
}

const ParticipacaoAnexosManager = ({ visible, onDismiss, participacao, onError }: ParticipacaoAnexosManagerProps) => {
  const { upload, isUploading, download } = useParticipacaoAnexos(participacao?.pk);

  if (!participacao) return null;
  const documentos = participacao.documentos || [];

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

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title style={styles.title}>Anexos da Participação</Dialog.Title>
        <Dialog.Content>
          <Text style={styles.subtitle}>
            {participacao.colaborador_nome} · {participacao.motivo_artigo || 'Sem motivo'}
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

          {documentos.length === 0 ? (
            <Text style={styles.empty}>Sem anexos.</Text>
          ) : (
            documentos.map((doc, i) => (
              <View key={doc.pk ?? doc.filename}>
                {i > 0 && <Divider />}
                <View style={styles.row}>
                  <MaterialIcons name="insert-drive-file" size={20} color={COLORS.textSecondary} />
                  <View style={styles.rowBody}>
                    <Text style={styles.filename} numberOfLines={1}>{doc.nome_original || doc.filename}</Text>
                    <Text style={styles.meta}>{fmtBytes(doc.tamanho)}</Text>
                  </View>
                  <IconButton
                    icon="download"
                    size={18}
                    onPress={() => handleDownload(doc.filename, doc.nome_original)}
                  />
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
  uploadBtn: { marginBottom: SPACING.sm, borderRadius: RADIUS.md },
  empty: { color: COLORS.textDisabled, paddingVertical: SPACING.sm },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.xs, gap: SPACING.sm },
  rowBody: { flex: 1 },
  filename: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  meta: { fontSize: 11, color: COLORS.textDisabled },
});

export default ParticipacaoAnexosManager;
