from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QListWidget, QTextEdit,
    QPushButton, QHBoxLayout, QListWidgetItem, QLabel
)
from PyQt6.QtCore import Qt
from datetime import datetime


class MemoPanel(QWidget):
    """
    오른쪽 사이드 패널: 메모 + 리마인더
    """
    def __init__(self):
        super().__init__()
        self.setMinimumWidth(280)
        self.setMaximumWidth(500)
        self.setStyleSheet("background-color: #f8f6f0; border-left: 1px solid #ddd;")

        self.memos = []  # {"id", "title", "content", "timestamp"}
        self._build_ui()

    def _build_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(12, 12, 12, 12)
        layout.setSpacing(8)

        # 헤더
        header = QLabel("메모")
        header.setStyleSheet("font-size: 16px; font-weight: bold; color: #333;")
        layout.addWidget(header)

        # 새 메모 버튼
        new_btn = QPushButton("+ 새 메모")
        new_btn.setStyleSheet("""
            QPushButton {
                background: #5b4fcf;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 6px 12px;
                font-size: 13px;
            }
            QPushButton:hover { background: #4a3fb5; }
        """)
        new_btn.clicked.connect(self._new_memo)
        layout.addWidget(new_btn)

        # 메모 목록
        self.memo_list = QListWidget()
        self.memo_list.setStyleSheet("""
            QListWidget {
                border: 1px solid #ddd;
                border-radius: 6px;
                background: white;
            }
            QListWidget::item {
                padding: 8px;
                border-bottom: 1px solid #f0f0f0;
            }
            QListWidget::item:selected {
                background: #eeeaff;
                color: #333;
            }
        """)
        self.memo_list.itemClicked.connect(self._load_memo)
        layout.addWidget(self.memo_list)

        # 메모 편집 영역
        self.memo_editor = QTextEdit()
        self.memo_editor.setPlaceholderText("메모 내용...")
        self.memo_editor.setMaximumHeight(200)
        self.memo_editor.setStyleSheet("""
            QTextEdit {
                border: 1px solid #ddd;
                border-radius: 6px;
                padding: 8px;
                background: white;
                font-size: 13px;
            }
        """)
        layout.addWidget(self.memo_editor)

        # 저장 / 삭제 버튼
        btn_row = QHBoxLayout()

        save_btn = QPushButton("저장")
        save_btn.clicked.connect(self._save_memo)
        save_btn.setStyleSheet("padding: 4px 12px; border-radius: 4px;")

        delete_btn = QPushButton("삭제")
        delete_btn.clicked.connect(self._delete_memo)
        delete_btn.setStyleSheet("padding: 4px 12px; border-radius: 4px; color: #c0392b;")

        btn_row.addWidget(save_btn)
        btn_row.addWidget(delete_btn)
        layout.addLayout(btn_row)

    # ── 메모 CRUD ────────────────────────────────────────

    def _new_memo(self):
        self.memo_list.clearSelection()
        self.memo_editor.clear()
        self.memo_editor.setFocus()

    def _save_memo(self):
        content = self.memo_editor.toPlainText().strip()
        if not content:
            return

        # 첫 줄을 제목으로
        title = content.split("\n")[0][:30]
        timestamp = datetime.now().strftime("%m/%d %H:%M")

        selected = self.memo_list.currentRow()

        if selected >= 0:
            # 기존 메모 수정
            self.memos[selected]["content"] = content
            self.memos[selected]["title"] = title
            self.memo_list.item(selected).setText(f"{title}\n{timestamp}")
        else:
            # 새 메모 추가
            memo = {
                "id": len(self.memos),
                "title": title,
                "content": content,
                "timestamp": timestamp
            }
            self.memos.append(memo)
            item = QListWidgetItem(f"{title}\n{timestamp}")
            self.memo_list.addItem(item)

    def _load_memo(self, item: QListWidgetItem):
        idx = self.memo_list.row(item)
        self.memo_editor.setPlainText(self.memos[idx]["content"])

    def _delete_memo(self):
        selected = self.memo_list.currentRow()
        if selected < 0:
            return
        self.memo_list.takeItem(selected)
        self.memos.pop(selected)
        self.memo_editor.clear()
