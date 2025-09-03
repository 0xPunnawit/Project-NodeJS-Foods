-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Apr 18, 2025 at 03:59 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `food`
--

-- --------------------------------------------------------

--
-- Table structure for table `accounts`
--

CREATE TABLE `accounts` (
  `account_id` int(7) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `tel` varchar(15) NOT NULL,
  `role` enum('admin','customer','vendor') DEFAULT 'customer',
  `account_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `accounts`
--

INSERT INTO `accounts` (`account_id`, `name`, `email`, `password`, `tel`, `role`, `account_at`) VALUES
(12, 'กกก ขขข', 'AA@gmail.com', '71cd11fc93d8b8e475d89cc955e00b120084174861fd5c77f6ddb485d66ad6d4', '1234567891', 'customer', '2025-01-13 23:08:27'),
(36, 'นาย ขอไข่ ต้นไม้', 'Test@gmail.com', '60b7750a8ee074c6a8b1a2e8178e4da4c5cffc5309b5236a12355b7b21a985d6', '4324675765', 'vendor', '2025-04-18 08:52:37');

-- --------------------------------------------------------

--
-- Table structure for table `menu_items`
--

CREATE TABLE `menu_items` (
  `menu_item_id` int(7) NOT NULL,
  `restaurant_id` int(7) NOT NULL,
  `name` varchar(255) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `availability` enum('มี','ไม่มี') DEFAULT 'มี',
  `menu_img` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `menu_items`
--

INSERT INTO `menu_items` (`menu_item_id`, `restaurant_id`, `name`, `price`, `availability`, `menu_img`) VALUES
(14, 16, 'ข้าวหมู', 40.00, 'มี', '/uploads/vendor/menu_items/menu-1744941434339.jpg');

-- --------------------------------------------------------

--
-- Table structure for table `menu_options`
--

CREATE TABLE `menu_options` (
  `menu_option_id` int(7) NOT NULL,
  `menu_item_id` int(7) NOT NULL,
  `name` varchar(255) NOT NULL,
  `price_adjustment` decimal(10,2) DEFAULT 0.00,
  `availability` enum('มี','ไม่มี') DEFAULT 'มี'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `menu_options`
--

INSERT INTO `menu_options` (`menu_option_id`, `menu_item_id`, `name`, `price_adjustment`, `availability`) VALUES
(38, 14, 'ข้าวหมูเปื่อย', 0.00, 'ไม่มี'),
(39, 14, 'ข้าวหมูกรอบ', 10.00, 'มี'),
(40, 14, 'ข้าวหมูสับ', 0.00, 'มี');

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `order_id` int(7) NOT NULL,
  `account_id` int(7) NOT NULL,
  `restaurant_id` int(7) NOT NULL,
  `total_price` decimal(10,2) NOT NULL,
  `payment_status` enum('จ่ายสำเร็จ','รอจ่ายเงิน') DEFAULT 'จ่ายสำเร็จ',
  `order_status` enum('รอร้านค้ารับออเดอร์','กำลังทำอาหาร','อาหารเสร็จแล้ว','ร้านปฏิเสธ') DEFAULT 'รอร้านค้ารับออเดอร์',
  `created_at` datetime DEFAULT current_timestamp(),
  `note` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `order_items`
--

CREATE TABLE `order_items` (
  `order_item_id` int(7) NOT NULL,
  `order_id` int(7) NOT NULL,
  `menu_item_id` int(7) NOT NULL,
  `menu_option_id` int(7) DEFAULT NULL,
  `item_price` decimal(10,2) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `total_item_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `restaurants`
--

CREATE TABLE `restaurants` (
  `restaurant_id` int(7) NOT NULL,
  `account_id` int(7) NOT NULL,
  `name` varchar(50) NOT NULL,
  `description` varchar(50) DEFAULT NULL,
  `address` varchar(100) DEFAULT NULL,
  `phone` varchar(15) DEFAULT NULL,
  `status` enum('เปิดร้าน','ปิดร้าน') DEFAULT 'เปิดร้าน',
  `imageqrcode` varchar(255) DEFAULT NULL,
  `restaurant_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `restaurants`
--

INSERT INTO `restaurants` (`restaurant_id`, `account_id`, `name`, `description`, `address`, `phone`, `status`, `imageqrcode`, `restaurant_at`) VALUES
(16, 36, 'อาหารตามสั่ง ร้านม้า 4 ขา', 'หน้า 7-11', 'ดวงจันทร์', '5435435435', 'เปิดร้าน', '/uploads/vendor/qrcode/qrcode-1744941286687.png', '2025-04-18 08:54:46');

-- --------------------------------------------------------

--
-- Table structure for table `sessions`
--

CREATE TABLE `sessions` (
  `session_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `expires` bigint(20) UNSIGNED NOT NULL,
  `data` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sessions`
--

INSERT INTO `sessions` (`session_id`, `expires`, `data`) VALUES
('m-xfowhB8tMyANsPUT8acFJghMgVr77w', 1744943286, '{\"cookie\":{\"originalMaxAge\":1800000,\"expires\":\"2025-04-18T02:28:06.087Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\"},\"user\":{\"id\":12,\"name\":\"กกก ขขข\",\"email\":\"AA@gmail.com\",\"role\":\"customer\",\"restaurant_id\":null},\"order\":{\"userId\":12,\"menuItemId\":\"14\",\"optionName\":\"ข้าวหมูสับ\",\"totalPrice\":40,\"restaurant\":{\"restaurant_id\":16,\"name\":\"อาหารตามสั่ง ร้านม้า 4 ขา\"}}}');

-- --------------------------------------------------------

--
-- Table structure for table `slip`
--

CREATE TABLE `slip` (
  `slip_id` int(7) NOT NULL,
  `account_id` int(7) NOT NULL,
  `restaurant_id` int(7) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `transaction_reference` varchar(255) NOT NULL,
  `transaction_date` datetime NOT NULL,
  `status` enum('รอดำเนินการ','สำเร็จ','ปฏิเสธ') DEFAULT 'รอดำเนินการ',
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `accounts`
--
ALTER TABLE `accounts`
  ADD PRIMARY KEY (`account_id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `tel` (`tel`);

--
-- Indexes for table `menu_items`
--
ALTER TABLE `menu_items`
  ADD PRIMARY KEY (`menu_item_id`),
  ADD KEY `restaurant_id` (`restaurant_id`);

--
-- Indexes for table `menu_options`
--
ALTER TABLE `menu_options`
  ADD PRIMARY KEY (`menu_option_id`),
  ADD KEY `menu_item_id` (`menu_item_id`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`order_id`),
  ADD KEY `account_id` (`account_id`),
  ADD KEY `restaurant_id` (`restaurant_id`);

--
-- Indexes for table `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`order_item_id`),
  ADD KEY `order_id` (`order_id`),
  ADD KEY `menu_item_id` (`menu_item_id`),
  ADD KEY `menu_option_id` (`menu_option_id`);

--
-- Indexes for table `restaurants`
--
ALTER TABLE `restaurants`
  ADD PRIMARY KEY (`restaurant_id`),
  ADD KEY `fk_account_id` (`account_id`);

--
-- Indexes for table `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`session_id`);

--
-- Indexes for table `slip`
--
ALTER TABLE `slip`
  ADD PRIMARY KEY (`slip_id`),
  ADD KEY `restaurant_id` (`restaurant_id`),
  ADD KEY `fk_slip_account` (`account_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `accounts`
--
ALTER TABLE `accounts`
  MODIFY `account_id` int(7) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=37;

--
-- AUTO_INCREMENT for table `menu_items`
--
ALTER TABLE `menu_items`
  MODIFY `menu_item_id` int(7) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `menu_options`
--
ALTER TABLE `menu_options`
  MODIFY `menu_option_id` int(7) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=41;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `order_id` int(7) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=123;

--
-- AUTO_INCREMENT for table `order_items`
--
ALTER TABLE `order_items`
  MODIFY `order_item_id` int(7) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=39;

--
-- AUTO_INCREMENT for table `restaurants`
--
ALTER TABLE `restaurants`
  MODIFY `restaurant_id` int(7) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `slip`
--
ALTER TABLE `slip`
  MODIFY `slip_id` int(7) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=55;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `menu_items`
--
ALTER TABLE `menu_items`
  ADD CONSTRAINT `menu_items_ibfk_1` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`restaurant_id`);

--
-- Constraints for table `menu_options`
--
ALTER TABLE `menu_options`
  ADD CONSTRAINT `menu_options_ibfk_1` FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items` (`menu_item_id`);

--
-- Constraints for table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `fk_orders_account` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`account_id`) ON DELETE CASCADE;

--
-- Constraints for table `order_items`
--
ALTER TABLE `order_items`
  ADD CONSTRAINT `fk_menu_item_id` FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items` (`menu_item_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_menu_option_id` FOREIGN KEY (`menu_option_id`) REFERENCES `menu_options` (`menu_option_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE;

--
-- Constraints for table `restaurants`
--
ALTER TABLE `restaurants`
  ADD CONSTRAINT `fk_restaurants_account` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`account_id`) ON DELETE CASCADE;

--
-- Constraints for table `slip`
--
ALTER TABLE `slip`
  ADD CONSTRAINT `fk_slip_account` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`account_id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
