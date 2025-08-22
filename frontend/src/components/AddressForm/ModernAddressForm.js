import React, { useState, useEffect } from "react";
import {
  TextField,
  MenuItem,
  IconButton,
  InputAdornment,
  Tooltip,
  Grid,
  Box,
  Paper,
  Typography,
  CircularProgress,
  useTheme,
  Fade,
  Alert,
  Chip,
} from "@mui/material";
import {
  ArrowBack,
  LocationOn,
  Search,
  CheckCircle,
  Info as InfoIcon
} from "@mui/icons-material";
import { getAddressByPostalCode } from "../../services/postalCodeService";

const ModernAddressForm = ({
  addressData,
  setAddressData,
  errors = {},
  title = "Morada",
  variant = "primary",
  required = true,
  isAutoFilled = false,
  skipPaper = false  // Nova prop para controlar se deve renderizar o Paper
}) => {

  const theme = useTheme();
  const [manualAddress, setManualAddress] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [isInitialData, setIsInitialData] = useState(true);
  const [loading, setLoading] = useState(false);
  const [fetchSuccess, setFetchSuccess] = useState(false);

  useEffect(() => {
    const hasInitialData =
      addressData?.address ||
      addressData?.nut4 ||
      addressData?.nut3 ||
      addressData?.nut2 ||
      addressData?.nut1;

    if (hasInitialData && isInitialData) {
      setManualAddress(true);
      setIsInitialData(false);
    }
  }, [addressData, isInitialData]);

  const fetchAddresses = async (postalCode) => {
    setLoading(true);
    setFetchSuccess(false);

    try {
      const addressData = await getAddressByPostalCode(postalCode);
      if (addressData && addressData.length > 0) {
        const ruas = addressData.map((item) => item.morada);
        setAddresses([...ruas, "Outra"]);
        setManualAddress(false);
        setFetchSuccess(true);

        const address = addressData[0];
        setAddressData((prev) => ({
          ...prev,
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
    } finally {
      setLoading(false);
    }
  };

  const clearFields = (postalCode) => {
    setAddressData((prev) => ({
      ...prev,
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
    setFetchSuccess(false);

    // Remove todos os caracteres não numéricos
    value = value.replace(/[^\d]/g, "");

    // Limita a 7 dígitos
    value = value.slice(0, 7);

    // Adiciona o hífen após os primeiros 4 dígitos
    if (value.length > 4) {
      value = `${value.slice(0, 4)}-${value.slice(4)}`;
    }

    // Atualiza o estado com o novo valor formatado
    setAddressData((prev) => ({
      ...prev,
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
      setAddressData((prev) => ({
        ...prev,
        address: "",
      }));
    } else {
      setManualAddress(false);
      setAddressData((prev) => ({
        ...prev,
        address: value,
      }));
    }
  };

  const handleManualAddressChange = (e) => {
    const { value } = e.target;
    setAddressData((prev) => ({
      ...prev,
      address: value,
    }));
  };

  const handleReturnToList = () => {
    setManualAddress(false);
    setAddressData((prev) => ({
      ...prev,
      address: "",
    }));
  };

  const getColorScheme = () => {
    return variant === 'primary'
      ? theme.palette.primary.main
      : theme.palette.secondary.main;
  };

  // Conteúdo do formulário
  const formContent = (
    <>
      {title && (
        <Box display="flex" alignItems="center" mb={2} justifyContent="space-between">
          <Box display="flex" alignItems="center">
            <LocationOn sx={{ mr: 1, color: getColorScheme() }} />
            <Typography variant="h6">
              {title}
            </Typography>
          </Box>

          {fetchSuccess && (
            <Tooltip title="Código postal encontrado">
              <CheckCircle color="success" sx={{ ml: 1, fontSize: 20 }} />
            </Tooltip>
          )}

          {isAutoFilled && !fetchSuccess && (
            <Tooltip title="Preenchido automaticamente a partir dos dados da entidade">
              <Chip
                size="small"
                color="info"
                label="Pré-preenchido"
                icon={<InfoIcon fontSize="small" />}
              />
            </Tooltip>
          )}
        </Box>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 3 }}>
          <TextField
            required={required}
            label="Código Postal"
            name="postal"
            id="postal-code-input"
            value={addressData?.postal ?? ""}
            onChange={handlePostalCodeChange}
            fullWidth
            variant="outlined"
            error={!!errors?.postal}
            helperText={errors?.postal}
            InputProps={{
              endAdornment: loading ? (
                <InputAdornment position="end">
                  <CircularProgress size={20} />
                </InputAdornment>
              ) : addressData?.postal?.length === 8 ? (
                <InputAdornment position="end">
                  <Tooltip title="Pesquisar código postal">
                    <IconButton
                      onClick={() => fetchAddresses(addressData.postal)}
                      size="small"
                      color="primary"
                    >
                      <Search fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ) : null
            }}
            placeholder="1234-567"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 5 }}>
          {manualAddress ? (
            <TextField
              required={required}
              variant="outlined"
              fullWidth
              label="Morada"
              name="address"
              id="address-input"
              value={addressData?.address ?? ""}
              onChange={handleManualAddressChange}
              error={!!errors?.address}
              helperText={errors?.address}
              InputProps={{
                endAdornment: addresses.length > 0 && (
                  <InputAdornment position="end">
                    <Tooltip title="Voltar à Lista">
                      <IconButton onClick={handleReturnToList} size="small">
                        <ArrowBack fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
              placeholder="Digite a morada manualmente"
            />
          ) : addresses.length > 0 ? (
            <TextField
              required={required}
              variant="outlined"
              fullWidth
              select
              id="address-select"
              label="Morada"
              name="address"
              value={addressData?.address ?? ""}
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
              required={required}
              variant="outlined"
              fullWidth
              label="Morada"
              name="address"
              id="address-input"
              value={addressData?.address ?? ""}
              onChange={handleManualAddressChange}
              error={!!errors?.address}
              helperText={errors?.address || "Insira um código postal válido para pesquisar moradas"}
              disabled={!addressData?.postal || addressData?.postal.length < 8}
              placeholder="Será preenchido automaticamente após inserir o código postal"
            />
          )}
        </Grid>

        <Grid size={{ xs: 12, sm: 2 }}>
          <TextField
            label="Nº de porta"
            name="door"
            id="door-input"
            value={addressData?.door ?? ""}
            onChange={(e) =>
              setAddressData((prev) => ({
                ...prev,
                door: e.target.value,
              }))
            }
            fullWidth
            variant="outlined"
            placeholder="Ex: 12A"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 2 }}>
          <TextField
            label="Andar"
            name="floor"
            id="floor-input"
            value={addressData?.floor ?? ""}
            onChange={(e) =>
              setAddressData((prev) => ({
                ...prev,
                floor: e.target.value,
              }))
            }
            fullWidth
            variant="outlined"
            placeholder="Ex: 3º Dto"
          />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
              gap: 2,
              mt: 1
            }}
          >
            <TextField
              variant="outlined"
              required={required}
              size="small"
              label="Localidade"
              name="nut4"
              value={addressData?.nut4 ?? ""}
              onChange={(e) =>
                setAddressData((prev) => ({
                  ...prev,
                  nut4: e.target.value,
                }))
              }
              fullWidth
              error={!!errors.nut4}
              helperText={errors.nut4}
              disabled={fetchSuccess}
              InputProps={{
                readOnly: fetchSuccess,
              }}
            />

            <TextField
              variant="outlined"
              required={required}
              size="small"
              label="Freguesia"
              name="nut3"
              value={addressData?.nut3 ?? ""}
              onChange={(e) =>
                setAddressData((prev) => ({
                  ...prev,
                  nut3: e.target.value,
                }))
              }
              fullWidth
              error={!!errors.nut3}
              helperText={errors.nut3}
              disabled={fetchSuccess}
              InputProps={{
                readOnly: fetchSuccess,
              }}
            />

            <TextField
              variant="outlined"
              required={required}
              size="small"
              label="Concelho"
              name="nut2"
              value={addressData?.nut2 ?? ""}
              onChange={(e) =>
                setAddressData((prev) => ({
                  ...prev,
                  nut2: e.target.value,
                }))
              }
              fullWidth
              error={!!errors.nut2}
              helperText={errors.nut2}
              disabled={fetchSuccess}
              InputProps={{
                readOnly: fetchSuccess,
              }}
            />

            <TextField
              variant="outlined"
              required={required}
              size="small"
              label="Distrito"
              name="nut1"
              value={addressData?.nut1 ?? ""}
              onChange={(e) =>
                setAddressData((prev) => ({
                  ...prev,
                  nut1: e.target.value,
                }))
              }
              fullWidth
              error={!!errors.nut1}
              helperText={errors.nut1}
              disabled={fetchSuccess}
              InputProps={{
                readOnly: fetchSuccess,
              }}
            />
          </Box>
        </Grid>
      </Grid>

      {!fetchSuccess && addressData?.postal?.length === 8 && !loading && (
        <Fade in={!fetchSuccess && addressData?.postal?.length === 8}>
          <Alert severity="info" sx={{ mt: 2 }}>
            Se o código postal não devolver resultados, deve preencher os dados manualmente.
          </Alert>
        </Fade>
      )}
    </>
  );

  // Se skipPaper é verdadeiro, retorna apenas o conteúdo sem o Paper
  if (skipPaper) {
    return formContent;
  }

  // Caso contrário, envolve o conteúdo com Paper (comportamento padrão)
  return (
    <Paper
      elevation={0}
      variant="outlined"
      sx={{
        p: 2,
        mb: 2,
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
        borderColor: fetchSuccess ? theme.palette.success.light :
          isAutoFilled ? theme.palette.info.light : undefined,
        borderLeft: `3px solid ${getColorScheme()}`
      }}
    >
      {formContent}
    </Paper>
  );
};

export default ModernAddressForm;