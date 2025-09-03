exports.getHome = (req, res) => {
  const user = req.session.user || null; // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบหรือยัง
  res.render("home", {
    title: "Home - PBRU IT",
    user, // ส่งข้อมูลผู้ใช้ไปยัง view
  });
};
