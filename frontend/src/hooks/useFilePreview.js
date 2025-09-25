import { useState, useCallback } from 'react';
import { generateFilePreview } from '../pages/ModernDocuments/filePreviewUtils';
import { notifyError } from '../components/common/Toaster/ThemedToaster';

/**
 * Hook personalizado para gerenciar pré-visualizações de arquivos
 * 
 * @returns {Object} - Objeto com funções e estados para gerenciar pré-visualizações
 */
const useFilePreview = () => {
  // Estado para controlar o modal de pré-visualização
  const [previewState, setPreviewState] = useState({
    open: false,
    fileUrl: null,
    fileType: null,
    fileName: null,
    currentFile: null
  });

  // Estado para armazenar os arquivos e suas pré-visualizações
  const [files, setFiles] = useState([]);
  
  // Estado para rastrear o carregamento da pré-visualização
  const [loading, setLoading] = useState(false);

  /**
   * Adiciona um arquivo à lista de arquivos com pré-visualização
   */
  const addFile = useCallback(async (file) => {
    setLoading(true);
    try {
      const preview = await generateFilePreview(file);
      
      setFiles(prevFiles => [
        ...prevFiles,
        {
          file,
          preview,
          description: '',
          id: Date.now() // ID único para identificar o arquivo
        }
      ]);
      
      return true;
    } catch (error) {
      console.error('Erro ao gerar pré-visualização:', error);
      notifyError('Não foi possível gerar a pré-visualização do arquivo.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Adiciona múltiplos arquivos à lista
   */
  const addFiles = useCallback(async (newFiles) => {
    setLoading(true);
    
    try {
      const processedFiles = await Promise.all(
        newFiles.map(async (file) => {
          try {
            const preview = await generateFilePreview(file);
            return {
              file,
              preview,
              description: '',
              id: Date.now() + Math.random() // ID único
            };
          } catch (error) {
            console.error(`Erro ao processar arquivo ${file.name}:`, error);
            return null;
          }
        })
      );
      
      // Filtrar arquivos que não puderam ser processados
      const validFiles = processedFiles.filter(f => f !== null);
      
      setFiles(prevFiles => [...prevFiles, ...validFiles]);
      
      // Retornar true se todos os arquivos foram processados com sucesso
      return processedFiles.length === validFiles.length;
    } catch (error) {
      console.error('Erro ao processar arquivos:', error);
      notifyError('Ocorreu um erro ao processar alguns arquivos.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Remove um arquivo da lista
   */
  const removeFile = useCallback((idToRemove) => {
    setFiles(prevFiles => {
      const fileToRemove = prevFiles.find(f => f.id === idToRemove);
      if (fileToRemove && fileToRemove.preview) {
        // Liberar memória revogando o URL criado
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prevFiles.filter(f => f.id !== idToRemove);
    });
  }, []);

  /**
   * Atualiza a descrição de um arquivo
   */
  const updateFileDescription = useCallback((id, description) => {
    setFiles(prevFiles => 
      prevFiles.map(f => 
        f.id === id ? { ...f, description } : f
      )
    );
  }, []);

  /**
   * Abre a pré-visualização de um arquivo
   */
  const openPreview = useCallback((fileData) => {
    setPreviewState({
      open: true,
      fileUrl: fileData.preview,
      fileType: fileData.file.type,
      fileName: fileData.file.name,
      currentFile: fileData
    });
  }, []);

  /**
   * Fecha a pré-visualização
   */
  const closePreview = useCallback(() => {
    setPreviewState({
      open: false,
      fileUrl: null,
      fileType: null,
      fileName: null,
      currentFile: null
    });
  }, []);

  /**
   * Faz download do arquivo atual em pré-visualização
   */
  const downloadCurrentFile = useCallback(() => {
    if (!previewState.currentFile) return;

    // Verificar se document está disponível
    if (typeof document === 'undefined' || !document.createElement || !document.body) {
      console.error("document.createElement não está disponível para download");
      notifyError("Não foi possível fazer o download do arquivo");
      return;
    }

    const { file } = previewState.currentFile;
    const url = URL.createObjectURL(file);

    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();

    // Limpeza
    setTimeout(() => {
      URL.revokeObjectURL(url);
      document.body.removeChild(link);
    }, 100);
  }, [previewState.currentFile]);

  /**
   * Limpa todos os arquivos e libera memória
   */
  const clearAllFiles = useCallback(() => {
    files.forEach(fileData => {
      if (fileData.preview) {
        URL.revokeObjectURL(fileData.preview);
      }
    });
    setFiles([]);
  }, [files]);

  return {
    // Estados
    files,
    loading,
    previewState,
    
    // Funções
    addFile,
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