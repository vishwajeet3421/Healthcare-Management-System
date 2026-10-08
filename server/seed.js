const bcrypt = require("bcryptjs");
const { User, Slot, Setting } = require("./models");
const { DEFAULTS } = require("./utils");

// Ensures demo accounts, default settings and sample slots exist (safe to run on every start).
async function seed() {
  const demo = [
    ["Admin", "admin@health.com", "admin123", "admin"],
    ["Dr. Asha Rao", "doctor@health.com", "doctor123", "doctor", "Cardiology"],
    ["Dr. Vikram Singh", "doctor2@health.com", "doctor123", "doctor", "General Medicine"],
    ["Ravi Kumar", "patient@health.com", "patient123", "patient"],
  ];
  for (const [name, email, pw, role, specialization] of demo) {
    if (!(await User.exists({ email }))) await User.create({ name, email, role, specialization, phone: "9000000000", password: await bcrypt.hash(pw, 10) });
  }
  for (const [key, value] of Object.entries(DEFAULTS)) await Setting.updateOne({ key }, { $setOnInsert: { value } }, { upsert: true });

  if (!(await Slot.countDocuments())) {
    const docs = await User.find({ role: "doctor" });
    for (const d of docs) for (let i = 1; i <= 3; i++) {
      const date = new Date(Date.now() + i * 86400000).toISOString().slice(0, 10);
      await Slot.create([{ doctor: d._id, date, start: "10:00", end: "10:30", capacity: 2 }, { doctor: d._id, date, start: "11:00", end: "11:30", capacity: 1 }]);
    }
  }
  console.log("Demo data ready: admin@health.com / doctor@health.com / patient@health.com");
}
module.exports = seed;
if (require.main === module) {
  require("dotenv").config();
  require("mongoose").connect(process.env.MONGO_URI).then(seed).then(() => process.exit(0));
}
