-- ============================================================
-- ProTrade Database Dump
-- Import vào phpMyAdmin: Database > Import > Chọn file này
-- ============================================================

CREATE DATABASE IF NOT EXISTS `protrade` 
  DEFAULT CHARACTER SET utf8mb4 
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `protrade`;

-- ── Bảng users ──────────────────────────────────────────────
DROP TABLE IF EXISTS `trades`;
DROP TABLE IF EXISTS `sessions`;
DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `fullName` varchar(100) DEFAULT NULL,
  `role` enum('user','admin') DEFAULT 'user',
  `liveBalance` decimal(15,2) DEFAULT 0.00,
  `isActive` tinyint(1) DEFAULT 1,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Bảng sessions ───────────────────────────────────────────
CREATE TABLE `sessions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `startTime` datetime NOT NULL,
  `endTime` datetime DEFAULT NULL,
  `status` enum('open','locked','settled') DEFAULT 'open',
  `outcome` enum('up','down') DEFAULT NULL,
  `outcomeMode` enum('force_up','force_down','random') DEFAULT 'random',
  `totalCallAmount` decimal(15,2) DEFAULT 0.00,
  `totalPutAmount` decimal(15,2) DEFAULT 0.00,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Bảng trades ─────────────────────────────────────────────
CREATE TABLE `trades` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) NOT NULL,
  `sessionId` int(11) NOT NULL,
  `type` enum('call','put') NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `result` enum('win','lose','pending') DEFAULT 'pending',
  `profit` decimal(15,2) DEFAULT 0.00,
  `payoutRate` decimal(5,2) DEFAULT 0.85,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  KEY `sessionId` (`sessionId`),
  CONSTRAINT `trades_userId` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `trades_sessionId` FOREIGN KEY (`sessionId`) REFERENCES `sessions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- DỮ LIỆU ẢO
-- Mật khẩu admin: admin123
-- Mật khẩu users: user123
-- (đã hash bằng bcrypt rounds=10)
-- ============================================================

INSERT INTO `users` (`email`, `password`, `fullName`, `role`, `liveBalance`, `isActive`, `createdAt`, `updatedAt`) VALUES
('admin@protrade.com',     '$2b$10$yJtgqiKOcIwLtrGYHGOALuzFYzQlborb.p9fZtEnqz5jZJWKwZaMmW', 'Quản Trị Viên',  'admin', 0.00,    1, NOW(), NOW()),
('nguyen.van.a@gmail.com', '$2b$10$yJtgqiKOcIwLtrGYHGOALuzFYzQlborb.p9fZtEnqz5jZJWKwZaMmW', 'Nguyễn Văn A',   'user',  500.00,  1, NOW(), NOW()),
('tran.thi.b@gmail.com',   '$2b$10$yJtgqiKOcIwLtrGYHGOALuzFYzQlborb.p9fZtEnqz5jZJWKwZaMmW', 'Trần Thị B',     'user',  1200.00, 1, NOW(), NOW()),
('le.van.c@gmail.com',     '$2b$10$yJtgqiKOcIwLtrGYHGOALuzFYzQlborb.p9fZtEnqz5jZJWKwZaMmW', 'Lê Văn C',       'user',  0.00,    1, NOW(), NOW()),
('pham.thi.d@gmail.com',   '$2b$10$yJtgqiKOcIwLtrGYHGOALuzFYzQlborb.p9fZtEnqz5jZJWKwZaMmW', 'Phạm Thị D',     'user',  2500.00, 1, NOW(), NOW()),
('hoang.van.e@gmail.com',  '$2b$10$yJtgqiKOcIwLtrGYHGOALuzFYzQlborb.p9fZtEnqz5jZJWKwZaMmW', 'Hoàng Văn E',    'user',  0.00,    1, NOW(), NOW());

