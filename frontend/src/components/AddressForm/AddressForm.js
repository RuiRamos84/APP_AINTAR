import React, { useState, useEffect } from "react";
import {
  TextField,
  MenuItem,
  IconButton,
  InputAdornment,
  Tooltip,
  Grid,
  Box
} from "@mui/material";
import { driver } from "driver.js"; // Certifique-se de importar corretamente
import "driver.js/dist/driver.css";
import { ArrowBack } from "@mui/icons-material";
import { getAddressByPostalCode } from "../../services/postalCodeService";

const AddressForm = ({ entity = {}, setEntity, errors = {} }) => {
  const [manualAddress, setManualAddress] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [isInitialData, setIsInitialData] = useState(true);

  useEffect(() => {
    const hasInitialData =
      entity?.address ||
      entity?.nut4 ||
      entity?.nut3 ||
      entity?.nut2 ||
      entity?.nut1;

    if (hasInitialData && isInitialData) {
      setManualAddress(true);
      setIsInitialData(false);
    }
  }, [entity, isInitialData]);

  const fetchAddresses = async (postalCode) => {
    try {
      const addressData = await getAddressByPostalCode(postalCode);
      if (addressData && addressData.length > 0) {
        const ruas = addressData.map((item) => item.morada);
        setAddresses([...ruas, "Outra"]);
        setManualAddress(false);

        const address = addressData[0];
        setEntity((prevEntity) => ({
          ...prevEntity,
          postal: postalCode,
          address: "",
          nut4: address.localidade,
          nut3: address.freguesia,
          nut2: address.concelho,
          nut1: address.distrito,
        }));
      } else {
        setAddresses([]);
        setManualAddress(true);
        clearFields(postalCode);
      }
    } catch (error) {
      console.error("Erro ao obter o endereço pelo código postal", error);
      setAddresses([]);
      setManualAddress(true);
      clearFields(postalCode);
    }
  };

  const clearFields = (postalCode) => {
    setEntity((prevEntity) => ({
      ...prevEntity,
      postal: postalCode,
      address: "",
      door: "",
      floor: "",
      nut4: "",
      nut3: "",
      nut2: "",
      nut1: "",
    }));
  };

  const handlePostalCodeChange = (e) => {
    let { value } = e.target;
    setIsInitialData(false);

    // Remove todos os caracteres não numéricos
    value = value.replace(/[^\d]/g, "");

    // Limita a 7 dígitos
    value = value.slice(0, 7);

    // Adiciona o hífen após os primeiros 4 dígitos
    if (value.length > 4) {
      value = `${value.slice(0, 4)}-${value.slice(4)}`;
    }

    // Atualiza o estado com o novo valor formatado
    setEntity((prevEntity) => ({
      ...prevEntity,
      postal: value,
    }));

    // Verifica se o código postal está completo (7 dígitos + hífen)
    if (value.length === 8) {
      fetchAddresses(value);
    } else {
      setAddresses([]);
      setManualAddress(false);
      clearFields(value);
    }
  };

  const handleAddressSelect = (e) => {
    const { value } = e.target;

    if (value === "Outra") {
      setManualAddress(true);
      setEntity((prevEntity) => ({
        ...prevEntity,
        address: "",
      }));
    } else {
      setManualAddress(false);
      setEntity((prevEntity) => ({
        ...prevEntity,
        address: value,
      }));
    }
  };

  const handleManualAddressChange = (e) => {
    const { value } = e.target;
    setEntity((prevEntity) => ({
      ...prevEntity,
      address: value,
    }));
  };

  const handleReturnToList = () => {
    setManualAddress(false);
    setEntity((prevEntity) => ({
      ...prevEntity,
      address: "",
    }));
  };

  const startPostalCodeTutorial = () => {
    const driverInstance = driver({
      showProgress: true,
      steps: [
        {
          element: "#postal-code-input",
          popover: {
            title: "Código Postal",
            description: "Digite o código postal aqui.",
            position: "bottom",
          },
        },
        {
          element: "#address-input",
          popover: {
            title: "Endereço",
            description:
              "O endereço será preenchido automaticamente com base no código postal.",
            position: "bottom",
          },
        },
      ],
    });

    driverInstance.drive();
  };

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 2 }}>
        <TextField
          required
          label="Código Postal"
          name="postal"
          id="postal-code-input"
          value={entity?.postal ?? ""}
          onChange={handlePostalCodeChange}
          fullWidth
          margin="normal"
          error={!!errors?.postal}
          helperText={errors?.postal}
          inputProps={{
            maxLength: 9, // 8 caracteres + 1 para o hífen
          }}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        {manualAddress ? (
          <TextField
            required
            variant="outlined"
            margin="normal"
            fullWidth
            label="Morada"
            name="address"
            id="address-input"
            value={entity?.address ?? ""}
            onChange={handleManualAddressChange}
            error={!!errors?.address}
            helperText={errors?.address}
            InputProps={{
              endAdornment: addresses.length > 0 && (
                <InputAdornment position="end">
                  <Tooltip title="Voltar à Lista">
                    <IconButton onClick={handleReturnToList}>
                      <ArrowBack />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
            }}
          />
        ) : addresses.length > 0 ? (
          <TextField
            required
            variant="outlined"
            margin="normal"
            fullWidth
            select
            id="address-label"
            label="Morada"
            name="address"
            value={entity?.address ?? ""}
            onChange={handleAddressSelect}
            error={!!errors?.address}
            helperText={errors?.address}
          >
            {addresses.map((address, index) => (
              <MenuItem key={index} value={address}>
                {address}
              </MenuItem>
            ))}
          </TextField>
        ) : (
          <TextField
            required
            variant="outlined"
            margin="normal"
            fullWidth
            label="Morada"
            name="address"
            id="address-input"
            value={entity?.address ?? ""}
            onChange={handleManualAddressChange}
            error={!!errors?.address}
            helperText={errors?.address}
            disabled={!entity?.postal}
          />
        )}
      </Grid>
      <Grid size={{ xs: 12, sm: 2 }}>
        <TextField
          label="Nº de porta"
          name="door"
          id="door-input"
          value={entity?.door ?? ""}
          onChange={(e) =>
            setEntity((prevEntity) => ({
              ...prevEntity,
              door: e.target.value,
            }))
          }
          fullWidth
          margin="normal"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 2 }}>
        <TextField
          label="Andar"
          name="floor"
          id="floor-input"
          value={entity?.floor ?? ""}
          onChange={(e) =>
            setEntity((prevEntity) => ({
              ...prevEntity,
              floor: e.target.value,
            }))
          }
          fullWidth
          margin="normal"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 12 }}>
        <Tooltip title="Preenchido automaticamente com base no código postal">
          <Box display="flex" gap={2} id="grouped-info">
            <TextField
              required
              label="Localidade"
              name="nut4"
              value={entity?.nut4 ?? ""}
              onChange={(e) =>
                setEntity((prevEntity) => ({
                  ...prevEntity,
                  nut4: e.target.value,
                }))
              }
              fullWidth
              margin="normal"
              error={!!errors.nut4}
              helperText={errors.nut4}
              disabled
            />
            <TextField
              required
              label="Freguesia"
              name="nut3"
              value={entity?.nut3 ?? ""}
              onChange={(e) =>
                setEntity((prevEntity) => ({
                  ...prevEntity,
                  nut3: e.target.value,
                }))
              }
              fullWidth
              margin="normal"
              error={!!errors.nut3}
              helperText={errors.nut3}
              disabled
            />
            <TextField
              required
              label="Concelho"
              name="nut2"
              value={entity?.nut2 ?? ""}
              onChange={(e) =>
                setEntity((prevEntity) => ({
                  ...prevEntity,
                  nut2: e.target.value,
                }))
              }
              fullWidth
              margin="normal"
              error={!!errors.nut2}
              helperText={errors.nut2}
              disabled
            />
            <TextField
              required
              label="Distrito"
              name="nut1"
              value={entity?.nut1 ?? ""}
              onChange={(e) =>
                setEntity((prevEntity) => ({
                  ...prevEntity,
                  nut1: e.target.value,
                }))
              }
              fullWidth
              margin="normal"
              error={!!errors.nut1}
              helperText={errors.nut1}
              disabled
            />
          </Box>
        </Tooltip>
      </Grid>
    </Grid>
  );
};

export default AddressForm;
