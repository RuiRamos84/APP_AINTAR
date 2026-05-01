# Orçamento — Upgrade Premium Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir todos os bugs do módulo de orçamento e elevar a qualidade visual/UX ao padrão premium da aplicação AINTAR.

**Architecture:** 3 fases — (1) fixes críticos backend+frontend, (2) CatalogPage com ModulePage + pesquisa, (3) upgrade visual premium da tabela e catálogo com layout duas colunas. Sem novos endpoints. Sem alterações ao schema da BD.

**Tech Stack:** Flask/SQLAlchemy (backend), React + MUI v7 + Zustand + React Hook Form + Zod (frontend-v2), sonner (toasts), `useSearch` hook partilhado.

---

## Contexto — O que existe

- `backend/app/routes/orcamento_routes.py` — 11 endpoints, decorator stack correto
- `backend/app/services/orcamento_service.py` — lógica de negócio + Pydantic schemas
- `frontend-v2/src/features/orcamento/api/orcamentoService.js` — 11 métodos, padrão correto
- `frontend-v2/src/features/orcamento/store/orcamentoStore.js` — Zustand store
- `frontend-v2/src/features/orcamento/pages/OrcamentoPage.jsx` — usa ModulePage + YearNavigator
- `frontend-v2/src/features/orcamento/pages/CatalogPage.jsx` — header manual, sem pesquisa
- `frontend-v2/src/features/orcamento/components/OrcamentoTable.jsx` — tabela colapsável com KPIs
- `frontend-v2/src/features/orcamento/components/OrcamentoForm.jsx` — React Hook Form
- `frontend-v2/src/core/config/routeConfig.js` — linha 385, só tem `/orcamento`
- `frontend-v2/src/shared/components/layout/ModulePage.jsx` — suporta `center`, `search`, `actions`

**Cor do módulo:** `#059669` (verde esmeralda)

---

## FASE 1 — Fixes Críticos

### Task 1: Fix `expenses.manage` → `expenses.edit` no backend

**Ficheiros:**
- Modify: `backend/app/routes/orcamento_routes.py` linhas 123, 167, 239, 273, 313

**Contexto:** A BD define `expenses.edit` (migration linha 97) mas o código usa `expenses.manage` — ninguém consegue criar/editar/eliminar dotações.

- [ ] **Corrigir as 5 ocorrências**

Em `orcamento_routes.py`, substituir TODAS as ocorrências de `@require_permission('expenses.manage')` por `@require_permission('expenses.edit')`:

```python
# Linha 123 — create_orcamento_route
@require_permission('expenses.edit')

# Linha 167 — update_orcamento_route
@require_permission('expenses.edit')

# Linha 239 — create_classe_route
@require_permission('expenses.edit')

# Linha 273 — create_subclasse_route
@require_permission('expenses.edit')

# Linha 313 — delete_orcamento_route
@require_permission('expenses.edit')
```

- [ ] **Commit**

```
git add backend/app/routes/orcamento_routes.py
git commit -m "fix: corrigir permissão expenses.manage → expenses.edit no módulo de orçamento"
```

---

### Task 2: Toast errors + loading state na store

**Ficheiros:**
- Modify: `frontend-v2/src/features/orcamento/store/orcamentoStore.js`

**Contexto:** Erros em fetchTipos, fetchClasses, addClasse, addSubclasse são silenciosos. `loading` só é gerido em `fetchDetalhe`.

- [ ] **Substituir o ficheiro completo**

