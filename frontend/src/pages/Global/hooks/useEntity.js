// frontend/src/pages/Global/hooks/useEntity.js

import { useState, useEffect, useCallback } from 'react';
import { useGlobal } from '../context/GlobalContext';
import { useMetaData } from '../../../contexts/MetaDataContext';
import { getEntityDetails, updateEntityDetails } from '../../../services/InternalService';
import { notifyError, notifySuccess } from '../../../components/common/Toaster/ThemedToaster';

export const useEntity = (areaId) => {
    const { state, dispatch } = useGlobal();
    const { metaData } = useMetaData();
    const [details, setDetails] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);

    // Obter entidades baseado na área
    const getEntitiesForArea = useCallback(() => {
        if (!areaId || !metaData) return [];
        return areaId === 1 ? (metaData.etar || []) : (metaData.ee || []);
    }, [areaId, metaData]);

    // Obter localizações únicas
    const getLocations = useCallback(() => {
        const entities = getEntitiesForArea();
        return [...new Set(entities.map(entity => entity.ts_entity))];
    }, [getEntitiesForArea]);

    // Filtrar entidades por localização
    const getEntitiesByLocation = useCallback((location) => {
        if (!location) return [];
        const entities = getEntitiesForArea();
        return entities.filter(entity => entity.ts_entity === location);
    }, [getEntitiesForArea]);

    // Seleccionar localização
    const selectLocation = useCallback((location) => {
        dispatch({ type: 'SET_LOCATION', payload: location });
        const entities = getEntitiesByLocation(location);
        dispatch({ type: 'SET_ENTITIES', payload: entities });
    }, [dispatch, getEntitiesByLocation]);

    // Seleccionar entidade
    const selectEntity = useCallback((entityId) => {
        const entity = state.entities.find(e => e.pk === parseInt(entityId, 10));
        dispatch({ type: 'SET_ENTITY', payload: entity });
    }, [state.entities, dispatch]);

    // Carregar detalhes da entidade
    const loadEntityDetails = useCallback(async (entityId = null) => {
        const targetEntityId = entityId || state.selectedEntity?.pk;
        if (!targetEntityId || !areaId) return;

        setDetailsLoading(true);
        try {
            const response = await getEntityDetails(areaId, targetEntityId);
            setDetails(response.details || {});
        } catch (error) {
            notifyError('Erro ao carregar detalhes da entidade');
            console.error(error);
        } finally {
            setDetailsLoading(false);
        }
    }, [areaId, state.selectedEntity]);

    // Actualizar detalhes da entidade
    const saveEntityDetails = useCallback(async (data) => {
        if (!state.selectedEntity?.pk || !areaId) return false;

        setDetailsLoading(true);
        try {
            await updateEntityDetails(areaId, state.selectedEntity.pk, data);
            await loadEntityDetails();
            notifySuccess('Detalhes actualizados com sucesso');
            return true;
        } catch (error) {
            notifyError('Erro ao actualizar detalhes');
            console.error(error);
            return false;
        } finally {
            setDetailsLoading(false);
        }
    }, [areaId, state.selectedEntity, loadEntityDetails]);

    // Auto-carregar detalhes quando entidade muda
    useEffect(() => {
        if (state.selectedEntity) {
            loadEntityDetails();
        } else {
            setDetails(null);
        }
    }, [state.selectedEntity, loadEntityDetails]);

    return {
        // Estado
        selectedLocation: state.selectedLocation,
        entities: state.entities,
        selectedEntity: state.selectedEntity,
        details,
        detailsLoading,

        // Dados derivados
        locations: getLocations(),

        // Acções
        selectLocation,
        selectEntity,
        loadEntityDetails,
        saveEntityDetails
    };
};