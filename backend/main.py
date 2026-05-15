import sys
import os
from pathlib import Path

# backend/ 폴더를 모듈 경로에 등록
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# workspace 폴더: backend/ 바로 옆에 위치
# 예) word_processor/workspace/
WORKSPACE_DIR = Path(__file__).parent.parent / "workspace"
WORKSPACE_DIR.mkdir(exist_ok=True)   # 없으면 자동 생성

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import document, snapshot, export, explorer, memo
from storage.database import init_db

app = FastAPI(title="Roots API", version="0.1.0")


# ── 앱 시작 시 DB + workspace 초기화 ─────────────────
@app.on_event("startup")
def startup():
    init_db()
    print(f"✅ DB 초기화 완료")
    print(f"📁 workspace 경로: {WORKSPACE_DIR}")


# ── CORS 설정 ─────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 라우터 등록 ───────────────────────────────────────
app.include_router(document.router,  prefix="/document",  tags=["문서"])
app.include_router(snapshot.router,  prefix="/snapshot",  tags=["스냅샷"])
app.include_router(export.router,    prefix="/export",    tags=["내보내기"])
app.include_router(explorer.router,  prefix="/explorer",  tags=["파일 트리"])
app.include_router(memo.router,      prefix="/memo",      tags=["메모"])


@app.get("/")
def root():
    return {"status": "ok", "message": "Roots API 실행 중"}


# ── workspace 경로 반환 (프론트엔드에서 초기 폴더 설정용) ──
@app.get("/workspace")
def get_workspace():
    return {"status": "ok", "data": {"path": str(WORKSPACE_DIR)}}


# ── 직접 실행 시 ──────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="localhost", port=8000, reload=True)