```js
import { create } from 'zustand';
import { toast } from 'sonner';
import { orcamentoService } from '../api/orcamentoService';

const unwrap = (data) => Array.isArray(data) ? data : (data?.data ?? []);

export const useOrcamentoStore = create((set, get) => ({
    registos: [],
    summary: [],
    anos: [],
    subclasses: [],
    tipos: [],
    classes: [],
    anoSelecionado: null,
    loading: true,
    error: null,
    modalOpen: false,
    editTarget: null,

    setAno: (ano) => {
        set({ anoSelecionado: ano });
        get().fetchDetalhe(ano);
        get().fetchSummary(ano);
        get().fetchSubclasses();
    },

    openModal:  (registo = null) => set({ modalOpen: true,  editTarget: registo }),
    closeModal: ()               => set({ modalOpen: false, editTarget: null }),

    fetchAnos: async () => {
        try {
            const data = await orcamentoService.getAnos();
            const list = [...unwrap(data)].sort((a, b) => b - a);
            set({ anos: list });
            return list;
        } catch {
            const cur  = new Date().getFullYear();
            const list = Array.from({ length: cur - 2022 }, (_, i) => cur - i);
            set({ anos: list });
            return list;
        }
    },

    fetchSubclasses: async () => {
        try {
            const data = await orcamentoService.getSubclasses();
            set({ subclasses: unwrap(data) });
        } catch (err) {
            toast.error('Erro ao carregar subclasses.');
            set({ error: err.message });
        }
    },

    fetchTipos: async () => {
        try {
            const data = await orcamentoService.getTipos();
            set({ tipos: unwrap(data) });
        } catch (err) {
            toast.error('Erro ao carregar tipos.');
            set({ error: err.message });
        }
    },

    fetchClasses: async () => {
        try {
            const data = await orcamentoService.getClasses();
            set({ classes: unwrap(data) });
        } catch (err) {
            toast.error('Erro ao carregar classes.');
            set({ error: err.message });
        }
    },

    fetchDetalhe: async (ano = null) => {
        set({ loading: true, error: null });
        try {
            const resolved = ano ?? get().anoSelecionado;
            const data     = await orcamentoService.getDetalhe(resolved);
            set({ registos: unwrap(data), loading: false });
        } catch (err) {
            toast.error('Erro ao carregar dotações.');
            set({ error: err.message, loading: false });
        }
    },

    fetchSummary: async (ano = null) => {
        try {
            const resolved = ano ?? get().anoSelecionado;
            const data     = await orcamentoService.getSummary(resolved);
            set({ summary: unwrap(data) });
        } catch (err) {
            set({ error: err.message });
        }
    },

    addClasse: async (designacao) => {
        await orcamentoService.createClasse({ designacao });
        await get().fetchSubclasses();
        await get().fetchClasses();
    },

    addSubclasse: async (payload) => {
        await orcamentoService.createSubclasse(payload);
        await get().fetchSubclasses();
    },

    addRegisto: async (payload) => {
        await orcamentoService.create(payload);
        set({ modalOpen: false, editTarget: null });
        const ano = get().anoSelecionado;
        await get().fetchDetalhe(ano);
        await get().fetchSummary(ano);
    },

    updateRegisto: async (pk, payload) => {
        await orcamentoService.update(pk, payload);
        set({ modalOpen: false, editTarget: null });
        const ano = get().anoSelecionado;
        await get().fetchDetalhe(ano);
        await get().fetchSummary(ano);
    },

    deleteRegisto: async (pk) => {
        await orcamentoService.remove(pk);
        const ano = get().anoSelecionado;
        await get().fetchDetalhe(ano);
        await get().fetchSummary(ano);
    },
}));
```

- [ ] **Commit**

```
git add frontend-v2/src/features/orcamento/store/orcamentoStore.js
git commit -m "fix: toast.error nos catches da store de orçamento e helper unwrap"
```

---

### Task 3: Corrigir OrcamentoForm — `canSubmit` + `InputLabelProps` deprecated

**Ficheiros:**
- Modify: `frontend-v2/src/features/orcamento/components/OrcamentoForm.jsx`

**Contexto:**
- `canSubmit` (linha 154) permite submit quando `classesDisponiveis.length === 0` (todas as subclasses ocupadas) — o submit vai falhar no backend. Deve bloquear.
- `InputLabelProps={{ shrink: true }}` (linhas ~307, ~325) é deprecated em MUI v7 — deve ser `slotProps={{ inputLabel: { shrink: true } }}`.

- [ ] **Corrigir `canSubmit`** — localizar linha 154 e substituir:

