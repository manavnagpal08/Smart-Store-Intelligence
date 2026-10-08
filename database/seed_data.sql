-- Seed Data for Smart Store Database

USE smart_store_db;

-- Cameras
INSERT INTO cameras (camera_id, camera_name, location, stream_source, status) VALUES
('CAM-01', 'Main Store Overhead CCTV', 'Main Floor Ceiling', 'datasets/sample/sample_cctv.mp4', 'ACTIVE'),
('CAM-02', 'Checkout Lane Monitor', 'Front Registers', 'rtsp://store-cam-02.local/stream', 'ACTIVE'),
('CAM-03', 'Backroom Storage Security', 'Storage Corridor', 'rtsp://store-cam-03.local/stream', 'ACTIVE'),
('CAM-04', 'Store Entrance Exterior', 'Entrance Vestibule', 'rtsp://store-cam-04.local/stream', 'INACTIVE')
ON DUPLICATE KEY UPDATE camera_name=VALUES(camera_name);

-- Zones
INSERT INTO zones (zone_id, zone_name, zone_type, camera_id, description) VALUES
('ENTRANCE', 'Store Entrance Area', 'ENTRANCE', 'CAM-01', 'Customer entry point and foyer'),
('AISLE-A', 'Aisle A (Groceries)', 'AISLE', 'CAM-01', 'High-traffic grocery dry goods aisle'),
('AISLE-B', 'Aisle B (Beverages)', 'AISLE', 'CAM-01', 'Beverages and cold storage aisle'),
('CHECKOUT-01', 'Checkout Lane 1', 'CHECKOUT', 'CAM-01', 'Primary cashier register lane'),
('CHECKOUT-02', 'Checkout Lane 2', 'CHECKOUT', 'CAM-01', 'Secondary register lane'),
('RESTRICTED', 'Staff Only Storage', 'RESTRICTED', 'CAM-01', 'Authorized staff inventory and electrical room')
ON DUPLICATE KEY UPDATE zone_name=VALUES(zone_name);
