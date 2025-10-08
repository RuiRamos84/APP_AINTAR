// NewOperationIndex.js - VERSÃO V2 CORRIGIDA
import React from 'react';
import OperationErrorBoundary from './components/common/OperationErrorBoundary';
import AdaptiveOperationViewV2 from './components/adaptive/AdaptiveOperationViewV2';

/**
 * VERSÃO V2 - COM HOOK CORRIGIDO
 *
 * ✅ Correções aplicadas:
 * - useOperationsUnifiedV2 usa getState() em vez de seletores reativos
 * - Sem loops infinitos do Zustand
 * - SpeedDial removido (causava problemas com refs)
 * - SWR + Zustand funcionando corretamente
 */
const NewOperationIndex = () => {
    return (
        <OperationErrorBoundary>
            <AdaptiveOperationViewV2 />
        </OperationErrorBoundary>
    );
};

export default NewOperationIndex;