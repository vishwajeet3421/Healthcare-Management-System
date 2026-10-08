const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User } = require("../models");
const auth = require("../middleware/auth");
const { wrap, httpErr } = require("../utils");
wrap(router);

const sign = (u) => jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
const safe = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role });

router.post("/register", async (req, res) => {
  const { name, email, password, phone, age, gender, address } = req.body;
  if (!name || !email || !password) throw httpErr(400, "Name, email and password are required");
  if (password.length < 6) throw httpErr(400, "Password must be at least 6 characters");
  if (await User.exists({ email: email.toLowerCase() })) throw httpErr(400, "Email already registered");
  const user = await User.create({ name, email, phone, age: age || undefined, gender, address, role: "patient", password: await bcrypt.hash(password, 10) });
  res.json({ message: "Registration successful", token: sign(user), user: safe(user) });
});

router.post("/login", async (req, res) => {
  const user = await User.findOne({ email: (req.body.email || "").toLowerCase().trim() });
  if (!user || !(await bcrypt.compare(req.body.password || "", user.password))) throw httpErr(400, "Invalid email or password");
  if (!user.active) throw httpErr(403, "This account has been deactivated. Contact the administrator.");
  res.json({ token: sign(user), user: safe(user) });
});

router.get("/me", auth(), (req, res) => res.json(safe(req.user)));
module.exports = router;
