import React from 'react';
import RamalGenericList from './RamalGenericList';
import { getDocumentRamais, updateDocumentPavenext } from '../../../services/documentService';

const RamaisActivePage = () => (
    <RamalGenericList
        title="Ramais a Pavimentar"
        getData={getDocumentRamais}
        onComplete={updateDocumentPavenext}
        isConcluded={false}
        showExport={true}
        exportType="active"
    />
);

export default RamaisActivePage;