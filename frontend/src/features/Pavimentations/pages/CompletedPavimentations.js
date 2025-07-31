import React from 'react';
import PavimentationList from '../components/PavimentationList';

/**
 * Página para pavimentações concluídas (pagas)
 */
const CompletedPavimentations = () => (
    <PavimentationList
        status="completed"
        title="Pavimentações Concluídas"
        subtitle="Pavimentações pagas e finalizadas"
        allowActions={false}
        showExport={true}
        showStats={true}
        autoRefresh={false}
        refreshInterval={10 * 60 * 1000} // 10 minutos (menos frequente)
    />
);

export default CompletedPavimentations;