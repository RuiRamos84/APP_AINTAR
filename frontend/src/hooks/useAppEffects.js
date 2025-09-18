// frontend/src/hooks/useAppEffects.js - NOVO ARQUIVO

import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { darkTheme, lightTheme } from "../styles/theme";

const PUBLIC_ROUTES = ["/", "/login", "/create-user", "/activation", "/password-recovery", "/reset-password"];

export const useAppEffects = (user, isLoading, isLoggingOut, sidebarMode, isDarkMode) => {
    const navigate = useNavigate();
    const location = useLocation();

    // Redirecionamento para login
    useEffect(() => {
        if (!isLoading && !user && !isLoggingOut) {
            if (!PUBLIC_ROUTES.some(route => location.pathname.startsWith(route))) {
                navigate("/login");
            }
        }
    }, [user, isLoading, isLoggingOut, navigate, location.pathname]);

    // CSS sidebar margin baseado no contexto (apenas para utilizadores autenticados)
    useEffect(() => {
        if (user) {
            let marginValue;
            switch (sidebarMode) {
                case 'full':
                    marginValue = "8.5vw";
                    break;
                case 'compact':
                    marginValue = "2.5vw";
                    break;
                case 'closed':
                default:
                    marginValue = "0vw";
                    break;
            }

            document.documentElement.style.setProperty("--sidebar-margin", marginValue);
        } else {
            document.documentElement.style.setProperty("--sidebar-margin", "0vw");
        }
    }, [sidebarMode, user]);

    // Theme color
    useEffect(() => {
        const updateThemeColor = (color) => {
            let metaThemeColor = document.querySelector("meta[name=theme-color]");
            if (!metaThemeColor) {
                metaThemeColor = document.createElement("meta");
                metaThemeColor.name = "theme-color";
                document.getElementsByTagName("head")[0].appendChild(metaThemeColor);
            }
            metaThemeColor.content = color;
        };

        const themeColor = isDarkMode
            ? darkTheme.palette.background.default
            : lightTheme.palette.background.default;
        updateThemeColor(themeColor);
    }, [isDarkMode]);
};