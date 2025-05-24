-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: May 13, 2025 at 09:56 AM
-- Server version: 8.3.0
-- PHP Version: 8.2.18

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `insighted`
--

-- --------------------------------------------------------

--
-- Table structure for table `processed_files`
--

DROP TABLE IF EXISTS `processed_files`;
CREATE TABLE IF NOT EXISTS `processed_files` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `date_processed` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`)
) ENGINE=MyISAM AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `processed_files`
--

INSERT INTO `processed_files` (`id`, `user_id`, `file_name`, `date_processed`) VALUES
(1, 2, 'sample-1.csv', '2025-05-11 23:30:45'),
(2, 2, 'students_sample_v2-3.csv', '2025-05-12 04:28:09'),
(3, 2, 'students_sample_v2-3.csv', '2025-05-12 05:23:19'),
(4, 2, 'students_sample_v2-3.csv', '2025-05-12 05:24:51'),
(5, 2, 'students_sample_v2-3.csv', '2025-05-12 05:49:33'),
(6, 2, 'students_sample_v2-3.csv', '2025-05-12 18:05:34'),
(7, 2, 'students_sample_v2-3.csv', '2025-05-12 18:59:09'),
(8, 4, 'sample-1.csv', '2025-05-12 20:27:24');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) DEFAULT NULL,
  `email` varchar(191) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `role` varchar(50) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=MyISAM AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `created_at`) VALUES
(1, 'Teacher A', 'teachera@example.com', '$2b$12$INDHi7Kna1VFjzSRjDF7n.MPfKzf27xPg39oDv7IIiotkLA.mnStK', 'teacher', '2025-05-12 00:06:38'),
(2, 'Aiza Grace Fronteras', 'agfronteras@usep.edu.ph', '$2b$12$TYBMNHI7qSYiaiky4XJ0LuP4ynBMlY8jBf78amQU5E.WXJ2zZA8Kq', 'teacher', '2025-05-12 00:06:38'),
(3, 'Prince Girk Adlawan', 'pgsadlawan00110@usep.edu.ph', '$2b$12$8TVZUKMrm3gIO75SbFvygea0uaizKy16X5Xjzqr9HXClc/Zw2mScO', 'admin', '2025-05-12 00:06:38'),
(4, 'Gabriel Cimafranca', 'gcimafranca@usep.edu.ph', '$2b$12$vBbOjfh0DyGvRELWpjFM/OlA.8HDg3i23l583vrjMiVjHYzzLr9XW', 'teacher', '2025-05-12 20:26:53');
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
