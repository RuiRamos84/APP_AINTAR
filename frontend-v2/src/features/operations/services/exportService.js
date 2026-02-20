import * as XLSX from 'xlsx';

/**
 * Serviço de exportação de dados operacionais para Excel/CSV
 */

const COLUMN_WIDTHS = {
    pk: 8,
    instalacao: 30,
    acao: 20,
    modo: 15,
    dia: 18,
    operador: 20,
    status: 12,
    data: 18,
    valor: 15,
    observacoes: 35,
};

/**
 * Exportar dados de metas/voltas para Excel
 */
export const exportMetasToExcel = (metas, { filename = 'Voltas_Operacao' } = {}) => {
    if (!metas?.length) return;

    const headers = ['#', 'Instalação', 'Ação', 'Modo', 'Dia', 'Operador Principal', 'Operador Secundário'];

    const rows = metas.map((m, i) => [
        i + 1,
        m.tb_instalacao || '-',
        m.tt_operacaoaccao || '-',
        m.tt_operacaomodo || '-',
        m.tt_operacaodia || '-',
        m.ts_operador1 || 'Não atribuído',
        m.ts_operador2 || 'Não atribuído',
    ]);

    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Larguras de coluna
    ws['!cols'] = [
        { wch: 5 },
        { wch: COLUMN_WIDTHS.instalacao },
        { wch: COLUMN_WIDTHS.acao },
        { wch: COLUMN_WIDTHS.modo },
        { wch: COLUMN_WIDTHS.dia },
        { wch: COLUMN_WIDTHS.operador },
        { wch: COLUMN_WIDTHS.operador },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Voltas');

    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `${filename}_${date}.xlsx`);
};

/**
 * Exportar tarefas operacionais para Excel
 */
export const exportTasksToExcel = (tasks, { filename = 'Tarefas_Operacao', groupBy = 'instalacao' } = {}) => {
    if (!tasks?.length) return;

    const headers = ['#', 'Instalação', 'Ação', 'Modo', 'Dia', 'Estado', 'Valor', 'Observações'];

    const mapTask = (t, i) => [
        i + 1,
        t.instalacao_nome || '-',
        t.acao_operacao || '-',
        t.modo_operacao || '-',
        t.dia_operacao ? new Date(t.dia_operacao).toLocaleDateString('pt-PT') : '-',
        t.completed ? 'Concluída' : 'Pendente',
        t.valuetext || t.valuenumb || '-',
        t.valuememo || '-',
    ];

    // Folha "Todos"
    const allRows = tasks.map(mapTask);
    const wsAll = XLSX.utils.aoa_to_sheet([headers, ...allRows]);
    wsAll['!cols'] = [
        { wch: 5 }, { wch: COLUMN_WIDTHS.instalacao }, { wch: COLUMN_WIDTHS.acao },
        { wch: COLUMN_WIDTHS.modo }, { wch: COLUMN_WIDTHS.dia }, { wch: COLUMN_WIDTHS.status },
        { wch: COLUMN_WIDTHS.valor }, { wch: COLUMN_WIDTHS.observacoes },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsAll, 'Todos');

    // Folhas por instalação
    if (groupBy === 'instalacao') {
        const grouped = {};
        tasks.forEach(t => {
            const key = t.instalacao_nome || 'Sem Instalação';
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(t);
        });

        Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([name, groupTasks]) => {
                const sheetName = name.slice(0, 31).replace(/[[\]*?/\\]/g, '_');
                const rows = groupTasks.map(mapTask);
                const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
                ws['!cols'] = wsAll['!cols'];
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
            });
    }

    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `${filename}_${date}.xlsx`);
};

/**
 * Exportar dados de supervisor (analytics) para Excel
 */
export const exportSupervisorDataToExcel = (operations, operatorStats, { filename = 'Supervisao_Operacoes' } = {}) => {
    const wb = XLSX.utils.book_new();

    // Folha 1: Operações
    if (operations?.length) {
        const opHeaders = ['#', 'Instalação', 'Ação', 'Modo', 'Dia', 'Operador', 'Estado', 'Valor'];
        const opRows = operations.map((o, i) => [
            i + 1,
            o.instalacao_nome || '-',
            o.acao_operacao || '-',
            o.modo_operacao || '-',
            o.dia_operacao ? new Date(o.dia_operacao).toLocaleDateString('pt-PT') : '-',
            o.operador_nome || '-',
            o.completed ? 'Concluída' : 'Pendente',
            o.valuetext || o.valuenumb || '-',
        ]);
        const wsOps = XLSX.utils.aoa_to_sheet([opHeaders, ...opRows]);
        wsOps['!cols'] = [
            { wch: 5 }, { wch: 30 }, { wch: 20 }, { wch: 15 },
            { wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 15 },
        ];
        XLSX.utils.book_append_sheet(wb, wsOps, 'Operações');
    }

    // Folha 2: Operadores
    if (operatorStats?.length) {
        const statHeaders = ['Operador', 'Total', 'Concluídas', 'Pendentes', 'Taxa (%)'];
        const statRows = operatorStats.map(s => [
            s.name || s.operador_nome || '-',
            s.total || 0,
            s.completed || 0,
            s.pending || 0,
            s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0,
        ]);
        const wsStats = XLSX.utils.aoa_to_sheet([statHeaders, ...statRows]);
        wsStats['!cols'] = [{ wch: 25 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 10 }];
        XLSX.utils.book_append_sheet(wb, wsStats, 'Operadores');
    }

    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `${filename}_${date}.xlsx`);
};

/**
 * Exportar qualquer array de dados para CSV
 */
export const exportToCSV = (data, headers, { filename = 'export' } = {}) => {
    if (!data?.length) return;

    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
};
