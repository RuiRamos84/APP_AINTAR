import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Button,
  CircularProgress,
} from "@mui/material";
import { Edit as EditIcon, Delete as DeleteIcon } from "@mui/icons-material";
import {
  getLetters,
  updateLetter,
  deleteLetter,
  createLetter,
} from "../../services/letter_service";
import LetterTemplateModal from "./LetterTemplateModal";
import { useMetaData } from "../../contexts/MetaDataContext";

const LetterTemplateList = () => {
  const { metaData } = useMetaData();
  const [letters, setLetters] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleCreateNew = () => {
    setSelectedLetter(null);
    setOpenModal(true);
  };

  useEffect(() => {
    fetchLetters();

    // Listener para o evento de criar novo modelo
    document.addEventListener("createNewTemplate", handleCreateNew);

    return () => {
      document.removeEventListener("createNewTemplate", handleCreateNew);
    };
  }, []);

  const fetchLetters = async () => {
    try {
      setLoading(true);
      const fetchedLetters = await getLetters();
    //   console.log(fetchedLetters);
      setLetters(fetchedLetters);
    } catch (error) {
      console.error("Erro ao buscar modelos de ofícios:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDocTypeName = (typeCode) => {
    // console.log("Type Code:", typeCode);
    // console.log("Available Types:", metaData?.types);

    if (!typeCode || !metaData?.types) return "";

    // Procura nos types o item que tem pk igual ao tt_doctype da carta
    const docType = metaData.types.find((type) => type.pk === Number(typeCode));

    // console.log("Found Type:", docType);

    return docType ? docType.tt_doctype_value : "";
  };

  const handleEdit = (letter) => {
    setSelectedLetter(letter);
    setOpenModal(true);
  };

  const handleDelete = async (letterId) => {
    if (window.confirm("Tem certeza que deseja excluir este modelo?")) {
      try {
        await deleteLetter(letterId);
        fetchLetters();
      } catch (error) {
        console.error("Erro ao excluir modelo de ofício:", error);
      }
    }
  };

  const handleSave = async (letterData) => {
    try {
      if (selectedLetter) {
        await updateLetter(selectedLetter.pk, letterData);
      } else {
        await createLetter(letterData);
      }
      fetchLetters();
      setOpenModal(false);
    } catch (error) {
      console.error("Erro ao salvar modelo de ofício:", error);
    }
  };

  if (loading) {
    return (
      <div
        style={{ display: "flex", justifyContent: "center", padding: "20px" }}
      >
        <CircularProgress />
      </div>
    );
  }

  return (
    <>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome do Modelo</TableCell>
              <TableCell>Tipo de Documento</TableCell>
              <TableCell>Versão</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {letters.map((letter) => (
              <TableRow key={letter.pk}>
                <TableCell>{letter.name}</TableCell>
                <TableCell>{getDocTypeName(letter.tt_doctype)}</TableCell>
                <TableCell>{letter.version}</TableCell>
                <TableCell>{letter.active ? "Ativo" : "Desativo"}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleEdit(letter)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(letter.pk)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <LetterTemplateModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onSave={handleSave}
        initialData={selectedLetter}
      />
    </>
  );
};

export default LetterTemplateList;
