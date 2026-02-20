import React, { useState, useEffect } from "react";
import { TextField } from "@mui/material";

const LicenseInput = ({ value, onChange, disabled }) => {
    // Máscara fixa: AA-00-AA (9 posições, incluindo traços)
    const maskTemplate = ["-", " ", " ", "-", " ", " ", "-", " ", " "];

    const [internalValue, setInternalValue] = useState(maskTemplate.join(""));

    // Inicializa o input com os traços se value estiver vazio
    useEffect(() => {
        if (!value || value.replace(/-/g, "").trim() === "") {
            setInternalValue(maskTemplate.join(""));
            if (onChange) onChange({ target: { value: maskTemplate.join("") } });
        } else {
            setInternalValue(value);
        }
    }, [value, onChange]);

    const handleChange = (e) => {
        const input = e.target.value.toUpperCase();

        const newVal = maskTemplate.map((char, index) => {
            // Letras: posições 0,1,7,8
            if ([0, 1, 7, 8].includes(index)) {
                return /[A-Z]/.test(input[index]) ? input[index] : " ";
            }
            // Números: posições 3,4
            if ([3, 4].includes(index)) {
                return /[0-9]/.test(input[index]) ? input[index] : " ";
            }
            // Traços e espaços fixos
            return char;
        });

        const formatted = newVal.join("");
        setInternalValue(formatted);
        if (onChange) onChange({ target: { value: formatted } });
    };

    const handleFocus = () => {
        // Força a máscara ao focar se estiver vazio
        if (!internalValue || internalValue.replace(/-/g, "").trim() === "") {
            setInternalValue(maskTemplate.join(""));
            if (onChange) onChange({ target: { value: maskTemplate.join("") } });
        }
    };

    return (
        <TextField
            label="Matrícula"
            value={internalValue}
            onChange={handleChange}
            onFocus={handleFocus}
            disabled={disabled}
            fullWidth
        />
    );
};

export default LicenseInput;