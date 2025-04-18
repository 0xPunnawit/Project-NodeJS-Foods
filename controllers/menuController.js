const db = require("../config/db");

exports.orderSummary = (req, res) => {
  const menuItemId = req.params.menuItemId;
  const selectedOptionName = req.body.menuOption;
  const userId = req.session.user ? req.session.user.id : null;

  if (!userId) {
    return res.status(401).json({ success: false, message: "กรุณาเข้าสู่ระบบก่อนสั่งอาหาร" });
  }

  const sql = `
    SELECT 
      mi.name AS menu_name,
      mo.name AS option_name,
      mo.price_adjustment AS price_adjustment,
      mi.price AS base_price,
      mi.restaurant_id AS restaurant_id, 
      r.name AS restaurant_name
    FROM 
      menu_items mi
    INNER JOIN 
      menu_options mo ON mi.menu_item_id = mo.menu_item_id
    INNER JOIN 
      restaurants r ON mi.restaurant_id = r.restaurant_id
    WHERE 
      mi.menu_item_id = ? AND mo.name = ?
  `;

  db.query(sql, [menuItemId, selectedOptionName], (err, results) => {
    if (err) {
      console.error("Error fetching order details:", err);
      return res.status(500).render("error", { title: "เกิดข้อผิดพลาด", message: "ไม่สามารถดึงข้อมูลคำสั่งซื้อได้" });
    }

    if (results.length === 0) {
      return res.status(404).render("error", { title: "ไม่พบข้อมูล", message: "ไม่พบตัวเลือกที่คุณเลือก" });
    }

    const selectedItem = results[0];
    const totalPrice = parseFloat(selectedItem.base_price) + parseFloat(selectedItem.price_adjustment);

    // **เซฟคำสั่งซื้อใน Session ก่อน Redirect**
    req.session.order = {
      userId,
      menuItemId,
      optionName: selectedItem.option_name,
      totalPrice,
      restaurant: {
        restaurant_id: selectedItem.restaurant_id,
        name: selectedItem.restaurant_name,
      },
    };

    console.log("[SERVER] บันทึกคำสั่งซื้อใน Session:", req.session.order);

    res.render("order-summary", {
      title: "สรุปรายการสินค้า",
      selectedItem,
      totalPrice,
      restaurantId: selectedItem.restaurant_id,
      restaurant: req.session.order.restaurant, 
    });
  });
};


exports.createOrderSession = (req, res) => {
  const menuItemId = req.params.menuItemId;
  const selectedOptionName = req.body.menuOption;
  const userId = req.session.user ? req.session.user.id : null; // ดึง user_id จาก session

  if (!userId) {
    return res.status(401).json({ success: false, message: "กรุณาเข้าสู่ระบบก่อนสั่งอาหาร" });
  }

  const sql = `
    SELECT 
      mi.name AS menu_name,
      mo.name AS option_name,
      mo.price_adjustment AS price_adjustment,
      mi.price AS base_price,
      mi.restaurant_id AS restaurant_id, 
      r.name AS restaurant_name
    FROM 
      menu_items mi
    INNER JOIN 
      menu_options mo ON mi.menu_item_id = mo.menu_item_id
    INNER JOIN 
      restaurants r ON mi.restaurant_id = r.restaurant_id
    WHERE 
      mi.menu_item_id = ? AND mo.name = ?
  `;

  db.query(sql, [menuItemId, selectedOptionName], (err, results) => {
    if (err) {
      console.error(" Error fetching order details:", err);
      return res.status(500).json({ success: false, message: "ไม่สามารถดึงข้อมูลคำสั่งซื้อได้" });
    }

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: "ไม่พบตัวเลือกที่คุณเลือก" });
    }

    const selectedItem = results[0];
    const totalPrice = parseFloat(selectedItem.base_price) + parseFloat(selectedItem.price_adjustment);

    //  เก็บข้อมูลคำสั่งซื้อไว้ใน session
    req.session.order = {
      userId,
      menuItemId,
      optionName: selectedItem.option_name,
      totalPrice,
      restaurant: {
        restaurant_id: selectedItem.restaurant_id,
        name: selectedItem.restaurant_name,
      },
    };

    res.json({
      success: true,
      message: "บันทึกคำสั่งซื้อใน session แล้ว",
      order: req.session.order,
      paymentUrl: `/payment/${selectedItem.restaurant_id}`,
    });
  });
};

exports.updateOrderSession = (req, res) => {
  if (!req.session.order) {
    return res.status(400).json({ success: false, message: "ไม่พบคำสั่งซื้อใน session" });
  }

  const { quantity, totalPrice, note } = req.body;

  if (!quantity || isNaN(quantity) || !totalPrice || isNaN(totalPrice)) {
    console.error("[SERVER] ข้อมูลไม่ถูกต้อง:", { quantity, totalPrice });
    return res.status(400).json({ success: false, message: "ข้อมูลไม่ครบถ้วน หรือข้อมูลไม่ถูกต้อง" });
  }

  // อัปเดต session
  req.session.order.quantity = parseInt(quantity);  // ตรวจสอบให้แน่ใจว่าเป็นตัวเลข
  req.session.order.totalPrice = parseFloat(totalPrice);
  req.session.order.note = note || "";

  console.log("[SERVER] อัปเดต session สำเร็จ:", req.session.order);

  res.json({ success: true, message: "อัปเดตข้อมูลใน session สำเร็จ", order: req.session.order });
};


