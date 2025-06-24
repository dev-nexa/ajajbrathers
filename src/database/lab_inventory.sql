-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jun 24, 2025 at 06:57 PM
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
-- Database: `lab_inventory`
--

-- --------------------------------------------------------

--
-- Table structure for table `certificates`
--

CREATE TABLE `certificates` (
  `id` int(11) NOT NULL,
  `certificate_number` varchar(50) DEFAULT NULL,
  `year` int(11) DEFAULT NULL,
  `type` enum('internal','external') DEFAULT NULL,
  `date` date DEFAULT NULL,
  `customer_name` varchar(255) DEFAULT NULL,
  `customer_phone` varchar(20) DEFAULT NULL,
  `customer_address` text DEFAULT NULL,
  `analyst` varchar(100) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `items` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`items`)),
  `total_quantity` decimal(10,2) DEFAULT NULL,
  `total_weight` decimal(10,2) DEFAULT NULL,
  `public_id` varchar(36) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL COMMENT 'Timestamp of soft-delete'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `inventory`
--

CREATE TABLE `inventory` (
  `id` int(11) NOT NULL,
  `date` date NOT NULL,
  `sample_number` varchar(50) NOT NULL,
  `supplier_or_sample_name` varchar(255) NOT NULL,
  `base_quantity` decimal(10,2) DEFAULT NULL,
  `current_quantity` decimal(10,2) DEFAULT NULL,
  `sample_weight` decimal(10,3) DEFAULT NULL,
  `net_weight_total` decimal(10,2) NOT NULL,
  `ph` decimal(4,2) DEFAULT NULL,
  `peroxide_value` decimal(10,2) DEFAULT NULL,
  `absorption_readings` varchar(255) DEFAULT NULL,
  `sigma_absorbance` decimal(10,3) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `analyst` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_rejected` tinyint(1) DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL COMMENT 'Timestamp of soft-delete'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `invoices`
--

CREATE TABLE `invoices` (
  `id` int(11) NOT NULL,
  `invoice_number` varchar(50) NOT NULL,
  `date` date NOT NULL,
  `customer_name` varchar(255) NOT NULL,
  `driver_name` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `customer_phone` varchar(20) DEFAULT NULL,
  `customer_address` text DEFAULT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `status` enum('paid','unpaid') DEFAULT 'unpaid',
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `avg_ph` decimal(10,2) DEFAULT 0.00,
  `avg_peroxide` decimal(10,2) DEFAULT 0.00,
  `avg_232` decimal(10,2) DEFAULT 0.00,
  `avg_270` decimal(10,2) DEFAULT 0.00,
  `avg_delta_k` decimal(10,2) DEFAULT 0.00,
  `total_quantity_tanks` decimal(10,2) DEFAULT 0.00,
  `total_quantity_liters` decimal(10,2) DEFAULT 0.00,
  `deleted_at` datetime DEFAULT NULL COMMENT 'Timestamp of soft-delete'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `invoice_items`
--

CREATE TABLE `invoice_items` (
  `id` int(11) NOT NULL,
  `invoice_id` int(11) NOT NULL,
  `inventory_id` int(11) NOT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `sample_number` varchar(255) DEFAULT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `net_weight` decimal(10,2) DEFAULT NULL,
  `ph` decimal(5,2) DEFAULT NULL,
  `peroxide_value` decimal(10,2) DEFAULT NULL,
  `absorption_232` decimal(10,4) DEFAULT NULL,
  `absorption_266` decimal(10,4) DEFAULT NULL,
  `absorption_270` decimal(10,4) DEFAULT NULL,
  `absorption_274` decimal(10,4) DEFAULT NULL,
  `delta_k` decimal(10,4) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id`, `name`, `created_at`) VALUES
(2, 'editor', '2025-05-19 12:14:12'),
(3, 'viewer', '2025-05-19 12:14:12'),
(9, 'admin', '2025-06-01 14:58:41');

-- --------------------------------------------------------

--
-- Table structure for table `sessions`
--

