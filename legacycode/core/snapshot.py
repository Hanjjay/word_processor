import difflib
from datetime import datetime
from typing import List, Dict


class SnapshotManager:
    """
    문서의 특정 시점을 저장하고 diff를 계산합니다.
    1단계에서는 메모리에 보관, 2단계에서 SQLite 연동 예정.
    """
    def __init__(self):
        self._snapshots: List[Dict] = []
        self._counter = 0

    def take(self, content: str) -> int:
        """현재 내용을 스냅샷으로 저장하고 ID 반환"""
        self._counter += 1
        snap = {
            "id": self._counter,
            "content": content,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        self._snapshots.append(snap)
        return self._counter

    def list_all(self) -> List[Dict]:
        """모든 스냅샷 목록 반환 (내용 제외)"""
        return [
            {"id": s["id"], "timestamp": s["timestamp"]}
            for s in self._snapshots
        ]

    def get(self, snap_id: int) -> Dict | None:
        """ID로 스냅샷 조회"""
        for s in self._snapshots:
            if s["id"] == snap_id:
                return s
        return None

    def diff(self, snap_id_a: int, snap_id_b: int) -> str:
        """
        두 스냅샷 사이의 차이를 unified diff 형식으로 반환.
        변경된 줄에 +/-가 붙어 한눈에 확인 가능.
        """
        a = self.get(snap_id_a)
        b = self.get(snap_id_b)

        if not a or not b:
            return "스냅샷을 찾을 수 없습니다."

        lines_a = a["content"].splitlines(keepends=True)
        lines_b = b["content"].splitlines(keepends=True)

        diff = difflib.unified_diff(
            lines_a, lines_b,
            fromfile=f"스냅샷 #{snap_id_a}",
            tofile=f"스냅샷 #{snap_id_b}",
        )
        return "".join(diff) or "차이 없음"

    def restore(self, snap_id: int) -> str | None:
        """스냅샷 내용을 반환 (에디터에 복원할 때 사용)"""
        snap = self.get(snap_id)
        return snap["content"] if snap else None
