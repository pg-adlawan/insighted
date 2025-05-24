import a{ useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import AuthPage from "./components/Auth/AuthPage";
import { FileUploadSidebar } from "./components/Sidebar/FileUploadSidebar";
import { MainDashboard } from "./components/Dashboard/MainDashboard";
import AdminDashboard from "./components/Admin/AdminDashboard";

// Protect dashboard route if no token
const PrivateRoute = ({
  children,
  role,
}: {
  children: JSX.Element;
  role: string;
}) => {
  const [valid, setValid] = useState<null | boolean>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    const parsedUser = user ? JSON.parse(user) : null;

    

    if (!token || !parsedUser) {
      setValid(false);
      return;
    }

    if (parsedUser.role !== role) {
      setValid(false);
      return;
    }

    fetch(`${import.meta.env.VITE_API_URL}/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Invalid token");
        return res.json();
      })
      .then(() => setValid(true))
      .catch(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setValid(false);
      });
  }, []);

  if (valid === null) {
    return (
      <div className="text-gray-400 text-center mt-10 text-sm animate-pulse">
        Verifying token...
      </div>
    );
  }

  return valid ? children : <Navigate to="/" replace />;
};

export default function App() {
  return (
    <Router>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute role="teacher">
              <div className="flex w-full min-h-screen bg-white">
                <FileUploadSidebar />
                <MainDashboard />
              </div>
            </PrivateRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <PrivateRoute role="admin">
              <AdminDashboard />
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}