CREATE TABLE `sessions` (
  `session_id` varchar(128) NOT NULL,
  `expires` int(10) UNSIGNED NOT NULL,
  `data` mediumtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sessions`
--

INSERT INTO `sessions` (`session_id`, `expires`, `data`, `created_at`, `updated_at`) VALUES
('1TBfgerBIkngoy8Msa08wFTqrxjFoiRy', 1750783883, '{\"cookie\":{\"originalMaxAge\":86400000,\"expires\":\"2025-06-24T16:51:20.780Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"flash\":{},\"user\":{\"id\":3,\"username\":\"anas\",\"role\":\"editor\"}}', '2025-06-23 16:51:15', '2025-06-23 16:51:22'),
('5p4b9kTIruklvrcThyrc6bsv-QqyAPSF', 1750861195, '{\"cookie\":{\"originalMaxAge\":86400000,\"expires\":\"2025-06-25T14:19:55.402Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"flash\":{}}', '2025-06-24 14:19:55', '2025-06-24 14:19:55'),
('Bgp5jbpja9JPGxFi8ElJJ_RwNpmApo0k', 1750870613, '{\"cookie\":{\"originalMaxAge\":86399997,\"expires\":\"2025-06-25T16:56:27.233Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"flash\":{},\"user\":{\"id\":3,\"username\":\"anas\",\"role\":\"editor\"}}', '2025-06-23 13:36:46', '2025-06-24 16:56:53'),
('KbikMMEstcaXFLPj_6R_7Kn55P8l70W1', 1750865278, '{\"cookie\":{\"originalMaxAge\":86400000,\"expires\":\"2025-06-25T15:27:02.842Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"flash\":{}}', '2025-06-24 15:27:02', '2025-06-24 15:27:58'),
('KGOI0VM_HWyZ8yPQZbZo_WNFPiOlaCg_', 1750861049, '{\"cookie\":{\"originalMaxAge\":86400000,\"expires\":\"2025-06-25T14:17:28.428Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"flash\":{}}', '2025-06-24 14:17:28', '2025-06-24 14:17:29'),
('lmpIztGpb1F0q94o03zN3r7gD482Qxqa', 1750861311, '{\"cookie\":{\"originalMaxAge\":86400000,\"expires\":\"2025-06-25T14:21:50.804Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"flash\":{}}', '2025-06-24 14:21:50', '2025-06-24 14:21:50'),
('mV5w-6Kn5LDqJAIE7DIPZtRx4JhUe-V3', 1750859931, '{\"cookie\":{\"originalMaxAge\":86400000,\"expires\":\"2025-06-25T13:58:51.330Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"flash\":{}}', '2025-06-24 13:58:51', '2025-06-24 13:58:51'),
('tGBqXuo1jRp4US4YMK5CkLDP5VN-rzMV', 1750861695, '{\"cookie\":{\"originalMaxAge\":86400000,\"expires\":\"2025-06-25T14:28:14.617Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"flash\":{}}', '2025-06-24 14:28:14', '2025-06-24 14:28:14'),
('XWrQhEU4UbEKRosYNr7jT2pC3LyAXltk', 1750869936, '{\"cookie\":{\"originalMaxAge\":86400000,\"expires\":\"2025-06-25T16:45:35.667Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"flash\":{}}', '2025-06-24 16:45:35', '2025-06-24 16:45:35');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `password_hash`, `role_id`, `created_at`) VALUES
(3, 'anas', '$2b$10$FNk6hHCPhXWiqwkxUmpBSeCHjqvGxLmQihBxfE5Iq5yYl0EknLl0y', 2, '2025-05-19 12:19:53'),
(11, 'Malik', '$2a$10$TsHfxqS7/IZBCgv0H0N0ruhkMQhg2zv.t4zyBRlAvZR7eAeebMW7a', 3, '2025-06-04 22:58:09');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `certificates`
--
ALTER TABLE `certificates`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_certificate_year` (`certificate_number`,`year`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `idx_certificates_deleted_at` (`deleted_at`);

--
-- Indexes for table `inventory`
--
ALTER TABLE `inventory`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `invoices`
--
ALTER TABLE `invoices`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `invoice_items`
--
ALTER TABLE `invoice_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `inventory_id` (`inventory_id`),
  ADD KEY `invoice_items_ibfk_1` (`invoice_id`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`session_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD KEY `role_id` (`role_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `certificates`
--
ALTER TABLE `certificates`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=76;

--
-- AUTO_INCREMENT for table `inventory`
--
ALTER TABLE `inventory`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=178;

--
-- AUTO_INCREMENT for table `invoices`
--
ALTER TABLE `invoices`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=92;

--
-- AUTO_INCREMENT for table `invoice_items`
--
ALTER TABLE `invoice_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=191;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `invoices`
--
ALTER TABLE `invoices`
  ADD CONSTRAINT `invoices_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `invoice_items`
--
ALTER TABLE `invoice_items`
  ADD CONSTRAINT `invoice_items_ibfk_1` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `invoice_items_ibfk_2` FOREIGN KEY (`inventory_id`) REFERENCES `inventory` (`id`);

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
