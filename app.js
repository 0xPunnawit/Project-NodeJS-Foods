const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const http = require("http");
const db = require("./config/db"); 
const { sessionMiddleware, sessionRoleHandler } = require("./config/session");

// Import Controllers
const homeController = require("./controllers/homeController");
const loginController = require("./controllers/loginController");
const registerController = require("./controllers/registerController");
const restaurantController = require("./controllers/restaurantController");
const menuController = require("./controllers/menuController");
const vendorController = require("./controllers/vendorController");
const { uploadSlip } = require("./middleware/upload");
const paymentController = require("./controllers/paymentController");
const orderController = require("./controllers/orderController");
const cartController = require("./controllers/cartController");


// Middleware
const { uploadQRCode, uploadMenuImage } = require("./middleware/upload");
const preventLoggedInAccess = require("./middleware/preventLoggedInAccess");
const requireLogin = require("./middleware/requireLogin");


const app = express();
const server = http.createServer(app);

// ========================= [ Configuration & Middleware ] =========================

// Session
app.use(sessionMiddleware);
app.use(sessionRoleHandler);

app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ extended: true })); 

// View Engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Static Files
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// Body Parser
app.use(bodyParser.urlencoded({ extended: false }));

// ส่งค่า user ไปยังทุก template
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});


// ลบข้อมูล session ทั้งหมดเมื่อเซิร์ฟเวอร์เริ่มต้น
// db.query("DELETE FROM sessions", (err) => {
//   if (err) {
//     console.error("Error clearing sessions on server start:", err);
//   } else {
//     console.log("All sessions cleared on server start.");
//   }
// });


// *** ========================= [ Routes - คนทั่วไป & ลูกค้า ] ========================= ***
// หน้าแรก
app.get("/", homeController.getHome);

// ระบบล็อกอิน
app.route("/login")
  .get(preventLoggedInAccess, loginController.getLogin)
  .post(loginController.postLogin);
app.get("/logout", loginController.logout);

// ระบบลงทะเบียน
app.route("/register")
  .get(preventLoggedInAccess, registerController.getRegister)
  .post(registerController.postRegister);

// ร้านอาหาร
app.get("/restaurant", restaurantController.getRestaurant);

app.get("/restaurant/:id", restaurantController.getRestaurantDetail);

app.get("/menu/:menuItemId/options", requireLogin(["customer"]), restaurantController.getMenuOptions);
app.post("/menu/:menuItemId/order", requireLogin(["customer"]), menuController.orderSummary);
app.post("/update-order-session", requireLogin(["customer"]), menuController.updateOrderSession);

// ================================ API CHECK STATUS Order ================================
app.get("/api/order-status/:orderId", (req, res) => {
  const orderId = req.params.orderId;

  db.query("SELECT order_status FROM orders WHERE order_id = ?", [orderId], (err, results) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Database error" });
    }
    if (results.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.json({ success: true, order_status: results[0].order_status });
  });
});

// ================================ API CHECK STATUS Restaurants ================================
app.get("/api/check-restaurant-status/:id", (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  const restaurantId = req.params.id;
  db.query(
    "SELECT status FROM restaurants WHERE restaurant_id = ?",
    [restaurantId],
    (err, results) => {
      if (err || results.length === 0) {
        return res.json({ success: false, message: "ไม่พบร้านค้า" });
      }
      const isClosed = results[0].status === "ปิดร้าน";
      res.json({ success: true, isClosed });
    }
  );
});

// ระบบ ดึง QR Code มาแสดง
app.get("/restaurant/:id/qrcode", requireLogin(["customer"]), restaurantController.showQRCode);

//  Route สำหรับอัปโหลดและตรวจสอบสลิป
app.post("/upload-slip", uploadSlip, paymentController.verifyPayment);
// API ตรวจสอบสลิป
app.post("/payment/verify", paymentController.verifyPayment);

// สถานะติดตาม
app.get("/order-success", requireLogin(["customer"]), orderController.getOrderStatus);
app.get("/orders", requireLogin(["customer"]), orderController.getUserOrders);
app.get("/order/:id", requireLogin(["customer"]), orderController.getOrderDetail);

