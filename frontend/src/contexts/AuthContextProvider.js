import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import {
  TableCell,
  TableRow,
  CircularProgress,
} from "@mui/material";
import { useAuth } from "../contexts/AuthContext";

const PrivateRoute = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </div>
    );
  }


  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }


  return children;
};

export default PrivateRoute;
