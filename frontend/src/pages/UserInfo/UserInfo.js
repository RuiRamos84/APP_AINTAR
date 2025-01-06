import React, { useEffect, useState } from "react";
import { getUserInfo, updateUserInfo } from "../../services/userService";
import {
  Container,
  TextField,
  Button,
  Typography,
  Paper,
  MenuItem,
  Grid,
  Box,
  IconButton,
  Collapse,
  CircularProgress,
} from "@mui/material";
import { ExpandMore, ExpandLess } from "@mui/icons-material";
import {
  notifyError,
  notifySuccess,
  notifyLoading,
} from "../../components/common/Toaster/ThemedToaster";
import { useNavigate } from "react-router-dom";
import { useMetaData } from "../../contexts/MetaDataContext";
import AddressForm from "../../components/AddressForm/AddressForm";
import "./UserInfo.css";

const UserInfo = () => {
  const { metaData, loading: metaLoading, error: metaError } = useMetaData();
  const [userInfo, setUserInfo] = useState({});
  const [initialUserInfo, setInitialUserInfo] = useState({});
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [openIdentification, setOpenIdentification] = useState(true);
  const [openContact, setOpenContact] = useState(true);
  const [openAddress, setOpenAddress] = useState(true);
  const [openDescription, setOpenDescription] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getUserInfo();
        setUserInfo(data.user_info);
        setInitialUserInfo(data.user_info);
        notifySuccess(
          `Informações do Utilizador ${data.user_info.name}, obtidos corretamente!`
        );
      } catch (error) {
        notifyError("Erro ao buscar informações do utilizador");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserInfo((prevInfo) => ({
      ...prevInfo,
      [name]: value || "",
    }));
    setErrors((prevErrors) => ({
      ...prevErrors,
      [name]: "",
    }));
  };

  const hasChanges = () => {
    return JSON.stringify(userInfo) !== JSON.stringify(initialUserInfo);
  };

  const handleBack = () => {
    navigate(-1); // Volta para a página anterior
  };

  const validateFields = () => {
    let tempErrors = {};
    if (!userInfo.name) tempErrors.name = "Nome é obrigatório.";
    if (!userInfo.email) tempErrors.email = "Email é obrigatório.";
    if (!userInfo.address) tempErrors.address = "Morada é obrigatória.";
    if (!userInfo.postal) tempErrors.postal = "Código Postal é obrigatório.";
    if (!userInfo.phone) tempErrors.phone = "Telefone é obrigatório.";
    // Verificação condicional para Tipo e Número de Identificação
    if (
      (userInfo.ident_type && !userInfo.ident_value) ||
      (!userInfo.ident_type && userInfo.ident_value)
    ) {
      if (!userInfo.ident_type)
        tempErrors.ident_type =
          "Tipo de Identificação é obrigatório se o Nº de Identificação for preenchido.";
      if (!userInfo.ident_value)
        tempErrors.ident_value =
          "Nº de Identificação é obrigatório se o Tipo de Identificação for preenchido.";
    }
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateFields()) {
      try {
        await notifyLoading(
          () => updateUserInfo(userInfo),
          "A guardar alterações...",
          () => "Informações do utilizador atualizadas com sucesso.",
          "Erro ao atualizar informações do utilizador"
        );
        setInitialUserInfo(userInfo);
      } catch (error) {
        notifyError("Erro ao atualizar informações do utilizador");
      }
    } else {
      notifyError("Deve preencher todos os campos obrigatórios");;
    }
  };

  if (loading || metaLoading) return <CircularProgress />;
  if (metaError) return <Typography>Erro: {metaError.message}</Typography>;

  const identTypes = metaData?.ident_types || [];

  return (
    <Container component="main" maxWidth="lg">
      <Paper className="user-info-paper" elevation={5}>
        <Typography variant="h4" gutterBottom>
          Informações do Utilizador
        </Typography>
        <form onSubmit={handleSubmit}>
          <Box className="user-info-box">
            <Box>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="h5" gutterBottom>
                  Identificação
                </Typography>
                <IconButton
                  onClick={() => setOpenIdentification(!openIdentification)}
                >
                  {openIdentification ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </Box>
              <Collapse in={openIdentification}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={2}>
                    <TextField
                      required
                      fullWidth
                      id="nipc"
                      label="Numero Fiscal"
                      name="nipc"
                      value={userInfo.nipc || ""}
                      onChange={handleChange}
                      error={!!errors.email}
                      helperText={errors.email}
                    />
                  </Grid>
                  <Grid item xs={12} sm={5}>
                    <TextField
                      required
                      fullWidth
                      id="name"
                      label="Nome"
                      name="name"
                      value={userInfo.name || ""}
                      onChange={handleChange}
                      error={!!errors.name}
                      helperText={errors.name}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      // required
                      fullWidth
                      select
                      id="ident_type"
                      label="Tipo de Identificação"
                      name="ident_type"
                      value={userInfo.ident_type || ""}
                      onChange={handleChange}
                    >
                      <MenuItem value="">Sem identificação</MenuItem>
                      {identTypes.map((type) => (
                        <MenuItem key={type.pk} value={type.pk}>
                          {type.value}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <TextField
                      // required
                      fullWidth
                      id="ident_value"
                      label="Número de Identificação"
                      name="ident_value"
                      value={userInfo.ident_value || ""}
                      onChange={handleChange}
                      error={!!errors.ident_value}
                      helperText={errors.ident_value}
                    />
                  </Grid>
                </Grid>
              </Collapse>
            </Box>
            <Box mt={2}>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="h5" gutterBottom>
                  Contacto
                </Typography>
                <IconButton onClick={() => setOpenContact(!openContact)}>
                  {openContact ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </Box>
              <Collapse in={openContact}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      required
                      fullWidth
                      id="phone"
                      label="Telefone"
                      name="phone"
                      value={userInfo.phone || ""}
                      onChange={handleChange}
                      error={!!errors.phone}
                      helperText={errors.phone}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      required
                      fullWidth
                      id="email"
                      label="Email"
                      name="email"
                      value={userInfo.email || ""}
                      onChange={handleChange}
                      error={!!errors.email}
                      helperText={errors.email}
                    />
                  </Grid>
                </Grid>
              </Collapse>
            </Box>
            <Box mt={2}>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="h5" gutterBottom>
                  Morada
                </Typography>
                <IconButton onClick={() => setOpenContact(!openAddress)}>
                  {openAddress ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </Box>
              <Collapse in={openAddress}>
                <Grid container>
                  <AddressForm
                    prefix=""
                    entity={userInfo}
                    setEntity={setUserInfo}
                    errors={errors}
                  />
                </Grid>
              </Collapse>
            </Box>
            <Box mt={2}>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="h5" gutterBottom>
                  Outros
                </Typography>
                <IconButton
                  onClick={() => setOpenDescription(!openDescription)}
                >
                  {openDescription ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </Box>
              <Collapse in={openDescription}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      id="descr"
                      label="Descrição"
                      name="descr"
                      value={userInfo.descr || ""}
                      onChange={handleChange}
                      multiline
                      rows={4}
                    />
                  </Grid>
                </Grid>
              </Collapse>
            </Box>
          </Box>
          <Box className="user-info-actions">
            {hasChanges() ? (
              <>
                <Button
                  variant="contained"
                  color="secondary"
                  className="user-info-button"
                  onClick={handleBack}
                >
                  Voltar
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  className="user-info-button"
                >
                  Atualizar
                </Button>
              </>
            ) : (
              <Button
                variant="contained"
                color="secondary"
                className="user-info-button"
                onClick={handleBack}
              >
                Voltar
              </Button>
            )}
          </Box>
        </form>
      </Paper>
    </Container>
  );
};

export default UserInfo;