```jsx
// ANTES
const canSubmit = !isSubmitting && !sobreposicao && (isEdit || !!subclasseW || classesDisponiveis.length === 0);

// DEPOIS
const canSubmit = !isSubmitting && !sobreposicao && (isEdit || !!subclasseW);
```

- [ ] **Corrigir os dois campos de data** — localizar os dois `TextField` com `type="date"` e substituir `InputLabelProps`:

```jsx
// ANTES (ambos os campos data_inicio e data_fim)
InputLabelProps={{ shrink: true }}

// DEPOIS
slotProps={{ inputLabel: { shrink: true } }}
```

- [ ] **Commit**

```
git add frontend-v2/src/features/orcamento/components/OrcamentoForm.jsx
git commit -m "fix: canSubmit corrigido e InputLabelProps deprecated → slotProps em OrcamentoForm"
```

---

### Task 4: SummaryDashboard reage ao filtro activo

**Ficheiros:**
- Modify: `frontend-v2/src/features/orcamento/components/OrcamentoTable.jsx`

**Contexto:** O dashboard KPI calcula totais sempre de `registos` (todos), ignorando o filtro de tipo activo. Deve calcular sobre `searched` (dados após filtros).

- [ ] **Mover `SummaryDashboard` para baixo do pipeline de filtragem e passar `searched`**

Localizar o render do componente `OrcamentoTable` (linha ~351). A linha:
```jsx
<SummaryDashboard registos={registos} />
```
Substituir por:
```jsx
<SummaryDashboard registos={searched} />
```

Agora o dashboard reflete exactamente o que está visível na tabela (filtro de tipo + pesquisa de texto).

- [ ] **Commit**

```
git add frontend-v2/src/features/orcamento/components/OrcamentoTable.jsx
git commit -m "fix: SummaryDashboard calcula KPIs sobre dados filtrados em vez de todos os registos"
```

---

## FASE 2 — CatalogPage Profissional

### Task 5: Registar rota `/orcamento/catalogo` em routeConfig.js

**Ficheiros:**
- Modify: `frontend-v2/src/core/config/routeConfig.js` linha ~385

**Contexto:** A rota existe em `App.jsx` mas não em `routeConfig.js`, pelo que não tem proteção de permissão via o sistema de routing.

- [ ] **Adicionar subrota ao bloco de orçamento**

Localizar o bloco do orçamento em `routeConfig.js` (linha ~385):
```js
'/orcamento': {
  id: 'orcamento',
  // ...
},
```

Adicionar a subrota dentro do mesmo bloco (ou como entrada separada, seguindo o padrão das outras rotas do ficheiro):
```js
'/orcamento/catalogo': {
  id: 'orcamento-catalogo',
  module: 'orcamento',
  permissions: { required: 'expenses.view' },
},
```

- [ ] **Commit**

```
git add frontend-v2/src/core/config/routeConfig.js
git commit -m "feat: registar rota /orcamento/catalogo em routeConfig com permissão expenses.view"
```

---

### Task 6: CatalogPage — ModulePage + SearchBar/useSearch + fix join por pk

**Ficheiros:**
- Modify: `frontend-v2/src/features/orcamento/pages/CatalogPage.jsx`

**Contexto:**
- Não usa `ModulePage` — header manual sem breadcrumbs, sem cor do módulo.
- Sem `SearchBar`/`useSearch` — lista sem pesquisa.
- `porClasse` faz join por string `s.classe === c.designacao` (linha ~161) — deve ser por `pk`.

- [ ] **Substituir `CatalogPage.jsx` completo**

