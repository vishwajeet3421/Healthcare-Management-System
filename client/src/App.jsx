import { Routes, Route, Navigate } from "react-router-dom";
import { getUser } from "./api.js";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Admin from "./pages/Admin.jsx";
import Doctor from "./pages/Doctor.jsx";
import Patient from "./pages/Patient.jsx";

function Protected({ role, children }) {
  const u = getUser();
  if (!u) return <Navigate to="/login" replace />;
  if (u.role !== role) return <Navigate to={"/" + u.role} replace />;
  return children;
}

export default function App() {
  const u = getUser();
  return (
    <Routes>
      <Route path="/" element={<Navigate to={u ? "/" + u.role : "/login"} replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/admin" element={<Protected role="admin"><Admin /></Protected>} />
      <Route path="/doctor" element={<Protected role="doctor"><Doctor /></Protected>} />
      <Route path="/patient" element={<Protected role="patient"><Patient /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
