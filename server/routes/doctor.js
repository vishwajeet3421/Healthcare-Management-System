const router = require("express").Router();
const { Slot, Appointment, Record } = require("../models");
const auth = require("../middleware/auth");
const { wrap, httpErr, todayStr, addMinutes, getSettings, validateSlot, cancelAppointment } = require("../utils");
wrap(router);
router.use(auth("doctor"));

router.get("/dashboard", async (req, res) => {
  const me = req.user._id, today = todayStr();
  const [todayAppointments, upcomingSlots, recentRecords] = await Promise.all([
    Appointment.find({ doctor: me, date: today, status: { $ne: "Cancelled" } }).populate("patient", "name").sort({ start: 1 }),
    Slot.find({ doctor: me, active: true, date: { $gte: today } }).sort({ date: 1, start: 1 }).limit(6),
    Record.find({ doctor: me }).populate("patient", "name").sort({ updatedAt: -1 }).limit(5),
  ]);
  res.json({ todayAppointments, upcomingSlots, recentRecords });
});

// ----- Schedule management -----
router.get("/slots", async (req, res) => res.json(await Slot.find({ doctor: req.user._id }).sort({ date: -1, start: 1 })));

router.post("/slots", async (req, res) => {
  const s = await getSettings();
  const { date, start, capacity = 1 } = req.body;
  const end = req.body.end || (start && addMinutes(start, s.slot_minutes));
  await validateSlot({ doctor: req.user._id, date, start, end, capacity });
  await Slot.create({ doctor: req.user._id, date, start, end, capacity: Number(capacity) });
  res.json({ message: "Slot created" });
});

router.put("/slots/:id", async (req, res) => {
  const slot = await Slot.findOne({ _id: req.params.id, doctor: req.user._id });
  if (!slot) throw httpErr(404, "Slot not found");
  const { date, start, end, capacity } = req.body;
  if (Number(capacity) < slot.booked) throw httpErr(400, `Capacity cannot be lower than current bookings (${slot.booked})`);
  if (slot.booked && (date !== slot.date || start !== slot.start || end !== slot.end))
    throw httpErr(400, "Date/time cannot be changed once patients have booked this slot");
  await validateSlot({ doctor: req.user._id, date, start, end, capacity }, slot._id);
  Object.assign(slot, { date, start, end, capacity: Number(capacity) });
  await slot.save();
  res.json({ message: "Slot updated" });
});

router.put("/slots/:id/toggle", async (req, res) => {
  const slot = await Slot.findOne({ _id: req.params.id, doctor: req.user._id });
  if (!slot) throw httpErr(404, "Slot not found");
  slot.active = !slot.active;
  await slot.save();
  res.json({ message: `Slot ${slot.active ? "activated" : "deactivated"}` });
});

// ----- Appointments -----
router.get("/appointments", async (req, res) =>
  res.json(await Appointment.find({ doctor: req.user._id }).populate("patient", "name phone").sort({ date: -1, start: 1 })));

const NEXT = { Pending: ["Confirmed", "Cancelled"], Confirmed: ["Completed", "Cancelled"] };
router.put("/appointments/:id/status", async (req, res) => {
  const a = await Appointment.findOne({ _id: req.params.id, doctor: req.user._id });
  if (!a) throw httpErr(404, "Appointment not found");
  const status = req.body.status;
  if (!(NEXT[a.status] || []).includes(status)) throw httpErr(400, `Cannot change a ${a.status} appointment to ${status}`);
  if (status === "Cancelled") await cancelAppointment(a);
  else { a.status = status; await a.save(); }
  res.json({ message: `Appointment ${status.toLowerCase()}` });
});

// ----- Medical records -----
router.get("/records", async (req, res) =>
  res.json(await Record.find({ doctor: req.user._id }).populate("patient", "name").populate("appointment", "date start").sort({ createdAt: -1 })));

router.get("/records/pending", async (req, res) => {
  const done = await Appointment.find({ doctor: req.user._id, status: "Completed" }).populate("patient", "name").sort({ date: -1 });
  const withRecord = new Set((await Record.find({ doctor: req.user._id }).select("appointment")).map((r) => String(r.appointment)));
  res.json(done.filter((a) => !withRecord.has(String(a._id))));
});

router.post("/records", async (req, res) => {
  const { appointment, diagnosis, prescription, notes } = req.body;
  const a = await Appointment.findOne({ _id: appointment, doctor: req.user._id, status: "Completed" });
  if (!a) throw httpErr(400, "Records can only be created for your completed appointments");
  if (await Record.exists({ appointment })) throw httpErr(400, "A record already exists for this appointment");
  if (!diagnosis) throw httpErr(400, "Diagnosis is required");
  await Record.create({ appointment, patient: a.patient, doctor: req.user._id, diagnosis, prescription, notes });
  res.json({ message: "Medical record created" });
});

router.put("/records/:id", async (req, res) => {
  const { diagnosis, prescription, notes } = req.body;
  await Record.findOneAndUpdate({ _id: req.params.id, doctor: req.user._id }, { diagnosis, prescription, notes });
  res.json({ message: "Medical record updated" });
});

module.exports = router;
