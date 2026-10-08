-- ========================================================
-- Smart Store Safety & Operations Intelligence Database Schema
-- Target: MySQL 8.0+
-- ========================================================

CREATE DATABASE IF NOT EXISTS smart_store_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE smart_store_db;

-- 1. Cameras Table
CREATE TABLE IF NOT EXISTS cameras (
    camera_id VARCHAR(50) PRIMARY KEY,
    camera_name VARCHAR(100) NOT NULL,
    location VARCHAR(255),
    stream_source VARCHAR(500),
    status VARCHAR(30) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Zones Table
CREATE TABLE IF NOT EXISTS zones (
    zone_id VARCHAR(50) PRIMARY KEY,
    zone_name VARCHAR(100) NOT NULL,
    zone_type VARCHAR(50) NOT NULL,
    camera_id VARCHAR(50),
    description VARCHAR(255),
    FOREIGN KEY (camera_id)
        REFERENCES cameras(camera_id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Events Table
CREATE TABLE IF NOT EXISTS events (
    event_id VARCHAR(50) PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    camera_id VARCHAR(50) NOT NULL,
    zone_id VARCHAR(50),
    track_id VARCHAR(50),
    timestamp DATETIME NOT NULL,
    severity VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    description TEXT,
    people_count INT,
    details JSON,
    resolved_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (camera_id)
        REFERENCES cameras(camera_id)
        ON DELETE CASCADE,
    FOREIGN KEY (zone_id)
        REFERENCES zones(zone_id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Event History (Lifecycle audit log)
CREATE TABLE IF NOT EXISTS event_history (
    history_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id VARCHAR(50) NOT NULL,
    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    changed_by VARCHAR(100) DEFAULT 'SYSTEM',
    FOREIGN KEY (event_id)
        REFERENCES events(event_id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Indexes for High-Performance Queries
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_camera ON events(camera_id);
CREATE INDEX IF NOT EXISTS idx_events_zone ON events(zone_id);
CREATE INDEX IF NOT EXISTS idx_events_severity ON events(severity);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_history_event_id ON event_history(event_id);
