const { Schema, model } = require("mongoose");
const ref = (m, extra = {}) => ({ type: Schema.Types.ObjectId, ref: m, ...extra });

const User = model("User", new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["admin", "doctor", "patient"], default: "patient" },
  active: { type: Boolean, default: true },
  phone: String, age: Number, gender: String, address: String, // patient demographics
  specialization: String,                                       // doctors
}, { timestamps: true }));

// A consultation slot created by a doctor. `booked` is updated atomically (concurrency control).
const Slot = model("Slot", new Schema({
  doctor: ref("User", { required: true }),
  date: { type: String, required: true },   // YYYY-MM-DD
  start: { type: String, required: true },  // HH:mm
  end: { type: String, required: true },
  capacity: { type: Number, default: 1, min: 1 },
  booked: { type: Number, default: 0, min: 0 },
  active: { type: Boolean, default: true },
}, { timestamps: true }));

const Appointment = model("Appointment", new Schema({
  patient: ref("User", { required: true }),
  doctor: ref("User", { required: true }),
  slot: ref("Slot", { required: true }),
  date: String, start: String, end: String,
  status: { type: String, enum: ["Pending", "Confirmed", "Completed", "Cancelled"], default: "Pending" },
  reason: String,
  rating: Number, feedback: String,
}, { timestamps: true }));

const Record = model("Record", new Schema({
  patient: ref("User", { required: true }),
  doctor: ref("User", { required: true }),
  appointment: ref("Appointment", { required: true }),
  diagnosis: { type: String, required: true },
  prescription: String,
  notes: String,
}, { timestamps: true }));

const Setting = model("Setting", new Schema({ key: { type: String, unique: true }, value: String }));

module.exports = { User, Slot, Appointment, Record, Setting };
