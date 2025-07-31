import React from 'react';
import RamalGenericList from './RamalGenericList';
import { getDocumentRamaisConcluded } from '../../../services/documentService';

const RamaisConcludedPage = () => (
    <RamalGenericList
        title="Pavimentações Concluídas e Pagas"
        getData={getDocumentRamaisConcluded}
        isConcluded={true}
        showExport={true}
        exportType="concluded"
    />
);

export default RamaisConcludedPage;