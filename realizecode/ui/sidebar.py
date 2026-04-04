import os
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout,
    QLabel, QPushButton, QTreeView, QFileDialog
)
# ★ PyQt6에서 QFileSystemModel은 QtGui 소속
from PyQt6.QtGui import QFileSystemModel
from PyQt6.QtCore import Qt, QDir, QModelIndex, pyqtSignal


class Sidebar(QWidget):
    """
    VS Code 탐색기 패널.
    - 폴더 열기 버튼 / 메뉴로 폴더 선택
    - 선택된 폴더의 파일·폴더를 트리로 표시
    - 파일 더블클릭 → file_selected 시그널 발생
    """
    file_selected = pyqtSignal(str)   # 열 파일의 전체 경로

    def __init__(self):
        super().__init__()
        self.setMinimumWidth(180)
        self.setMaximumWidth(400)
        self.setStyleSheet("""
            QWidget {
                background-color: #252526;
                color: #cccccc; 
            }
        """)
        self._build()

    # ── UI ───────────────────────────────────────────────

    def _build(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)

        # 상단 헤더
        layout.addWidget(self._header())

        # 폴더 이름 표시줄
        self.folder_label = QLabel("  폴더를 열어주세요")
        self.folder_label.setStyleSheet("""
            QLabel {
                color: #888888;
                font-size: 11px;
                font-weight: bold;
                letter-spacing: 0.5px;
                padding: 5px 12px;
                background-color: #252526;
                border-bottom: 1px solid #3c3c3c;
            }
        """)
        layout.addWidget(self.folder_label)

        # 파일 트리
        layout.addWidget(self._tree())

        # 하단 버튼
        open_btn = QPushButton("폴더 열기...")
        open_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        open_btn.setStyleSheet("""
            QPushButton {
                background-color: #0e639c;
                color: white;
                border: none;
                padding: 8px 0;
                font-size: 13px;
            }
            QPushButton:hover {
                background-color: #1177bb;
            }
        """)
        open_btn.clicked.connect(self.open_folder)
        layout.addWidget(open_btn)

    def _header(self):
        header = QWidget()
        header.setFixedHeight(36)
        header.setStyleSheet("""
            QWidget {
                background-color: #252526;
                border-bottom: 1px solid #3c3c3c;
            }
        """)
        row = QHBoxLayout(header)
        row.setContentsMargins(12, 0, 8, 0)

        title = QLabel("탐색기")
        title.setStyleSheet("""
            color: #bbbbbb;
            font-size: 11px;
            font-weight: bold;
            letter-spacing: 1px;
        """)
        row.addWidget(title)
        row.addStretch()

        btn = QPushButton("＋")
        btn.setToolTip("폴더 열기")
        btn.setFixedSize(22, 22)
        btn.setCursor(Qt.CursorShape.PointingHandCursor)
        btn.setStyleSheet("""
            QPushButton {
                background: transparent;
                color: #888888;
                border: none;
                font-size: 15px;
            }
            QPushButton:hover { color: #cccccc; }
        """)
        btn.clicked.connect(self.open_folder)
        row.addWidget(btn)
        return header

    def _tree(self):
        # 파일시스템 모델
        self.model = QFileSystemModel()
        self.model.setRootPath("")
        self.model.setFilter(
            QDir.Filter.AllEntries | QDir.Filter.NoDotAndDotDot
        )

        # 트리 뷰
        self.tree = QTreeView()
        self.tree.setModel(self.model)
        self.tree.setHeaderHidden(True)

        # 이름 열만 표시
        for col in range(1, self.model.columnCount()):
            self.tree.hideColumn(col)

        self.tree.setAnimated(True)
        self.tree.setIndentation(16)
        self.tree.setStyleSheet("""
            QTreeView {
                background-color: #252526;
                color: #cccccc;
                border: none;
                font-size: 13px;
                outline: none;
            }
            QTreeView::item {
                height: 24px;
                padding-left: 4px;
            }
            QTreeView::item:hover {
                background-color: #2a2d2e;
            }
            QTreeView::item:selected {
                background-color: #094771;
                color: #ffffff;
            }
            QTreeView::branch {
                background-color: #252526;
            }
        """)

        self.tree.doubleClicked.connect(self._on_double_click)
        return self.tree

    # ── 슬롯 ─────────────────────────────────────────────

    def open_folder(self):
        """폴더 선택 다이얼로그"""
        path = QFileDialog.getExistingDirectory(self, "폴더 열기", "")
        if not path:
            return
        idx = self.model.setRootPath(path)
        self.tree.setRootIndex(idx)
        name = os.path.basename(path).upper() or path
        self.folder_label.setText(f"  {name}")
        self.folder_label.setStyleSheet("""
            QLabel {
                color: #cccccc;
                font-size: 11px;
                font-weight: bold;
                letter-spacing: 0.5px;
                padding: 5px 12px;
                background-color: #252526;
                border-bottom: 1px solid #3c3c3c;
            }
        """)

    def _on_double_click(self, index: QModelIndex): 
        path = self.model.filePath(index)
        if os.path.isfile(path):
            self.file_selected.emit(path)
