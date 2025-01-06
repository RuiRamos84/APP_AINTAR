import api from "./api";


// DarkMode
export const updateDarkMode = async (userId, darkMode) => {
  try {
    const response = await api.post("/auth/update_dark_mode", {
      user_id: userId,
      dark_mode: darkMode ? 1 : 0,
    });
    if (response.status === 200) {
      const user = JSON.parse(localStorage.getItem("user"));
      const updatedUser = { ...user, dark_mode: darkMode ? 1 : 0 };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      return updatedUser;
    }
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.msg || "Failed to update dark mode");
    }
    throw error;
  }
};


// Criar novo utilizador
export const createUser = async (userData) => {
  try {
    const response = await api.post("/user/create_user_ext", userData);
    return response.data;
  } catch (error) {
    // Verificar se há uma resposta de erro do servidor
    if (error.response && error.response.data) {
      throw new Error(
        error.response.data.erro ||
          error.response.data.error ||
          "Error creating user"
      );
    }
    // Caso contrário, lançar um erro genérico
    throw new Error(error.message || "Error creating user");
  }
};


// Ativar utilizador
export const activateUser = async (id, activation_code) => {
  try {
    const response = await api.get(`user/activation/${id}/${activation_code}`);
    // console.log(response.data)
    return response.data;
  } catch (error) {
    console.error("Error activating user", error); 
    throw new Error(error.message || "Error activating user");
  }
}

// Obter informações do utilizador
export const getUserInfo = async () => {
  try {
    const response = await api.get("user/user_info");
    return response.data;
  } catch (error) {
    console.error("Error fetching user info", error);
    throw error;
  }
};

// Atualizar informações do utilizador
export const updateUserInfo = async (userData) => {
  try {
    const response = await api.put("user/user_info", userData);
    return response.data;
  } catch (error) {
    console.error("Error updating user info", error);
    throw error;
  }
};

// Alterar password
export const changePassword = async (passwordData) => {
  try {
    // console.log("Passwords", passwordData)
    const response = await api.put("user/change_password", passwordData);
    return response.data;
  } catch (error) {
    console.error("Error changing password", error);
    throw error;
  }
};

// Recuperar password
export const passwordRecovery = async (email) => {
  try {
    const response = await api.post("user/password_recovery", { email });
    return response.data;
  } catch (error) {
    console.error("Error recovering password", error);
    throw error;
  }
};

// Redefinir password
export const resetPassword = async (resetData) => {
  try {
    const response = await api.post("user/reset_password", resetData);
    return response.data;
  } catch (error) {
    console.error("Error resetting password", error);
    throw error;
  }
};

// Status Ferias
export const updateVacationStatus = async (userId, status) => {
  try {
    // console.log("Sending request to update vacation status", userId, status); // Log
    const response = await api.post("user/vacation_status", {
      user_id: userId,
      vacation: status ? 1 : 0,
    });
    // console.log("Response from server", response); // Log
    if (response.status === 200) {
      const user = JSON.parse(localStorage.getItem("user"));
      const updatedUser = { ...user, vacation: status ? 1 : 0 };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      return updatedUser;
    } else {
      console.error("Failed to update vacation status, status:",
        response.status
      );
      throw new Error("Failed to update vacation status");
    }
  } catch (error) {
    console.error("Error updating vacation status", error); // Log
    if (error.response) {
      console.error("Server response error", error.response); // Log
      throw new Error(
        error.response.data.msg || "Failed to update vacation status"
      );
    }
    throw error;
  }
};

