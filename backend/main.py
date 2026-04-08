import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import document, snapshot, export, explorer, memo
from storage.database import init_db

app = FastAPI(title="Roots API", version="0.1.0")


# ── 앱 시작 시 DB 초기화 ──────────────────────────────
@app.on_event("startup")
def startup():
    init_db()
    print("✅ DB 초기화 완료")

# ── CORS 설정 ─────────────────────────────────────────
# React(localhost:5173)에서 FastAPI(localhost:8000)로
# 요청할 때 브라우저가 막지 않도록 허용
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


# ── 직접 실행 시 ──────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="localhost", port=8000, reload=True)