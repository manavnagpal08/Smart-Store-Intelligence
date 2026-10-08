# Smart Store Database (MySQL 8.0+)

This directory contains the relational database schema, indexes, migrations, and seed data for the Smart Store Safety & Operations Intelligence System.

## Schema Architecture

```
cameras (camera_id, camera_name, location, stream_source, status, created_at)
   ▲               ▲
   │               │
   │ (camera_id)   │ (camera_id)
   │               │
zones (zone_id, zone_name, zone_type, camera_id, description)
   ▲
   │ (zone_id)
   │
events (event_id, event_type, camera_id, zone_id, track_id, timestamp, severity, status, description, people_count, details, resolved_at, created_at, updated_at)
   ▲
   │ (event_id)
   │
event_history (history_id, event_id, old_status, new_status, changed_at, changed_by)
```

## Setup Instructions

1. **Log in to MySQL**:
   ```bash
   mysql -u root -p
   ```

2. **Execute Schema and Seed Data**:
   ```bash
   mysql -u root -p < database/schemas/schema.sql
   mysql -u root -p < database/seed_data.sql
   ```

3. **Configure Connection**:
   Copy `.env.example` to `.env` and set your MySQL credentials:
   ```env
   DATABASE_URL=mysql+pymysql://root:password@localhost:3306/smart_store_db
   ```
