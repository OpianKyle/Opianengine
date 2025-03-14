-- MariaDB dump 10.19  Distrib 10.11.6-MariaDB, for Linux (x86_64)
--
-- Host: dedi1350.jnb1.host-h.net    Database: opianrewards
-- ------------------------------------------------------
-- Server version	10.5.28-MariaDB-deb11

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `admin_logs`
--

DROP TABLE IF EXISTS `admin_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `admin_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `admin_id` int(11) NOT NULL,
  `target_user_id` int(11) DEFAULT NULL,
  `action_type` enum('POINT_ADJUSTMENT','ADMIN_CREATED','ADMIN_REMOVED','ADMIN_ENABLED','ADMIN_DISABLED','USER_ENABLED','USER_DISABLED','USER_UPDATED','REWARD_CREATED','REWARD_UPDATED','REWARD_DELETED','PRODUCT_CREATED','PRODUCT_UPDATED','PRODUCT_DELETED','PRODUCT_ASSIGNED','PRODUCT_UNASSIGNED','QUOTE_REQUEST_UPDATED','QUOTE_REQUEST_COMPLETED','QUOTE_REQUEST_REJECTED') NOT NULL,
  `details` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `admin_id` (`admin_id`),
  KEY `target_user_id` (`target_user_id`),
  CONSTRAINT `admin_logs_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`),
  CONSTRAINT `admin_logs_ibfk_2` FOREIGN KEY (`target_user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin_logs`
--

LOCK TABLES `admin_logs` WRITE;
/*!40000 ALTER TABLE `admin_logs` DISABLE KEYS */;
INSERT INTO `admin_logs` VALUES
(1,17,21,'POINT_ADJUSTMENT','Adjusted points by 10000. Reason: Points for product activation activity (Activities: PRODUCT_ACTIVATION, UPGRADE)','2025-02-27 09:03:39'),
(2,17,30,'POINT_ADJUSTMENT','Adjusted points by 5000. Reason: test (POS Value: R5000)','2025-03-06 09:50:57'),
(3,17,30,'POINT_ADJUSTMENT','Adjusted points by 1. Reason: test (POS Value: R1)','2025-03-07 09:14:44'),
(4,17,30,'POINT_ADJUSTMENT','Adjusted points by 11. Reason: Points for product activation activity (POS Value: R11)','2025-03-07 09:48:19'),
(5,17,30,'POINT_ADJUSTMENT','Adjusted points by 4124. Reason: test (POS Value: R4124)','2025-03-07 10:05:51'),
(6,17,30,'POINT_ADJUSTMENT','Adjusted points by 2423. Reason: wer (POS Value: R2423)','2025-03-07 10:22:44'),
(7,17,30,'POINT_ADJUSTMENT','Adjusted points by 35634. Reason: erge (POS Value: R35634)','2025-03-07 10:53:47'),
(8,17,30,'POINT_ADJUSTMENT','Adjusted points by 366. Reason: Points for product activation activity (POS Value: R244)','2025-03-07 11:22:58'),
(9,17,30,'POINT_ADJUSTMENT','Adjusted points by 168. Reason: tets (POS Value: R112)','2025-03-07 11:43:58'),
(10,17,30,'POINT_ADJUSTMENT','Adjusted points by 666. Reason: noti (POS Value: R444)','2025-03-07 11:50:22'),
(11,17,30,'POINT_ADJUSTMENT','Adjusted points by 819. Reason: ert (POS Value: R546)','2025-03-07 11:59:16'),
(12,17,30,'POINT_ADJUSTMENT','Adjusted points by 38431. Reason: yf6 (POS Value: R25621)','2025-03-07 12:15:53'),
(13,17,30,'POINT_ADJUSTMENT','Adjusted points by 648. Reason: we4r (POS Value: R324)','2025-03-07 13:17:55'),
(14,17,30,'POINT_ADJUSTMENT','Adjusted points by 90. Reason: test (POS Value: R45)','2025-03-07 13:35:39'),
(15,17,30,'POINT_ADJUSTMENT','Adjusted points by 444. Reason: 225 (POS Value: R222)','2025-03-07 13:42:13'),
(16,17,30,'POINT_ADJUSTMENT','Adjusted points by 10670. Reason: tes (POS Value: R5335)','2025-03-10 06:52:24'),
(17,29,35,'','Created new agent: lance.heynes+1@gmail.com','2025-03-10 11:25:03'),
(18,17,33,'POINT_ADJUSTMENT','Adjusted points by 5000. Reason: Points for product activation activity (Activities: PRODUCT_ACTIVATION, CARD_BALANCE)','2025-03-10 12:36:32'),
(19,29,46,'','Created new agent: lanceheynes+5@gmail.com','2025-03-12 08:54:42'),
(20,17,48,'ADMIN_CREATED','Created new admin: jamies@opianfsgroup.com','2025-03-12 09:22:52'),
(21,48,74,'ADMIN_CREATED','Created new admin: jamiek@opianfsgroup.com','2025-03-14 09:16:48');
/*!40000 ALTER TABLE `admin_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `admin_users`
--

DROP TABLE IF EXISTS `admin_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `admin_users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `role_type` enum('ADMIN','SUPER_ADMIN') NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `admin_users_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin_users`
--

LOCK TABLES `admin_users` WRITE;
/*!40000 ALTER TABLE `admin_users` DISABLE KEYS */;
INSERT INTO `admin_users` VALUES
(1,17,'SUPER_ADMIN','2025-02-26 09:25:11'),
(4,74,'ADMIN','2025-03-14 09:16:47');
/*!40000 ALTER TABLE `admin_users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `package_premium_amounts`
--

DROP TABLE IF EXISTS `package_premium_amounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `package_premium_amounts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `package_type` enum('OPPORTUNITY','MOMENTUM','PROSPER','PRESTIGE','PINNACLE') NOT NULL,
  `premium_amount` decimal(10,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `package_premium_amounts`
--

LOCK TABLES `package_premium_amounts` WRITE;
/*!40000 ALTER TABLE `package_premium_amounts` DISABLE KEYS */;
INSERT INTO `package_premium_amounts` VALUES
(1,'OPPORTUNITY',275.00,'2025-03-06 10:43:53','2025-03-13 06:54:43'),
(2,'MOMENTUM',385.00,'2025-03-06 10:43:53','2025-03-13 06:54:54'),
(3,'PROSPER',495.00,'2025-03-06 10:43:53','2025-03-13 06:55:00'),
(4,'PRESTIGE',660.00,'2025-03-06 10:43:53','2025-03-13 06:55:05'),
(5,'PINNACLE',825.00,'2025-03-06 10:43:53','2025-03-13 06:55:13');
/*!40000 ALTER TABLE `package_premium_amounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_activities`
--

DROP TABLE IF EXISTS `product_activities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `product_activities` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` int(11) NOT NULL,
  `type` enum('SYSTEM_ACTIVATION','PRODUCT_ACTIVATION','PREMIUM_PAYMENT','CARD_BALANCE','UPGRADE','RENEWAL') NOT NULL,
  `points_value` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `product_activities_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_activities`
--

LOCK TABLES `product_activities` WRITE;
/*!40000 ALTER TABLE `product_activities` DISABLE KEYS */;
INSERT INTO `product_activities` VALUES
(1,1,'PRODUCT_ACTIVATION',333,'2025-02-26 12:01:12','2025-02-26 12:01:12'),
(2,1,'PREMIUM_PAYMENT',0,'2025-02-26 12:01:13','2025-02-26 12:01:13'),
(3,1,'CARD_BALANCE',0,'2025-02-26 12:01:13','2025-02-26 12:01:13'),
(4,1,'UPGRADE',34324,'2025-02-26 12:01:13','2025-02-26 12:01:13'),
(5,1,'RENEWAL',3242,'2025-02-26 12:01:13','2025-02-26 12:01:13'),
(16,2,'PRODUCT_ACTIVATION',5000,'2025-02-27 06:12:47','2025-02-27 06:12:47'),
(17,2,'PREMIUM_PAYMENT',0,'2025-02-27 06:12:47','2025-02-27 06:12:47'),
(18,2,'CARD_BALANCE',0,'2025-02-27 06:12:47','2025-02-27 06:12:47'),
(19,2,'UPGRADE',5000,'2025-02-27 06:12:47','2025-02-27 06:12:47'),
(20,2,'RENEWAL',5000,'2025-02-27 06:12:48','2025-02-27 06:12:48'),
(21,3,'PRODUCT_ACTIVATION',5000,'2025-02-27 06:14:29','2025-02-27 06:14:29'),
(22,3,'PREMIUM_PAYMENT',0,'2025-02-27 06:14:30','2025-02-27 06:14:30'),
(23,3,'CARD_BALANCE',0,'2025-02-27 06:14:30','2025-02-27 06:14:30'),
(24,3,'UPGRADE',5000,'2025-02-27 06:14:30','2025-02-27 06:14:30'),
(25,3,'RENEWAL',776,'2025-02-27 06:14:30','2025-02-27 06:14:30'),
(26,4,'PRODUCT_ACTIVATION',5000,'2025-02-27 06:21:10','2025-02-27 06:21:10'),
(27,4,'PREMIUM_PAYMENT',0,'2025-02-27 06:21:10','2025-02-27 06:21:10'),
(28,4,'CARD_BALANCE',0,'2025-02-27 06:21:10','2025-02-27 06:21:10'),
(29,4,'UPGRADE',5000,'2025-02-27 06:21:10','2025-02-27 06:21:10'),
(30,4,'RENEWAL',6777,'2025-02-27 06:21:11','2025-02-27 06:21:11'),
(31,5,'PRODUCT_ACTIVATION',5000,'2025-03-06 09:50:06','2025-03-06 09:50:06'),
(32,5,'PREMIUM_PAYMENT',0,'2025-03-06 09:50:06','2025-03-06 09:50:06'),
(33,5,'CARD_BALANCE',0,'2025-03-06 09:50:06','2025-03-06 09:50:06'),
(34,5,'UPGRADE',5000,'2025-03-06 09:50:06','2025-03-06 09:50:06'),
(35,5,'RENEWAL',500,'2025-03-06 09:50:07','2025-03-06 09:50:07'),
(36,6,'PRODUCT_ACTIVATION',45435,'2025-03-10 08:34:25','2025-03-10 08:34:25'),
(37,6,'PREMIUM_PAYMENT',0,'2025-03-10 08:34:25','2025-03-10 08:34:25'),
(38,6,'CARD_BALANCE',0,'2025-03-10 08:34:25','2025-03-10 08:34:25'),
(39,6,'UPGRADE',43535,'2025-03-10 08:34:25','2025-03-10 08:34:25'),
(40,6,'RENEWAL',5345,'2025-03-10 08:34:25','2025-03-10 08:34:25');
/*!40000 ALTER TABLE `product_activities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_assignments`
--

DROP TABLE IF EXISTS `product_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `product_assignments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `product_assignments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `product_assignments_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_assignments`
--

LOCK TABLES `product_assignments` WRITE;
/*!40000 ALTER TABLE `product_assignments` DISABLE KEYS */;
INSERT INTO `product_assignments` VALUES
(3,21,2,'2025-02-27 05:51:53'),
(4,21,3,'2025-02-27 06:32:52'),
(5,21,4,'2025-02-27 06:32:53'),
(6,21,1,'2025-02-27 06:32:54'),
(7,27,2,'2025-03-05 13:26:04'),
(8,28,4,'2025-03-06 07:34:48'),
(9,28,2,'2025-03-06 07:34:53'),
(10,30,2,'2025-03-06 07:41:43'),
(11,30,1,'2025-03-06 07:41:44'),
(12,30,5,'2025-03-07 09:14:23'),
(13,33,2,'2025-03-10 07:28:01'),
(14,33,5,'2025-03-10 08:04:49'),
(15,30,4,'2025-03-10 08:05:10'),
(17,33,6,'2025-03-10 08:34:51');
/*!40000 ALTER TABLE `product_assignments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `products` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `is_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES
(1,'test','testet',1,'2025-02-26 12:01:12','2025-02-26 12:01:12'),
(2,'Life cover','test',1,'2025-02-26 12:09:08','2025-02-26 12:46:45'),
(3,'test','test',1,'2025-02-27 06:14:29','2025-02-27 06:14:29'),
(4,'Kyle','test',1,'2025-02-27 06:21:09','2025-02-27 06:21:09'),
(5,'logs','lo',1,'2025-03-06 09:50:05','2025-03-06 09:50:05'),
(6,'erggergregdfgfdg','dfgfgdfg',1,'2025-03-10 08:34:24','2025-03-10 08:34:24');
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quote_requests`
--

DROP TABLE IF EXISTS `quote_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `quote_requests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `status` enum('PENDING','IN_PROGRESS','COMPLETED','REJECTED') NOT NULL DEFAULT 'PENDING',
  `notes` text DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `completed_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `product_id` (`product_id`),
  KEY `completed_by` (`completed_by`),
  CONSTRAINT `quote_requests_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `quote_requests_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `quote_requests_ibfk_3` FOREIGN KEY (`completed_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quote_requests`
--

LOCK TABLES `quote_requests` WRITE;
/*!40000 ALTER TABLE `quote_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `quote_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rewards`
--

DROP TABLE IF EXISTS `rewards`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `rewards` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `points_cost` int(11) NOT NULL,
  `image_url` text NOT NULL,
  `available` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rewards`
--

LOCK TABLES `rewards` WRITE;
/*!40000 ALTER TABLE `rewards` DISABLE KEYS */;
/*!40000 ALTER TABLE `rewards` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transactions`
--

DROP TABLE IF EXISTS `transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `points` int(11) NOT NULL,
  `type` enum('EARNED','REDEEMED','ADMIN_ADJUSTMENT','CASH_REDEMPTION','WELCOME_BONUS','REFERRAL_BONUS','QUOTE_REQUEST') NOT NULL,
  `description` text NOT NULL,
  `reward_id` int(11) DEFAULT NULL,
  `status` enum('PENDING','PROCESSED') DEFAULT 'PENDING',
  `processed_at` timestamp NULL DEFAULT NULL,
  `processed_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `reward_id` (`reward_id`),
  KEY `processed_by` (`processed_by`),
  KEY `transactions_ibfk_1` (`user_id`),
  CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `transactions_ibfk_2` FOREIGN KEY (`reward_id`) REFERENCES `rewards` (`id`),
  CONSTRAINT `transactions_ibfk_3` FOREIGN KEY (`processed_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=46 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transactions`
--

LOCK TABLES `transactions` WRITE;
/*!40000 ALTER TABLE `transactions` DISABLE KEYS */;
INSERT INTO `transactions` VALUES
(14,17,15000,'WELCOME_BONUS','Welcome bonus points for ACTIVE package registration',NULL,'PENDING',NULL,NULL,'2025-02-26 09:04:31'),
(16,21,15000,'WELCOME_BONUS','Welcome bonus points for ACTIVE package',NULL,'PENDING',NULL,NULL,'2025-02-26 11:16:23'),
(17,21,10000,'ADMIN_ADJUSTMENT','Points for product activation activity (Activities: PRODUCT_ACTIVATION, UPGRADE)',NULL,'PENDING',NULL,NULL,'2025-02-27 09:03:38'),
(18,22,20000,'WELCOME_BONUS','Welcome bonus points for PROFESSIONAL package',NULL,'PENDING',NULL,NULL,'2025-02-27 09:21:12'),
(19,23,5000,'WELCOME_BONUS','Welcome bonus points for BEGINNER package',NULL,'PENDING',NULL,NULL,'2025-03-03 08:33:44'),
(20,30,5000,'ADMIN_ADJUSTMENT','test (POS Value: R5000)',NULL,'PENDING',NULL,NULL,'2025-03-06 09:50:56'),
(21,31,25000,'WELCOME_BONUS','Welcome bonus points for EXPERT package',NULL,'PENDING',NULL,NULL,'2025-03-06 10:15:49'),
(22,32,25000,'WELCOME_BONUS','Welcome bonus points for EXPERT package',NULL,'PENDING',NULL,NULL,'2025-03-06 10:49:22'),
(23,33,10000,'WELCOME_BONUS','Welcome bonus points for NOVICE package',NULL,'PENDING',NULL,NULL,'2025-03-06 10:52:33'),
(24,30,1,'ADMIN_ADJUSTMENT','test (POS Value: R1)',NULL,'PENDING',NULL,NULL,'2025-03-07 09:14:42'),
(25,30,11,'ADMIN_ADJUSTMENT','Points for product activation activity (POS Value: R11)',NULL,'PENDING',NULL,NULL,'2025-03-07 09:48:18'),
(26,30,4124,'ADMIN_ADJUSTMENT','test (POS Value: R4124)',NULL,'PENDING',NULL,NULL,'2025-03-07 10:05:50'),
(27,30,2423,'ADMIN_ADJUSTMENT','wer (POS Value: R2423)',NULL,'PENDING',NULL,NULL,'2025-03-07 10:22:43'),
(28,30,35634,'ADMIN_ADJUSTMENT','erge (POS Value: R35634)',NULL,'PENDING',NULL,NULL,'2025-03-07 10:53:45'),
(29,30,366,'ADMIN_ADJUSTMENT','Points for product activation activity (POS Value: R244)',NULL,'PENDING',NULL,NULL,'2025-03-07 11:22:57'),
(30,30,168,'ADMIN_ADJUSTMENT','tets (POS Value: R112)',NULL,'PENDING',NULL,NULL,'2025-03-07 11:43:57'),
(31,30,666,'ADMIN_ADJUSTMENT','noti (POS Value: R444)',NULL,'PENDING',NULL,NULL,'2025-03-07 11:50:21'),
(32,30,819,'ADMIN_ADJUSTMENT','ert (POS Value: R546)',NULL,'PENDING',NULL,NULL,'2025-03-07 11:59:15'),
(33,30,38431,'ADMIN_ADJUSTMENT','yf6 (POS Value: R25621)',NULL,'PENDING',NULL,NULL,'2025-03-07 12:15:52'),
(34,30,648,'ADMIN_ADJUSTMENT','we4r (POS Value: R324)',NULL,'PENDING',NULL,NULL,'2025-03-07 13:17:54'),
(35,30,90,'ADMIN_ADJUSTMENT','test (POS Value: R45)',NULL,'PENDING',NULL,NULL,'2025-03-07 13:35:38'),
(36,30,444,'ADMIN_ADJUSTMENT','225 (POS Value: R222)',NULL,'PENDING',NULL,NULL,'2025-03-07 13:42:11'),
(37,30,10670,'ADMIN_ADJUSTMENT','tes (POS Value: R5335)',NULL,'PENDING',NULL,NULL,'2025-03-10 06:52:23'),
(38,34,10000,'WELCOME_BONUS','Welcome bonus points for NOVICE package',NULL,'PENDING',NULL,NULL,'2025-03-10 08:54:01'),
(39,33,5000,'ADMIN_ADJUSTMENT','Points for product activation activity (Activities: PRODUCT_ACTIVATION, CARD_BALANCE)',NULL,'PENDING',NULL,NULL,'2025-03-10 12:36:30'),
(40,42,25000,'WELCOME_BONUS','Welcome bonus points for EXPERT package',NULL,'PENDING',NULL,NULL,'2025-03-11 09:21:03'),
(41,43,20000,'WELCOME_BONUS','Welcome bonus points for PROFESSIONAL package',NULL,'PENDING',NULL,NULL,'2025-03-11 09:29:33'),
(42,57,15000,'WELCOME_BONUS','Welcome bonus points for ACTIVE package',NULL,'PENDING',NULL,NULL,'2025-03-13 10:36:41'),
(43,60,5000,'WELCOME_BONUS','Welcome bonus points for BEGINNER package',NULL,'PENDING',NULL,NULL,'2025-03-13 11:56:19'),
(44,61,15000,'WELCOME_BONUS','Welcome bonus points for ACTIVE package',NULL,'PENDING',NULL,NULL,'2025-03-13 12:27:34'),
(45,62,15000,'WELCOME_BONUS','Welcome bonus points for ACTIVE package',NULL,'PENDING',NULL,NULL,'2025-03-13 12:49:59');
/*!40000 ALTER TABLE `transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `first_name` varchar(255) NOT NULL,
  `last_name` varchar(255) NOT NULL,
  `phone_number` varchar(50) NOT NULL,
  `is_south_african` tinyint(1) DEFAULT 0,
  `id_number` varchar(50) DEFAULT NULL,
  `date_of_birth` varchar(50) DEFAULT NULL,
  `gender` varchar(50) DEFAULT NULL,
  `occupation` varchar(255) DEFAULT NULL,
  `industry` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `city` varchar(255) DEFAULT NULL,
  `postal_code` varchar(50) DEFAULT NULL,
  `selected_package` enum('OPPORTUNITY','MOMENTUM','PROSPER','PRESTIGE','PINNACLE') DEFAULT NULL,
  `bank_name` varchar(255) DEFAULT NULL,
  `account_type` enum('CHEQUE','SAVINGS','CURRENT') DEFAULT NULL,
  `account_number` varchar(50) DEFAULT NULL,
  `account_holder_name` varchar(255) DEFAULT NULL,
  `branch_code` varchar(50) DEFAULT NULL,
  `has_credit_card` tinyint(1) DEFAULT 0,
  `signature` text DEFAULT NULL,
  `is_admin` tinyint(1) NOT NULL DEFAULT 0,
  `is_super_admin` tinyint(1) NOT NULL DEFAULT 0,
  `is_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `points` int(11) NOT NULL DEFAULT 0,
  `referral_code` varchar(50) DEFAULT NULL,
  `referred_by` varchar(50) DEFAULT NULL,
  `reset_token` varchar(255) DEFAULT NULL,
  `reset_token_expiry` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_agent` tinyint(1) NOT NULL DEFAULT 0,
  `agent_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `agent_id` (`agent_id`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`agent_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=75 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES
(17,'kylem@opianfsgroup.com','$2b$10$KwHVaHkVt5J3YmHj0GsYOeoI2G1G8VO1RnYkl5tD5OXOxC3v9hOkS','Kyle','test','0769815243',1,'42342432423432432','1998-09-24','female','IT','Retail','260 uys krige drive','Cape Town','7530','','FIRSTRAND BANK','CHEQUE','18142376781','Kyle','test',1,'data:image/png;base64,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',1,1,1,15000,'REF2f47c58b',NULL,NULL,NULL,'2025-02-26 09:04:31',0,NULL),
(21,'kylem+6456556@opianfsgroup.com','c0fe9f4e077054b1a8c77fcf98d31ed2.d0bfd14d72c2e2b04fa1812ca35cb8347992cf37ae860f7ebf34203b8c37ab54d4922a9e999e329de590381c883a098371309f8806c3dfad4736028a0fd57abd','Kyle','test','0769815243',1,'3455435435354354','1998-01-01','female','erttrest','Mining','260 uys krige drive','Cape Town','7530','','test','CURRENT','18142376781','Kyle','test',1,NULL,0,0,1,25000,'REFebdc179f',NULL,NULL,NULL,'2025-02-26 11:16:22',0,NULL),
(22,'kylem+4535252@opianfsgroup.com','c6bb8f490b8d0264b5e2ef58d1b848ea.2b13fd57ebbb9e1fadd71040632448242f7c1d375f52807b09e2c83aed984535373b7c40bd0bafda20a2de81b7f4d47d24bb16f65e6a57178d7f1113e30b4624','Kyle','test','0769815243',1,'42342432423432432','1998-09-24','female','erttrest','Services','260 uys krige drive','Cape Town','7530','','FIRSTRAND BANK','CURRENT','18142376781','Kyle','test',1,NULL,0,0,1,20000,'REF61b4c2c7',NULL,NULL,NULL,'2025-02-27 09:21:11',0,NULL),
(23,'kylem55654654@opianfsgroup.com','b4a2215b19ac759b3c406b99d325feab.eddb756b6daeab0e8ae1af7182dcbcec4df8de6a267e8bb6ebcaf7407621afcad7424f37dee0bb0f068b8ed25c66253ff8013257c6995e61903051b503d23f5f','Kyle test','test','0769815243',1,'42342432423432432','1998-09-24','male','erttrest','Manufacturing','260 uys krige drive','Cape Town','7530','','FIRSTRAND BANK','CHEQUE','18142376781','Kyle','test',1,NULL,0,0,1,5000,'REF9f7dbcfe',NULL,NULL,NULL,'2025-03-03 08:33:44',0,NULL),
(24,'kylem+43@opianfsgroup.com','b8d255946966bb42f93743dc5f9004ca87cc1ef1992b19a6f288622c1a5c4e419a5c2ab0a4fb47a8d58236d94caf13dc24955c47fc7da4f0ba1f5665213b6dbb.7fd17909da6d08b725dcc2b8bcf67223','Kyle test','test','0769815243',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,0,0,1,0,NULL,NULL,NULL,NULL,'2025-03-03 09:13:50',1,NULL),
(25,'kyle.oraclesystems+187565@gmail.com','6cc1908af891c8dca4e1e04c857fc4bb20062442f34edfbd27640c0ef6518db8d52db886168ab1896b3c4fee96575cc0f190d0a361a539447148fa9d30fb09f6.b5aac3977c39b0be5b86e171d3e7dd0e','test','test','0769815243',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,0,0,1,0,NULL,NULL,NULL,NULL,'2025-03-03 10:35:47',1,NULL),
(26,'kyle.oraclesystems+test@gmail.com','b55ff6890b5c24067fcc7a2d086c363d3d4f8366116fcc98fe184297412dc6379f716fc3533a610c6169e09e75bb121795c87d38d7c1d4904773ab8622338988.82cfe46f5a1bd91a1526df50cdb93a4b','Agent','Doe','0769815243',0,NULL,NULL,NULL,'','','','','',NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,0,0,1,0,'REF26m844w47u',NULL,NULL,NULL,'2025-03-05 09:25:48',1,NULL),
(27,'kyle.oraclesystems+test1@gmail.com','a8bfe85bb08fa4b16847b6b9c43cc9b15bc26b0e00ca24bfda90dd7bf3cc0847121c62f9f78d5715317abf26ab7f47813ef91dd6303c959d6e1b8a05a992739a.8185603b1b55bacb9c79d7236b217177','John','Doe','0769815243',0,NULL,NULL,NULL,'','','','','','',NULL,NULL,NULL,NULL,NULL,0,NULL,0,0,1,0,'REF27m844xzm7',NULL,NULL,NULL,'2025-03-05 10:28:17',1,17),
(28,'kyle.oraclesystems+test22@gmail.com','c672dc8d4bda92809882ba0c8e325d97a261130a29e7d276c2f14e5a3a0014898a59e167244e095bab158b46826b7cb73cf4deba4714452270fcfdae731f3f24.b1dcd5e5d00f85a7c89acd9b0476e2b2','Kyle','test','0769815243',1,'42342432423432432','2025-02-27','male','','','','','','','FIRSTRAND BANK','SAVINGS','18142376781','Kyle test','test',1,NULL,0,0,1,5000,'REF28m7vu0jsq',NULL,NULL,NULL,'2025-03-05 11:18:40',0,27),
(29,'lanceh@opianfsgroup.com','f45dd905d5f029d29ec67b7d58fff1d17f5034b8fdc66957cee388290688843d0387626aca4e3d5bcbcd7dc613f7e904b48113c68bdead469ff1ae4ec984d61e.fecb1035e80f7b1085140cee04daef85','Lance','Heynes','0769815243',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,0,0,1,0,NULL,NULL,NULL,NULL,'2025-03-06 06:37:46',0,NULL),
(30,'kylem+4343@opianfsgroup.com','$2b$10$KwHVaHkVt5J3YmHj0GsYOeoI2G1G8VO1RnYkl5tD5OXOxC3v9hOkS','Kyle','test','0769815243',1,'42342432423432432','1199-09-09','male','erttrest','Construction','260 uys krige drive','Cape Town','7530','','FIRSTRAND BANK','SAVINGS','18142376781','Kyle','test',1,NULL,0,0,1,124495,'REF30m7x6joak',NULL,NULL,NULL,'2025-03-06 07:38:40',0,27),
(31,'kyle.oraclesystems+test3434@gmail.com','f637166bf208a8f8bae1eb54e3d0da44cb62174fd37324cb5b424ad624666348dfc5410fd68ffdedf5ea3ea4ea5496064aaa4d38ffa3fa350e29dca30f0ea9ac.53f27d1806f5a4c1b365f1294df96d14','Kyle test test','test','0769815243',1,'42342432423432432','1998-09-09','female','test','Transport','1 test','test','1424','','tetsttgerg','CURRENT','2434141413413','Kyle','24552452',1,NULL,0,0,1,25000,'REF64c14877','REF30m7x6joak',NULL,NULL,'2025-03-06 10:15:48',0,NULL),
(32,'kyle.oraclesystems+hi@gmail.com','b547af119c3d9029d77cf7461261d849024c282be936929f10dc9cd0ae0042d148a6fcb999c333b870ce0fd399fb4acac253b630c2a7fd55f0603ae19506d110.e9f09155a4da6dea59222e7469ecdf27','Kyle test test','test','0769815243',1,'42342432423432432','1998-09-09','male','ertest','Retail','1 test','test','1424','','run','CHEQUE','45256758758','Kyle','24552452',1,NULL,0,0,1,25000,'REF83c5b5b1','REF30m7x6joak',NULL,NULL,'2025-03-06 10:49:22',0,NULL),
(33,'kyle.oraclesystems+level2@gmail.com','dfd70eb4410d6708d7b624901346f2e1e480672f6594aa191e54fca781ccb61011e4f1a8b7b820a502dc43f2a937fc2441ea4aea0f3383012446746b25bde174.495b29feb63bb36545676a48276fac43','Kyle test test','test','0769815243',1,'42342432423432432','1998-09-09','male','IT','Finance','1 test','test','1424','','FIRSTRAND BANK','CURRENT','18142376781','Kyle','test',1,NULL,0,0,1,15000,'REFbc27d21e','REF83c5b5b1',NULL,NULL,'2025-03-06 10:52:32',0,NULL),
(34,'kyle.oraclesystems@gmail.com','760309f6c09c4d7dad5759a50a568b4c9ef91667492479cc07ed9478350210c89cd3b2ee7c72f2828752730b4a24880eb0b2705f3354f6424d699f72597b179d.f8983bd8a6ff0ec4a3b394a44cf3c88e','Kyle','test','0769815243',1,'42342432423432432','1998-09-09','female','erttrest','Services','260 uys krige drive','Cape Town','7530','','gfdgds','CURRENT','18142376781','wefrfs','24552452',1,NULL,0,0,1,10000,'REFb711929e',NULL,NULL,NULL,'2025-03-10 08:54:01',0,NULL),
(35,'lance.heynes+1@gmail.com','28fef3967b8a248a3e58c873fa3051200fda667e5300dbe5ec2fd0200edcc2d4d7b4434bff5e7868c783173cc6da9447913af2a5170384044de6dc7cf003e81e.b75e8a11112e98c37c34e9def21206ae','Lawrence','Heynes','+27813234299',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,0,0,1,0,NULL,NULL,NULL,NULL,'2025-03-10 11:25:02',1,29),
(37,'lance.heynes+4@gmail.com','$2b$10$KwHVaHkVt5J3YmHj0GsYOeoI2G1G8VO1RnYkl5tD5OXOxC3v9hOkS','John','James','0832324444',1,'7010010000000','1970-10-01','male','Consultant','Finance','30 John Vorster Avenue','Cape Town','7500','','Nedbank','CURRENT','1234567890','JJames','250050',1,NULL,0,0,1,10000,NULL,NULL,'b5681db335ccf811e8f1d3b68ece9b9754f6a289b27f940def561fadbc225664','2025-03-10 10:31:34','2025-03-10 11:29:10',0,35),
(38,'kylem+43165@opianfsgroup.com','$2b$10$KwHVaHkVt5J3YmHj0GsYOeoI2G1G8VO1RnYkl5tD5OXOxC3v9hOkS','Kyle','test','0769815243',1,'42342432423432432','1998-09-09','male','erttrest','Construction','260 uys krige drive','Cape Town','7530','','FIRSTRAND BANK','SAVINGS','18142376781','Kyle','24552452',1,NULL,0,0,1,10000,NULL,NULL,NULL,NULL,'2025-03-11 07:00:53',0,26),
(39,'kylem+43test@opianfsgroup.com','$2b$10$KwHVaHkVt5J3YmHj0GsYOeoI2G1G8VO1RnYkl5tD5OXOxC3v9hOkS','jaffgs','erggea','0769815243',1,'435353','1988-08-08','male','IT','Education','260 uys krige drive','Cape Town','7530','','test','CURRENT','test','Kyle test','test',1,NULL,0,0,1,10000,NULL,NULL,NULL,NULL,'2025-03-11 09:08:55',0,26),
(40,'kylem+43346245@opianfsgroup.com','$2b$10$KwHVaHkVt5J3YmHj0GsYOeoI2G1G8VO1RnYkl5tD5OXOxC3v9hOkS','Henry','Danger','0769815243',1,'42342432423432432','1998-09-09','male','erttrest','Construction','260 uys krige drive','Cape Town','7530','','FIRSTRAND BANK','CURRENT','181423767812','Kyle test','24552452',1,NULL,0,0,1,15000,NULL,NULL,NULL,NULL,'2025-03-11 09:12:18',0,26),
(41,'kylem+43322431534@opianfsgroup.com','$2b$10$KwHVaHkVt5J3YmHj0GsYOeoI2G1G8VO1RnYkl5tD5OXOxC3v9hOkS','  zoo','ertet','0769815243',1,'42342432423432432','1998-08-08','male','erttrest','Education','260 uys krige drive','Cape Town','7530','','FIRSTRAND BANK','CURRENT','18142376781','Kyle','test',1,NULL,0,0,1,20000,NULL,NULL,NULL,NULL,'2025-03-11 09:17:10',0,26),
(42,'kyle.oraclesystems+test4353543@gmail.com','de3e3f63eb6b78f7ac15c7b62cc91e93e4a3832e670bd50136b74da05f2fd75566dd1177e5ad75ee9a819686d885f5d706b61345dbc667d100aec18e86b30052.5ae643ea62844fe3d1f2fafcb63c5d74','jane','trtr','0769815243',1,'435353','1998-08-08','other','ferfsfsf','Transport','260 uys krige drive','Cape Town','7530','','test','','18142376781','Kyle','test',1,NULL,0,0,1,25000,'REF7ef56734',NULL,NULL,NULL,'2025-03-11 09:21:03',0,NULL),
(43,'kyle.oraclesystems+test435435@gmail.com','a37abc330c6af826aef7b9c5f9b86e993d6c4b2a086a6f150c8c60ccd5018cff1f2c1a83647d3d4f98579a830d6e48719c80287d02d4c74c4d87ccdb9c8a74e2.1089e0f53ae564ea1a535f5695cb9f15','Kyle test','test','0769815243',1,'42342432423432432','1998-09-24','female','IT','Education','260 uys krige drive','Cape Town','7530','','FIRSTRAND BANK','CHEQUE','18142376781','Kyle test','24552452',1,NULL,0,0,1,20000,'REF98df1d2b',NULL,NULL,NULL,'2025-03-11 09:29:33',0,NULL),
(44,'kylem+4343635665@opianfsgroup.com','$2b$10$KwHVaHkVt5J3YmHj0GsYOeoI2G1G8VO1RnYkl5tD5OXOxC3v9hOkS','Kyle','test','0769815243',1,'42342432423432432','1998-09-09','male','erttrest','Finance','260 uys krige drive','Cape Town','7530','','FIRSTRAND BANK','SAVINGS','18142376781','Kyle test','test',1,NULL,0,0,1,25000,NULL,NULL,NULL,NULL,'2025-03-11 10:38:43',0,27),
(45,'kylem+43regg@opianfsgroup.com','$2b$10$KwHVaHkVt5J3YmHj0GsYOeoI2G1G8VO1RnYkl5tD5OXOxC3v9hOkS','Kyle','test','0769815243',1,'42342432423432432','1998-09-09','male','IT','Education','260 uys krige drive','Cape Town','7530','','FIRSTRAND BANK','SAVINGS','18142376781','Kyle','test',1,NULL,0,0,1,20000,'CUSBCFF15',NULL,NULL,NULL,'2025-03-11 10:48:26',0,27),
(46,'lanceheynes+5@gmail.com','6daef1d883ac4c07b21ab2089608b004b484f210f99940f9fc2314e885a9b818ee2c51966b132102d22e152bf7a68e9b98a2ebafb0d68e0775bbca0f5663b285.b771a8e381b1e394139de74c4e91b3b9','Lawrence','Heynes','0813234297',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,0,0,1,0,NULL,NULL,NULL,NULL,'2025-03-12 08:54:40',1,29),
(47,'lance.heynes+10@gmail.com','$2b$10$KwHVaHkVt5J3YmHj0GsYOeoI2G1G8VO1RnYkl5tD5OXOxC3v9hOkS','Lancey','Heynesie','0813234297',1,'6710010000000','1980-10-01','male','Consultant','Construction','30 John Vorster Avenue','Cape Town','7500','','Nedbank','CHEQUE','12345678910','L Heynesie','250050',1,NULL,0,0,1,15000,'CUS33C21A',NULL,NULL,NULL,'2025-03-12 08:59:10',0,46),
(48,'jamies@opianfsgroup.com','da194c0aca3c72c1e390db6be6034f3a9c146e89b2ab369de52689eefcc6ce3e1d54dbca0d368e8999b0a38f3c8cfe8dea46823a36b152ee4330fef7e8541f43.8ad6e02ee6970304a6c9b203fa712b44','Jamie','Smith','0123456789',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,0,0,1,0,NULL,NULL,NULL,NULL,'2025-03-12 09:22:50',0,NULL),
(49,'kylem+pack@opianfsgroup.com','b2f9775677dd5a5db9c8224d92b8619f77f0b91d9ca3343f4b966f0639262deefcef60c1dec3eaa51e7536be085809cdd0dc84ecda463814e2f64554d0617d67.3564b5e0c57c558ea02f5bd87be985a0','Kyle test','test','0769815243',1,'42342432423432432','12123-12-13','female','erttrest','Agriculture','260 uys krige drive','Cape Town','7530','','FIRSTRAND BANK','CHEQUE','18142376781','Kyle test','test',1,NULL,0,0,1,0,'REFaa789045',NULL,NULL,NULL,'2025-03-13 06:59:08',0,NULL),
(50,'kylem+package@opianfsgroup.com','e75dd58ffd18ad727a91e2289bb61ee9b21bdd2772dbba3bf9a9dfa2030861ae8f26eca6e50e0370f61829d6f27358de506b5a6ab45c9a4a8198716f93cc6ac9.834a91b489bf69f867f3f4f06530090d','Kyle test','test','0769815243',1,'42342432423432432','1998-09-09','female','erttrest','Manufacturing','260 uys krige drive','Cape Town','7530','','gfdgds','CURRENT','181423767812','Kyle','test',1,NULL,0,0,1,0,'REF632f2c68',NULL,NULL,NULL,'2025-03-13 07:03:37',0,NULL),
(51,'kylem+pack2@opianfsgroup.com','8be45f6ea112a60e229f92bc361576c22c516f47b73bc60405c51d830babb8b5599296b00d5ca2b53ea5b7da073e47de6dc0d44b61ad49347f6ec43c792b9a1f.3d0f643f76d6b548460b09dcafe411d4','Kyle test','test','0769815243',1,'42342432423432432','1998-09-09','female','test','Retail','260 uys krige drive','Cape Town','7530','','FIRSTRAND BANK','CURRENT','18142376781','Kyle','test',1,NULL,0,0,1,0,'REFf69b7270',NULL,NULL,NULL,'2025-03-13 07:17:10',0,NULL),
(52,'kylem+pack22@opianfsgroup.com','34acb3db92be3cbde6e3dbda0ed66f6bb2a2607a4bdaf67d9703f298ab583ba5814e0e32e678e6d18cf31f5f53669b2652d52a77d8a45dcdb8db1c3e6cd4de0c.a00d8f188c499a94d73594615fef1c40','Kyle test','test','0769815243',1,'42342432423432432','1999-09-09','female','IT','Mining','260 uys krige drive','Cape Town','7530','','FIRSTRAND BANK','CURRENT','18142376781','Kyle','test',1,NULL,0,0,1,0,'REFa6d5b862',NULL,NULL,NULL,'2025-03-13 08:10:16',0,NULL),
(53,'kylem+pack23242@opianfsgroup.com','49d0190644ec208974428710a37f725f4c378dd9a85628be025b7501814ae68103ae9b11169fa3eceac22f88784ecd74704e4f7387fb10d756095cdcac986526.3d2a0eecf330161bad8295bc3e632b14','Kyle t','test','0769815243',1,'42342432423432432','1998-09-09','female','IT','Construction','260 uys krige drive','Cape Town','7530','','FIRSTRAND BANK','CURRENT','18142376781','Kyle','test',1,NULL,0,0,1,0,'REFb1c44f3a',NULL,NULL,NULL,'2025-03-13 08:55:24',0,NULL),
(54,'kylem+pack2324tr2@opianfsgroup.com','0fb436939ee77b8f5e611a3d594c90ade3f6d9b8a53e72ec13ee0a86777ebc93493533161517277cdca29d9eded6542ff019bcab3b5ea63a41b8b262ee6956b7.bbb779aa0546e6f0ded53084247f1d09','Kyle test','test','0769815243',1,'42342432423432432','1998-09-24','male','IT','Retail','260 uys krige drive','Cape Town','7530','','FIRSTRAND BANK','CURRENT','18142376781','Kyle','24552452',1,NULL,0,0,1,0,'REF8420784a',NULL,NULL,NULL,'2025-03-13 09:06:53',0,NULL),
(55,'kylem+43453443434@opianfsgroup.com','$2b$10$KwHVaHkVt5J3YmHj0GsYOeoI2G1G8VO1RnYkl5tD5OXOxC3v9hOkS','Kyle test','test','0769815243',1,'3455435435354354','1998-09-24','male','erttrest','Construction','260 uys krige drive','Cape Town','7530','','FIRSTRAND BANK','SAVINGS','18142376781','Kyle test','test',1,NULL,0,0,1,0,'CUS607DA2',NULL,NULL,NULL,'2025-03-13 09:14:23',0,27),
(56,'kyle.oraclesystems+test132@gmail.com','56a2d8a6113fc2ee6e27fd0591ce2fe3ec1a889dca9da7607b18dba759e001982c6457d4e01c5b8369f18e3861e34436b7552a6fbc27051f063956048c92ab25.17de0d7a38bdfccb8dc3eaa50057f2d1','Kyle test','test','0769815243',1,'42342432423432432','1998-08-08','other','erttrest','Services','260 uys krige drive','Cape Town','7530','','FIRSTRAND BANK','CURRENT','18142376781','Kyle','24552452',1,NULL,0,0,1,0,'REFa572efbc',NULL,NULL,NULL,'2025-03-13 10:32:29',0,NULL),
(57,'kyle.oraclesystems+testdss1@gmail.com','b943931b0d758c4e45fce1c3b7d7379ce57c7919bd669530f7018d0945d65c1883109c1341e415cf4756cdc7f086052cc27324db117e4df0bab1d8c2b7ad1c57.9355f6e14f4a7ebb1445b6d548f1bc8e','Kyle test','test','0769815243',1,'42342432423432432','1998-09-02','female','ferfsfsf','Retail','260 uys krige drive','Cape Town','7530','','FIRSTRAND BANK','CURRENT','18142376781','Kyle','test',1,NULL,0,0,1,15000,'REFf9cc8b43',NULL,NULL,NULL,'2025-03-13 10:36:41',0,NULL),
(58,'kyle.oraclesystems+tefefst1@gmail.com','ccad882d310d9d7f8d0a42c048569ca98b55407a5cdbb2b8aad1b6971ffa7353bc5800fd6cdb00156cf4541fe73a2f0a271db1611a29361f7311e67796ce9cbe.eda13de884e777fbe77810b7fdd5265f','Kyle test','test','0769815243',1,'42342432423432432','1998-09-09','female','erttrest','Mining','260 uys krige drive','Cape Town','7530','','FIRSTRAND BANK','CURRENT','18142376781','Kyle','test',1,NULL,0,0,1,0,'REF6779ef20',NULL,NULL,NULL,'2025-03-13 11:15:44',0,NULL),
(59,'kyle.oraclesystems+tesffst1@gmail.com','bbc6f847602a1fbd79ddf4ed25dd4403b4a48707e7395a90dbf5ba4a07e156645787eaa869d2c2625cfd02835029778c56f44995ed46c2b96608725d2f592889.09f224a40e5b2cf394d0355bf735d760','Kyle test','test','0769815243',1,'42342432423432432','1998-02-02','female','ertest','Mining','260 uys krige drive','Cape Town','7530','','FIRSTRAND BANK','CHEQUE','181423767812','Kyle test','test',1,NULL,0,0,1,0,'REF907882d4',NULL,NULL,NULL,'2025-03-13 11:49:35',0,NULL),
(60,'kylem+43hthth@opianfsgroup.com','3c3e1125ae275c334914276515c8c58aa8d5da5da124f36c93149a1a169dcacbecef4b7bdb7531d5b9417d4b007f9b1e08531a19abb0cb93fd7533d204482707.b75750fbfab86990d34edd807c2cc4c2','Kyle test','test','0769815243',1,'42342432423432432','1998-09-09','female','erttrest','Services','260 uys krige drive','Cape Town','7530','','FIRSTRAND BANK','CURRENT','18142376781','Kyle','test',1,NULL,0,0,1,5000,'REFaf8335ff',NULL,NULL,NULL,'2025-03-13 11:56:19',0,NULL),
(61,'kylem+4fef3@opianfsgroup.com','2f41784ac614c0c5d5f39a82f3baab715dab6361ea5ddad59678d9c083d49db5a1e2918a8a4e16b07ddbb44de80ac9879210a709e68bca45554293179b61a3e2.4136ffd2f1e3b35464bb9065f131cc2f','Kyle test','test','0769815243',1,'42342432423432432','1998-09-09','female','erttrest','Mining','260 uys krige drive','Cape Town','7530','','FIRSTRAND BANK','CURRENT','18142376781','Kyle','test',1,NULL,0,0,1,15000,'REFec6fad30',NULL,NULL,NULL,'2025-03-13 12:27:33',0,NULL),
(62,'kylem+43ththt@opianfsgroup.com','69c6de8f118428479d4853c89272da89370ec6b5e2c3ab6e353d28bed1fb98e8c90c6c8de984f72b96cff3e19618fd028f97682b2bdb118a354d7f7f22fc1ecd.eb144e31b656210c8b6f5f07f3087202','Kyle test','test','0769815243',1,'42342432423432432','1998-09-24','female','IT','Information Technology','260 uys krige drive','Cape Town','7530','','FIRSTRAND BANK','CURRENT','18142376781','Kyle','test',1,NULL,0,0,1,15000,'REF9c32c320',NULL,NULL,NULL,'2025-03-13 12:49:58',0,NULL),
(63,'kylem+4344GRDGD@opianfsgroup.com','89fc9a6d72c8cc225343092cc535d521a526c84eb176fa331a7d7c194bde4263c0cbde78c593c0fe2ea0876dbda69aa837183a74007026df18d088341382d36b.29ff639e9c937b929c8af96c07d36474','Kyle test','test','0769815243',1,'42342432423432432','1998-02-02','female','test','Mining','260 uys krige drive','Cape Town','7530','','FIRSTRAND BANK','CHEQUE','test','Kyle','250050',1,NULL,0,0,1,0,'REFc4ee56db',NULL,NULL,NULL,'2025-03-13 12:59:00',0,NULL),
(64,'kylem+43345@opianfsgroup.com','f2551207c1275f54230a30fe2f0931b310dcbc25c44a0a10ee591561c7fb06b790cc801688c31dab7844f265e923ba58437c3a9a9f2fae3f868dc6a3962568a8.c97a9e9f745e95c9b468a9130a5942ee','Kyle test','test','0769815243',1,'42342432423432432','1998-09-09','female','ferfsfsf','Information Technology','260 uys krige drive','Cape Town','7530','PROSPER','FIRSTRAND BANK','CHEQUE','18142376781','Kyle','test',1,NULL,0,0,1,0,'REF942d6716',NULL,NULL,NULL,'2025-03-13 13:09:26',0,NULL),
(65,'kyle.oraclesystems+tefrggst1@gmail.com','9b15d1bfd3b97e81d6bf309b69e66cfa0020d49a89f39694de0fd0abda50aedf31c2b28bd0261ed5cf1d61057b0a40dfb3ff3e6ce8cc978b46b6556c03584be6.154766b6f1566abf6ebdebd0f230cc8c','Kyle test','test','0769815243',1,'42342432423432432','1998-09-09','other','erttrest','Other','260 uys krige drive','Cape Town','7530','PRESTIGE','FIRSTRAND BANK','CHEQUE','18142376781','Kyle','test',1,NULL,0,0,1,0,'REFdc8a5a58',NULL,NULL,NULL,'2025-03-13 13:25:01',0,NULL),
(66,'kyle.oraclesystems+test1wd@gmail.com','a61bc1f6e645184a25ef12716353ddad42b09065f507e6e7ea3231b6f00212f5c5a647f29b9a630e6c72a496642065fae96d7b618f93586f5948710bd7b475f0.08e1e6ace644d6bdd129db94148faabb','Kyle test','test','0769815243',1,'42342432423432432','1998-09-09','male','test','Retail','260 uys krige drive','Cape Town','7530','MOMENTUM','FIRSTRAND BANK','CURRENT','18142376781','Kyle','test',1,NULL,0,0,1,0,'REFa2f82010',NULL,NULL,NULL,'2025-03-14 05:22:54',0,NULL),
(67,'kyle.oraclesystems+tthtest1@gmail.com','3e7b2976f432b4c4b57c7e39a5869fdc609be760b874a5a493eb8ba05f1b469f956087c01c037ef01fa3dfeb15a5cc24166e630e6acdc354c586ebce6c04d119.a185761afd75a1151adae59417c32e4e','Kyle test','test','0769815243',1,'42342432423432432','1998-04-04','male','erttrest','Education','260 uys krige drive','Cape Town','7530','PROSPER','FIRSTRAND BANK','CHEQUE','18142376781','Kyle','test',1,NULL,0,0,1,0,'REF193e21cb',NULL,NULL,NULL,'2025-03-14 05:42:00',0,NULL),
(68,'kyle.oraclesystems+tdest1@gmail.com','787c2b4ea2d6c690843ae2224483d977759a0cd6b49b610b59e60436b9c3e6516f683433b371402c5e90cc5395e8be3f9018e58e74d8597cdc2312a3f01e1a18.6bfcb12c214d6adc9d7c0564ebb68283','Kyle test','test','0769815243',1,'42342432423432432','1998-09-09','male','ertest','Mining','260 uys krige drive','Cape Town','7530','MOMENTUM','FIRSTRAND BANK','CURRENT','18142376781','Kyle','test',0,NULL,0,0,1,0,'REF7228bf62',NULL,NULL,NULL,'2025-03-14 06:13:35',0,NULL),
(69,'kyle.oraclesystems+tefefest1@gmail.com','90f560d351968609014cf255fb60e7c8c3c7de4e6058b43de7b735b9a7c5fd9b72c967b9b6cf55a89126c5a007d9d511cb41386df3abcf05ba8ff07be4714130.932e577727399fd76ca7dd27f6ec35ac','Kyle test','test','0769815243',1,'42342432423432432','1999-09-09','male','rtythstrhf','Mining','260 uys krige drive','Cape Town','7530','PROSPER','FIRSTRAND BANK','CURRENT','18142376781','Kyle','test',1,NULL,0,0,1,0,'REF8189f442',NULL,NULL,NULL,'2025-03-14 06:31:17',0,NULL),
(70,'kyle.oraclesystems+testsd1@gmail.com','34d6c5f119ecf46f6c19d26c746b7a7d37a6098b1861463ced3d647be068bf7dddf9bd576f750c757e263c13ff950b40edeca703d127a5525d2876136db4d6f8.885b7ec507c1a38d367431186e7d56e7','Kyle test','test','0769815243',1,'3455435435354354','1998-09-29','female','erttrest','Retail','260 uys krige drive','Cape Town','7530','PROSPER','FIRSTRAND BANK','CURRENT','18142376781','Kyle','test',1,NULL,0,0,1,0,'REF924fcb19',NULL,NULL,NULL,'2025-03-14 06:49:40',0,NULL),
(71,'kyle.oraclesystems+teecest1@gmail.com','aca016cfa466f9e361a89d0706f62e3c0a644e722f4215ca3183c70c836473acd0ee8a026a28784f5ac41bd7c5112b5022e5bde04a145a967f5559bea27571d5.b91e5591a7c2a3f4f9bdd78aaa57cb67','Kyle test','test','0769815243',1,'42342432423432432','1998-02-02','female','erttrest','Services','260 uys krige drive','Cape Town','7530','PROSPER','test','CHEQUE','2434141413413','Kyle','24552452',1,NULL,0,0,1,0,'REF189a3fcd',NULL,NULL,NULL,'2025-03-14 07:10:08',0,NULL),
(72,'kyle.oraclesystems+tedvdst1@gmail.com','aabad27f5ee1f45be4ddfd0c7fe9ca709820170cf53a77879876ca7d28f52dbceaf5c58a581c06fdf1aa110c530f4cca885b61d78c6bc7ddbc3653f30878417b.decd71494865c2fcf6bf1d344263c1f7','Kyle test','test','0769815243',1,'42342432423432432','1992-02-02','female','ertest','Transport','260 uys krige drive','Cape Town','7530','PROSPER','FIRSTRAND BANK','CURRENT','18142376781','Kyle','24552452',1,NULL,0,0,1,7500,'REFbf6bfe2f',NULL,NULL,NULL,'2025-03-14 07:37:16',0,NULL),
(73,'kylem+43hgg@opianfsgroup.com','$2b$10$KwHVaHkVt5J3YmHj0GsYOeoI2G1G8VO1RnYkl5tD5OXOxC3v9hOkS','Kyle test','test','0769815243',1,'3455435435354354','199818-06-06','male','erttrest','Education','260 uys krige drive','Cape Town','7530','MOMENTUM','FIRSTRAND BANK','SAVINGS','18142376781','Kyle test','24552452',1,NULL,0,0,1,0,'CUS4CC471',NULL,NULL,NULL,'2025-03-14 08:03:43',0,27),
(74,'jamiek@opianfsgroup.com','c6e9bee7212d2a23e9acc06d6460e164d223a6504e07359f7d38dc40927b3a388c2723f20a7faafdfdd76acf720e1fb8bcc58ec05386d7753a91c0442df3bcf9.86be7602f52492600d24ed910edf0ec3','Jamie','Koen','1234567',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,0,0,1,0,NULL,NULL,NULL,NULL,'2025-03-14 09:16:46',0,NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-03-14  9:26:58
