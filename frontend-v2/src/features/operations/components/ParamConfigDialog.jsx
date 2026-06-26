import { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
    Box, Grid, TextField, MenuItem, Button, Stack, Typography, Divider,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Checkbox, Tooltip, Alert, CircularProgress,
} from '@mui/material';
import { Close, Add, Edit, Delete, Tune as ParamIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMetaData } from '@/core/hooks/useMetaData';
import { operationService } from '../services/operationService';
import notification from '@/core/services/notification/notificationService';

const PARAM_TYPES = [
    { value: 1, label: 'Numérico' },
    { value: 2, label: 'Texto' },
    { value: 3, label: 'Referência' },
    { value: 4, label: 'Booleano' },
];

const catalogDefaults = { name: '', type: 1, units: '', refobj: '', refpk: '', refvalue: '' };

const ParamConfigDialog = ({ open, onClose }) => {
    const queryClient = useQueryClient();
    const { data: metaData } = useMetaData();
    const accaoOptions = metaData?.operacaoaccao || [];

    const [selectedAccao, setSelectedAccao] = useState('');
    const [catalogForm, setCatalogForm] = useState(null); // null = fechado, {} = novo, {...} = editar
    const [assocForm, setAssocForm] = useState(null);

    const { data: catalog = [], isLoading: loadingCatalog } = useQuery({
        queryKey: ['paramCatalog'],
        queryFn: operationService.getParamCatalog,
        enabled: open,
        staleTime: 1000 * 60 * 5,
    });

    const { data: assocList = [], isLoading: loadingAssoc } = useQuery({
        queryKey: ['paramAccao', selectedAccao],
        queryFn: () => operationService.getParamsByAccao(selectedAccao),
        enabled: open && !!selectedAccao,
        staleTime: 1000 * 60,
    });

    const invalidateCatalog = () => queryClient.invalidateQueries({ queryKey: ['paramCatalog'] });
    const invalidateAssoc = () => queryClient.invalidateQueries({ queryKey: ['paramAccao', selectedAccao] });

    const createParamMut = useMutation({
        mutationFn: (data) => operationService.createParam(data),
        onSuccess: () => { invalidateCatalog(); setCatalogForm(null); notification.success('Parâmetro criado.'); },
        onError: (e) => notification.error(e?.response?.data?.error || 'Erro ao criar parâmetro.'),
    });
    const updateParamMut = useMutation({
        mutationFn: ({ pk, data }) => operationService.updateParam(pk, data),
        onSuccess: () => { invalidateCatalog(); setCatalogForm(null); notification.success('Parâmetro atualizado.'); },
        onError: (e) => notification.error(e?.response?.data?.error || 'Erro ao atualizar parâmetro.'),
    });
    const deleteParamMut = useMutation({
        mutationFn: (pk) => operationService.deleteParam(pk),
        onSuccess: () => { invalidateCatalog(); notification.success('Parâmetro eliminado.'); },
        onError: (e) => notification.error(e?.response?.data?.error || 'Erro ao eliminar (pode estar associado a ações).'),
    });

    const createAssocMut = useMutation({
        mutationFn: (data) => operationService.createParamAccao(data),
        onSuccess: () => { invalidateAssoc(); setAssocForm(null); notification.success('Associado com sucesso.'); },
        onError: (e) => notification.error(e?.response?.data?.error || 'Erro ao associar parâmetro.'),
    });
    const updateAssocMut = useMutation({
        mutationFn: ({ pk, data }) => operationService.updateParamAccao(pk, data),
        onSuccess: () => { invalidateAssoc(); setAssocForm(null); notification.success('Associação atualizada.'); },
        onError: (e) => notification.error(e?.response?.data?.error || 'Erro ao atualizar associação.'),
    });
    const deleteAssocMut = useMutation({
        mutationFn: (pk) => operationService.deleteParamAccao(pk),
        onSuccess: () => { invalidateAssoc(); notification.success('Associação removida.'); },
        onError: (e) => notification.error(e?.response?.data?.error || 'Erro ao remover associação.'),
    });

    const handleSaveCatalog = () => {
        if (!catalogForm.name?.trim()) { notification.error('Indique o nome do parâmetro.'); return; }
        const payload = { ...catalogForm, type: parseInt(catalogForm.type, 10) };
        if (catalogForm.pk) updateParamMut.mutate({ pk: catalogForm.pk, data: payload });
        else createParamMut.mutate(payload);
    };

    const handleSaveAssoc = () => {
        if (!assocForm.tb_param) { notification.error('Selecione um parâmetro do catálogo.'); return; }
        if (assocForm.isNew) {
            createAssocMut.mutate({
                tb_param: parseInt(assocForm.tb_param, 10),
                tt_operacaoaccao: parseInt(selectedAccao, 10),
                sort: parseInt(assocForm.sort, 10) || 0,
                mandatory: assocForm.mandatory ? 1 : 0,
                editable: assocForm.editable ? 1 : 0,
                oncreate: assocForm.oncreate ? 1 : 0,
            });
        } else {
            updateAssocMut.mutate({
                pk: assocForm.pk,
                data: {
                    sort: parseInt(assocForm.sort, 10) || 0,
                    mandatory: assocForm.mandatory ? 1 : 0,
                    editable: assocForm.editable ? 1 : 0,
                    oncreate: assocForm.oncreate ? 1 : 0,
                },
            });
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
            <DialogTitle>
                <Box display="flex" alignItems="center" gap={1}>
                    <ParamIcon color="primary" />
                    Parâmetros de Operação
                </Box>
                <IconButton onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}><Close /></IconButton>
            </DialogTitle>
            <DialogContent>
                <Grid container spacing={3}>
                    {/* Catálogo */}
                    <Grid size={{ xs: 12, md: 5 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                            <Typography variant="subtitle1" fontWeight={600}>Catálogo de Parâmetros</Typography>
                            <Button size="small" startIcon={<Add />} onClick={() => setCatalogForm({ ...catalogDefaults })}>Novo</Button>
                        </Stack>
                        {loadingCatalog ? <CircularProgress size={24} /> : (
                            <TableContainer sx={{ maxHeight: 420 }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Nome</TableCell>
                                            <TableCell>Tipo</TableCell>
                                            <TableCell align="right">Ações</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {catalog.map((p) => (
                                            <TableRow key={p.pk} hover>
                                                <TableCell>{p.name}{p.units ? ` (${p.units})` : ''}</TableCell>
                                                <TableCell>{PARAM_TYPES.find((t) => t.value === p.type)?.label || p.type}</TableCell>
                                                <TableCell align="right">
                                                    <Tooltip title="Editar">
                                                        <IconButton size="small" onClick={() => setCatalogForm({ ...p })}><Edit fontSize="small" /></IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Eliminar">
                                                        <IconButton size="small" color="error" onClick={() => { if (window.confirm(`Eliminar "${p.name}"?`)) deleteParamMut.mutate(p.pk); }}>
                                                            <Delete fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {catalog.length === 0 && (
                                            <TableRow><TableCell colSpan={3}><Alert severity="info">Sem parâmetros no catálogo.</Alert></TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}

                        {catalogForm && (
                            <Box sx={{ mt: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                                <Stack spacing={2}>
                                    <TextField label="Nome" size="small" fullWidth value={catalogForm.name}
                                        onChange={(e) => setCatalogForm((f) => ({ ...f, name: e.target.value }))} />
                                    <TextField select label="Tipo" size="small" fullWidth value={catalogForm.type}
                                        onChange={(e) => setCatalogForm((f) => ({ ...f, type: e.target.value }))}>
                                        {PARAM_TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                                    </TextField>
                                    <TextField label="Unidades (opcional)" size="small" fullWidth value={catalogForm.units || ''}
                                        onChange={(e) => setCatalogForm((f) => ({ ...f, units: e.target.value }))} />
                                    {parseInt(catalogForm.type, 10) === 3 && (
                                        <>
                                            <TextField label="View de referência (refobj)" size="small" fullWidth value={catalogForm.refobj || ''}
                                                onChange={(e) => setCatalogForm((f) => ({ ...f, refobj: e.target.value }))} />
                                            <TextField label="Campo PK (refpk)" size="small" fullWidth value={catalogForm.refpk || ''}
                                                onChange={(e) => setCatalogForm((f) => ({ ...f, refpk: e.target.value }))} />
                                            <TextField label="Campo Valor (refvalue)" size="small" fullWidth value={catalogForm.refvalue || ''}
                                                onChange={(e) => setCatalogForm((f) => ({ ...f, refvalue: e.target.value }))} />
                                        </>
                                    )}
                                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                                        <Button size="small" onClick={() => setCatalogForm(null)}>Cancelar</Button>
                                        <Button size="small" variant="contained" onClick={handleSaveCatalog}
                                            disabled={createParamMut.isPending || updateParamMut.isPending}>
                                            Guardar
                                        </Button>
                                    </Stack>
                                </Stack>
                            </Box>
                        )}
                    </Grid>

                    <Grid size={{ xs: 12, md: 1 }} sx={{ display: { xs: 'none', md: 'block' } }}>
                        <Divider orientation="vertical" sx={{ height: '100%' }} />
                    </Grid>

                    {/* Associação a tipo de ação */}
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>Associar a Tipo de Ação</Typography>
                        <TextField select label="Tipo de Ação" size="small" fullWidth sx={{ mb: 2 }}
                            value={selectedAccao} onChange={(e) => { setSelectedAccao(e.target.value); setAssocForm(null); }}>
                            {accaoOptions.map((a) => <MenuItem key={a.pk} value={a.pk}>{a.name}</MenuItem>)}
                        </TextField>

                        {selectedAccao && (
                            <>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                                    <Typography variant="body2" color="text.secondary">Parâmetros desta ação</Typography>
                                    <Button size="small" startIcon={<Add />}
                                        onClick={() => setAssocForm({ isNew: true, tb_param: '', sort: assocList.length, mandatory: 0, editable: 1, oncreate: 0 })}>
                                        Associar
                                    </Button>
                                </Stack>

                                {loadingAssoc ? <CircularProgress size={24} /> : (
                                    <TableContainer sx={{ maxHeight: 300 }}>
                                        <Table size="small" stickyHeader>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Nome</TableCell>
                                                    <TableCell align="center">Obrig.</TableCell>
                                                    <TableCell align="center">Editável</TableCell>
                                                    <TableCell align="right">Ações</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {assocList.map((a) => (
                                                    <TableRow key={a.pk} hover>
                                                        <TableCell>{a.name}</TableCell>
                                                        <TableCell align="center">{a.mandatory ? 'Sim' : 'Não'}</TableCell>
                                                        <TableCell align="center">{a.editable ? 'Sim' : 'Não'}</TableCell>
                                                        <TableCell align="right">
                                                            <Tooltip title="Editar">
                                                                <IconButton size="small" onClick={() => setAssocForm({ ...a, isNew: false })}><Edit fontSize="small" /></IconButton>
                                                            </Tooltip>
                                                            <Tooltip title="Remover">
                                                                <IconButton size="small" color="error"
                                                                    onClick={() => { if (window.confirm(`Remover "${a.name}" desta ação?`)) deleteAssocMut.mutate(a.pk); }}>
                                                                    <Delete fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                {assocList.length === 0 && (
                                                    <TableRow><TableCell colSpan={4}><Alert severity="info">Sem parâmetros associados.</Alert></TableCell></TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                )}

                                {assocForm && (
                                    <Box sx={{ mt: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                                        <Stack spacing={2}>
                                            {assocForm.isNew ? (
                                                <TextField select label="Parâmetro do catálogo" size="small" fullWidth
                                                    value={assocForm.tb_param}
                                                    onChange={(e) => setAssocForm((f) => ({ ...f, tb_param: e.target.value }))}>
                                                    {catalog.map((p) => <MenuItem key={p.pk} value={p.pk}>{p.name}</MenuItem>)}
                                                </TextField>
                                            ) : (
                                                <Typography variant="body2"><strong>{assocForm.name}</strong></Typography>
                                            )}
                                            <TextField label="Ordem" type="number" size="small" fullWidth value={assocForm.sort}
                                                onChange={(e) => setAssocForm((f) => ({ ...f, sort: e.target.value }))} />
                                            <Stack direction="row" spacing={2}>
                                                <Stack direction="row" alignItems="center">
                                                    <Checkbox checked={!!assocForm.mandatory}
                                                        onChange={(e) => setAssocForm((f) => ({ ...f, mandatory: e.target.checked }))} />
                                                    <Typography variant="body2">Obrigatório</Typography>
                                                </Stack>
                                                <Stack direction="row" alignItems="center">
                                                    <Checkbox checked={!!assocForm.editable}
                                                        onChange={(e) => setAssocForm((f) => ({ ...f, editable: e.target.checked }))} />
                                                    <Typography variant="body2">Editável</Typography>
                                                </Stack>
                                                <Stack direction="row" alignItems="center">
                                                    <Checkbox checked={!!assocForm.oncreate}
                                                        onChange={(e) => setAssocForm((f) => ({ ...f, oncreate: e.target.checked }))} />
                                                    <Typography variant="body2">Preenchido na criação</Typography>
                                                </Stack>
                                            </Stack>
                                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                <Button size="small" onClick={() => setAssocForm(null)}>Cancelar</Button>
                                                <Button size="small" variant="contained" onClick={handleSaveAssoc}
                                                    disabled={createAssocMut.isPending || updateAssocMut.isPending}>
                                                    Guardar
                                                </Button>
                                            </Stack>
                                        </Stack>
                                    </Box>
                                )}
                            </>
                        )}
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Fechar</Button>
            </DialogActions>
        </Dialog>
    );
};

export default ParamConfigDialog;
