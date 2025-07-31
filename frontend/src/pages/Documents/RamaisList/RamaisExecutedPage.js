import React from 'react';
import RamalGenericList from './RamalGenericList';
import { getDocumentRamaisExecuted, updateDocumentPavpaid } from '../../../services/documentService';

const RamaisExecutedPage = () => (
    <RamalGenericList
        title="Pavimentações Executadas (Aguardam Pagamento)"
        getData={getDocumentRamaisExecuted}
        onComplete={updateDocumentPavpaid}
        isConcluded={false}
        showExport={true}
        exportType="executed"
        actionLabel="Marcar como Paga"
        actionTooltip="Marcar como paga e concluída"
        confirmTitle="Marcar como Paga"
        confirmMessage="Tem certeza que deseja marcar esta pavimentação como paga? Ela será movida para a lista de concluídas."
    />
);

export default RamaisExecutedPage;