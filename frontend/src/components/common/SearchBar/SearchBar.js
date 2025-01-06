import React, { useState, useRef } from "react";
import SearchIcon from "@mui/icons-material/Search";
import "./SearchBar.css";

const SearchBar = ({ onSearch }) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef();

  const handleSearchClick = () => {
    setSearchOpen(!searchOpen);
    if (!searchOpen) {
      setTimeout(() => searchInputRef.current.focus(), 300);
    }
  };

  const handleSearchBlur = () => {
    if (searchInputRef.current.value === "") {
      setSearchOpen(false);
    }
  };

  const handleInputChange = (event) => {
    onSearch(event.target.value);
  };

  return (
    <div className={`search-bar ${searchOpen ? "open" : ""}`}>
      <input
        type="search"
        onBlur={handleSearchBlur}
        onChange={handleInputChange}
        placeholder="O que procura?"
        ref={searchInputRef}
      />
      {!searchOpen && (
        <button type="button" onClick={handleSearchClick}>
          <SearchIcon />
        </button>
      )}
    </div>
  );
};

export default SearchBar;
