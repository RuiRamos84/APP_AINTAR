import { useCallback, useMemo } from 'react';
import { useUI } from '../context/UIStateContext';

/**
 * Hook para gerenciar o modo de visualização e densidade
 * Permite controlar como os documentos são exibidos na interface
 */
const useViewMode = () => {
    // Obter estados e funções do contexto
    const {
        viewMode,
        density,
        setViewMode,
        setDensity
    } = useUI();

    /**
     * Modos de visualização disponíveis
     * @type {Array}
     */
    const viewModes = useMemo(() => [
        { value: 'grid', label: 'Grade', icon: 'Dashboard' },
        { value: 'list', label: 'Lista', icon: 'List' },
        { value: 'kanban', label: 'Kanban', icon: 'ViewKanban' }
    ], []);

    /**
     * Opções de densidade disponíveis
     * @type {Array}
     */
    const densityOptions = useMemo(() => [
        { value: 'compact', label: 'Compacto', icon: 'ViewCompact' },
        { value: 'standard', label: 'Padrão', icon: 'ViewComfy' },
        { value: 'comfortable', label: 'Confortável', icon: 'ViewAgenda' }
    ], []);

    /**
     * Obter tamanho de elementos com base na densidade atual
     * @returns {string} - Tamanho dos elementos ('small', 'medium')
     */
    const getElementSize = useCallback(() => {
        switch (density) {
            case 'compact': return 'small';
            case 'comfortable': return 'medium';
            case 'standard':
            default: return 'small';
        }
    }, [density]);

    /**
     * Obter espaçamento com base na densidade atual
     * @returns {number} - Valor de espaçamento
     */
    const getSpacing = useCallback(() => {
        switch (density) {
            case 'compact': return 1;
            case 'comfortable': return 3;
            case 'standard':
            default: return 2;
        }
    }, [density]);

    /**
     * Obter padding com base na densidade atual
     * @returns {number} - Valor de padding
     */
    const getPadding = useCallback(() => {
        switch (density) {
            case 'compact': return 1;
            case 'comfortable': return 3;
            case 'standard':
            default: return 2;
        }
    }, [density]);

    /**
     * Obter tamanho do cartão no modo grid com base na densidade
     * @returns {Object} - Configuração de tamanho para Grid
     */
    const getGridItemSize = useCallback(() => {
        switch (density) {
            case 'compact':
                return { xs: 12, sm: 6, md: 3, lg: 2 }; // Mais cartões por linha
            case 'comfortable':
                return { xs: 12, sm: 6, md: 6, lg: 4 }; // Menos cartões por linha
            case 'standard':
            default:
                return { xs: 12, sm: 6, md: 4, lg: 3 };
        }
    }, [density]);

    /**
     * Alternar para o próximo modo de visualização
     */
    const cycleViewMode = useCallback(() => {
        const currentIndex = viewModes.findIndex(mode => mode.value === viewMode);
        const nextIndex = (currentIndex + 1) % viewModes.length;
        setViewMode(viewModes[nextIndex].value);
    }, [viewMode, viewModes, setViewMode]);

    /**
     * Alternar para a próxima densidade
     */
    const cycleDensity = useCallback(() => {
        const currentIndex = densityOptions.findIndex(option => option.value === density);
        const nextIndex = (currentIndex + 1) % densityOptions.length;
        setDensity(densityOptions[nextIndex].value);
    }, [density, densityOptions, setDensity]);

    return {
        // Estado
        viewMode,
        density,
        viewModes,
        densityOptions,

        // Funções
        setViewMode,
        setDensity,
        getElementSize,
        getSpacing,
        getPadding,
        getGridItemSize,
        cycleViewMode,
        cycleDensity
    };
};

export default useViewMode;