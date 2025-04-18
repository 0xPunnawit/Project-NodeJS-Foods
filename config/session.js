const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);

const sessionStore = new MySQLStore({
  host: "localhost",
  user: "root",
  password: "", // รหัสผ่าน MySQL
  database: "food",
  clearExpired: true, // ลบ session ที่หมดอายุอัตโนมัติ
  checkExpirationInterval: 5 * 60 * 1000, // เช็คทุก 5 นาที
  expiration: 6 * 60 * 60 * 1000, // สูงสุด 6 ชั่วโมง
});

const sessionMiddleware = session({
  secret: "your-secret-key",
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    secure: false,
    httpOnly: true,
  },
});

// Middleware ตรวจสอบ Role และจัดการ Session Timeout
function sessionRoleHandler(req, res, next) {
  if (req.session.user) {
    const now = Date.now();
    const role = req.session.user.role;

    // เช็คว่าหมดอายุหรือยัง
    if (req.session.cookie.expires && now > req.session.cookie.expires.getTime()) {
      console.log(`[SESSION] หมดอายุสำหรับ ${role}, ทำการ logout`);
      return req.session.destroy(() => {
        res.clearCookie("connect.sid"); // ลบ cookie
        return res.redirect("/login");
      });
    }

    // ตั้งเวลาใหม่ตาม Role
    if (role === "vendor") {
      req.session.cookie.maxAge = 6 * 60 * 60 * 1000; // 6 ชั่วโมง
    } else {
      req.session.cookie.maxAge = 30 * 60 * 1000; // 30 นาที
    }
    req.session.cookie.expires = new Date(now + req.session.cookie.maxAge);

    // บันทึก session
    req.session.save((err) => {
      if (err) {
        console.error("Error saving session:", err);
      }
      next();
    });
  } else {
    next();
  }
}

module.exports = {
  sessionMiddleware,
  sessionRoleHandler,
};
