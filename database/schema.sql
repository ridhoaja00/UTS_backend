-- MySQL 8.0+ / MariaDB 10.6+, InnoDB, amounts in whole rupiah.
CREATE TABLE IF NOT EXISTS users (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(100) NOT NULL, email VARCHAR(190) NOT NULL UNIQUE,
 phone VARCHAR(20) NOT NULL, password_hash VARCHAR(255) NOT NULL,
 role ENUM('tenant','admin') NOT NULL DEFAULT 'tenant', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS sessions (
 token_hash CHAR(64) PRIMARY KEY, user_id BIGINT UNSIGNED NOT NULL,
 csrf_token CHAR(64) NOT NULL, expires_at DATETIME NOT NULL,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE, INDEX(expires_at)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS rooms (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, name VARCHAR(120) NOT NULL,
 number VARCHAR(20) NOT NULL UNIQUE, type ENUM('Standar','Deluxe','Suite') NOT NULL,
 price INT UNSIGNED NOT NULL, size INT UNSIGNED NOT NULL,
 description TEXT NOT NULL, facilities JSON NOT NULL,
 image VARCHAR(255) NOT NULL DEFAULT '/images/room-standard.svg',
 status ENUM('available','maintenance','hidden') NOT NULL DEFAULT 'available',
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS bookings (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, code VARCHAR(30) NOT NULL UNIQUE,
 user_id BIGINT UNSIGNED NOT NULL, room_id BIGINT UNSIGNED NOT NULL,
 start_date DATE NOT NULL, end_date DATE NOT NULL, monthly_price INT UNSIGNED NOT NULL,
 status ENUM('pending','active','checkout_requested','completed','cancelled','expired') NOT NULL DEFAULT 'pending',
 expires_at DATETIME NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id), FOREIGN KEY(room_id) REFERENCES rooms(id),
 INDEX(room_id,status), INDEX(user_id,status)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS invoices (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, booking_id BIGINT UNSIGNED NOT NULL,
 kind ENUM('booking','renewal') NOT NULL, months INT UNSIGNED NOT NULL,
 period_start DATE NOT NULL, period_end DATE NOT NULL, amount INT UNSIGNED NOT NULL,
 status ENUM('unpaid','submitted','paid','void') NOT NULL DEFAULT 'unpaid',
 proof_file VARCHAR(100) NULL, proof_mime VARCHAR(30) NULL,
 review_note VARCHAR(500) NULL, reviewed_by BIGINT UNSIGNED NULL,
 paid_at DATETIME NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(booking_id) REFERENCES bookings(id), FOREIGN KEY(reviewed_by) REFERENCES users(id),
 INDEX(booking_id,status)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS complaints (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, booking_id BIGINT UNSIGNED NOT NULL,
 user_id BIGINT UNSIGNED NOT NULL, category ENUM('Listrik & Air','Fasilitas','Kebersihan','Keamanan','Lainnya') NOT NULL,
 title VARCHAR(120) NOT NULL, description TEXT NOT NULL,
 status ENUM('open','in_progress','resolved') NOT NULL DEFAULT 'open',
 reply TEXT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY(booking_id) REFERENCES bookings(id), FOREIGN KEY(user_id) REFERENCES users(id), INDEX(user_id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS expenses (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, description VARCHAR(200) NOT NULL,
 amount INT UNSIGNED NOT NULL, expense_date DATE NOT NULL,
 created_by BIGINT UNSIGNED NOT NULL, FOREIGN KEY(created_by) REFERENCES users(id)
) ENGINE=InnoDB;