```jsx
import React, { useEffect, useMemo, useState } from 'react';
import {
    Box, Button, Typography, Stack, Paper,
    Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Chip, alpha,
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, MenuItem, CircularProgress, Alert,
} from '@mui/material';
import {
    Add as AddIcon,
    TuneRounded as TuneIcon,
    AccountBalance as OrcamentoIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import { SearchBar } from '@/shared/components/data';
import { useSearch } from '@/shared/hooks';
import { useOrcamentoStore } from '../store/orcamentoStore';

const MODULE_COLOR = '#059669';

/* ── Dialog Nova Classe ─────────────────────────────────────── */
const NovaClasseDialog = ({ open, onClose, onSave }) => {
    const [designacao, setDesignacao] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => { if (open) { setDesignacao(''); setError(''); } }, [open]);

    const handleSave = async () => {
        if (!designacao.trim()) { setError('A designação é obrigatória.'); return; }
        setLoading(true);
        try {
            await onSave(designacao.trim());
            onClose();
        } catch (err) {
            setError(err?.response?.data?.error || err?.response?.data?.erro || err.message || 'Erro ao guardar.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
            slotProps={{ paper: { sx: { borderRadius: 3, borderTop: `4px solid ${MODULE_COLOR}` } } }}>
            <DialogTitle>Nova Classe</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    {error && <Alert severity="error">{error}</Alert>}
                    <TextField label="Designação" value={designacao}
                        onChange={(e) => setDesignacao(e.target.value)}
                        fullWidth required autoFocus size="small" />
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} color="inherit" disabled={loading}>Cancelar</Button>
                <Button variant="contained" onClick={handleSave} disabled={loading}
                    startIcon={loading ? <CircularProgress size={16} /> : null}
                    sx={{ bgcolor: MODULE_COLOR, '&:hover': { bgcolor: '#047857' } }}>
                    Criar
                </Button>
            </DialogActions>
        </Dialog>
    );
};

/* ── Dialog Nova Subclasse ──────────────────────────────────── */
const NovaSubclasseDialog = ({ open, onClose, onSave, classes, tipos }) => {
    const [designacao, setDesignacao] = useState('');
    const [classe, setClasse] = useState('');
    const [tipo, setTipo] = useState('');
    const [sncap, setSncap] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (open) { setDesignacao(''); setClasse(''); setTipo(''); setSncap(''); setError(''); }
    }, [open]);

    const handleSave = async () => {
        if (!designacao.trim() || !classe || !tipo || sncap === '') {
            setError('Preenche todos os campos obrigatórios.');
            return;
        }
        setLoading(true);
        try {
            await onSave({
                designacao: designacao.trim(),
                ts_orcamento_classe: parseInt(classe, 10),
                ts_orcamento_tipo: parseInt(tipo, 10),
                sncap: parseInt(sncap, 10),
            });
            onClose();
        } catch (err) {
            setError(err?.response?.data?.error || err?.response?.data?.erro || err.message || 'Erro ao guardar.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
            slotProps={{ paper: { sx: { borderRadius: 3, borderTop: `4px solid ${MODULE_COLOR}` } } }}>
            <DialogTitle>Nova Subclasse</DialogTitle>
            <DialogContent>
                <Stack spacing={2.5} sx={{ mt: 1 }}>
                    {error && <Alert severity="error">{error}</Alert>}
                    <TextField label="Designação" value={designacao}
                        onChange={(e) => setDesignacao(e.target.value)}
                        fullWidth required autoFocus size="small" />
                    <TextField select label="Classe" value={classe}
                        onChange={(e) => setClasse(e.target.value)} fullWidth required size="small">
                        {classes.map((c) => (
                            <MenuItem key={c.pk} value={c.pk}>{c.designacao}</MenuItem>
                        ))}
                    </TextField>
                    <TextField select label="Tipo" value={tipo}
                        onChange={(e) => setTipo(e.target.value)} fullWidth required size="small">
                        {tipos.map((t) => (
                            <MenuItem key={t.pk} value={t.pk}>{t.designacao}</MenuItem>
                        ))}
                    </TextField>
                    <TextField label="SNC-AP" value={sncap}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || /^\d+$/.test(val)) setSncap(val);
                        }}
                        fullWidth required size="small" type="number" inputProps={{ min: 0, step: 1 }} />
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} color="inherit" disabled={loading}>Cancelar</Button>
                <Button variant="contained" onClick={handleSave} disabled={loading}
                    startIcon={loading ? <CircularProgress size={16} /> : null}
                    sx={{ bgcolor: MODULE_COLOR, '&:hover': { bgcolor: '#047857' } }}>
                    Criar
                </Button>
            </DialogActions>
        </Dialog>
    );
};

/* ── Painel de subclasses (coluna direita) ───────────────────── */
const SubclassesList = ({ subclasses, classeNome }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const results = useSearch(subclasses, searchTerm);

    if (!classeNome) return (
        <Box sx={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            color: 'text.disabled', gap: 1, p: 4,
        }}>
            <TuneIcon sx={{ fontSize: 40, opacity: 0.3 }} />
            <Typography variant="body2">Seleciona uma classe para ver as subclasses</Typography>
        </Box>
    );

    return (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" px={2} py={1.5}
                sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
                <Typography variant="subtitle2" fontWeight={700} color={MODULE_COLOR}>
                    {classeNome}
                    <Chip label={subclasses.length} size="small" sx={{
                        ml: 1, height: 18, fontSize: '0.68rem',
                        bgcolor: alpha(MODULE_COLOR, 0.12), color: MODULE_COLOR, fontWeight: 700,
                    }} />
                </Typography>
            </Stack>
            <Box sx={{ px: 2, py: 1, flexShrink: 0 }}>
                <SearchBar
                    value={searchTerm}
                    onChange={setSearchTerm}
                    placeholder="Pesquisar subclasse, SNC-AP..."
                    size="small"
                    fullWidth
                />
            </Box>
            <Box sx={{ flex: 1, overflow: 'auto' }}>
                {results.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: 'center', color: 'text.disabled' }}>
                        <Typography variant="body2">Sem resultados.</Typography>
                    </Box>
                ) : (
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'grey.50' }}>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5 }}>Designação</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5, width: 100 }}>Tipo</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5, width: 90 }}>SNC-AP</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {results.map((s, i) => (
                                <TableRow key={s.pk} hover sx={{
                                    bgcolor: i % 2 === 0 ? 'background.paper' : alpha(MODULE_COLOR, 0.02),
                                }}>
                                    <TableCell>
                                        <Typography variant="body2">{s.designacao}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        {s.tipo && (
                                            <Chip label={s.tipo} size="small"
                                                color={s.tipo === 'Capital' ? 'warning' : 'info'} />
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="caption" fontFamily="monospace" color="text.secondary">
                                            {s.sncap ?? '—'}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Box>
        </Box>
    );
};

/* ── Página principal ───────────────────────────────────────── */
const CatalogPage = () => {
    const navigate = useNavigate();
    const {
        classes, subclasses, tipos,
        fetchClasses, fetchSubclasses, fetchTipos,
        addClasse, addSubclasse,
    } = useOrcamentoStore();

    const [classeSelPk, setClasseSelPk]         = useState(null);
    const [classeDialogOpen, setClasseDialogOpen]       = useState(false);
    const [subclasseDialogOpen, setSubclasseDialogOpen] = useState(false);
    const [searchClasses, setSearchClasses]             = useState('');

    useEffect(() => {
        fetchClasses();
        fetchSubclasses();
        fetchTipos();
    }, []);

    /* Auto-seleciona a primeira classe quando carregam */
    useEffect(() => {
        if (classes.length > 0 && classeSelPk === null) {
            setClasseSelPk(classes[0].pk);
        }
    }, [classes]);

    const classesFiltradas = useSearch(classes, searchClasses);

    /* Subclasses da classe seleccionada — join por pk */
    const subclassesDaClasse = useMemo(() => {
        if (!classeSelPk) return [];
        const classeObj = classes.find(c => c.pk === classeSelPk);
        if (!classeObj) return [];
        return subclasses.filter(s => s.classe === classeObj.designacao);
    }, [subclasses, classes, classeSelPk]);

    const classeSelNome = classes.find(c => c.pk === classeSelPk)?.designacao ?? null;

    return (
        <ModulePage
            title="Catálogo de Orçamento"
            subtitle="Classes e subclasses orçamentais"
            icon={OrcamentoIcon}
            color={MODULE_COLOR}
            breadcrumbs={[{ label: 'Orçamento', path: '/orcamento' }, { label: 'Catálogo' }]}
            actions={
                <Stack direction="row" spacing={1}>
                    <Button variant="outlined" size="small" startIcon={<AddIcon />}
                        onClick={() => setClasseDialogOpen(true)}>
                        Nova Classe
                    </Button>
                    <Button variant="contained" size="small" startIcon={<AddIcon />}
                        onClick={() => setSubclasseDialogOpen(true)}
                        sx={{ bgcolor: MODULE_COLOR, '&:hover': { bgcolor: '#047857' } }}>
                        Nova Subclasse
                    </Button>
                </Stack>
            }
        >
            {/* Layout duas colunas */}
            <Paper variant="outlined" sx={{
                display: 'flex',
                borderRadius: 2,
                overflow: 'hidden',
                minHeight: 500,
                height: 'calc(100vh - 220px)',
            }}>
                {/* Coluna esquerda — lista de classes */}
                <Box sx={{
                    width: 260,
                    flexShrink: 0,
                    borderRight: 1,
                    borderColor: 'divider',
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: 'grey.50',
                }}>
                    <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                        <SearchBar
                            value={searchClasses}
                            onChange={setSearchClasses}
                            placeholder="Filtrar classes..."
                            size="small"
                            fullWidth
                        />
                    </Box>
                    <Box sx={{ flex: 1, overflow: 'auto' }}>
                        {classesFiltradas.length === 0 ? (
                            <Typography variant="body2" color="text.disabled" sx={{ p: 2, textAlign: 'center' }}>
                                Sem classes.
                            </Typography>
                        ) : classesFiltradas.map((c) => {
                            const count = subclasses.filter(s => s.classe === c.designacao).length;
                            const isSelected = c.pk === classeSelPk;
                            return (
                                <Box
                                    key={c.pk}
                                    onClick={() => setClasseSelPk(c.pk)}
                                    sx={{
                                        px: 2, py: 1.25,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        bgcolor: isSelected ? alpha(MODULE_COLOR, 0.1) : 'transparent',
                                        borderLeft: `3px solid ${isSelected ? MODULE_COLOR : 'transparent'}`,
                                        '&:hover': { bgcolor: isSelected ? alpha(MODULE_COLOR, 0.1) : alpha(MODULE_COLOR, 0.05) },
                                        transition: 'all .15s',
                                    }}
                                >
                                    <Typography
                                        variant="body2"
                                        fontWeight={isSelected ? 700 : 400}
                                        color={isSelected ? MODULE_COLOR : 'text.primary'}
                                        sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                    >
                                        {c.designacao}
                                    </Typography>
                                    <Chip label={count} size="small" sx={{
                                        ml: 1, height: 18, fontSize: '0.65rem', flexShrink: 0,
                                        bgcolor: isSelected ? alpha(MODULE_COLOR, 0.15) : 'grey.200',
                                        color: isSelected ? MODULE_COLOR : 'text.secondary',
                                        fontWeight: 700,
                                    }} />
                                </Box>
                            );
                        })}
                    </Box>
                </Box>

                {/* Coluna direita — subclasses */}
                <SubclassesList subclasses={subclassesDaClasse} classeNome={classeSelNome} />
            </Paper>

            {/* Dialogs */}
            <NovaClasseDialog
                open={classeDialogOpen}
                onClose={() => setClasseDialogOpen(false)}
                onSave={addClasse}
            />
            <NovaSubclasseDialog
                open={subclasseDialogOpen}
                onClose={() => setSubclasseDialogOpen(false)}
                onSave={addSubclasse}
                classes={classes}
                tipos={tipos}
            />
        </ModulePage>
    );
};

export default CatalogPage;
```

