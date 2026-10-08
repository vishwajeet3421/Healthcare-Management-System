const router = require("express").Router();
const { User, Appointment, Record } = require("../models");
const auth = require("../middleware/auth");
const { wrap, httpErr, todayStr, availableSlots, bookSlot, cancelAppointment, ACTIVE } = require("../utils");
wrap(router);
router.use(auth("patient"));

router.get("/dashboard", async (req, res) => {
  const me = req.user._id;
  const [upcoming, recentRecords] = await Promise.all([
    Appointment.find({ patient: me, status: { $in: ACTIVE }, date: { $gte: todayStr() } }).populate("doctor", "name specialization").sort({ date: 1, start: 1 }).limit(5),
    Record.find({ patient: me }).populate("doctor", "name").sort({ createdAt: -1 }).limit(3),
  ]);
  res.json({ upcoming, recentRecords });
});

router.get("/doctors", async (req, res) => res.json(await User.find({ role: "doctor", active: true }).select("name specialization")));
router.get("/slots", async (req, res) => res.json(await availableSlots(req.query.doctor)));

router.post("/appointments", async (req, res) => {
  if (!req.body.slot) throw httpErr(400, "Please select a time slot");
  await bookSlot(req.user._id, req.body.slot, req.body.reason);
  res.json({ message: "Appointment requested. Awaiting doctor confirmation." });
});

router.get("/appointments", async (req, res) =>
  res.json(await Appointment.find({ patient: req.user._id }).populate("doctor", "name specialization").sort({ date: -1, start: 1 })));

router.put("/appointments/:id/cancel", async (req, res) => {
  const a = await Appointment.findOne({ _id: req.params.id, patient: req.user._id });
  if (!a) throw httpErr(404, "Appointment not found");
  if (a.date < todayStr()) throw httpErr(400, "Only upcoming appointments can be cancelled");
  await cancelAppointment(a);
  res.json({ message: "Appointment cancelled" });
});

router.put("/appointments/:id/feedback", async (req, res) => {
  const a = await Appointment.findOne({ _id: req.params.id, patient: req.user._id, status: "Completed" });
  if (!a) throw httpErr(400, "Feedback can only be given for completed appointments");
  if (a.rating) throw httpErr(400, "Feedback already submitted for this appointment");
  const rating = Number(req.body.rating);
  if (!(rating >= 1 && rating <= 5)) throw httpErr(400, "Rating must be between 1 and 5");
  Object.assign(a, { rating, feedback: req.body.feedback });
  await a.save();
  res.json({ message: "Thank you for your feedback" });
});

router.get("/records", async (req, res) =>
  res.json(await Record.find({ patient: req.user._id }).populate("doctor", "name specialization").sort({ createdAt: -1 })));

module.exports = router;
