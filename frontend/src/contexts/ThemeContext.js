import React, { createContext, useState, useEffect } from "react";
import { lightTheme, darkTheme } from "../styles/theme";

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [darkMode, setDarkMode] = useState(() => {
        return localStorage.getItem("darkMode") === "true";
    });

    useEffect(() => {
        localStorage.setItem("darkMode", darkMode);
    }, [darkMode]);

    return (
        <ThemeContext.Provider value={{ darkMode, setDarkMode, theme: darkMode ? darkTheme : lightTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