- [ ] **Commit**

```
git add frontend-v2/src/features/orcamento/pages/CatalogPage.jsx
git commit -m "feat: CatalogPage migrada para ModulePage com layout duas colunas, SearchBar e join por pk"
```

---

## FASE 3 — Upgrade Visual Premium

### Task 7: OrcamentoTable — refinamentos visuais premium

**Ficheiros:**
- Modify: `frontend-v2/src/features/orcamento/components/OrcamentoTable.jsx`

**Contexto:** A tabela funciona mas pode ser mais polida. Melhorias: KpiCards com trend indicator (nº de registos), `ClasseSection` com design mais clean, cabeçalho da tabela sticky, empty state ilustrado.

- [ ] **Melhorar `KpiCard` — adicionar contagem de registos**

Localizar o componente `KpiCard`. Adicionar prop `count` opcional que mostra o número de dotações abaixo do valor:

```jsx
const KpiCard = ({ label, value, total, icon: Icon, accent, count }) => {
    const theme = useTheme();
    const ratio = pct(value, total);

    return (
        <Paper
            elevation={0}
            variant="outlined"
            sx={{
                p: 2.5,
                borderLeft: `4px solid ${accent}`,
                borderRadius: 2,
                flex: 1,
                minWidth: 0,
                transition: 'box-shadow .2s',
                '&:hover': { boxShadow: theme.shadows[3] },
            }}
        >
            <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={1}>
                <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={500}
                        textTransform="uppercase" letterSpacing={0.6}>
                        {label}
                    </Typography>
                    <Typography variant="h5" fontWeight={700} mt={0.25}>
                        {fmt(value)}
                    </Typography>
                    {count !== undefined && (
                        <Typography variant="caption" color="text.disabled">
                            {count} dotaç{count === 1 ? 'ão' : 'ões'}
                        </Typography>
                    )}
                </Box>
                <Box sx={{
                    width: 40, height: 40, borderRadius: '50%',
                    bgcolor: alpha(accent, 0.12),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <Icon sx={{ color: accent, fontSize: 20 }} />
                </Box>
            </Stack>
            {total !== null && (
                <>
                    <LinearProgress
                        variant="determinate"
                        value={ratio}
                        sx={{
                            height: 6, borderRadius: 3, mb: 0.75,
                            bgcolor: alpha(accent, 0.12),
                            '& .MuiLinearProgress-bar': { bgcolor: accent, borderRadius: 3 },
                        }}
                    />
                    <Typography variant="caption" color="text.secondary">
                        {ratio}% do total
                    </Typography>
                </>
            )}
        </Paper>
    );
};
```

