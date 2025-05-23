// /hooks/useEntityDetails.js
import { useState, useEffect } from "react";
import { useInternalContext } from "../context/InternalContext";
import { getEntityDetails } from "../../../services/InternalService";
import { handleApiError } from "../utils/errorHandler";
import { updateEntityDetails } from "../../../services/InternalService";
import { notifySuccess } from "../../../components/common/Toaster/ThemedToaster";

export function useEntityDetails() {
    const { state } = useInternalContext();
    const [details, setDetails] = useState({});
    const [loading, setLoading] = useState(false);
    const [editableDetails, setEditableDetails] = useState({});
    const [isEditMode, setIsEditMode] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const fetchDetails = async () => {
        if (!state.selectedEntity) return;

        setLoading(true);
        try {
            const response = await getEntityDetails(state.selectedArea, state.selectedEntity.pk);
            setDetails(response.details || {});
            setEditableDetails(response.details || {});
        } catch (error) {
            handleApiError(error, "Erro ao carregar detalhes da entidade");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDetails();
    }, [state.selectedEntity]);

    const saveDetails = async (data) => {
        if (!state.selectedEntity) return false;

        setSubmitting(true);
        try {
            await updateEntityDetails(state.selectedArea, state.selectedEntity.pk, data);
            await fetchDetails();
            setIsEditMode(false);
            notifySuccess("Detalhes atualizados com sucesso");
            return true;
        } catch (error) {
            handleApiError(error, "Erro ao atualizar detalhes da entidade");
            return false;
        } finally {
            setSubmitting(false);
        }
    };

    return {
        details,
        loading,
        submitting,
        editableDetails,
        setEditableDetails,
        isEditMode,
        setIsEditMode,
        fetchDetails,
        saveDetails
    };
}