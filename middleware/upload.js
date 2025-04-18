const multer = require("multer");
const path = require("path");

//  อัปโหลด QR Code ร้านค้า
const storageQRCode = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./public/uploads/vendor/qrcode"); // บันทึกในโฟลเดอร์ qrcode
  },
  filename: (req, file, cb) => {
    cb(null, `qrcode-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const uploadQRCode = multer({
  storage: storageQRCode,
  limits: { fileSize: 3 * 1024 * 1024 }, // จำกัดขนาด 3MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("อัปโหลดได้เฉพาะไฟล์รูปภาพเท่านั้น"));
    }
  },
}).single("qrcode");

//  อัปโหลดรูปภาพเมนูอาหาร
const storageMenuImage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./public/uploads/vendor/menu_items"); // บันทึกในโฟลเดอร์ menu_items
  },
  filename: (req, file, cb) => {
    cb(null, `menu-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const uploadMenuImage = multer({
  storage: storageMenuImage,
  limits: { fileSize: 3 * 1024 * 1024 }, // จำกัดขนาด 3MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("อัปโหลดได้เฉพาะไฟล์รูปภาพเท่านั้น"));
    }
  },
}).single("menu_img");


// อัปโหลด Slip การชำระเงิน
const storageSlip = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./public/uploads/slips/"); // 🔹 ตรวจสอบว่าโฟลเดอร์นี้มีอยู่จริง
  },
  filename: (req, file, cb) => {
    cb(null, `slip-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const uploadSlip = multer({
  storage: storageSlip,
  limits: { fileSize: 3 * 1024 * 1024 }, // จำกัดขนาด 3MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("อัปโหลดได้เฉพาะไฟล์รูปภาพเท่านั้น"));
    }
  },
}).single("paymentSlip");


module.exports = { uploadQRCode, uploadMenuImage, uploadSlip };