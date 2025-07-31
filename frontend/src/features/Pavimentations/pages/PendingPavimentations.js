import React from 'react';
import PavimentationList from '../components/PavimentationList';

/**
 * Página para pavimentações pendentes (para pavimentar)
 */
const PendingPavimentations = () => (
    <PavimentationList
        status="pending"
        title="Pavimentações Pendentes"
        subtitle="Pavimentações que aguardam execução"
        allowActions={true}
        showExport={true}
        showStats={true}
        autoRefresh={true}
    />
);

export default PendingPavimentations;