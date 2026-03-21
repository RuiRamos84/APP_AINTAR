/**
 * EquipamentoInstalacaoPage
 * Página standalone para gestão de equipamentos instalados.
 * Aparece em /equipamento (Área Interna) e também como tab em ETAR/EE.
 */
import { useState, useMemo } from 'react';
import { Box, TextField, MenuItem, Typography } from '@mui/material';
import { Build as BuildIcon } from '@mui/icons-material';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import { useMetaData } from '@/core/hooks/useMetaData';
import EquipamentoModule from '../components/EquipamentoModule';

const COLOR = '#5c6bc0';

const EquipamentoInstalacaoPage = () => {
  const { data: meta } = useMetaData();
  const instalacoes = meta?.instalacao || [];

  const [selectedInstalacao, setSelectedInstalacao] = useState('');

  const agrupados = useMemo(() => {
    const map = {};
    for (const inst of instalacoes) {
      const grupo = inst.tipo || inst.ts_entity || 'Outros';
      if (!map[grupo]) map[grupo] = [];
      map[grupo].push(inst);
    }
    return map;
  }, [instalacoes]);

  const selectorActions = (
    <TextField
      select size="small" label="Instalação"
      value={selectedInstalacao}
      onChange={(e) => setSelectedInstalacao(e.target.value)}
      sx={{ minWidth: 260 }}
    >
      <MenuItem value=""><em>— Selecionar instalação —</em></MenuItem>
      {Object.entries(agrupados).map(([grupo, items]) => [
        <MenuItem key={`group-${grupo}`} disabled sx={{ fontWeight: 700, opacity: 1 }}>
          {grupo}
        </MenuItem>,
        ...items.map((inst) => (
          <MenuItem key={inst.pk} value={inst.pk} sx={{ pl: 3 }}>
            {inst.nome}
          </MenuItem>
        )),
      ])}
    </TextField>
  );

  return (
    <ModulePage
      title="Equipamentos Instalados"
      icon={BuildIcon}
      color={COLOR}
      breadcrumbs={[
        { label: 'Início', path: '/home' },
        { label: 'Área Interna', path: '/internal' },
        { label: 'Equipamentos Instalados' },
      ]}
      actions={selectorActions}
    >
      <EquipamentoModule tbInstalacao={selectedInstalacao || null} color={COLOR} />
    </ModulePage>
  );
};

export default EquipamentoInstalacaoPage;