-- Sessions lịch sử
INSERT INTO `sessions` (`startTime`, `endTime`, `status`, `outcome`, `outcomeMode`, `totalCallAmount`, `totalPutAmount`, `createdAt`, `updatedAt`) VALUES
(DATE_SUB(NOW(), INTERVAL 10 MINUTE), DATE_SUB(NOW(), INTERVAL 9 MINUTE),  'settled', 'up',   'random',    350.00, 200.00, DATE_SUB(NOW(), INTERVAL 10 MINUTE), NOW()),
(DATE_SUB(NOW(), INTERVAL 9 MINUTE),  DATE_SUB(NOW(), INTERVAL 8 MINUTE),  'settled', 'down', 'random',    100.00, 400.00, DATE_SUB(NOW(), INTERVAL 9 MINUTE),  NOW()),
(DATE_SUB(NOW(), INTERVAL 8 MINUTE),  DATE_SUB(NOW(), INTERVAL 7 MINUTE),  'settled', 'up',   'force_up',  500.00, 150.00, DATE_SUB(NOW(), INTERVAL 8 MINUTE),  NOW()),
(DATE_SUB(NOW(), INTERVAL 7 MINUTE),  DATE_SUB(NOW(), INTERVAL 6 MINUTE),  'settled', 'down', 'force_down',200.00, 600.00, DATE_SUB(NOW(), INTERVAL 7 MINUTE),  NOW()),
(DATE_SUB(NOW(), INTERVAL 6 MINUTE),  DATE_SUB(NOW(), INTERVAL 5 MINUTE),  'settled', 'up',   'random',    450.00, 250.00, DATE_SUB(NOW(), INTERVAL 6 MINUTE),  NOW()),
(DATE_SUB(NOW(), INTERVAL 5 MINUTE),  DATE_SUB(NOW(), INTERVAL 4 MINUTE),  'settled', 'up',   'random',    300.00, 100.00, DATE_SUB(NOW(), INTERVAL 5 MINUTE),  NOW()),
(DATE_SUB(NOW(), INTERVAL 4 MINUTE),  DATE_SUB(NOW(), INTERVAL 3 MINUTE),  'settled', 'down', 'random',    150.00, 350.00, DATE_SUB(NOW(), INTERVAL 4 MINUTE),  NOW()),
(DATE_SUB(NOW(), INTERVAL 3 MINUTE),  DATE_SUB(NOW(), INTERVAL 2 MINUTE),  'settled', 'up',   'force_up',  400.00, 200.00, DATE_SUB(NOW(), INTERVAL 3 MINUTE),  NOW()),
(DATE_SUB(NOW(), INTERVAL 2 MINUTE),  DATE_SUB(NOW(), INTERVAL 1 MINUTE),  'settled', 'down', 'random',    250.00, 500.00, DATE_SUB(NOW(), INTERVAL 2 MINUTE),  NOW()),
(DATE_SUB(NOW(), INTERVAL 1 MINUTE),  NOW(),                               'settled', 'up',   'random',    600.00, 300.00, DATE_SUB(NOW(), INTERVAL 1 MINUTE),  NOW());

-- Trades lịch sử (userid 2, 3, 4 trên session 1-10)
INSERT INTO `trades` (`userId`, `sessionId`, `type`, `amount`, `result`, `profit`, `payoutRate`, `createdAt`, `updatedAt`) VALUES
(2, 1, 'call', 100.00, 'win',  85.00,   0.85, DATE_SUB(NOW(), INTERVAL 10 MINUTE), NOW()),
(3, 1, 'put',  50.00,  'lose', -50.00,  0.85, DATE_SUB(NOW(), INTERVAL 10 MINUTE), NOW()),
(4, 1, 'call', 200.00, 'win',  170.00,  0.85, DATE_SUB(NOW(), INTERVAL 10 MINUTE), NOW()),
(2, 2, 'put',  100.00, 'win',  85.00,   0.85, DATE_SUB(NOW(), INTERVAL 9 MINUTE),  NOW()),
(3, 2, 'call', 100.00, 'lose', -100.00, 0.85, DATE_SUB(NOW(), INTERVAL 9 MINUTE),  NOW()),
(4, 2, 'put',  200.00, 'win',  170.00,  0.85, DATE_SUB(NOW(), INTERVAL 9 MINUTE),  NOW()),
(2, 3, 'call', 500.00, 'win',  425.00,  0.85, DATE_SUB(NOW(), INTERVAL 8 MINUTE),  NOW()),
(3, 3, 'call', 50.00,  'win',  42.50,   0.85, DATE_SUB(NOW(), INTERVAL 8 MINUTE),  NOW()),
(5, 3, 'put',  100.00, 'lose', -100.00, 0.85, DATE_SUB(NOW(), INTERVAL 8 MINUTE),  NOW()),
(2, 4, 'put',  200.00, 'win',  170.00,  0.85, DATE_SUB(NOW(), INTERVAL 7 MINUTE),  NOW()),
(3, 4, 'call', 100.00, 'lose', -100.00, 0.85, DATE_SUB(NOW(), INTERVAL 7 MINUTE),  NOW()),
(4, 4, 'put',  50.00,  'win',  42.50,   0.85, DATE_SUB(NOW(), INTERVAL 7 MINUTE),  NOW()),
(2, 5, 'call', 100.00, 'win',  85.00,   0.85, DATE_SUB(NOW(), INTERVAL 6 MINUTE),  NOW()),
(5, 5, 'call', 200.00, 'win',  170.00,  0.85, DATE_SUB(NOW(), INTERVAL 6 MINUTE),  NOW()),
(6, 5, 'put',  100.00, 'lose', -100.00, 0.85, DATE_SUB(NOW(), INTERVAL 6 MINUTE),  NOW()),
(2, 6, 'call', 50.00,  'win',  42.50,   0.85, DATE_SUB(NOW(), INTERVAL 5 MINUTE),  NOW()),
(3, 6, 'put',  100.00, 'lose', -100.00, 0.85, DATE_SUB(NOW(), INTERVAL 5 MINUTE),  NOW()),
(4, 7, 'put',  200.00, 'win',  170.00,  0.85, DATE_SUB(NOW(), INTERVAL 4 MINUTE),  NOW()),
(5, 7, 'call', 100.00, 'lose', -100.00, 0.85, DATE_SUB(NOW(), INTERVAL 4 MINUTE),  NOW()),
(2, 8, 'call', 500.00, 'win',  425.00,  0.85, DATE_SUB(NOW(), INTERVAL 3 MINUTE),  NOW());
