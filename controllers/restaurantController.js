const db = require("../config/db");

// ดึงข้อมูลร้านอาหารทั้งหมด
exports.getRestaurant = (req, res) => {
  const sql = "SELECT * FROM restaurants";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching restaurant data:", err);
      return res.status(500).send("เกิดข้อผิดพลาดในการดึงข้อมูลร้านอาหาร");
    }
    res.render("restaurant", {
      title: "Restaurant",
      restaurants: results,
      user: req.session.user || null, // ส่งข้อมูลผู้ใช้ไปยัง view
    });
  });
};

// ฟังก์ชันแสดงรายละเอียดร้านอาหาร พร้อมเมนู
exports.getRestaurantDetail = (req, res) => {
  const restaurantId = req.params.id;

  //  ดึงข้อมูลร้านค้า
  const restaurantQuery = "SELECT * FROM restaurants WHERE restaurant_id = ?";

  db.query(restaurantQuery, [restaurantId], (err, results) => {
    if (err || results.length === 0) {
      console.error(`[SERVER] เกิดข้อผิดพลาดในการดึงข้อมูลร้านค้า #${restaurantId}`, err);
      return res.redirect("/restaurant"); // ถ้าร้านค้าไม่มีอยู่หรือเกิดข้อผิดพลาด ให้พากลับไปหน้า /restaurant
    }

    const restaurant = results[0];

    // ถ้าร้านค้าปิดอยู่ ให้ Redirect ลูกค้าไปที่หน้าร้านค้า
    if (restaurant.status === "ปิดร้าน") {
      console.log(`[SERVER] ร้าน #${restaurantId} ปิดอยู่ -> พาลูกค้ากลับไปหน้าหลักร้านค้า`);
      return res.redirect("/restaurant");
    }

    //  ดึงรายการเมนูของร้านค้านั้น
    const menuQuery = "SELECT * FROM menu_items WHERE restaurant_id = ?";
    db.query(menuQuery, [restaurantId], (err, menuResults) => {
      if (err) {
        console.error(`[SERVER] เกิดข้อผิดพลาดในการดึงเมนูร้านค้า #${restaurantId}`, err);
        return res.redirect("/restaurant"); // ถ้าเมนูโหลดไม่ได้ ให้พากลับไปหน้า /restaurant
      }

      res.render("restaurant-detail", {
        title: restaurant.name,
        restaurant,
        menus: menuResults, //  ส่ง `menus` ไปให้ EJS ใช้งาน
      });
    });
  });
};


// ดึงตัวเลือกเมนู (เช่น ธรรมดา/พิเศษ)
exports.getMenuOptions = (req, res) => {
  const menuItemId = req.params.menuItemId; // ดึง ID ของเมนู

  //  ดึงข้อมูลเมนูหลักก่อน
  const menuQuery = `
    SELECT m.*, r.restaurant_id, r.status AS restaurant_status
    FROM menu_items m
    INNER JOIN restaurants r ON m.restaurant_id = r.restaurant_id
    WHERE m.menu_item_id = ?
  `;

  db.query(menuQuery, [menuItemId], (err, menuResults) => {
    if (err || menuResults.length === 0) {
      console.error("Error fetching menu item:", err);
      return res
        .status(500)
        .render("error", { title: "เกิดข้อผิดพลาด", message: "ไม่พบเมนูนี้" });
    }

    const menu = menuResults[0];

    //  ถ้าร้านค้าปิด ต้องแจ้งเตือนลูกค้าและพากลับไปที่ `/restaurant`
    if (menu.restaurant_status === "ปิดบริการ") {
      return res.render("error", {
        title: "ร้านค้าปิด",
        message: "ร้านค้านี้ปิดให้บริการแล้ว",
      });
    }

    //  ดึงตัวเลือกเมนูจากฐานข้อมูล
    const sqlOptions = "SELECT * FROM menu_options WHERE menu_item_id = ?";
    db.query(sqlOptions, [menuItemId], (err, options) => {
      if (err) {
        console.error("Error fetching menu options:", err);
        return res.status(500).render("error", {
          title: "เกิดข้อผิดพลาด",
          message: "ไม่สามารถโหลดตัวเลือกเมนูได้",
        });
      }

      //  ส่งค่า `menu.restaurant_id` ไปที่หน้า `menu-options.ejs`
      res.render("menu-options", {
        title: "ตัวเลือกเมนู",
        options,
        menuItemId,
        restaurant: { restaurant_id: menu.restaurant_id }, //  ส่ง ID ร้านไปที่ EJS
      });
    });
  });
};

exports.showQRCode = (req, res) => {
  const restaurantId = req.params.id;

  const sql = `
    SELECT restaurant_id, name, imageqrcode 
    FROM restaurants 
    WHERE restaurant_id = ?
  `;

  db.query(sql, [restaurantId], (err, results) => {
    if (err) {
      console.error("Error fetching QR Code:", err);
      return res.status(500).render("error", { title: "เกิดข้อผิดพลาด", message: "ไม่สามารถดึง QR Code ได้" });
    }

    if (results.length === 0) {
      return res.status(404).render("error", { title: "ไม่พบข้อมูล", message: "ไม่พบ QR Code ของร้านค้านี้" });
    }

    const restaurant = results[0];

    const totalPrice = req.session.order ? req.session.order.totalPrice : 0;

    // เรนเดอร์หน้า checkout.ejs และส่งข้อมูลไปให้ View
    res.render("checkout", {
      title: `QR Code สำหรับชำระเงิน - ${restaurant.name}`,
      qrCodeImage: restaurant.imageqrcode,
      restaurant, // ส่งข้อมูลร้านค้าไปยัง checkout.ejs
      totalPrice,
    });
  });
};


exports.toggleRestaurantStatus = (req, res) => {
  const restaurantId = req.params.id;

  //  ดึงสถานะร้านค้า
  const getStatusQuery =
    "SELECT status FROM restaurants WHERE restaurant_id = ?";
  db.query(getStatusQuery, [restaurantId], (err, results) => {
    if (err || results.length === 0) {
      return res.status(500).json({
        success: false,
        message: "เกิดข้อผิดพลาดในการดึงข้อมูลร้านค้า",
      });
    }

    const currentStatus = results[0].status;
    const newStatus = currentStatus === "เปิดร้าน" ? "ปิดร้าน" : "เปิดร้าน";

    //  อัปเดตสถานะร้านค้า
    const updateStatusQuery =
      "UPDATE restaurants SET status = ? WHERE restaurant_id = ?";
    db.query(updateStatusQuery, [newStatus, restaurantId], (err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "เกิดข้อผิดพลาดในการอัปเดตสถานะร้านค้า",
        });
      }

      res.json({ success: true, newStatus });
    });
  });
};
