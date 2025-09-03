const db = require("../config/db");

// ดึงรายการคำสั่งซื้อทั้งหมดของผู้ใช้ พร้อมร้านค้าและรายการเมนู
exports.getUserOrders = (req, res) => {
  const accountId = req.session.user ? req.session.user.id : null;
  if (!accountId)
    return res
      .status(401)
      .json({ success: false, message: "กรุณาเข้าสู่ระบบ" });

  const sql = `
    SELECT o.order_id, o.total_price, o.order_status, o.created_at, r.name AS restaurant_name
    FROM orders o
    JOIN restaurants r ON o.restaurant_id = r.restaurant_id
    WHERE o.account_id = ?
    ORDER BY o.created_at DESC
  `;

  db.query(sql, [accountId], (err, orders) => {
    if (err)
      return res
        .status(500)
        .json({ success: false, message: "ไม่สามารถดึงรายการคำสั่งซื้อได้" });

    //  ดึงเมนูที่อยู่ในแต่ละออเดอร์
    const orderIds = orders.map((o) => o.order_id);
    if (orderIds.length === 0)
      return res.render("order-list", { title: "รายการคำสั่งซื้อ", orders });

    const itemsSql = `
      SELECT oi.order_id, mi.name AS menu_name, oi.quantity, oi.total_item_price
      FROM order_items oi
      JOIN menu_items mi ON oi.menu_item_id = mi.menu_item_id
      WHERE oi.order_id IN (?)
    `;

    db.query(itemsSql, [orderIds], (err, items) => {
      if (err)
        return res
          .status(500)
          .json({ success: false, message: "ไม่สามารถดึงข้อมูลสินค้า" });

      orders.forEach((order) => {
        order.items = items.filter((item) => item.order_id === order.order_id);
      });

      res.render("order-list", { title: "รายการคำสั่งซื้อ", orders });
    });
  });
};

// ดึงรายละเอียดคำสั่งซื้อ พร้อมเมนูที่สั่ง
exports.getOrderDetail = (req, res) => {
  const accountId = req.session.user ? req.session.user.id : null;
  const orderId = req.params.id;

  if (!accountId) {
    return res
      .status(401)
      .json({ success: false, message: "กรุณาเข้าสู่ระบบ" });
  }

  const sql = `
    SELECT o.order_id, o.total_price, o.order_status, o.created_at, o.note, r.name AS restaurant_name
    FROM orders o
    JOIN restaurants r ON o.restaurant_id = r.restaurant_id
    WHERE o.order_id = ? AND o.account_id = ?
  `;

  db.query(sql, [orderId, accountId], (err, results) => {
    if (err) {
      console.error("[SERVER] Database error:", err);
      return res
        .status(500)
        .json({
          success: false,
          message: "ไม่สามารถดึงรายละเอียดคำสั่งซื้อได้",
        });
    }

    if (results.length === 0) {
      return res.status(403).render("error", {
        title: "ไม่มีสิทธิ์เข้าถึง",
        message: "คุณไม่มีสิทธิ์เข้าถึงคำสั่งซื้อนี้",
      });
    }

    const order = results[0];

    //  ดึงรายการเมนูที่สั่งไป
    const itemSql = `
     SELECT 
        oi.order_id, 
        m.name AS menu_name, 
        oi.quantity, 
        m.price AS base_price, -- ใช้ price จาก menu_items
        COALESCE(mo.name, 'ไม่มีตัวเลือก') AS menu_option_name, 
        COALESCE(mo.price_adjustment, 0) AS option_price, 
        (m.price + COALESCE(mo.price_adjustment, 0)) AS item_price, --  คำนวณราคาต่อชิ้น
        oi.quantity * (m.price + COALESCE(mo.price_adjustment, 0)) AS total_item_price --  คำนวณราคารวม
      FROM order_items oi
      JOIN menu_items m ON oi.menu_item_id = m.menu_item_id
      LEFT JOIN menu_options mo ON oi.menu_option_id = mo.menu_option_id
      WHERE oi.order_id = ?
    `;

    db.query(itemSql, [orderId], (err, itemResults) => {
      if (err) {
        console.error("[SERVER] Database error:", err);
        return res
          .status(500)
          .json({ success: false, message: "ไม่สามารถดึงรายการเมนูได้" });
      }

      // ตรวจสอบค่าก่อนส่งไป render
      console.log("[DEBUG] รายการเมนูที่ดึงมา:", itemResults);

      res.render("order-detail", {
        title: "รายละเอียดคำสั่งซื้อ",
        order,
        items: itemResults, //  เช็คว่ามี `item_price` และ `menu_option_name` ถูกส่งมาหรือไม่
        note: order.note || "ไม่มีหมายเหตุ"
      });
    });
  });
};

// ดึงสถานะคำสั่งซื้อสุดท้ายของผู้ใช้
exports.getOrderStatus = (req, res) => {
  const accountId = req.session.user ? req.session.user.id : null;
  if (!accountId)
    return res
      .status(401)
      .json({ success: false, message: "กรุณาเข้าสู่ระบบ" });

  const sql = `
    SELECT order_id, total_price, order_status, created_at
    FROM orders
    WHERE account_id = ?
    ORDER BY created_at DESC LIMIT 1
  `;

  db.query(sql, [accountId], (err, results) => {
    if (err || results.length === 0)
      return res
        .status(404)
        .json({ success: false, message: "ไม่พบข้อมูลคำสั่งซื้อ" });

    res.render("order-success", {
      title: "สถานะคำสั่งซื้อ",
      order: results[0],
    });
  });
};

exports.getLatestOrders = (req, res) => {
 //  เช็คว่ามี session user หรือไม่
 if (!req.session.user) {
  return res.status(401).json({ success: false, message: "Session ไม่ถูกต้อง" });
}

const restaurantId = req.session.user.restaurant_id;

//  เช็คว่า restaurant_id มีค่าหรือไม่
if (!restaurantId) {
  return res.status(400).json({ success: false, message: "ไม่พบ restaurant_id" });
}
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
          console.error("[SERVER] Error fetching latest orders:", err);
          return res.status(500).json({ success: false, message: "ไม่สามารถดึงออเดอร์ใหม่ได้" });
      }
      console.log("[SERVER] ออเดอร์ล่าสุด:", results);
      res.json({ success: true, orders: results });
  });
};
