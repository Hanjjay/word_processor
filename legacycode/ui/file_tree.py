import os
from PyQt6.QtGui import QFileSystemModel
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QLabel, QTreeView,
    QFileDialog, QPushButton, QHBoxLayout
)
from PyQt6.QtCore import Qt, pyqtSignal, QDir, QModelIndex
from PyQt6.QtGui import QFont


class FileTree(QWidget):
    """
    VS Code 탐색기 패널.
    폴더를 열면 하위 파일/폴더를 트리로 표시.
    파일을 더블클릭하면 file_opened 시그널 발생.
    """
    file_opened = pyqtSignal(str)   # 열린 파일의 전체 경로

    def __init__(self):
        super().__init__()
        self.setStyleSheet("""
            QWidget {
                background-color: #252526;
                color: #cccccc;
                border-right: 1px solid #3c3c3c;
            }
        """)
        self._root_path = ""
        self._build_ui()

    def _build_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)

        # 헤더 (탐색기 레이블 + 폴더 열기 버튼)
        header = QWidget()
        header.setFixedHeight(36)
        header.setStyleSheet("background-color: #252526; border-bottom: 1px solid #3c3c3c;")
        h_layout = QHBoxLayout(header)
        h_layout.setContentsMargins(12, 0, 8, 0)

        title = QLabel("탐색기")
        title.setStyleSheet("color: #bbbbbb; font-size: 11px; font-weight: bold; letter-spacing: 1px;")
        h_layout.addWidget(title)
        h_layout.addStretch()

        open_btn = QPushButton("⊞")
        open_btn.setToolTip("폴더 열기")
        open_btn.setFixedSize(24, 24)
        open_btn.setStyleSheet("""
            QPushButton {
                background: transparent;
                color: #888;
                border: none;
                font-size: 16px;
            }
            QPushButton:hover { color: #ccc; }
        """)
        open_btn.clicked.connect(self.open_folder)
        h_layout.addWidget(open_btn)

        layout.addWidget(header)

        # 폴더 이름 표시줄
        self.folder_label = QLabel("  폴더를 열어주세요")
        self.folder_label.setStyleSheet("""
            QLabel {
                color: #888;
                font-size: 11px;
                padding: 6px 12px;
                background-color: #252526;
                border-bottom: 1px solid #3c3c3c;
            }
        """)
        layout.addWidget(self.folder_label)

        # 파일 시스템 모델
        self.model = QFileSystemModel()
        self.model.setRootPath("")
        self.model.setFilter(QDir.Filter.AllEntries | QDir.Filter.NoDotAndDotDot)

        # 트리 뷰
        self.tree = QTreeView()
        self.tree.setModel(self.model)
        self.tree.setHeaderHidden(True)

        # 이름 열만 표시 (크기·타입·날짜 숨김)
        for col in range(1, 4):
            self.tree.hideColumn(col)

        self.tree.setStyleSheet("""
            QTreeView {
                background-color: #252526;
                color: #cccccc;
                border: none;
                font-size: 13px;
            }
            QTreeView::item {
                padding: 2px 0;
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
            QTreeView::branch:has-siblings:!adjoins-item {
                border-image: none;
            }
        """)

        self.tree.doubleClicked.connect(self._on_double_click)
        layout.addWidget(self.tree)

        # 하단 버튼 (폴더 열기)
        open_folder_btn = QPushButton("폴더 열기...")
        open_folder_btn.setStyleSheet("""
            QPushButton {
                background-color: #0e639c;
                color: white;
                border: none;
                padding: 8px;
                font-size: 13px;
            }
            QPushButton:hover { background-color: #1177bb; }
        """)
        open_folder_btn.clicked.connect(self.open_folder)
        layout.addWidget(open_folder_btn)

    def open_folder(self):
        """폴더 선택 다이얼로그"""
        path = QFileDialog.getExistingDirectory(self, "폴더 열기", "")
        if not path:
            return
        self._root_path = path
        index = self.model.setRootPath(path)
        self.tree.setRootIndex(index)
        folder_name = os.path.basename(path).upper()
        self.folder_label.setText(f"  {folder_name}")
        self.folder_label.setStyleSheet("""
            QLabel {
                color: #cccccc;
                font-size: 11px;
                font-weight: bold;
                padding: 6px 12px;
                background-color: #252526;
                border-bottom: 1px solid #3c3c3c;
                letter-spacing: 0.5px;
            }
        """)

    def _on_double_click(self, index: QModelIndex):
        path = self.model.filePath(index)
        if os.path.isfile(path):
            self.file_opened.emit(path)
