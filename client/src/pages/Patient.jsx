import { useEffect, useState } from "react";
import { api } from "../api.js";
import { Layout, Card, Form, Table, Badge, Stat, Stars, useFlash, today, fmt } from "../components.jsx";

const TABS = ["Dashboard", "Book Appointment", "My Appointments", "Medical Records", "Feedback"];

export default function Patient() {
  const [tab, setTab] = useState("Dashboard");
  const [msg, run, load] = useFlash();
  const [dash, setDash] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [doctor, setDoctor] = useState("");
  const [slots, setSlots] = useState([]);
  const [reason, setReason] = useState("");
  const [appts, setAppts] = useState([]);
  const [records, setRecords] = useState([]);
  const [rate, setRate] = useState(null);

  const loadSlots = (d = doctor) => load(async () => setSlots(d ? await api("/patient/slots?doctor=" + d) : []));
  const loadAppts = () => load(async () => setAppts(await api("/patient/appointments")));

  useEffect(() => { load(async () => {
    if (tab === "Dashboard") setDash(await api("/patient/dashboard"));
    if (tab === "Book Appointment") { setDoctors(await api("/patient/doctors")); await loadSlots(); }
    if (tab === "My Appointments" || tab === "Feedback") await loadAppts();
    if (tab === "Medical Records") setRecords(await api("/patient/records"));
  }); }, [tab]);

  const book = (slot) => run(() => api("/patient/appointments", "POST", { slot: slot._id, reason }), async () => { await loadSlots(); setReason(""); });
  const cancel = (a) => window.confirm("Cancel this appointment?") && run(() => api(`/patient/appointments/${a._id}/cancel`, "PUT"), loadAppts);
  const upcoming = (a) => a.date >= today() && ["Pending", "Confirmed"].includes(a.status);

  return (
    <Layout title="Patient Dashboard" tabs={TABS} tab={tab} setTab={setTab} msg={msg}>
      {tab === "Dashboard" && dash && <>
        <div className="stats">
          <Stat label="Upcoming appointments" value={dash.upcoming.length} onClick={() => setTab("My Appointments")} />
          <Stat label="Recent records" value={dash.recentRecords.length} onClick={() => setTab("Medical Records")} />
          <div className="stat"><button className="btn" onClick={() => setTab("Book Appointment")}>+ Book new appointment</button></div>
        </div>
        <Card title="Upcoming appointments">
          <Table head={["Doctor", "Date & time", "Status"]} rows={dash.upcoming.map((a) => [`${a.doctor?.name} ${a.doctor?.specialization ? "(" + a.doctor.specialization + ")" : ""}`, fmt(a), <Badge s={a.status} />])} empty="No upcoming appointments." />
        </Card>
        <Card title="Recent medical records">
          <Table head={["Date", "Doctor", "Diagnosis"]} rows={dash.recentRecords.map((r) => [r.createdAt?.slice(0, 10), r.doctor?.name, r.diagnosis])} empty="No records yet." />
        </Card>
      </>}

      {tab === "Book Appointment" && <>
        <Card title="1. Select a doctor">
          <div className="form">
            <label>Doctor<select value={doctor} onChange={(e) => { setDoctor(e.target.value); loadSlots(e.target.value); }}>
              <option value="">Select a doctor</option>{doctors.map((d) => <option key={d._id} value={d._id}>{d.name}{d.specialization ? " - " + d.specialization : ""}</option>)}</select></label>
            <label>Reason for visit (optional)<input value={reason} onChange={(e) => setReason(e.target.value)} /></label>
          </div>
        </Card>
        <Card title="2. Choose an available time slot">
          {!doctor ? <p className="muted">Select a doctor to see their available slots.</p> :
            <Table head={["Date", "Time", "Places left", ""]} empty="This doctor has no available slots right now."
              rows={slots.map((s) => [s.date, `${s.start}-${s.end}`, s.capacity - s.booked, <button className="btn small" onClick={() => book(s)}>Book</button>])} />}
        </Card>
      </>}

      {tab === "My Appointments" && <Card title="My appointments">
        <Table head={["Doctor", "Date & time", "Status", "Actions"]} empty="No appointments yet."
          rows={appts.map((a) => [a.doctor?.name, fmt(a), <Badge s={a.status} />, upcoming(a) ? <button className="btn small danger" onClick={() => cancel(a)}>Cancel</button> : "-"])} />
      </Card>}

      {tab === "Medical Records" && <Card title="Medical history timeline">
        {!records.length && <p className="muted">No medical records yet. Records appear after a doctor completes your visit.</p>}
        <div className="timeline">
          {records.map((r) => <div key={r._id} className="tl-item"><b>{r.createdAt?.slice(0, 10)}</b> · {r.doctor?.name}
            <div><b>Diagnosis:</b> {r.diagnosis}</div>{r.prescription && <div><b>Prescription:</b> {r.prescription}</div>}{r.notes && <div><b>Doctor's notes:</b> {r.notes}</div>}</div>)}
        </div>
      </Card>}

      {tab === "Feedback" && <>
        {rate && <Card title={`Feedback for visit with ${rate.doctor?.name} (${rate.date})`}>
          <Form key={rate._id} submit="Submit feedback" onCancel={() => setRate(null)}
            fields={[{ name: "rating", label: "Rating", options: [5, 4, 3, 2, 1].map((n) => [String(n), "★".repeat(n) + ` (${n})`]) }, { name: "feedback", label: "Comments", type: "textarea" }]}
            onSubmit={(v) => run(() => api(`/patient/appointments/${rate._id}/feedback`, "PUT", v), async () => { setRate(null); await loadAppts(); })} />
        </Card>}
        <Card title="Completed appointments">
          <Table head={["Doctor", "Date", "Your rating", ""]} empty="You have no completed appointments yet."
            rows={appts.filter((a) => a.status === "Completed").map((a) => [a.doctor?.name, a.date, a.rating ? <Stars n={a.rating} /> : "-",
              a.rating ? "Submitted" : <button className="btn small" onClick={() => setRate(a)}>Give feedback</button>])} />
        </Card>
      </>}
    </Layout>
  );
}
