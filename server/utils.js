const { Slot, Appointment, Setting } = require("./models");

const ACTIVE = ["Pending", "Confirmed"];
const DEFAULTS = { clinic_name: "CareConnect Clinic", work_start: "09:00", work_end: "17:00", slot_minutes: "30", lead_hours: "1" };
const todayStr = () => new Date().toISOString().slice(0, 10);
const httpErr = (status, message) => Object.assign(new Error(message), { status });

// Makes async route handlers forward errors to Express (Express 4 does not do this itself).
function wrap(router) {
  for (const m of ["get", "post", "put", "delete"]) {
    const orig = router[m].bind(router);
    router[m] = (path, ...fns) => orig(path, ...fns.map((f) => (req, res, next) => Promise.resolve(f(req, res, next)).catch(next)));
  }
  return router;
}

async function getSettings() {
  const rows = await Setting.find();
  return { ...DEFAULTS, ...Object.fromEntries(rows.map((r) => [r.key, r.value])) };
}

const addMinutes = (t, mins) => {
  const total = Number(t.slice(0, 2)) * 60 + Number(t.slice(3)) + Number(mins);
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

// Slots that can still be booked (active, in the future respecting lead time, not full)
async function availableSlots(doctor) {
  const s = await getSettings();
  const minTime = Date.now() + Number(s.lead_hours) * 3600000;
  const slots = await Slot.find({ ...(doctor && { doctor }), active: true, date: { $gte: todayStr() }, $expr: { $lt: ["$booked", "$capacity"] } })
    .populate("doctor", "name specialization active").sort({ date: 1, start: 1 });
  return slots.filter((x) => x.doctor?.active !== false && new Date(`${x.date}T${x.start}`).getTime() >= minTime);
}

// Atomic booking: capacity check + increment happen in ONE database operation, so two patients
// cannot both take the last place in a slot.
async function takeSlot(slotId) {
  const slot = await Slot.findOneAndUpdate(
    { _id: slotId, active: true, $expr: { $lt: ["$booked", "$capacity"] } }, { $inc: { booked: 1 } }, { new: true });
  if (!slot) throw httpErr(409, "That slot is no longer available. Please choose another.");
  return slot;
}
const releaseSlot = (slotId) => Slot.updateOne({ _id: slotId, booked: { $gt: 0 } }, { $inc: { booked: -1 } });

async function bookSlot(patient, slotId, reason) {
  const s = await getSettings();
  const slot = await Slot.findById(slotId);
  if (!slot || !slot.active) throw httpErr(400, "Slot is not available");
  if (new Date(`${slot.date}T${slot.start}`).getTime() < Date.now() + Number(s.lead_hours) * 3600000)
    throw httpErr(400, `Appointments must be booked at least ${s.lead_hours} hour(s) in advance`);
  if (await Appointment.exists({ patient, slot: slot._id, status: { $in: ACTIVE } }))
    throw httpErr(400, "You already have an appointment in this slot");
  const locked = await takeSlot(slotId);
  try {
    return await Appointment.create({ patient, doctor: locked.doctor, slot: locked._id, date: locked.date, start: locked.start, end: locked.end, reason });
  } catch (e) { await releaseSlot(slotId); throw e; }
}

async function cancelAppointment(appt) {
  if (!ACTIVE.includes(appt.status)) throw httpErr(400, `A ${appt.status.toLowerCase()} appointment cannot be cancelled`);
  appt.status = "Cancelled";
  await appt.save();
  await releaseSlot(appt.slot);
}

async function validateSlot({ doctor, date, start, end, capacity }, ignoreId) {
  const s = await getSettings();
  if (!date || !start) throw httpErr(400, "Date and start time are required");
  if (date < todayStr()) throw httpErr(400, "Slot date cannot be in the past");
  if (start < s.work_start || end > s.work_end) throw httpErr(400, `Slots must be within working hours (${s.work_start} - ${s.work_end})`);
  if (start >= end) throw httpErr(400, "End time must be after start time");
  if (!(Number(capacity) >= 1)) throw httpErr(400, "Capacity must be at least 1");
  if (await Slot.exists({ doctor, date, active: true, _id: { $ne: ignoreId }, start: { $lt: end }, end: { $gt: start } }))
    throw httpErr(400, "This slot overlaps with another active slot");
}

module.exports = { ACTIVE, DEFAULTS, todayStr, httpErr, wrap, getSettings, addMinutes, availableSlots, takeSlot, releaseSlot, bookSlot, cancelAppointment, validateSlot };
