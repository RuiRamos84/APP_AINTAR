import React from 'react';
import {
    Grid,
    Paper,
    Typography,
    Box,
    useTheme,
    Alert,
    Chip,
    Stack,
    TextField
} from '@mui/material';
import {
    Description as DocumentIcon,
    PictureAsPdf as PdfIcon,
    Image as ImageIcon,
    InsertDriveFile as FileIcon,
    TableChart as TableIcon,
    Email as EmailIcon
} from '@mui/icons-material';

// Componentes personalizados
import FileUploadField from '../fields/FileUploadField';

/**
 * Quinto passo do formulário - Anexos
 * @param {Object} props - Propriedades do componente
 * @param {Object} props.formData - Dados do formulário
 * @param {Function} props.handleChange - Manipulador de mudanças no formulário
 * @param {Array} props.files - Lista de arquivos anexados
 * @param {Function} props.onAddFiles - Função para adicionar arquivos
 * @param {Function} props.onRemoveFile - Função para remover um arquivo
 * @param {Function} props.onUpdateDescription - Função para atualizar descrição
 * @param {Object} props.errors - Erros de validação
 * @param {boolean} props.loading - Se está em carregamento
 */
const AttachmentsStep = ({
    formData,
    handleChange,
    files,
    onAddFiles,
    onRemoveFile,
    onUpdateDescription,
    errors,
    loading
}) => {
    const theme = useTheme();

    // Lista de tipos de arquivos permitidos com ícones e cores
    const fileTypes = [
        { type: 'PDF', icon: <PdfIcon fontSize="small" sx={{ mr: 0.5 }} />, color: 'error' },
        { type: 'Imagens', icon: <ImageIcon fontSize="small" sx={{ mr: 0.5 }} />, color: 'success' },
        { type: 'Word', icon: <DocumentIcon fontSize="small" sx={{ mr: 0.5 }} />, color: 'info' },
        { type: 'Excel', icon: <TableIcon fontSize="small" sx={{ mr: 0.5 }} />, color: 'primary' },
        { type: 'Email', icon: <EmailIcon fontSize="small" sx={{ mr: 0.5 }} />, color: 'info' }
    ];

    return (
        <Grid container spacing={3}>
            <Grid item xs={12}>
                <Paper
                    elevation={0}
                    variant="outlined"
                    sx={{
                        p: 2,
                        mb: 2,
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'
                    }}
                >
                    <Box display="flex" alignItems="center" mb={2}>
                        <DocumentIcon color="primary" sx={{ mr: 1 }} />
                        <Typography variant="h6">
                            Observações e Anexos
                        </Typography>
                        {!formData.memo && files.length === 0 && (
                            <Alert severity="warning" sx={{ mt: 2 }}>
                                É necessário adicionar observações ou pelo menos um arquivo.
                            </Alert>
                        )}
                    </Box>

                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Observações"
                        name="memo"
                        value={formData.memo || ''}
                        onChange={handleChange}
                        placeholder="Informe qualquer detalhe adicional relevante para este pedido..."
                        error={!!errors.memo}
                        helperText={errors.memo}
                        sx={{ mb: 3 }}
                    />

                    <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                            Adicione até 5 arquivos relacionados ao pedido:
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                            {fileTypes.map((type, index) => (
                                <Chip
                                    key={index}
                                    icon={type.icon}
                                    label={type.type}
                                    size="small"
                                    color={type.color}
                                    variant="outlined"
                                />
                            ))}
                        </Stack>
                    </Box>

                    <FileUploadField
                        files={files}
                        onAddFiles={onAddFiles}
                        onRemoveFile={onRemoveFile}
                        onUpdateDescription={onUpdateDescription}
                        error={errors.files}
                        disabled={loading}
                        maxFiles={5}
                    />

                </Paper>
            </Grid>
        </Grid>
    );
};

export default AttachmentsStep;