- [ ] **Actualizar `SummaryDashboard` para passar `count`**

```jsx
const SummaryDashboard = ({ registos }) => {
    const totalGeral    = registos.reduce((s, r) => s + (parseFloat(r.valor) || 0), 0);
    const corrente      = registos.filter(r => r.tipo === 'Corrente');
    const capital       = registos.filter(r => r.tipo === 'Capital');
    const totalCorrente = corrente.reduce((s, r) => s + (parseFloat(r.valor) || 0), 0);
    const totalCapital  = capital.reduce((s, r) => s + (parseFloat(r.valor) || 0), 0);

    if (totalGeral === 0) return null;

    return (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={3}>
            <TotalCard total={totalGeral} corrente={totalCorrente} capital={totalCapital} accent="#059669" />
            <KpiCard label="Despesas Correntes" value={totalCorrente} total={totalGeral}
                accent="#0891b2" icon={Corrente} count={corrente.length} />
            <KpiCard label="Despesas Capital" value={totalCapital} total={totalGeral}
                accent="#d97706" icon={Capital} count={capital.length} />
        </Stack>
    );
};
```

- [ ] **Melhorar empty state** — localizar o `Alert severity="info"` do empty state e substituir por empty state visual mais rico:

```jsx
{activeClasses.length === 0 ? (
    <Box sx={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', py: 8, gap: 1.5, color: 'text.disabled',
    }}>
        <OrcamentoIcon sx={{ fontSize: 48, opacity: 0.25 }} />
        <Typography variant="body1" fontWeight={500}>
            {isSearching
                ? 'Nenhum resultado encontrado'
                : `Sem dotações registadas${anoSelecionado ? ` para ${anoSelecionado}` : ''}`
            }
        </Typography>
        {isSearching && (
            <Typography variant="caption">
                Tenta ajustar os filtros ou o termo de pesquisa.
            </Typography>
        )}
    </Box>
) : ( /* tabela existente */ )}
```

