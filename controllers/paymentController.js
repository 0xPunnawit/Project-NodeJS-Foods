const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");
const db = require("../config/db");

const SLIPOK_API_URL = "<API_URL>";
const SLIPOK_API_KEY = "<API_KEY>";

exports.verifyPayment = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "กรุณาอัปโหลดไฟล์สลิป" });
    }

    const filePath = req.file.path;
    const { restaurantId, accountId } = req.body;

    if (!restaurantId || !accountId) {
      fs.unlinkSync(filePath);
      return res
        .status(400)
        .json({ success: false, message: "ไม่พบข้อมูลร้านค้าหรือบัญชีผู้ใช้" });
    }

    const order = req.session.order;
    if (!order || order.restaurant.restaurant_id !== parseInt(restaurantId)) {
      fs.unlinkSync(filePath);
      return res
        .status(400)
        .json({ success: false, message: "ไม่พบข้อมูลคำสั่งซื้อ โปรดลองใหม่" });
    }

    console.log("[SERVER] คำสั่งซื้อที่ดึงจาก session:", order);

    const note = order.note && order.note.trim() !== "" ? order.note.trim() : null;
    console.log("[SERVER] หมายเหตุที่จะบันทึก:", note);

    const formData = new FormData();
    formData.append("files", fs.createReadStream(filePath));

    const headers = {
      "x-authorization": SLIPOK_API_KEY,
      ...formData.getHeaders(),
    };

    let response;
    try {
      response = await axios.post(SLIPOK_API_URL, formData, { headers });
    } catch (apiError) {
      fs.unlinkSync(filePath);
      return res
        .status(400)
        .json({ success: false, message: "รูปภาพสลิปไม่ถูกต้อง โปรดลองใหม่" });
    }

    const data = response.data.data;
    if (!data || !data.amount || !data.receiver || !data.transRef) {
      fs.unlinkSync(filePath);
      return res
        .status(400)
        .json({ success: false, message: "ไม่สามารถดึงข้อมูลจากสลิปได้" });
    }

    // เช็คว่าการโอนเงินเกิดขึ้นในช่วงเวลาไม่เกิน 15 นาที
    const transactionTimestamp = new Date(data.transTimestamp); // เวลาจากสลิป
    const currentTimestamp = new Date(); // เวลาปัจจุบัน
    const diffTime = currentTimestamp - transactionTimestamp; // คำนวณเวลาต่าง (มิลลิวินาที)
    if (diffTime > 900000) {
      // 15 นาที = 900000 มิลลิวินาที
      fs.unlinkSync(filePath);
      return res.status(400).json({
        success: false,
        message: "สลิปนี้เวลา (เกินไป 15 นาที) ไม่สามารถใช้สั่งออเดอร์ได้!",
      });
    }

    const transactionReference = data.transRef;
    const slipAmount = parseFloat(data.amount);
    if (slipAmount !== order.totalPrice) {
      fs.unlinkSync(filePath);
      return res.status(400).json({
        success: false,
        message: "ยอดเงินในสลิปไม่ตรงกับยอดคำสั่งซื้อ กรุณาตรวจสอบใหม่",
      });
    }
    console.log("[SERVER] ยอดเงินตรงกัน");

    // 🔹 ตรวจสอบว่าชื่อบัญชีผู้รับตรงกับร้านค้าหรือไม่
    const receiver = data.receiver;
    const receivedDisplayName = receiver.displayName
      ? receiver.displayName.trim().normalize("NFC")
      : "";
    const receivedName = receiver.name
      ? receiver.name.trim().normalize("NFC")
      : "";

    console.log("[SERVER] ชื่อบัญชีในสลิป:", receivedDisplayName);

    const getOwnerNameSql = `
      SELECT a.name AS owner_name
      FROM restaurants r
      INNER JOIN accounts a ON r.account_id = a.account_id
      WHERE r.restaurant_id = ?
    `;

    db.query(getOwnerNameSql, [restaurantId], async (err, results) => {
      if (err || results.length === 0) {
        fs.unlinkSync(filePath);
        return res
          .status(404)
          .json({ success: false, message: "ไม่พบข้อมูลร้านค้า" });
      }

      const ownerFullName = results[0].owner_name.trim().normalize("NFC");
      const ownerNameParts = ownerFullName.split(" ");
      const ownerFirstName = ownerNameParts.slice(0, 2).join(" ");

      if (
        !(
          receivedDisplayName.includes(ownerFirstName) ||
          receivedName.includes(ownerFirstName)
        )
      ) {
        fs.unlinkSync(filePath);
        return res
          .status(400)
          .json({
            success: false,
            message: "ชื่อบัญชีในสลิปไม่ตรงกับร้านค้า!",
          });
      }

      console.log(" [SERVER] ชื่อบัญชีตรงกับร้านค้า ดำเนินการต่อ...");

      // 🔹 เช็คว่ามีการใช้เลขสลิปซ้ำหรือไม่
      const checkSlipSql = `SELECT * FROM slip WHERE transaction_reference = ?`;
      db.query(checkSlipSql, [transactionReference], (err, results) => {
        if (err || results.length > 0) {
          fs.unlinkSync(filePath);
          return res
            .status(400)
            .json({ success: false, message: "สลิปนี้ถูกใช้ไปแล้ว!" });
        }

        console.log(" [SERVER] สลิปนี้ยังไม่ถูกใช้ สามารถดำเนินการต่อได้");

        db.beginTransaction(async (err) => {
          if (err) {
            fs.unlinkSync(filePath);
            return res
              .status(500)
              .json({
                success: false,
                message: "เกิดข้อผิดพลาดในการเริ่มต้นธุรกรรม",
              });
          }

          // 🔹 บันทึกการชำระเงิน
          const insertPaymentSql = `
            INSERT INTO slip (account_id, restaurant_id, amount, transaction_reference, transaction_date, status, created_at)
            VALUES (?, ?, ?, ?, ?, 'สำเร็จ', NOW())
          `;

          db.query(
            insertPaymentSql,
            [
              accountId,
              restaurantId,
              slipAmount,
              transactionReference,
              new Date(data.transTimestamp),
            ],
            async (err) => {
              if (err) {
                return db.rollback(() =>
                  res
                    .status(500)
                    .json({
                      success: false,
                      message: "เกิดข้อผิดพลาดในการบันทึกการชำระเงิน",
                    })
                );
              }

              // 🔹 สร้างออเดอร์
              const insertOrderSql = `INSERT INTO orders (account_id, restaurant_id, total_price, order_status, note, created_at) VALUES (?, ?, ?, 'รอร้านค้ารับออเดอร์', ?, NOW())`;

              db.query(
                insertOrderSql,
                [accountId, restaurantId, slipAmount, note],
                async (err, orderResult) => {
                  if (err) {
                    return db.rollback(() =>
                      res
                        .status(500)
                        .json({
                          success: false,
                          message: "เกิดข้อผิดพลาดในการบันทึกคำสั่งซื้อ",
                        })
                    );
                  }

                  const orderId = orderResult.insertId;

                  // **รองรับทั้ง 1 เมนู และหลายเมนู**
                  let items = Array.isArray(order.items)
                    ? order.items
                    : [order];

                  const itemsData = await Promise.all(
                    items.map(async (item) => {
                      return new Promise((resolve, reject) => {
                        const getOptionQuery = `SELECT menu_option_id FROM menu_options WHERE name = ? LIMIT 1`;

                        db.query(
                          getOptionQuery,
                          [item.optionName],
                          (err, optionResult) => {
                            if (err) {
                              console.error("[ERROR] Query menu_options:", err);
                              return reject(
                                "เกิดข้อผิดพลาดในการตรวจสอบตัวเลือกเมนู"
                              );
                            }

                            const menuOptionId =
                              optionResult.length > 0
                                ? optionResult[0].menu_option_id
                                : null;

                            resolve([
                              orderId,
                              item.menuItemId,
                              menuOptionId,
                              item.totalPrice / item.quantity,
                              item.quantity,
                              item.totalPrice,
                              new Date(),
                            ]);
                          }
                        );
                      });
                    })
                  );

                  console.log("[SERVER] รายการอาหารที่กำลังบันทึก:", itemsData);

                  const insertItemsSql = `
                INSERT INTO order_items (order_id, menu_item_id, menu_option_id, item_price, quantity, total_item_price, created_at)
                VALUES ?
              `;

              console.log("[SERVER] บันทึกคำสั่งซื้อ:", { accountId, restaurantId, slipAmount, note });

                  db.query(insertItemsSql, [itemsData], (err) => {
                    if (err) {
                      return db.rollback(() =>
                        res
                          .status(500)
                          .json({
                            success: false,
                            message: "บันทึกรายการอาหารล้มเหลว",
                          })
                      );
                    }

                    if (req.session.cart && req.session.cart[restaurantId]) {
                      delete req.session.cart[restaurantId];
                    }

                    db.commit((commitErr) => {
                      if (commitErr) {
                        console.error("[ERROR] Commit ล้มเหลว:", commitErr);
                        return res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดระหว่าง Commit โปรดลองใหม่" });
                      }
                      
                      req.session.order = null;
                      console.log("[SERVER] บันทึกคำสั่งซื้อสำเร็จ!");
                      return res.json({
                        success: true,
                        message: "สั่งซื้อสำเร็จ!",
                        redirectUrl: "/order-success",
                      });
                    });
                  });
                }
              );
            }
          );
        });
      });
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "เกิดข้อผิดพลาด โปรดลองใหม่" });
  }
};
