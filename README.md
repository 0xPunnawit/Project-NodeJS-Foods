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
- **วิธีการสมัครบัญชี SlipOK**
  - สำหรับการใช้ API ของ SlipOK คุณต้องสมัครบัญชี SlipOK ก่อน เพื่อรับ API Key
  - สามารถดูวิธีการสมัครบัญชี SlipOK ตั้งแต่เริ่มต้นจนถึงการรับ API Key ในช่วงเวลา **0:00 - 9:40 นาที** ของวิดีโอนี้: [วิธีสมัครบัญชี SlipOK](https://youtu.be/o9a9WwANKjo?si=DA3YQWqzfrWh2_qV)



---

## 🧑‍💻 เทคโนโลยีที่ใช้

| ประเภท | รายละเอียด |
|--------|-------------|
| Backend | `Node.js (version:v22.19.0)`, `Express.js` |
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
Import ไฟล์ SQL ที่อยู่ในโฟลเดอร์ Database/food.sql เพื่อสร้างตารางและข้อมูลพื้นฐานตัวอย่าง

2️⃣ การตั้งค่า Database
หากคุณต้องการเชื่อมต่อกับฐานข้อมูล MySQL ด้วยข้อมูลของคุณเอง ให้ทำการแก้ไขไฟล์ `db.js` ที่อยู่ในโฟลเดอร์ `config/` ตามนี้:
1. ไปที่โฟลเดอร์ `config/` และเปิดไฟล์ `db.js`
2. แก้ไขข้อมูลการเชื่อมต่อฐานข้อมูลในไฟล์ดังนี้:

// ตั้งค่าการเชื่อมต่อฐานข้อมูล
const dbConfig = {
  host: "localhost",  // ที่อยู่เซิร์ฟเวอร์ฐานข้อมูล
  user: "root",       // ชื่อผู้ใช้ MySQL (ค่าปกติ: 'root')
  password: "",       // รหัสผ่าน MySQL (ถ้าไม่มี ให้เว้นว่าง)
  database: "food"    // ชื่อฐานข้อมูล
};

3️⃣ 🔑 การตั้งค่า SlipOK API
เพื่อให้ระบบตรวจสอบสลิปการโอนเงินทำงานได้ คุณต้องตั้งค่า API Key ของ SlipOK ในไฟล์ `paymentController.js` ที่อยู่ในโฟลเดอร์ `controllers/` ตามขั้นตอนดังนี้:
1. เปิดไฟล์ `paymentController.js` ในโฟลเดอร์ `controllers/`
2. ค้นหาบรรทัดที่มีการตั้งค่า `SLIPOK_API_URL` และ `SLIPOK_API_KEY`
3. แก้ไขค่าของตัวแปรทั้งสองเป็น API Key ของคุณเอง
ตัวอย่างเช่น
const SLIPOK_API_URL = "<URL-KEY>";  // แทนที่ <URL-KEY> ด้วย URL ที่ได้รับจาก SlipOK
const SLIPOK_API_KEY = "<API-KEY>";  // แทนที่ <API-KEY> ด้วย API Key ของคุณ


4️⃣ รันโปรเจค  npm run dev 
🔗 เข้าใช้งานได้ที่:  http://localhost:3000