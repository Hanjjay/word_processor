"""
main.py — Roots FastAPI 서버 진입점 v2
"""
import sys
import os
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

WORKSPACE_DIR = Path(__file__).parent.parent / "workspace"
WORKSPACE_DIR.mkdir(exist_ok=True)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import document, snapshot, export, explorer, memo
from api import project, section          # ← v2 신규
from storage.database import init_db

app = FastAPI(title="Roots API", version="2.0.0")

# ── CORS ────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 시작 시 DB 초기화 ────────────────────────────────────
@app.on_event("startup")
def startup():
    init_db()
    print(f"📁 workspace: {WORKSPACE_DIR}")

# ── 라우터 등록 ──────────────────────────────────────────
app.include_router(project.router,   prefix="/project",   tags=["프로젝트"])
app.include_router(section.router,   prefix="/section",   tags=["섹션"])
app.include_router(document.router,  prefix="/document",  tags=["문서"])
app.include_router(snapshot.router,  prefix="/snapshot",  tags=["스냅샷"])
app.include_router(export.router,    prefix="/export",    tags=["내보내기"])
app.include_router(explorer.router,  prefix="/explorer",  tags=["파일 트리"])
app.include_router(memo.router,      prefix="/memo",      tags=["메모"])

@app.get("/")
def root():
    return {"status": "ok", "version": "2.0.0"}

@app.get("/workspace")
def get_workspace():
    return {"status": "ok", "data": {"path": str(WORKSPACE_DIR)}}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="localhost", port=8000, reload=True)
