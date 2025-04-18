// Middleware สำหรับป้องกันผู้ใช้ล็อกอินแล้วเข้าถึงหน้า Login และ Register
module.exports = (req, res, next) => {
  if (req.session.user) {
    return res.redirect("/"); // หากล็อกอินแล้ว ให้กลับไปหน้าแรก
  }
  next(); // ดำเนินการต่อถ้ายังไม่ได้ล็อกอิน
};

function preventLoggedInAccess(req, res, next) {
  if (req.session.user) {
    return res.redirect("/"); // หากผู้ใช้ล็อกอินแล้ว ให้กลับไปหน้าแรก
  }
  next(); // ดำเนินการต่อหากผู้ใช้ยังไม่ได้ล็อกอิน
}

module.exports = preventLoggedInAccess;
