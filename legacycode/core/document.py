from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class Document:
    """
    열려 있는 문서 하나를 나타냅니다.
    에디터 패널이 이 객체를 들고 있습니다.
    """
    doc_id: int = 0          # DB의 documents 테이블 ID (0 = 아직 미저장)
    title: str = "제목 없음"
    path: str = ""           # 파일 시스템 경로 (있을 경우)
    mode: str = "일반"       # 일반 / 마크다운 / 대본 / 뮤지컬 가사
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)

    def touch(self):
        """수정 시간 갱신"""
        self.updated_at = datetime.now()

    def is_saved(self) -> bool:
        return self.doc_id > 0 or bool(self.path)
