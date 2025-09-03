const db = require("../config/db");

exports.getDashboard = (req, res) => {
  if (!req.session.user || !req.session.user.id) {
    return res.redirect("/login"); // ถ้าไม่มี ID ให้กลับไปล็อกอินใหม่
  }

  const accountId = req.session.user.id;

  const sql = `
    SELECT r.*, a.name AS owner_name, a.email AS owner_email, a.tel AS owner_tel, r.imageqrcode AS qrcode_image
    FROM restaurants r
    INNER JOIN accounts a ON r.account_id = a.account_id
    WHERE r.account_id = ?
  `;

  db.query(sql, [accountId], (err, results) => {
    if (err) {
      return res.status(500).send("เกิดข้อผิดพลาดในการดึงข้อมูลร้านค้า");
    }

    const restaurant = results.length > 0 ? results[0] : null;
    res.render("vendor/dashboard", {
      title: "Dashboard ร้านค้า",
      restaurant,
    });
  });
};

exports.getCreateRestaurant = (req, res) => {
  res.render("vendor/create-restaurant", {
    title: "สร้างร้านค้าใหม่",
  });
};

exports.postCreateRestaurant = (req, res) => {
  const { name, description, address, phone } = req.body;
  const accountId = req.session.user.id;

  if (!name || !description || !address || !phone) {
    return res.status(400).send("กรุณากรอกข้อมูลให้ครบถ้วน");
  }

  // ตรวจสอบว่ามีไฟล์ QR Code ถูกอัปโหลดหรือไม่
  let imagePath = null;
  if (req.file) {
    imagePath = `/uploads/vendor/qrcode/${req.file.filename}`;
  }

  const sql = `
    INSERT INTO restaurants (account_id, name, description, address, phone, imageqrcode, status)
    VALUES (?, ?, ?, ?, ?, ?, 'เปิดร้าน')
  `;

  db.query(
    sql,
    [accountId, name, description, address, phone, imagePath],
    (err, result) => {
      if (err) {
        console.error("Error creating restaurant:", err);
        return res.status(500).send("เกิดข้อผิดพลาดในการสร้างร้านค้า");
      }
      res.redirect("/vendor/dashboard");
    }
  );
};

exports.toggleRestaurantStatus = (req, res) => {
  const restaurantId = req.params.id;

  // ดึงสถานะร้านค้า
  const getStatusQuery = "SELECT status FROM restaurants WHERE restaurant_id = ?";
  db.query(getStatusQuery, [restaurantId], (err, results) => {
    if (err || results.length === 0) {
      return res.status(500).json({
        success: false,
        message: "เกิดข้อผิดพลาดในการดึงข้อมูลร้านค้า",
      });
    }

    const currentStatus = results[0].status;
    const newStatus = currentStatus === "เปิดร้าน" ? "ปิดร้าน" : "เปิดร้าน";

    // อัปเดตสถานะร้านค้า
    const updateStatusQuery = "UPDATE restaurants SET status = ? WHERE restaurant_id = ?";
    db.query(updateStatusQuery, [newStatus, restaurantId], (err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "เกิดข้อผิดพลาดในการอัปเดตสถานะร้านค้า",
        });
      }

      // ลบ `notifyRestaurantClosed(restaurantId);` ออก เพราะไม่ต้องใช้แล้ว

      res.json({ success: true, newStatus });
    });
  });
};

exports.getAddMenuPage = (req, res) => {
  const restaurantId = req.params.restaurant_id;
  res.render("vendor/add-menu", { title: "เพิ่มรายการอาหาร", restaurantId });
};

