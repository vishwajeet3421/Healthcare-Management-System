const router = require("express").Router();
const bcrypt = require("bcryptjs");
const { User, Slot, Appointment, Setting } = require("../models");
const auth = require("../middleware/auth");
const { wrap, httpErr, ACTIVE, availableSlots, takeSlot, releaseSlot, cancelAppointment, getSettings } = require("../utils");
wrap(router);
router.use(auth("admin"));

// ----- Dashboard metrics -----
router.get("/dashboard", async (req, res) => {
  const [users, doctors, patients, activeAppointments, rating, byStatus] = await Promise.all([
    User.countDocuments(), User.countDocuments({ role: "doctor" }), User.countDocuments({ role: "patient" }),
    Appointment.countDocuments({ status: { $in: ACTIVE } }),
    Appointment.aggregate([{ $match: { rating: { $ne: null } } }, { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } }]),
    Appointment.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);
  res.json({ users, doctors, patients, activeAppointments, avgRating: rating[0]?.avg ?? null, ratingCount: rating[0]?.count ?? 0, byStatus });
});

// ----- User management -----
router.get("/users", async (req, res) =>
  res.json(await User.find(req.query.role ? { role: req.query.role } : {}).select("-password").sort({ createdAt: 1 })));

router.post("/users", async (req, res) => {
  const { name, email, password, role, specialization, phone } = req.body;
  if (!name || !email || !password) throw httpErr(400, "Name, email and password are required");
  if (await User.exists({ email: email.toLowerCase() })) throw httpErr(400, "Email already exists");
  await User.create({ name, email, role, specialization, phone, password: await bcrypt.hash(password, 10) });
  res.json({ message: "User created successfully" });
});

router.put("/users/:id", async (req, res) => {
  const { name, email, role, specialization, phone, password } = req.body;
  const update = { name, email, role, specialization, phone };
  if (password) update.password = await bcrypt.hash(password, 10);
  const clash = await User.exists({ email: (email || "").toLowerCase(), _id: { $ne: req.params.id } });
  if (clash) throw httpErr(400, "Email already exists");
  await User.findByIdAndUpdate(req.params.id, update, { runValidators: true });
  res.json({ message: "User updated successfully" });
});

router.put("/users/:id/toggle", async (req, res) => {
  if (req.params.id === String(req.user._id)) throw httpErr(400, "You cannot deactivate your own account");
  const u = await User.findById(req.params.id);
  u.active = !u.active;
  await u.save();
  res.json({ message: `User ${u.active ? "activated" : "deactivated"}` });
});

// ----- Appointment overview -----
router.get("/appointments", async (req, res) =>
  res.json(await Appointment.find(req.query.status ? { status: req.query.status } : {})
    .populate("patient", "name").populate("doctor", "name").sort({ date: -1, start: 1 })));

router.put("/appointments/:id/cancel", async (req, res) => {
  await cancelAppointment(await Appointment.findById(req.params.id));
  res.json({ message: "Appointment cancelled" });
});

router.get("/slots", async (req, res) => res.json(await availableSlots()));

router.put("/appointments/:id/reassign", async (req, res) => {
  const a = await Appointment.findById(req.params.id);
  if (!ACTIVE.includes(a.status)) throw httpErr(400, "Only pending or confirmed appointments can be reassigned");
  if (String(a.slot) === req.body.slot) throw httpErr(400, "Appointment is already in this slot");
  const target = await takeSlot(req.body.slot);
  await releaseSlot(a.slot);
  Object.assign(a, { doctor: target.doctor, slot: target._id, date: target.date, start: target.start, end: target.end, status: "Pending" });
  await a.save();
  res.json({ message: "Appointment reassigned. The new doctor must confirm it." });
});

// ----- Feedback -----
router.get("/feedback", async (req, res) =>
  res.json(await Appointment.find({ rating: { $ne: null } }).populate("patient", "name").populate("doctor", "name").sort({ updatedAt: -1 })));

// ----- Settings -----
router.get("/settings", async (req, res) => res.json(await getSettings()));
router.put("/settings", async (req, res) => {
  const { work_start, work_end, slot_minutes, lead_hours } = req.body;
  if (work_start >= work_end) throw httpErr(400, "Working hours: closing time must be after opening time");
  if (Number(slot_minutes) < 5 || Number(lead_hours) < 0) throw httpErr(400, "Invalid slot duration or lead time");
  for (const key of ["clinic_name", "work_start", "work_end", "slot_minutes", "lead_hours"])
    if (req.body[key] !== undefined) await Setting.findOneAndUpdate({ key }, { value: String(req.body[key]) }, { upsert: true });
  res.json({ message: "Settings updated successfully" });
});

module.exports = router;
