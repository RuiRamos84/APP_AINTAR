import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export interface VoltaExportRow {
  tb_instalacao?: string;
  tt_operacaoaccao?: string;
  tt_operacaomodo?: string;
  tt_operacaodia?: string;
  ts_operador1?: string;
  ts_operador2?: string;
}

const COLUMN_WIDTHS = [
  { wch: 5 }, { wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 18 }, { wch: 20 }, { wch: 20 },
];

// Mirrors frontend-v2's exportMetasToExcel (features/operations/services/exportService.js)
export const exportVoltasToExcel = async (
  voltas: VoltaExportRow[],
  filename = 'Voltas_Operacao'
): Promise<void> => {
  if (!voltas.length) return;

  const headers = ['#', 'Instalação', 'Ação', 'Modo', 'Dia', 'Operador Principal', 'Operador Secundário'];
  const rows = voltas.map((v, i) => [
    i + 1,
    v.tb_instalacao || '-',
    v.tt_operacaoaccao || '-',
    v.tt_operacaomodo || '-',
    v.tt_operacaodia || '-',
    v.ts_operador1 || 'Não atribuído',
    v.ts_operador2 || 'Não atribuído',
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = COLUMN_WIDTHS;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Voltas');

  const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  const date = new Date().toISOString().slice(0, 10);
  const uri = `${FileSystem.cacheDirectory}${filename}_${date}.xlsx`;

  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Exportar Voltas',
    });
  }
};
