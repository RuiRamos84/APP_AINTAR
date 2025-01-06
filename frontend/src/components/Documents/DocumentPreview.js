import React, { useEffect, useState, useRef } from "react";
import api from "../../services/api";
import { notifyError } from "../common/Toaster/ThemedToaster";
import "./DocumentPreview.css";

const DocumentPreview = ({
  fileUrl,
  fileType,
  onClose,
  onDownload,
  position,
}) => {
  const [fileContent, setFileContent] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 400 });
  const previewRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    if (fileUrl) {
      const fetchFile = async () => {
        try {
          const response = await api.get(fileUrl, {
            responseType: fileType === "pdf" ? "blob" : "arraybuffer",
            headers: {
              Authorization: `Bearer ${
                JSON.parse(localStorage.getItem("user")).access_token
              }`,
            },
          });

          const fileBlob = new Blob([response.data], {
            type: response.headers["content-type"],
          });
          const fileURL = URL.createObjectURL(fileBlob);

          setFileContent(fileURL);
        } catch (error) {
          console.error("Erro ao buscar o arquivo:", error);
          if (error.response && error.response.status === 404) {
            notifyError("Arquivo não encontrado.");
          } else {
            notifyError(
              "Erro ao buscar o arquivo. Por favor, tente novamente."
            );
          }
          onClose(); // Fechar a pré-visualização em caso de erro
        }
      };

      fetchFile();
    }
  }, [fileUrl, fileType, onClose]);

  useEffect(() => {
    const adjustSize = () => {
      if (previewRef.current && contentRef.current) {
        const modalRect =
          previewRef.current.offsetParent.getBoundingClientRect();
        const contentRect = contentRef.current.getBoundingClientRect();

        const minWidth = 400;
        const minHeight = 400;
        const maxWidth = Math.max(modalRect.width * 0.8, minWidth);
        const maxHeight = Math.max(modalRect.height * 0.8, minHeight);

        const aspectRatio = contentRect.width / contentRect.height;

        let newWidth = Math.min(
          Math.max(contentRect.width, minWidth),
          maxWidth
        );
        let newHeight = newWidth / aspectRatio;

        if (newHeight > maxHeight) {
          newHeight = maxHeight;
          newWidth = newHeight * aspectRatio;
        }

        setDimensions({
          width: Math.max(newWidth, minWidth),
          height: Math.max(newHeight, minHeight) + 40, // +40 para a barra de ações
        });
      }
    };

    if (fileContent) {
      // Dê um pequeno atraso para garantir que o conteúdo foi renderizado
      setTimeout(adjustSize, 100);
    }
  }, [fileContent]);

  useEffect(() => {
    if (previewRef.current) {
      const modalRect = previewRef.current.offsetParent.getBoundingClientRect();

      let adjustedX = position.x;
      let adjustedY = position.y;

      // Ajuste horizontal se necessário
      if (adjustedX + dimensions.width > modalRect.width) {
        adjustedX = modalRect.width - dimensions.width - 10; // 10px de margem
      }

      // Ajuste vertical se necessário
      if (adjustedY + dimensions.height > modalRect.height) {
        adjustedY = modalRect.height - dimensions.height - 10; // 10px de margem
      }

      previewRef.current.style.left = `${adjustedX}px`;
      previewRef.current.style.top = `${adjustedY}px`;
    }
  }, [position, dimensions]);

  if (!fileContent) return null;

  return (
    <div
      className="preview-container"
      ref={previewRef}
      style={{
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
      }}
    >
      {fileType === "pdf" ? (
        <iframe
          src={fileContent}
          className="preview-content"
          title="Document Preview"
          ref={contentRef}
        />
      ) : (
        <img
          src={fileContent}
          alt="Document Preview"
          className="preview-content"
          ref={contentRef}
        />
      )}
      <div className="preview-actions">
        <button className="preview-button" onClick={onDownload}>
          Descarregar
        </button>
        <button className="preview-button" onClick={onClose}>
          Fechar
        </button>
      </div>
    </div>
  );
};

export default DocumentPreview;
