import { useState, useCallback } from 'react';
import { generateFilePreview } from '../utils/filePreviewUtils';

/**
 * Hook para gerenciar pré-visualizações de arquivos
 * @returns {Object} Estado e funções para manipular arquivos
 */
const useFilePreview = () => {
    // Estados
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [previewState, setPreviewState] = useState({
        open: false,
        fileUrl: '',
        fileType: '',
        fileName: '',
        currentIndex: -1
    });

    // Adicionar arquivos
    const addFiles = useCallback(async (newFiles) => {
        setLoading(true);

        try {
            const processedFiles = await Promise.all(
                newFiles.map(async (file) => ({
                    file,
                    preview: await generateFilePreview(file),
                    description: '',
                }))
            );

            setFiles(prev => [...prev, ...processedFiles]);
        } catch (error) {
            console.error('Erro ao processar arquivos:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Remover arquivo
    const removeFile = (index) => {
        setFiles(prev => {
            const updatedFiles = [...prev];
            // Liberar URL do objeto para economizar memória
            if (updatedFiles[index]?.preview) {
                URL.revokeObjectURL(updatedFiles[index].preview);
            }
            updatedFiles.splice(index, 1);
            return updatedFiles;
        });
    };

    // Atualizar descrição do arquivo
    const updateFileDescription = (index, description) => {
        setFiles(prev => {
            const updatedFiles = [...prev];
            if (updatedFiles[index]) {
                updatedFiles[index] = {
                    ...updatedFiles[index],
                    description
                };
            }
            return updatedFiles;
        });
    };

    // Abrir pré-visualização
    const openPreview = (index) => {
        if (index >= 0 && index < files.length) {
            setPreviewState({
                open: true,
                fileUrl: files[index].preview,
                fileType: files[index].file.type,
                fileName: files[index].file.name,
                currentIndex: index
            });
        }
    };

    // Fechar pré-visualização
    const closePreview = () => {
        setPreviewState(prev => ({
            ...prev,
            open: false
        }));
    };

    // Baixar arquivo atual
    const downloadCurrentFile = () => {
        const { fileUrl, fileName, currentIndex } = previewState;
        if (fileUrl && currentIndex >= 0 && currentIndex < files.length) {
            const link = document.createElement('a');
            link.href = fileUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            link.remove();
        }
    };

    // Limpar todos os arquivos
    const clearAllFiles = () => {
        // Liberar todas as URLs de objeto
        files.forEach(file => {
            if (file.preview) {
                URL.revokeObjectURL(file.preview);
            }
        });
        setFiles([]);
    };

    return {
        files,
        loading,
        previewState,
        addFiles,
        removeFile,
        updateFileDescription,
        openPreview,
        closePreview,
        downloadCurrentFile,
        clearAllFiles
    };
};

export default useFilePreview;