const db = require("../config/db");
const crypto = require("crypto"); // สำหรับใช้ SHA-256

// ฟังก์ชันแฮชรหัสผ่านด้วย SHA-256
function hashPasswordSHA256(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// แสดงหน้า Register
exports.getRegister = (req, res) => {
  if (req.session.user) {
    return res.redirect("/"); // หากล็อกอินแล้ว ให้กลับไปหน้าแรก
  }
  res.render("register", {
    title: "สมัครสมาชิก",
    errorMessage: null,
    successMessage: null,
    name: "",
    email: "",
    password: "",
    tel: "",
  });
};

// สมัคร Register
exports.postRegister = async (req, res) => {
  const { name, email, password, tel } = req.body;

  try {
    const checkDuplicateSql =
      "SELECT * FROM accounts WHERE email = ? OR tel = ?";
    db.query(checkDuplicateSql, [email, tel], (err, results) => {
      if (err) {
        console.error(err);
        return res.render("register", {
          title: "สมัครสมาชิก",
          errorMessage: "เกิดข้อผิดพลาดในการตรวจสอบข้อมูล",
          successMessage: null,
          name,
          email,
          password,
          tel,
        });
      }

      if (results.length > 0) {
        if (results[0].email === email) {
          return res.render("register", {
            title: "สมัครสมาชิก",
            errorMessage: "อีเมลนี้ถูกใช้ไปแล้ว กรุณาใช้อีเมลอื่น",
            successMessage: null,
            name,
            email,
            password,
            tel,
          });
        }
        if (results[0].tel === tel) {
          return res.render("register", {
            title: "สมัครสมาชิก",
            errorMessage: "เบอร์โทรนี้ถูกใช้ไปแล้ว กรุณาใช้เบอร์โทรอื่น",
            successMessage: null,
            name,
            email,
            password,
            tel,
          });
        }
      }

      // เข้ารหัสรหัสผ่านด้วย SHA-256
      const hashedPassword = hashPasswordSHA256(password);

      const sql =
        "INSERT INTO accounts (name, email, password, tel) VALUES (?, ?, ?, ?)";
      db.query(sql, [name, email, hashedPassword, tel], (err, results) => {
        if (err) {
          console.error(err);
          return res.render("register", {
            title: "สมัครสมาชิก",
            errorMessage: "เกิดข้อผิดพลาดในการบันทึกข้อมูล",
            successMessage: null,
            name,
            email,
            password,
            tel,
          });
        }
        // ส่งข้อความสำเร็จกลับไปยังหน้า register
        return res.render("register", {
          title: "สมัครสมาชิก",
          errorMessage: null,
          successMessage: "สมัครสมาชิกสำเร็จ! กำลังไปหน้า ล็อกอิน",
          name: "",
          email: "",
          password: "",
          tel: "",
        });
      });
    });
  } catch (err) {
    console.error(err);
    res.render("register", {
      title: "สมัครสมาชิก",
      errorMessage: "เกิดข้อผิดพลาดที่ไม่คาดคิด",
      successMessage: null,
      name,
      email,
      password,
      tel,
    });
  }
};
