# Copilot Instructions for Roots Word Processor

## Project Overview

**Roots** is a full-stack writing application for authors, combining a React frontend with a FastAPI backend. It manages projects, documents, snapshots (version history), and exports to Word/PDF.

## Architecture

### Backend (Python FastAPI)

- **Entry**: `backend/main.py` - Initializes FastAPI, workspace folder, and DB
- **Database**: SQLite at `backend/storage/roots.db` (initialized on startup)
- **Layers**:
  - `api/` - HTTP endpoints that map directly to feature functions
  - `features/` - Business logic (matches `api/` file names)
  - `storage/database.py` - Schema and DB connection management

**Key Convention**: Every API endpoint in `api/document.py` calls a corresponding function in `features/document.py`. Maintain this separation strictly.

### Frontend (React + Vite)

- **Entry**: `frontend/src/main.jsx`
- **Main App**: `frontend/src/App.jsx` - Layout combining Sidebar + Editor
- **API Layer**: `frontend/src/api.js` - All backend calls go through `request()` helper
- **Components**: 
  - `sidebar/` - Project/document navigation
  - `editor/` - Rich text editing with TipTap

## Data Model

**Hierarchy** (from `storage/database.py`):
```
projects
  └── sections (parent_id self-reference for infinite nesting)
      └── documents
          ├── snapshots (version history)
          ├── memos (notes)
          └── (corkboard_cards)
```

**Key Fields**:
- `document.mode` - "일반" (normal) or other modes (affects rendering)
- `document.word_count` - Auto-calculated by `count_words()`
- `snapshot.memo` - User note when snapshot created
- `projects.cover_color` - Hex color for project UI

## API Pattern

**Request/Response Format** (from `api.js`):
```javascript
// All responses: { status: "ok"|"error", data: {...}, message?: "error text" }
POST /document/save     → { doc_id, title, content, mode }
GET  /document/{id}     → returns full document object
POST /document/autosave → { doc_id, content } (content-only update)
```

**Frontend call pattern**:
```javascript
api.document.save(id, title, content, mode)  // Returns { status, data }
```

## Critical Workflows

### Starting Development
```powershell
# Terminal 1 - Backend
cd backend
python main.py

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

**Verification**: Backend http://localhost:8000, Frontend http://localhost:5173

### Adding a New Document Feature

1. Add function to `backend/features/document.py`
2. Create endpoint in `backend/api/document.py` using Pydantic models for request bodies
3. Add method to `frontend/src/api.js` using `request()` helper
4. Call from React components via `api.document.methodName()`

### Database Changes

- Schema edits go in `storage/database.py` inside the `init_db()` function
- All CREATE TABLE statements must have `IF NOT EXISTS` (app auto-initializes)
- Use `conn.executescript()` for multiple statements; remember `conn.commit()` and `conn.close()`

## Project-Specific Patterns

- **Korean UI**: All text strings, comments use Korean (한글). Maintain consistency.
- **Auto-save**: `autosave` endpoint updates only content; full `save` updates title/mode too
- **Workspace folder**: `word_processor/workspace/` stores exports and external files
- **No ORM**: Direct SQL queries with `sqlite3.Row` dict-like access
- **Error handling**: Frontend checks `res.ok` and `data.status`; backend raises `HTTPException`

## File Reference Map

| Purpose | Backend | Frontend |
|---------|---------|----------|
| Documents | `features/document.py` | `api.js` / UI components |
| Snapshots | `features/snapshot.py` | `api.js` / history UI |
| Export | `features/export.py` | `api.js` / toolbar |
| Projects | `features/project.py` | Sidebar components |
| Sections | `features/section.py` | Sidebar tree structure |

## Common Pitfalls

1. **Forgetting `conn.close()`** after DB queries → connection leak
2. **Mismatching parameter names** between API request model and feature function
3. **Not maintaining api/features separation** → architecture breaks
4. **Hardcoded `/api` paths** in frontend → use `const BASE = '/api'` in `api.js`
5. **Missing `IF NOT EXISTS`** in CREATE TABLE → duplicate table error on restart
