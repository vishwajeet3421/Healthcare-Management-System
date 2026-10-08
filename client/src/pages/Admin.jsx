import { useEffect, useState } from "react";
import { api } from "../api.js";
import { Layout, Card, Form, Table, Badge, Bar, Stat, Stars, useFlash, fmt } from "../components.jsx";

const ROLES = [["patient", "Patient"], ["doctor", "Doctor"], ["admin", "Admin"]];
const STATUSES = ["Pending", "Confirmed", "Completed", "Cancelled"];
const TABS = ["Dashboard", "Users", "Appointments", "Feedback", "Settings"];

export default function Admin() {
  const [tab, setTab] = useState("Dashboard");
  const [msg, run, load] = useFlash();
  const [dash, setDash] = useState(null);
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState("");
  const [editUser, setEditUser] = useState(null);
  const [appts, setAppts] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [slots, setSlots] = useState([]);
  const [reassign, setReassign] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [settings, setSettings] = useState(null);

  const loadUsers = () => load(async () => setUsers(await api("/admin/users" + (roleFilter ? "?role=" + roleFilter : ""))));
  const loadAppts = () => load(async () => setAppts(await api("/admin/appointments" + (statusFilter ? "?status=" + statusFilter : ""))));

  useEffect(() => { load(async () => {
    if (tab === "Dashboard") setDash(await api("/admin/dashboard"));
    if (tab === "Feedback") setFeedback(await api("/admin/feedback"));
    if (tab === "Settings") setSettings(await api("/admin/settings"));
    if (tab === "Appointments") setSlots(await api("/admin/slots"));
  }); }, [tab]);
  useEffect(() => { tab === "Users" && loadUsers(); }, [tab, roleFilter]);
  useEffect(() => { tab === "Appointments" && loadAppts(); }, [tab, statusFilter]);

  const userFields = [
    { name: "name", label: "Name", required: true }, { name: "email", label: "Email", type: "email", required: true },
    { name: "role", label: "Role", options: ROLES }, { name: "phone", label: "Phone" }, { name: "specialization", label: "Specialization (doctors)" }];

  return (
    <Layout title="Admin Dashboard" tabs={TABS} tab={tab} setTab={setTab} msg={msg}>
      {tab === "Dashboard" && dash && <>
        <div className="stats">
          <Stat label="Total users" value={dash.users} onClick={() => setTab("Users")} />
          <Stat label="Doctors" value={dash.doctors} onClick={() => setTab("Users")} />
          <Stat label="Patients" value={dash.patients} onClick={() => setTab("Users")} />
          <Stat label="Active appointments" value={dash.activeAppointments} onClick={() => setTab("Appointments")} />
          <Stat label={`Overall rating (${dash.ratingCount} reviews)`} value={dash.avgRating ? dash.avgRating.toFixed(1) + " ★" : "No ratings"} onClick={() => setTab("Feedback")} />
        </div>
        <Card title="Appointments by status">
          {dash.byStatus.map((s) => <Bar key={s._id} label={s._id} value={s.count} max={Math.max(...dash.byStatus.map((x) => x.count))} />)}
          {!dash.byStatus.length && <p className="muted">No appointments yet.</p>}
        </Card>
        <Card title="Quick links"><div className="row wrap">{TABS.slice(1).map((t) => <button key={t} className="btn" onClick={() => setTab(t)}>{t}</button>)}</div></Card>
      </>}

      {tab === "Users" && <>
        <Card title={editUser ? "Edit user" : "Add user"}>
          <Form key={editUser?._id || "new"} initial={editUser || {}} submit={editUser ? "Update" : "Create user"} onCancel={editUser && (() => setEditUser(null))}
            fields={editUser ? userFields : [...userFields, { name: "password", label: "Password", type: "password", required: true }]}
            onSubmit={(v) => run(() => editUser ? api("/admin/users/" + editUser._id, "PUT", v) : api("/admin/users", "POST", v), async () => { setEditUser(null); await loadUsers(); })} />
        </Card>
        <Card title="Users">
          <div className="filter">Filter by role: <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}><option value="">All</option>{ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          <Table head={["Name", "Email", "Role", "Phone", "Status", "Actions"]} rows={users.map((u) => [u.name, u.email, <Badge s={u.role} />, u.phone || "-",
            <Badge s={u.active ? "Active" : "Inactive"} />,
            <span className="row"><button className="btn small" onClick={() => setEditUser(u)}>Edit</button>
              <button className={"btn small " + (u.active ? "danger" : "")} onClick={() => run(() => api(`/admin/users/${u._id}/toggle`, "PUT"), loadUsers)}>{u.active ? "Deactivate" : "Activate"}</button></span>])} />
        </Card>
      </>}

      {tab === "Appointments" && <>
        {reassign && <Card title={`Reassign: ${reassign.patient?.name} (currently ${reassign.doctor?.name}, ${fmt(reassign)})`}>
          <Form key={reassign._id} submit="Reassign" onCancel={() => setReassign(null)}
            fields={[{ name: "slot", label: "New doctor / slot", required: true, options: [["", "Select an available slot"], ...slots.map((s) => [s._id, `${s.doctor?.name} - ${fmt(s)} (${s.capacity - s.booked} left)`])] }]}
            onSubmit={(v) => run(() => api(`/admin/appointments/${reassign._id}/reassign`, "PUT", v), async () => { setReassign(null); await loadAppts(); setSlots(await api("/admin/slots")); })} />
        </Card>}
        <Card title="All appointments">
          <div className="filter">Status: <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="">All</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div>
          <Table head={["Patient", "Doctor", "Date & time", "Status", "Actions"]} rows={appts.map((a) => [a.patient?.name, a.doctor?.name, fmt(a), <Badge s={a.status} />,
            ["Pending", "Confirmed"].includes(a.status) ? <span className="row">
              <button className="btn small" onClick={() => setReassign(a)}>Reassign</button>
              <button className="btn small danger" onClick={() => window.confirm("Cancel this appointment?") && run(() => api(`/admin/appointments/${a._id}/cancel`, "PUT"), loadAppts)}>Cancel</button></span> : "-"])} />
        </Card>
      </>}

      {tab === "Feedback" && <Card title="Patient feedback">
        <Table head={["Patient", "Doctor", "Visit", "Rating", "Comments"]} empty="No feedback submitted yet."
          rows={feedback.map((f) => [f.patient?.name, f.doctor?.name, f.date, <Stars n={f.rating} />, f.feedback || "-"])} />
      </Card>}

      {tab === "Settings" && settings && <Card title="System settings">
        <Form initial={settings} submit="Update settings" fields={[
          { name: "clinic_name", label: "Hospital / clinic name", required: true },
          { name: "work_start", label: "Working hours - opens", type: "time", required: true },
          { name: "work_end", label: "Working hours - closes", type: "time", required: true },
          { name: "slot_minutes", label: "Default slot duration (minutes)", type: "number", min: 5, required: true },
          { name: "lead_hours", label: "Appointment lead time (hours in advance)", type: "number", min: 0, required: true }]}
          onSubmit={(v) => run(() => api("/admin/settings", "PUT", v), () => api("/admin/settings").then(setSettings))} />
      </Card>}
    </Layout>
  );
}
