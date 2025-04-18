module.exports = (rolesAllowed = []) => {
  return (req, res, next) => {
    console.log("[DEBUG] Session User:", req.session.user);

    if (!req.session || !req.session.user) {
      if (req.originalUrl.startsWith("/api/")) {
        return res.status(401).json({ success: false, message: "กรุณาเข้าสู่ระบบ" });
      }
      return res.redirect("/login");
    }

    if (
      rolesAllowed.length > 0 &&
      !rolesAllowed.includes(req.session.user.role)
    ) {
      console.warn(`[WARN] สิทธิ์ไม่พอ! Role: ${req.session.user.role}`);
      
      if (req.originalUrl.startsWith("/api/")) {
        return res.status(403).json({ success: false, message: "คุณไม่มีสิทธิ์เข้าถึง API นี้" });
      }

      return res.status(403).render("error", {
        title: "Access Denied",
        message: "คุณไม่มีสิทธิ์เข้าถึงหน้านี้",
      });
    }

    next();
  };
};