// ตะกร้า
app.get("/cart", requireLogin(["customer"]), cartController.getCart);
app.post("/cart/add", requireLogin(["customer"]), cartController.addToCart);
app.post("/cart/remove", requireLogin(["customer"]), cartController.removeFromCart);
app.post("/cart/update", requireLogin(["customer"]), cartController.updateQuantity);
app.post("/cart/checkout", requireLogin(["customer"]), cartController.checkout);

// *** ========================= [ Routes - ร้านค้า (Vendor) ] ========================= ***

app.get("/vendor/dashboard", requireLogin(["vendor"]), vendorController.getDashboard);
app.route("/vendor/create-restaurant")
  .get(requireLogin(["vendor"]), vendorController.getCreateRestaurant)
  .post(requireLogin(["vendor"]), uploadQRCode, vendorController.postCreateRestaurant);

//  ปรับ toggle-status ให้ใช้ socket แจ้งเตือนลูกค้า
app.post("/vendor/toggle-status/:id", requireLogin(["vendor"]), (req, res) => {
  vendorController.toggleRestaurantStatus(req, res);
});

// ระบบเมนูร้านค้า
app.route("/vendor/add-menu/:restaurant_id")
  .get(requireLogin(["vendor"]), vendorController.validateOwner, vendorController.getAddMenuPage)
  .post(requireLogin(["vendor"]), uploadMenuImage, (req, res) => {
    if (!req.file) return res.status(400).send("กรุณาอัปโหลดรูปภาพเมนู");
    vendorController.postAddMenu(req, res);
  });

// API เช็คสถานะร้านค้า
app.get("/vendor/check-status/:id", (req, res) => {
  db.query("SELECT status FROM restaurants WHERE restaurant_id = ?", [req.params.id], (err, results) => {
    if (err || results.length === 0) return res.status(500).json({ success: false, message: "ไม่สามารถดึงสถานะร้านค้าได้" });
    res.json({ success: true, status: results[0].status });
  });
});

// รับรายการออเดอร์
app.get("/vendor/receive-orders", requireLogin(["vendor"]), vendorController.getOrders);
app.post("/vendor/update-order-status/:order_id", requireLogin(["vendor"]), vendorController.updateOrderStatus);
app.get("/vendor/order-details/:order_id", requireLogin(["vendor"]), vendorController.getOrderDetails);

// เพิ่ม API นับจำนวนออเดอร์
app.get("/vendor/get-order-count", vendorController.getOrderCount);
app.get("/vendor/get-latest-orders", orderController.getLatestOrders);

// ========================= จัดการเมนู =========================
// เพิ่มหน้า "จัดการเมนู"
app.get("/vendor/manage-menu", requireLogin(["vendor"]), menuController.getVendorMenus);
// อัปเดตเมนู
app.post("/vendor/menu/update", requireLogin(["vendor"]), menuController.updateMenu);
// ลบเมนู
app.delete("/vendor/menu/delete/:menuId", requireLogin(["vendor"]), menuController.deleteMenu);
// อัปเดตตัวเลือกเมนู
app.post("/vendor/menu-options/update", requireLogin(["vendor"]), menuController.updateMenuOption);
// ลบตัวเลือกเมนู
app.delete("/vendor/menu-options/delete/:optionId", requireLogin(["vendor"]), menuController.deleteMenuOption);
// เพิ่มตัวเลือกเมนู
app.post("/vendor/menu-options/add", requireLogin(["vendor"]), menuController.addMenuOption);
app.get("/vendor/manage-menu-options/:menuId", requireLogin(["vendor"]), menuController.getMenuOptions);


// 🌟 API ดึงยอดขาย
app.get("/sales-report", requireLogin(["vendor"]), vendorController.getSalesReport);
// 🌟 แสดงหน้า Dashboard รายงานยอดขาย
app.get("/report", requireLogin(["vendor"]), (req, res) => {
    res.render("vendor/sales-report", { title: "📊 รายงานยอดขาย" });
});


// ========================= [ Error Handling & Server Start ] =========================

// Middleware จัดการข้อผิดพลาด
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render("error", { title: "เกิดข้อผิดพลาด", message: "เกิดข้อผิดพลาดในระบบ" });
});

// 404 Not Found
app.use((req, res) => {
  res.status(404).render("404", { title: "ไม่พบหน้า", message: "ไม่พบหน้าที่คุณต้องการ" });
});

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
