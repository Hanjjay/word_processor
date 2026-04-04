from PyQt6.QtCore import QThread, pyqtSignal
import time


class AutoSave(QThread):
    """
    별도 스레드에서 3초마다 실행.
    에디터 내용을 DB에 저장합니다.
    UI가 멈추지 않도록 QThread를 사용합니다.
    """
    saved = pyqtSignal()   # 저장 완료 시 시그널 발생

    INTERVAL_SECONDS = 3

    def __init__(self, editor_panel, db):
        super().__init__()
        self.editor_panel = editor_panel
        self.db = db
        self._running = False
        self._last_content = ""

    def run(self):
        """스레드 실행 루프"""
        self._running = True
        while self._running:
            time.sleep(self.INTERVAL_SECONDS)
            if self._running:
                self._do_save()

    def _do_save(self):
        """실제 저장 로직 — 내용이 바뀌었을 때만 저장"""
        try:
            content = self.editor_panel.get_content()
            if content == self._last_content:
                return  # 변경 없으면 스킵

            doc_id = self.editor_panel.get_document_id()
            self.db.save_document(doc_id, content)
            self._last_content = content
            self.saved.emit()

        except Exception as e:
            # 자동 저장 오류는 무시 (사용자 방해 금지)
            print(f"[AutoSave] 오류: {e}")

    def stop(self):
        """스레드 중단"""
        self._running = False
        self.wait()
