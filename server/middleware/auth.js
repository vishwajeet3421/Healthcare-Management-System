const jwt = require("jsonwebtoken");
const { User } = require("../models");

const auth = (...roles) => async (req, res, next) => {
  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(id).select("-password");
    if (!user || !user.active) return res.status(401).json({ message: "Session expired. Please log in again." });
    if (roles.length && !roles.includes(user.role)) return res.status(403).json({ message: "Access denied" });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Please log in" });
  }
};
module.exports = auth;
