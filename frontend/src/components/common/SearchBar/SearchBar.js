import React, { useState, useRef, useEffect } from "react";
import { InputBase, IconButton, Tooltip } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import { alpha, styled } from "@mui/material/styles";

// Componente estilizado para a barra de pesquisa (expandindo da direita para a esquerda)
const SearchWrapper = styled('div')(({ theme, open }) => ({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end', // Alinha à direita
  borderRadius: theme.shape.borderRadius,
  backgroundColor: open ? alpha(theme.palette.common.white, 1) : 'transparent',
  border: open ? `1px solid ${theme.palette.grey[300]}` : 'none',
  '&:hover': {
    backgroundColor: open ? alpha(theme.palette.common.white, 1) : alpha(theme.palette.grey[100], 0.15),
  },
  transition: theme.transitions.create(['width', 'background-color', 'border']),
  width: open ? '200px' : '40px', // Largura fixa ao expandir
  maxWidth: '100%',
  height: '40px',
  overflow: 'hidden',
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 1),
  height: '100%',
  position: 'absolute',
  right: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2,
}));

const StyledInputBase = styled(InputBase)(({ theme, open }) => ({
  color: 'inherit',
  width: '100%',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 4, 1, 2),
    transition: theme.transitions.create(['width', 'opacity']),
    width: open ? '100%' : 0,
    opacity: open ? 1 : 0,
  },
}));

const SearchBar = ({ onSearch }) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const searchInputRef = useRef();
  const wrapperRef = useRef();

  // Adicionar efeito para detectar clique fora do componente
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchOpen &&
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target) &&
        searchTerm === "") {
        setSearchOpen(false);
      }
    }

    // Adicionar event listener
    document.addEventListener("mousedown", handleClickOutside);

    // Remover event listener na limpeza
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [searchOpen, searchTerm]);

  const handleSearchClick = () => {
    setSearchOpen(!searchOpen);
    if (!searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 300);
    } else if (searchTerm) {
      // Limpar a pesquisa ao fechar
      setSearchTerm("");
      onSearch("");
    }
  };

  const handleSearchClear = () => {
    setSearchTerm("");
    onSearch("");
    searchInputRef.current?.focus();
  };

  const handleInputChange = (event) => {
    const value = event.target.value;
    setSearchTerm(value);
    onSearch(value);
  };

  const handleKeyDown = (event) => {
    // Fechar a pesquisa ao pressionar Escape se estiver vazia
    if (event.key === 'Escape' && !searchTerm) {
      setSearchOpen(false);
    }
  };

  return (
    <SearchWrapper open={searchOpen} ref={wrapperRef}>
      <StyledInputBase
        placeholder="O que procura?"
        inputProps={{ 'aria-label': 'pesquisar' }}
        inputRef={searchInputRef}
        open={searchOpen}
        value={searchTerm}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        fullWidth
      />
      <SearchIconWrapper>
        {searchOpen && searchTerm ? (
          <Tooltip title="Limpar pesquisa">
            <IconButton size="small" onClick={handleSearchClear} aria-label="limpar pesquisa">
              <ClearIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : (
          <Tooltip title={searchOpen ? "Fechar" : "Pesquisar"}>
            <IconButton size="small" onClick={handleSearchClick} aria-label={searchOpen ? "fechar pesquisa" : "abrir pesquisa"}>
              <SearchIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </SearchIconWrapper>
    </SearchWrapper>
  );
};

export default SearchBar;