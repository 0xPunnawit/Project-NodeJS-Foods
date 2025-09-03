const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost", // เซิร์ฟเวอร์ของฐานข้อมูล
  user: "root", // ชื่อผู้ใช้ MySQL
  password: "", // รหัสผ่าน (กรณีไม่มี ให้เว้นว่าง)
  database: "food", // ชื่อฐานข้อมูล
});

db.connect((err) => {
  if (err) {
    console.error("Error Connecting to the database:", err);
    throw err;
  }
  console.log("Connected to MySQL database successfully.");
});

module.exports = db;
