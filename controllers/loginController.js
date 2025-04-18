const db = require("../config/db");
const crypto = require("crypto");

// ฟังก์ชันแฮชรหัสผ่านด้วย SHA-256
function hashPasswordSHA256(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// แสดงหน้า Login
exports.getLogin = (req, res) => {
  if (req.session.user) {
    return res.redirect("/"); // หาก Login แล้วให้กลับหน้าแรก
  }
  res.render("login", {
    title: "Login - PBRU IT",
    errorMessage: null,
    email: "",
    password: "",
  });
};

// ตรวจสอบข้อมูล Login
exports.postLogin = (req, res) => {
  const { email, password } = req.body;
  const hashedPassword = hashPasswordSHA256(password);

  const sql = `
    SELECT a.*, r.restaurant_id
    FROM accounts a
    LEFT JOIN restaurants r ON a.account_id = r.account_id
    WHERE a.email = ?
  `;

  db.query(sql, [email], (err, results) => {
    if (err) {
      console.error(err);
      return res.render("login", {
        title: "Login - PBRU IT",
        errorMessage: "เกิดข้อผิดพลาด โปรดลองอีกครั้ง",
        email, // ส่ง email กลับไป
      });
    }

    if (results.length === 0) {
      return res.render("login", {
        title: "Login - PBRU IT",
        errorMessage: "ไม่พบอีเมลนี้ในระบบ",
        email,
      });
    }

    const user = results[0];

    if (user.password !== hashedPassword) {
      return res.render("login", {
        title: "Login - PBRU IT",
        errorMessage: "รหัสผ่านไม่ถูกต้อง",
        email,
      });
    }

    // เพิ่ม `restaurant_id` เข้า session
    req.session.user = {
      id: user.account_id,
      name: user.name,
      email: user.email,
      role: user.role,
      restaurant_id: user.restaurant_id || null, // ถ้าไม่มีร้านให้เป็น null
    };

    console.log("[DEBUG] Session Updated:", req.session.user); // Debug ค่า session
    res.redirect("/");
  });
};


// ออกจากระบบ
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      return res.redirect("/"); // หากลบเซสชันไม่สำเร็จให้กลับหน้าแรก
    }
    res.redirect("/login");
  });
};
