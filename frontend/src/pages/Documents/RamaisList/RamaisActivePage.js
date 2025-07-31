import React from 'react';
import RamalGenericList from './RamalGenericList';
import { getDocumentRamais, updateDocumentPavenext } from '../../../services/documentService';

const RamaisActivePage = () => (
    <RamalGenericList
        title="Pavimentações Pendentes"
        getData={getDocumentRamais}
        onComplete={updateDocumentPavenext}
        isConcluded={false}
        showExport={true}
        exportType="active"
        actionLabel="Marcar como Executada"
        actionTooltip="Marcar como executada"
        confirmTitle="Marcar como Executada"
        confirmMessage="Tem certeza que deseja marcar esta pavimentação como executada? Ela será movida para a lista de executadas."
    />
);

export default RamaisActivePage;