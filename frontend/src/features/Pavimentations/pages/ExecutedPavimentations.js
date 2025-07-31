import React from 'react';
import PavimentationList from '../components/PavimentationList';

/**
 * Página para pavimentações executadas (aguardam pagamento)
 */
const ExecutedPavimentations = () => (
    <PavimentationList
        status="executed"
        title="Pavimentações Executadas"
        subtitle="Pavimentações executadas que aguardam pagamento"
        allowActions={true}
        showExport={true}
        showStats={true}
        autoRefresh={true}
    />
);

export default ExecutedPavimentations;