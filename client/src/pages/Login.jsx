import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, setSession } from "../api.js";
import { Form } from "../components.jsx";

export default function Login() {
  const nav = useNavigate();
  const [err, setErr] = useState("");
  const submit = async (v) => {
    try { const r = await api("/auth/login", "POST", v); setSession(r.token, r.user); nav("/" + r.user.role); }
    catch (e) { setErr(e.message); }
  };
  return (
    <div className="auth">
      <h1>🏥 Healthcare Management System</h1>
      <p className="muted">Sign in as Admin, Doctor or Patient</p>
      {err && <div className="flash error">{err}</div>}
      <Form submit="Login" onSubmit={submit} fields={[
        { name: "email", label: "Email", type: "email", required: true },
        { name: "password", label: "Password", type: "password", required: true }]} />
      <p>New patient? <Link to="/register">Create an account</Link></p>
      <small className="muted">Demo: admin@health.com / admin123 · doctor@health.com / doctor123 · patient@health.com / patient123</small>
    </div>
  );
}
