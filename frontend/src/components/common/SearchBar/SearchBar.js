import React, { useState, useRef, useEffect } from "react";
import { InputBase, IconButton, Tooltip, useTheme } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import { alpha, styled, shouldForwardProp } from "@mui/material/styles";

// Componente estilizado para a barra de pesquisa (expandindo da direita para a esquerda)
const SearchWrapper = styled('div', {
  shouldForwardProp: (prop) => prop !== 'open' && prop !== 'isDarkMode'
})(({ theme, open, isDarkMode }) => ({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end', // Alinha à direita
  borderRadius: theme.shape.borderRadius,
  backgroundColor: open
    ? isDarkMode
      ? alpha(theme.palette.background.paper, 0.9)
      : alpha(theme.palette.common.white, 1)
    : 'transparent',
  border: open
    ? isDarkMode
      ? `1px solid ${alpha(theme.palette.common.white, 0.15)}`
      : `1px solid ${theme.palette.grey[300]}`
    : 'none',
  '&:hover': {
    backgroundColor: open
      ? isDarkMode
        ? alpha(theme.palette.background.paper, 0.9)
        : alpha(theme.palette.common.white, 1)
      : isDarkMode
        ? alpha(theme.palette.common.white, 0.05)
        : alpha(theme.palette.grey[100], 0.15),
  },
  transition: theme.transitions.create(['width', 'background-color', 'border']),
  width: open ? '200px' : '40px', // Largura fixa ao expandir
  maxWidth: '100%',
  height: '40px',
  overflow: 'hidden',
  boxShadow: open && isDarkMode ? '0 0 10px rgba(0,0,0,0.2)' : 'none'
}));

const SearchIconWrapper = styled('div', {
  shouldForwardProp: (prop) => prop !== 'isDarkMode'
})(({ theme, isDarkMode }) => ({
  padding: theme.spacing(0, 1),
  height: '100%',
  position: 'absolute',
  right: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2,
  color: isDarkMode
    ? alpha(theme.palette.common.white, 0.7)
    : theme.palette.grey[700]
}));

const StyledInputBase = styled(InputBase, {
  shouldForwardProp: (prop) => prop !== 'open' && prop !== 'isDarkMode'
})(({ theme, open, isDarkMode }) => ({
  color: isDarkMode ? theme.palette.common.white : 'inherit',
  width: '100%',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 4, 1, 2),
    transition: theme.transitions.create(['width', 'opacity']),
    width: open ? '100%' : 0,
    opacity: open ? 1 : 0,
    '&::placeholder': {
      color: isDarkMode
        ? alpha(theme.palette.common.white, 0.5)
        : theme.palette.text.secondary,
      opacity: 0.7
    }
  },
}));

const SearchBar = ({ searchTerm: externalSearchTerm, onSearch }) => {
  // Modo compatível: usar o estado interno se não receber searchTerm como prop
  const [internalSearchTerm, setInternalSearchTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef();
  const wrapperRef = useRef();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  // Determinar se estamos em modo controlado (recebendo searchTerm de fora)
  const isControlled = externalSearchTerm !== undefined;
  const searchTerm = isControlled ? externalSearchTerm : internalSearchTerm;

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

  // Atualizar o estado de searchOpen quando o termo de busca mudar
  useEffect(() => {
    if (searchTerm && !searchOpen) {
      setSearchOpen(true);
    }
  }, [searchTerm]);

  const handleSearchClick = () => {
    setSearchOpen(!searchOpen);
    if (!searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 300);
    } else if (searchTerm) {
      // Limpar a pesquisa ao fechar
      handleSearchChange("");
    }
  };

  const handleSearchClear = () => {
    handleSearchChange("");
    searchInputRef.current?.focus();
  };

  const handleSearchChange = (value) => {
    // Se estiver em modo controlado, apenas chama onSearch
    // Se não, atualiza o estado interno
    if (isControlled) {
      onSearch(value);
    } else {
      setInternalSearchTerm(value);
      if (onSearch) {
        onSearch(value);
      }
    }
  };

  const handleInputChange = (event) => {
    const value = event.target.value;
    handleSearchChange(value);
  };

  const handleKeyDown = (event) => {
    // Fechar a pesquisa ao pressionar Escape se estiver vazia
    if (event.key === 'Escape' && !searchTerm) {
      setSearchOpen(false);
    }
  };

  return (
    <SearchWrapper open={searchOpen} ref={wrapperRef} isDarkMode={isDarkMode}>
      <StyledInputBase
        placeholder="O que procura?"
        inputProps={{ 'aria-label': 'pesquisar' }}
        inputRef={searchInputRef}
        open={searchOpen}
        value={searchTerm}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        fullWidth
        isDarkMode={isDarkMode}
      />
      <SearchIconWrapper isDarkMode={isDarkMode}>
        {searchOpen && searchTerm ? (
          <Tooltip title="Limpar pesquisa">
            <IconButton
              size="small"
              onClick={handleSearchClear}
              aria-label="limpar pesquisa"
              sx={{
                color: 'inherit',
                '&:hover': {
                  backgroundColor: isDarkMode
                    ? alpha(theme.palette.common.white, 0.1)
                    : alpha(theme.palette.common.black, 0.05)
                }
              }}
            >
              <ClearIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : (
          <Tooltip title={searchOpen ? "Fechar" : "Pesquisar"}>
            <IconButton
              size="small"
              onClick={handleSearchClick}
              aria-label={searchOpen ? "fechar pesquisa" : "abrir pesquisa"}
              sx={{
                color: 'inherit',
                '&:hover': {
                  backgroundColor: isDarkMode
                    ? alpha(theme.palette.common.white, 0.1)
                    : alpha(theme.palette.common.black, 0.05)
                }
              }}
            >
              <SearchIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </SearchIconWrapper>
    </SearchWrapper>
  );
};

export default SearchBar;