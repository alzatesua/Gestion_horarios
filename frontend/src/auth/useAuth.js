import { useNavigate } from "react-router-dom";

export function useAuth() {
  const navigate = useNavigate();
  
  const login = (usuario, role) => {
    localStorage.setItem("user", JSON.stringify({ usuario, role }));
    navigate("/dashboard");
  };

  const logout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  const getUser = () => JSON.parse(localStorage.getItem("user") || "{}");

  const isAuthenticated = () => !!localStorage.getItem("user");

  return { login, logout, getUser, isAuthenticated };
}