exports.postAddMenu = (req, res) => {
  const {
    name,
    price,
    availability,
    restaurant_id,
    menu_options,
    menu_prices,
    menu_status,
  } = req.body;
  const imagePath = req.file
    ? `/uploads/vendor/menu_items/${req.file.filename}`
    : null;

  // 1. เพิ่มเมนูหลักลงใน `menu_items`
  const menuSql = `
    INSERT INTO menu_items (restaurant_id, name, price, availability, menu_img)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(
    menuSql,
    [restaurant_id, name, price, availability, imagePath],
    (err, result) => {
      if (err) {
        console.error("Error adding menu item:", err);
        return res.status(500).send("เกิดข้อผิดพลาดในการเพิ่มเมนู");
      }

      const menuItemId = result.insertId; // ดึง `menu_item_id` ที่เพิ่งเพิ่ม

      // 2. เพิ่มตัวเลือกเมนู (ถ้ามี)
      if (Array.isArray(menu_options) && menu_options.length > 0) {
        let optionsData = [];

        for (let i = 0; i < menu_options.length; i++) {
          if (menu_options[i].trim() !== "") {
            // ป้องกันการเพิ่มตัวเลือกที่ไม่มีค่า
            let optionName = menu_options[i].trim();
            let optionPrice = parseFloat(menu_prices[i]) || 0; // ถ้าไม่มีราคา ให้ใช้ 0
            let optionStatus = menu_status[i] || "มี"; // ถ้าไม่มีสถานะ ให้ใช้ "มี"

            optionsData.push([
              menuItemId,
              optionName,
              optionPrice,
              optionStatus,
            ]);
          }
        }

        if (optionsData.length > 0) {
          const optionSql = `
          INSERT INTO menu_options (menu_item_id, name, price_adjustment, availability)
          VALUES ?
        `;

          db.query(optionSql, [optionsData], (err) => {
            if (err) {
              console.error("Error adding menu options:", err);
              return res
                .status(500)
                .send("เกิดข้อผิดพลาดในการเพิ่มตัวเลือกเมนู");
            }
          });
        }
      }

      res.redirect(`/vendor/dashboard`);
    }
  );
};

exports.validateOwner = (req, res, next) => {
  const restaurantId = req.params.restaurant_id;
  const accountId = req.session.user.id;

  if (!restaurantId) {
    return res.status(400).send("เกิดข้อผิดพลาด: ไม่พบ restaurant_id");
  }

  const sql =
    "SELECT * FROM restaurants WHERE restaurant_id = ? AND account_id = ?";
  db.query(sql, [restaurantId, accountId], (err, results) => {
    if (err) {
      console.error("Database Error:", err);
      req.session.alert = { type: "error", message: "เกิดข้อผิดพลาดในระบบ" };
      return res.redirect("/vendor/dashboard"); // Redirect กลับไปที่หน้า Dashboard
    }

    if (results.length === 0) {
      return res.redirect("/vendor/dashboard"); // Redirect กลับไปที่หน้า Dashboard
    }

    next(); // อนุญาตให้ทำงานต่อ
  });
};

// ดึงรายการออเดอร์ของร้านค้า
exports.getOrders = (req, res) => {
  const restaurantId = req.session.user.restaurant_id;

  const sql = `
      SELECT 
          o.order_id,
          o.order_status,
          o.note,
          GROUP_CONCAT(
              CONCAT(oi.quantity, 'x ', mi.name, IFNULL(CONCAT(' (', mo.name, ')'), '')) 
              SEPARATOR ', '
          ) AS items
      FROM orders o
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.menu_item_id
      LEFT JOIN menu_options mo ON oi.menu_option_id = mo.menu_option_id
      WHERE o.restaurant_id = ?
      GROUP BY o.order_id
      ORDER BY o.created_at DESC
  `;

  db.query(sql, [restaurantId], (err, results) => {
    if (err) {
      console.error("Error fetching orders:", err);
      return res.status(500).send("เกิดข้อผิดพลาดในการดึงรายการออเดอร์");
    }

    console.log("Orders fetched:", results);
    res.render("vendor/receive-orders", {
      title: "รายการออเดอร์",
      orders: results
    });
  });
};

// ดึงรายละเอียดออเดอร์เฉพาะรายการเดียว
exports.getOrderDetails = (req, res) => {
  const { order_id } = req.params;
  const restaurantId = req.session.user.restaurant_id;

  const sql = `
      SELECT 
          o.order_id,              -- ใช้แสดงเลขออเดอร์
          u.name AS customer_name,  -- ใช้แสดงชื่อลูกค้า
          u.tel AS customer_tel,    -- ใช้แสดงเบอร์โทรลูกค้า
          o.note,
          m.name AS menu_name,      -- ใช้แสดงชื่อเมนู
          mo.name AS menu_option_name, -- ใช้แสดงตัวเลือกของเมนู
          oi.quantity,              -- ใช้แสดงจำนวนที่สั่ง
          (m.price + COALESCE(mo.price_adjustment, 0)) * oi.quantity AS total_item_price, -- ใช้แสดงราคารวม
          o.created_at              -- ใช้แสดงวันที่สั่งซื้อ
      FROM orders o
      JOIN accounts u ON o.account_id = u.account_id
      JOIN order_items oi ON o.order_id = oi.order_id
      JOIN menu_items m ON oi.menu_item_id = m.menu_item_id
      LEFT JOIN menu_options mo ON oi.menu_option_id = mo.menu_option_id
      WHERE o.restaurant_id = ? AND o.order_id = ?
      ORDER BY o.created_at DESC;
  `;

  db.query(sql, [restaurantId, order_id], (err, results) => {
    if (err) {
      console.error("Error fetching order details:", err);
      return res.status(500).json({ success: false, message: "ไม่สามารถดึงข้อมูลออเดอร์ได้" });
    }

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: "ไม่พบออเดอร์นี้" });
    }

    res.json({ success: true, order: results[0], items: results, note: results[0].note });
  });
};

// อัพเดตสถานะออเดอร์
exports.updateOrderStatus = (req, res) => {
  const { order_id } = req.params;
  const { new_status } = req.body;

  const sql = `UPDATE orders SET order_status = ? WHERE order_id = ?`;

  db.query(sql, [new_status, order_id], (err, result) => {
    if (err) {
      console.error("Error updating order status:", err);
      return res.status(500).json({ success: false, message: "ไม่สามารถอัปเดตสถานะออเดอร์ได้" });
    }

    res.json({ success: true, message: "อัปเดตสถานะเรียบร้อย!" });
  });
};

// API ดึงจำนวนออเดอร์ทั้งหมดของร้านค้า
exports.getOrderCount = (req, res) => {
  const restaurantId = req.session.user.restaurant_id; // ดึง ID ร้านค้าจาก session

  if (!restaurantId) {
    return res.status(400).json({ success: false, message: "ไม่พบ restaurant_id" });
  }

  const sql = `SELECT COUNT(*) AS count FROM orders WHERE restaurant_id = ?`;

  db.query(sql, [restaurantId], (err, results) => {
    if (err) {
      console.error("Error fetching order count:", err);
      return res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการดึงจำนวนออเดอร์" });
    }

    res.json({ success: true, count: results[0].count });
  });
};

// API รายงานยอดขาย (รายวัน / รายสัปดาห์ / รายเดือน)
exports.getSalesReport = (req, res) => {
  const restaurantId = req.session.user ? req.session.user.restaurant_id : null;
  const period = req.query.period || "daily";

  if (!restaurantId) {
      return res.status(400).json({ success: false, message: "ไม่พบ restaurant_id" });
  }

  let dateCondition = "DATE(o.created_at) = CURDATE()"; // รายวัน
  if (period === "weekly") {
      dateCondition = "o.created_at BETWEEN DATE_SUB(NOW(), INTERVAL 7 DAY) AND NOW()"; // 7 วันล่าสุด
  } else if (period === "monthly") {
      dateCondition = "o.created_at BETWEEN DATE_SUB(NOW(), INTERVAL 30 DAY) AND NOW()"; // 30 วันล่าสุด
  }

  const sql = `
      SELECT 
          o.order_id, o.total_price, o.created_at,
          mi.name AS menu_name, oi.quantity, oi.total_item_price, 
          COALESCE(mo.name, 'ไม่มีตัวเลือก') AS option_name
      FROM orders o
      JOIN order_items oi ON o.order_id = oi.order_id
      JOIN menu_items mi ON oi.menu_item_id = mi.menu_item_id
      LEFT JOIN menu_options mo ON oi.menu_option_id = mo.menu_option_id
      WHERE o.restaurant_id = ? AND ${dateCondition}
      ORDER BY o.order_id ASC
  `;

  db.query(sql, [restaurantId], (err, results) => {
      if (err) {
          console.error("❌ Error fetching sales report:", err);
          return res.status(500).json({ success: false, message: "ไม่สามารถดึงข้อมูลยอดขายได้" });
      }

      let totalSales = 0;
      let totalOrders = new Set();
      let totalItems = 0;
      let itemCount = {};
      let orderDetails = {};

      results.forEach(row => {
          let menuKey = `${row.menu_name} (${row.option_name})`;
          itemCount[menuKey] = (itemCount[menuKey] || 0) + row.quantity;

          totalSales += Number(row.total_item_price) || 0;
          totalOrders.add(row.order_id);
          totalItems += row.quantity;

          if (!orderDetails[row.order_id]) {
              orderDetails[row.order_id] = {
                  items: [],
                  totalOrderPrice: 0
              };
          }

          orderDetails[row.order_id].items.push({
              menuName: menuKey,
              quantity: row.quantity,
              totalItemPrice: Number(row.total_item_price || 0).toFixed(2)
          });

          orderDetails[row.order_id].totalOrderPrice += Number(row.total_item_price || 0);
      });

      let sortedItems = Object.entries(itemCount).sort((a, b) => b[1] - a[1]); // จัดเรียงเมนูขายดีที่สุด
      let bestSellingItems = sortedItems.slice(0, 3).map(item => ({ name: item[0], quantity: item[1] }));

      res.json({
          success: true,
          totalSales: totalSales.toFixed(2),
          totalOrders: totalOrders.size,
          totalItems,
          bestSellingItems,
          orderDetails
      });
  });
};
