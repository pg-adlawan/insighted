import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");

    // If token doesn't exist, redirect to login
    if (!token) {
      navigate("/auth");
      return;
    }

    // Optionally, verify the token via backend (optional but better)
    fetch(`${import.meta.env.VITE_API_URL}/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Invalid token");
        }
      })
      .catch(() => {
        localStorage.removeItem("token");
        navigate("/auth");
      });
  }, [navigate]);

  return <>{children}</>;
};

export default ProtectedRoute;