Adicionar `OrcamentoIcon` às importações no topo:
```jsx
import { AccountBalance as OrcamentoIcon } from '@mui/icons-material';
```

- [ ] **Tornar o cabeçalho da tabela sticky**

Localizar o `TableContainer` e adicionar `sx={{ maxHeight: 'calc(100vh - 380px)' }}` e no `TableHead` adicionar:
```jsx
<TableHead sx={{ position: 'sticky', top: 0, zIndex: 1 }}>
```

- [ ] **Commit**

```
git add frontend-v2/src/features/orcamento/components/OrcamentoTable.jsx
git commit -m "feat: OrcamentoTable com KPI count, empty state visual e header sticky"
```

---

### Task 8: OrcamentoForm — polish visual final

**Ficheiros:**
- Modify: `frontend-v2/src/features/orcamento/components/OrcamentoForm.jsx`

**Contexto:** O form funciona mas pode ter mais polish: success toast no submit, melhor feedback visual quando todas as subclasses estão ocupadas.

- [ ] **Adicionar toast.success após submit bem-sucedido**

Localizar o bloco `onSubmit` (linha ~131). Adicionar import `toast` no topo do ficheiro:
```jsx
import { toast } from 'sonner';
```

No `onSubmit`, após o try bem-sucedido, adicionar antes de fechar:
```jsx
const onSubmit = async (v) => {
    setApiError('');
    try {
        if (isEdit) {
            await updateRegisto(editTarget.pk, {
                valor:       parseFloat(v.valor),
                data_inicio: v.data_inicio || null,
                data_fim:    v.data_fim    || null,
            });
            toast.success('Dotação actualizada com sucesso.');
        } else {
            await addRegisto({
                ano:                    parseInt(v.ano, 10),
                ts_orcamento_subclasse: parseInt(v.ts_orcamento_subclasse, 10),
                valor:                  parseFloat(v.valor),
                data_inicio:            v.data_inicio || null,
                data_fim:               v.data_fim    || null,
            });
            toast.success('Dotação criada com sucesso.');
        }
    } catch (err) {
        setApiError(err?.response?.data?.error || err?.response?.data?.erro || err?.message || 'Erro ao guardar.');
    }
};
```