// อัปเดตเมนู
exports.updateMenu = (req, res) => {
  const { menuId, name, price, availability } = req.body;

  if (!menuId || !name || !price || !availability) {
      return res.status(400).json({ success: false, message: "ข้อมูลไม่ครบถ้วน" });
  }

  const sql = "UPDATE menu_items SET name = ?, price = ?, availability = ? WHERE menu_item_id = ?";
  db.query(sql, [name, price, availability, menuId], (err, result) => {
      if (err) {
          console.error("Error updating menu:", err);
          return res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการอัปเดตเมนู" });
      }
      res.json({ success: true, message: "อัปเดตเมนูสำเร็จ!" });
  });
};


// ดึงเมนูทั้งหมดของร้านค้า
exports.getVendorMenus = (req, res) => {
  const accountId = req.session.user.id;

  if (!accountId) {
      return res.redirect("/login");
  }

  const sql = `
      SELECT mi.menu_item_id, mi.name, mi.price, mi.availability
      FROM menu_items mi
      JOIN restaurants r ON mi.restaurant_id = r.restaurant_id
      WHERE r.account_id = ?
  `;

  db.query(sql, [accountId], (err, results) => {
      if (err) {
          return res.status(500).send("เกิดข้อผิดพลาดในการดึงเมนู");
      }

      res.render("vendor/manage-menu", { title: "จัดการเมนู", menus: results });
  });
};

exports.getMenuOptions = (req, res) => {
  const menuId = req.params.menuId;

  const sqlMenu = "SELECT * FROM menu_items WHERE menu_item_id = ?";
  const sqlOptions = "SELECT * FROM menu_options WHERE menu_item_id = ?";

  db.query(sqlMenu, [menuId], (err, menuResult) => {
      if (err || menuResult.length === 0) {
          return res.status(500).send("เกิดข้อผิดพลาดหรือไม่มีเมนูนี้");
      }

      db.query(sqlOptions, [menuId], (err, optionsResult) => {
          if (err) {
              return res.status(500).send("เกิดข้อผิดพลาดในการดึงตัวเลือกเมนู");
          }

          res.render("vendor/manage-menu-options", {
              title: "จัดการตัวเลือกเมนู",
              menu: menuResult[0],
              menuOptions: optionsResult
          });
      });
  });
};

// ลบเมนู
exports.deleteMenu = (req, res) => {
  const menuId = req.params.menuId;
  const accountId = req.session.user.id;

  if (!accountId) {
      return res.status(401).json({ success: false, message: "กรุณาเข้าสู่ระบบ" });
  }

  // ตรวจสอบว่าเมนูเป็นของร้านค้าที่ผู้ใช้ล็อกอินเป็นเจ้าของหรือไม่
  const checkQuery = `
      SELECT mi.menu_item_id 
      FROM menu_items mi 
      JOIN restaurants r ON mi.restaurant_id = r.restaurant_id
      WHERE mi.menu_item_id = ? AND r.account_id = ?
  `;

  db.query(checkQuery, [menuId, accountId], (err, results) => {
      if (err) {
          return res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการตรวจสอบเมนู" });
      }

      if (results.length === 0) {
          return res.status(403).json({ success: false, message: "คุณไม่มีสิทธิ์ลบเมนูนี้" });
      }

      // 🔥 ลบตัวเลือกเมนูก่อน
      const deleteOptionsQuery = "DELETE FROM menu_options WHERE menu_item_id = ?";
      db.query(deleteOptionsQuery, [menuId], (err) => {
          if (err) {
              return res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการลบตัวเลือกเมนู" });
          }

          // 🔥 ลบเมนูหลักหลังจากลบตัวเลือกสำเร็จ
          const deleteMenuQuery = "DELETE FROM menu_items WHERE menu_item_id = ?";
          db.query(deleteMenuQuery, [menuId], (err) => {
              if (err) {
                  return res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการลบเมนูหลัก" });
              }

              res.json({ success: true, message: "ลบเมนูและตัวเลือกเมนูสำเร็จ" });
          });
      });
  });
};


// อัปเดตตัวเลือกเมนู
exports.updateMenuOption = (req, res) => {
  const { optionId, name, price, availability } = req.body;

  if (!optionId || !name || !price || !availability) {
      return res.status(400).json({ success: false, message: "ข้อมูลไม่ครบถ้วน" });
  }

  const sql = "UPDATE menu_options SET name = ?, price_adjustment = ?, availability = ? WHERE menu_option_id = ?";
  db.query(sql, [name, price, availability, optionId], (err, result) => {
      if (err) {
          return res.status(500).json({ success: false, message: "เกิดข้อผิดพลาด" });
      }
      res.json({ success: true, message: "อัปเดตสำเร็จ!" });
  });
};

// ลบตัวเลือกเมนู
exports.deleteMenuOption = (req, res) => {
  const optionId = req.params.optionId;

  const sql = "DELETE FROM menu_options WHERE menu_option_id = ?";
  db.query(sql, [optionId], (err, result) => {
      if (err) {
          return res.status(500).json({ success: false, message: "เกิดข้อผิดพลาด" });
      }
      res.json({ success: true, message: "ลบสำเร็จ!" });
  });
};

// เพิ่มตัวเลือกเมนู
exports.addMenuOption = (req, res) => {
  const { menuItemId, name, price, availability } = req.body;

  const sql = "INSERT INTO menu_options (menu_item_id, name, price_adjustment, availability) VALUES (?, ?, ?, ?)";
  db.query(sql, [menuItemId, name, price, availability], (err, result) => {
      if (err) {
          return res.status(500).json({ success: false, message: "เกิดข้อผิดพลาด" });
      }
      res.json({ success: true, message: "เพิ่มสำเร็จ!" });
  });
};


