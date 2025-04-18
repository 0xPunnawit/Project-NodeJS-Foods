# 🍽️ Food Ordering Web Application

ระบบเว็บไซต์สั่งอาหารออนไลน์ ที่พัฒนาโดยใช้ **Node.js + Express.js + MySQL (XAMPP)**  
รองรับการสั่งอาหารจากลูกค้า การจัดการร้านค้าสำหรับ vendor และการตรวจสอบ slip การชำระเงินด้วย API (SlipOK)  
พร้อมแยกรูปแบบการแสดงผลตามประเภทผู้ใช้งาน ได้แก่ `customer` และ `vendor`

---

## 🚀 ฟีเจอร์หลัก

### 👥 ระบบผู้ใช้งาน
- สมัครสมาชิก / ล็อกอิน / ล็อกเอาต์
- แบ่งบทบาทเป็น `customer`, `vendor`

### 🛒 ฝั่งลูกค้า (Customer)
- ดูรายการร้านอาหารและเมนู
- เพิ่มอาหารลงตะกร้า และชำระเงิน
- แนบสลิปการโอนเงิน และติดตามสถานะคำสั่งซื้อ

### 🧑‍🍳 ฝั่งร้านค้า (Vendor)
- สร้างร้านค้า พร้อม QR Code สำหรับรับเงิน
- จัดการเมนูอาหารและตัวเลือก
- ตรวจสอบออเดอร์จากลูกค้าและอัปเดตสถานะ
- รายงานยอดขาย (รายวัน / รายสัปดาห์ / รายเดือน)

### 💳 ระบบการชำระเงิน
- รองรับการอัปโหลดสลิปการโอนเงิน
- ตรวจสอบสลิปด้วย [SlipOK](https://slipok.com)
  - ตรวจสอบยอดเงิน
  - ตรวจสอบชื่อผู้รับเงิน
  - ตรวจสอบเวลาการโอน (ภายใน 15 นาที)
  - ป้องกันการใช้สลิปซ้ำ

---

## 🧑‍💻 เทคโนโลยีที่ใช้

| ประเภท | รายละเอียด |
|--------|-------------|
| Backend | `Node.js`, `Express.js` |
| View Engine | `EJS` |
| Database | `MySQL (XAMPP)` |
| Session Store | `express-session` + `express-mysql-session` |
| Upload File | `multer` |
| Payment Verify | `SlipOK API` |
| Security | ตรวจ Role, Session Timeout, แยกสิทธิ์ |
| UI Framework | `Bootstrap 5` |
| Auth Hash | `crypto (SHA-256)` |

---

## 📁 โฟลเดอร์หลักของโปรเจค

```plaintext
📁 config/                  // การตั้งค่าฐานข้อมูลและ session
📁 controllers/            // จัดการ logic ของ route ต่าง ๆ
📁 middleware/             // Middleware เช่น requireLogin, upload
📁 public/uploads/         // โฟลเดอร์เก็บรูปภาพเมนู, QR Code และสลิป
📁 views/                  // ไฟล์ EJS แสดงผล UI
📁 Database/               // ไฟล์ฐานข้อมูล SQL


🛠 วิธีติดตั้งและรันโปรเจค
1️⃣ เตรียมฐานข้อมูล
เปิดโปรแกรม XAMPP และรัน MySQL
เปิด phpMyAdmin แล้วสร้างฐานข้อมูลชื่อ food
Import ไฟล์ SQL ที่อยู่ในโฟลเดอร์ Database/food.sql

2️⃣ ติดตั้งโปรเจค  npm install 
3️⃣ รันโปรเจค  npm run dev 
🔗 เข้าใช้งานได้ที่:  http://localhost:3000