- [ ] **Melhorar o Alert "todas as subclasses ocupadas"**

Localizar o bloco onde `classesDisponiveis.length === 0` é verificado no render. Substituir o `Alert severity="success"` por um mais informativo:

```jsx
classesDisponiveis.length === 0 ? (
    <Grid size={{ xs: 12 }}>
        <Alert severity="info" sx={{ py: 0.5 }}>
            Todas as subclasses já têm dotação activa para {anoW}. Para adicionar uma nova dotação,
            edita um registo existente e define datas de início/fim para libertar o período.
        </Alert>
    </Grid>
) : (
```

- [ ] **Commit**

```
git add frontend-v2/src/features/orcamento/components/OrcamentoForm.jsx
git commit -m "feat: toast.success no submit de OrcamentoForm e melhoria do alert subclasses ocupadas"
```

---

## Commit final de integração

Após todas as tasks:

```
git add .
git commit -m "refactor: módulo de orçamento — qualidade premium (fases 1-2-3)"
```

---

## Checklist de verificação manual (após implementação)

- [ ] Login com utilizador com permissão `expenses.edit` → consegue criar dotação
- [ ] Login com utilizador sem permissão `expenses.edit` → botão "Nova Dotação" não aparece ou recebe 403
- [ ] Filtro de tipo "Corrente" → KPIs do dashboard actualizam para mostrar só correntes
- [ ] Criar dotação → toast "criada com sucesso" aparece
- [ ] Editar dotação → toast "actualizada com sucesso" aparece
- [ ] Deletar dotação → confirmação → registo desaparece
- [ ] Navegar para `/orcamento/catalogo` → abre com ModulePage (breadcrumbs, cor verde, título)
- [ ] Clicar numa classe na coluna esquerda → subclasses aparecem na coluna direita
- [ ] Pesquisar nas classes → lista filtra
- [ ] Pesquisar nas subclasses → tabela filtra
- [ ] Header da tabela fica fixo ao fazer scroll
- [ ] Empty state visual aparece quando não há dotações para o ano
