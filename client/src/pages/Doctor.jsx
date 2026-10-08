import { useEffect, useState } from "react";
import { api } from "../api.js";
import { Layout, Card, Form, Table, Badge, Stat, useFlash, today, fmt } from "../components.jsx";

const TABS = ["Dashboard", "Schedule", "Appointments", "Medical Records"];

export default function Doctor() {
  const [tab, setTab] = useState("Dashboard");
  const [msg, run, load] = useFlash();
  const [dash, setDash] = useState(null);
  const [slots, setSlots] = useState([]);
  const [editSlot, setEditSlot] = useState(null);
  const [appts, setAppts] = useState([]);
  const [records, setRecords] = useState([]);
  const [pending, setPending] = useState([]);
  const [editRec, setEditRec] = useState(null);

  const loadSlots = () => load(async () => setSlots(await api("/doctor/slots")));
  const loadAppts = () => load(async () => setAppts(await api("/doctor/appointments")));
  const loadRecs = () => load(async () => { setRecords(await api("/doctor/records")); setPending(await api("/doctor/records/pending")); });

  useEffect(() => { load(async () => {
    if (tab === "Dashboard") setDash(await api("/doctor/dashboard"));
    if (tab === "Schedule") await loadSlots();
    if (tab === "Appointments") await loadAppts();
    if (tab === "Medical Records") await loadRecs();
  }); }, [tab]);

  const setStatus = (a, status) => run(() => api(`/doctor/appointments/${a._id}/status`, "PUT", { status }), loadAppts);
  const slotFields = [{ name: "date", label: "Date", type: "date", min: today(), required: true }, { name: "start", label: "Start time", type: "time", required: true },
    { name: "end", label: "End time (blank = default duration)", type: "time" }, { name: "capacity", label: "Max capacity", type: "number", min: 1, required: true }];
  const recFields = [{ name: "diagnosis", label: "Diagnosis", required: true }, { name: "prescription", label: "Prescription", type: "textarea" }, { name: "notes", label: "Clinical notes", type: "textarea" }];

  return (
    <Layout title="Doctor Dashboard" tabs={TABS} tab={tab} setTab={setTab} msg={msg}>
      {tab === "Dashboard" && dash && <>
        <div className="stats">
          <Stat label="Today's appointments" value={dash.todayAppointments.length} onClick={() => setTab("Appointments")} />
          <Stat label="Upcoming active slots" value={dash.upcomingSlots.length} onClick={() => setTab("Schedule")} />
          <Stat label="Recent record updates" value={dash.recentRecords.length} onClick={() => setTab("Medical Records")} />
        </div>
        <Card title="Today's appointments">
          <Table head={["Time", "Patient", "Status"]} rows={dash.todayAppointments.map((a) => [`${a.start}-${a.end}`, a.patient?.name, <Badge s={a.status} />])} empty="No appointments today." />
        </Card>
        <Card title="Upcoming schedule slots">
          <Table head={["Date", "Time", "Booked / capacity"]} rows={dash.upcomingSlots.map((s) => [s.date, `${s.start}-${s.end}`, `${s.booked} / ${s.capacity}`])} empty="No upcoming slots. Add some in Schedule." />
        </Card>
        <Card title="Recent medical record updates">
          <Table head={["Patient", "Diagnosis", "Updated"]} rows={dash.recentRecords.map((r) => [r.patient?.name, r.diagnosis, r.updatedAt?.slice(0, 10)])} empty="No records yet." />
        </Card>
      </>}

      {tab === "Schedule" && <>
        <Card title={editSlot ? "Update slot" : "Create consultation slot"}>
          <Form key={editSlot?._id || "new"} initial={editSlot || { capacity: 1 }} submit={editSlot ? "Update slot" : "Create slot"} onCancel={editSlot && (() => setEditSlot(null))} fields={slotFields}
            onSubmit={(v) => run(() => editSlot ? api("/doctor/slots/" + editSlot._id, "PUT", v) : api("/doctor/slots", "POST", v), async () => { setEditSlot(null); await loadSlots(); })} />
        </Card>
        <Card title="My slots">
          <Table head={["Date", "Time", "Booked / capacity", "Status", "Actions"]} rows={slots.map((s) => [s.date, `${s.start}-${s.end}`, `${s.booked} / ${s.capacity}`, <Badge s={s.active ? "Active" : "Inactive"} />,
            <span className="row"><button className="btn small" onClick={() => setEditSlot(s)}>Edit</button>
              <button className="btn small" onClick={() => run(() => api(`/doctor/slots/${s._id}/toggle`, "PUT"), loadSlots)}>{s.active ? "Deactivate" : "Activate"}</button></span>])} empty="No slots yet." />
        </Card>
      </>}

      {tab === "Appointments" && <Card title="My patient appointments">
        <Table head={["Patient", "Phone", "Date & time", "Reason", "Status", "Actions"]} rows={appts.map((a) => [a.patient?.name, a.patient?.phone || "-", fmt(a), a.reason || "-", <Badge s={a.status} />,
          <span className="row">
            {a.status === "Pending" && <button className="btn small" onClick={() => setStatus(a, "Confirmed")}>Confirm</button>}
            {a.status === "Confirmed" && <button className="btn small" onClick={() => setStatus(a, "Completed")}>Complete</button>}
            {["Pending", "Confirmed"].includes(a.status) && <button className="btn small danger" onClick={() => setStatus(a, "Cancelled")}>Cancel</button>}
          </span>])} empty="No appointments yet." />
      </Card>}

      {tab === "Medical Records" && <>
        <Card title={editRec ? `Update record - ${editRec.patient?.name}` : "Create medical record (for a completed appointment)"}>
          {!editRec && !pending.length ? <p className="muted">No completed appointments are waiting for a record. Mark an appointment as Completed first.</p> :
            <Form key={editRec?._id || "new"} initial={editRec || {}} submit={editRec ? "Update record" : "Create record"} onCancel={editRec && (() => setEditRec(null))}
              fields={editRec ? recFields : [{ name: "appointment", label: "Completed appointment", required: true, options: pending.map((a) => [a._id, `${a.patient?.name} - ${a.date}`]) }, ...recFields]}
              onSubmit={(v) => run(() => editRec ? api("/doctor/records/" + editRec._id, "PUT", v) : api("/doctor/records", "POST", v), async () => { setEditRec(null); await loadRecs(); })} />}
        </Card>
        <Card title="Records of patients I treated">
          <Table head={["Patient", "Visit", "Diagnosis", "Prescription", "Notes", ""]} rows={records.map((r) => [r.patient?.name, r.appointment?.date, r.diagnosis, r.prescription || "-", r.notes || "-",
            <button className="btn small" onClick={() => setEditRec(r)}>Edit</button>])} empty="No records yet." />
        </Card>
      </>}
    </Layout>
  );
}
