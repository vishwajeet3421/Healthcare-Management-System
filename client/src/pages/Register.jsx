import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, setSession } from "../api.js";
import { Form } from "../components.jsx";

export default function Register() {
  const nav = useNavigate();
  const [err, setErr] = useState("");
  const submit = async (v) => {
    try { const r = await api("/auth/register", "POST", v); setSession(r.token, r.user); nav("/patient"); }
    catch (e) { setErr(e.message); }
  };
  return (
    <div className="auth">
      <h1>Patient Registration</h1>
      {err && <div className="flash error">{err}</div>}
      <Form submit="Register" onSubmit={submit} fields={[
        { name: "name", label: "Full name", required: true },
        { name: "email", label: "Email", type: "email", required: true },
        { name: "password", label: "Password (min 6 characters)", type: "password", required: true },
        { name: "phone", label: "Phone", required: true },
        { name: "age", label: "Age", type: "number", min: 0, max: 120 },
        { name: "gender", label: "Gender", options: [["", "Select"], ["Female", "Female"], ["Male", "Male"], ["Other", "Other"]] },
        { name: "address", label: "Address", type: "textarea" }]} />
      <p>Already registered? <Link to="/login">Login</Link></p>
    </div>
  );
}
