const db = require("../config/db");

// ดึงข้อมูลตะกร้ามาแสดง
exports.getCart = (req, res) => {
    console.log("🛒 ตะกร้าปัจจุบัน:", JSON.stringify(req.session.cart, null, 2));
    res.render("cart", { title: "ตะกร้าสินค้า", cart: req.session.cart || {} });
};

// เพิ่มเมนูลงตะกร้า
exports.addToCart = (req, res) => {
    const { menu_item_id, option_name, quantity } = req.body;
    const user = req.session.user;

    if (!user) {
        return res.status(401).json({ success: false, message: "กรุณาเข้าสู่ระบบ" });
    }

    if (quantity < 1 || quantity > 3) {
        return res.status(400).json({ success: false, message: "จำนวนสินค้าต้องอยู่ระหว่าง 1-3" });
    }

    const sql = `
        SELECT mi.name AS menu_name, mi.price AS base_price, mo.price_adjustment AS option_price, 
               mo.name AS option_name, mi.restaurant_id, r.name AS restaurant_name
        FROM menu_items mi
        LEFT JOIN menu_options mo ON mi.menu_item_id = mo.menu_item_id AND mo.name = ?
        INNER JOIN restaurants r ON mi.restaurant_id = r.restaurant_id
        WHERE mi.menu_item_id = ?`;

    db.query(sql, [option_name, menu_item_id], (err, results) => {
        if (err || results.length === 0) {
            return res.status(500).json({ success: false, message: "ไม่พบเมนูที่เลือก" });
        }

        const menu = results[0];
        const base_price = parseFloat(menu.base_price) || 0;
        const option_price = parseFloat(menu.option_price) || 0;
        const total_price = (base_price + option_price) * quantity;

        if (!req.session.cart) {
            req.session.cart = {};
        }

        if (!req.session.cart[menu.restaurant_id]) {
            req.session.cart[menu.restaurant_id] = {
                restaurant_name: menu.restaurant_name,
                items: []
            };
        }

        if (!Array.isArray(req.session.cart[menu.restaurant_id].items)) {
            req.session.cart[menu.restaurant_id].items = [];
        }

        const existingItem = req.session.cart[menu.restaurant_id].items.find(item =>
            item.menu_item_id === menu_item_id && item.option_name === option_name
        );

        if (existingItem) {
            existingItem.quantity += quantity;
            if (existingItem.quantity > 3) existingItem.quantity = 3;
            existingItem.total_price = (existingItem.base_price + existingItem.option_price) * existingItem.quantity;
        } else {
            req.session.cart[menu.restaurant_id].items.push({
                menu_item_id,
                name: menu.menu_name,
                base_price,
                option_name: menu.option_name || "-",
                option_price,
                quantity,
                total_price
            });
        }

        console.log("🛒 ตะกร้าอัปเดต:", JSON.stringify(req.session.cart, null, 2));
        res.json({ success: true, cart: req.session.cart });
    });
};

// ลบเมนูจากตะกร้า
exports.removeFromCart = (req, res) => {
    const { restaurant_id, menu_item_id, option_name } = req.body;

    if (!req.session.cart || !req.session.cart[restaurant_id] || !req.session.cart[restaurant_id].items) {
        return res.json({ success: false, message: "ไม่มีสินค้าในตะกร้า" });
    }

    req.session.cart[restaurant_id].items = req.session.cart[restaurant_id].items.filter(
        (item) => item.menu_item_id !== menu_item_id || item.option_name !== option_name
    );

    if (req.session.cart[restaurant_id].items.length === 0) {
        delete req.session.cart[restaurant_id];
    }

    res.json({ success: true, cart: req.session.cart });
};

// อัปเดตจำนวนเมนูในตะกร้า
exports.updateQuantity = (req, res) => {
    const { restaurant_id, menu_item_id, option_name, diff } = req.body;

    if (!req.session.cart || !req.session.cart[restaurant_id]) {
        return res.json({ success: false, message: "ไม่มีสินค้าในตะกร้า" });
    }

    const item = req.session.cart[restaurant_id].items.find(
        i => i.menu_item_id === menu_item_id && i.option_name === option_name
    );

    if (!item) {
        return res.json({ success: false, message: "ไม่พบสินค้าในตะกร้า" });
    }

    item.quantity += parseInt(diff);
    if (item.quantity < 1) item.quantity = 1;
    if (item.quantity > 3) item.quantity = 3;
    item.total_price = (item.base_price + item.option_price) * item.quantity;

    res.json({ success: true, cart: req.session.cart });
};

exports.checkout = (req, res) => {
    const { restaurant_id, total_price, note } = req.body;
    const user_id = req.session.user.id;

    if (!req.session.cart || !req.session.cart[restaurant_id]) {
        return res.json({ success: false, message: "ไม่มีสินค้าในตะกร้า" });
    }

    const items = req.session.cart[restaurant_id].items;
    const restaurant_name = req.session.cart[restaurant_id].restaurant_name;
    const finalNote = note && note.trim() !== "" ? note.trim() : null;

    // บันทึกออเดอร์แบบหลายเมนูใน session
    req.session.order = {
        userId: user_id,
        restaurant: {
            restaurant_id: parseInt(restaurant_id),
            name: restaurant_name,
        },
        items: items.map(item => ({
            menuItemId: item.menu_item_id,
            name: item.name,
            optionName: item.option_name,
            totalPrice: (parseFloat(item.base_price) + parseFloat(item.option_price)) * item.quantity,
            quantity: item.quantity
        })),
        totalPrice: parseFloat(total_price),
        note: finalNote
    };

    console.log("[CHECKOUT] ออเดอร์ถูกบันทึกใน session:", req.session.order);

    res.json({ success: true, redirectUrl: `/restaurant/${restaurant_id}/qrcode` });
};

