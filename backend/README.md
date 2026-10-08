# Smart Store Backend (FastAPI + SQLAlchemy + MySQL)

FastAPI REST API server for the Smart Store Safety & Operations Intelligence System.

## Architecture

```
HTTP Request
     │
     ▼
FastAPI Routes (/api/events, /api/cameras, /api/zones)
     │
     ▼
Service Layer (EventService, CameraService, ZoneService)
     │
     ├──► Java OOP Validation Service (com.smartstore.Main)
     │
     ▼
SQLAlchemy ORM
     │
     ▼
MySQL Database (with SQLite fallback for development)
```

## Running the Server

```bash
# Run server using uvicorn
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

## API Documentation

Once the server is running:
- **Interactive Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc Documentation**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)
