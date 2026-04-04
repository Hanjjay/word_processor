import os
from PyQt6.QtWidgets import (
    QMainWindow, QWidget, QHBoxLayout,
    QSplitter, QLabel, QStatusBar
)
from PyQt6.QtCore import Qt
from PyQt6.QtGui import QAction, QKeySequence

from ui.sidebar import Sidebar
from ui.editor import EditorPanel


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Roots")
        self.resize(1300, 860)
        self.setMinimumSize(800, 500)

        # 전체 다크 배경
        self.setStyleSheet("""
            QMainWindow {
                background-color: #1e1e1e;
            }
            QMenuBar {
                background-color: #2d2d2d;
                color: #cccccc;
                padding: 2px 0;
                border-bottom: 1px solid #3c3c3c;
            }
            QMenuBar::item:selected {
                background-color: #3c3c3c;
            }
            QMenu {
                background-color: #252526;
                color: #cccccc;
                border: 1px solid #454545;
            }
            QMenu::item:selected {
                background-color: #094771;
            }
            QStatusBar {
                background-color: #007acc;
                color: white;
                font-size: 12px;
            }
        """)

        self._init_ui()
        self._init_menu()
        self._init_statusbar()

    # ── 레이아웃 ─────────────────────────────────────────

    def _init_ui(self):
        central = QWidget()
        self.setCentralWidget(central)

        layout = QHBoxLayout(central)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)

        # 왼쪽: 사이드바 (파일 트리)
        self.sidebar = Sidebar()
        self.sidebar.file_selected.connect(self._open_file)

        # 오른쪽: 에디터
        self.editor = EditorPanel()

        # 분할선
        splitter = QSplitter(Qt.Orientation.Horizontal)
        splitter.setHandleWidth(1)
        splitter.setStyleSheet("""
            QSplitter::handle {
                background-color: #3c3c3c;
            }
        """)
        splitter.addWidget(self.sidebar)
        splitter.addWidget(self.editor)
        splitter.setSizes([220, 1080])      # 사이드바 220px / 나머지 에디터
        splitter.setCollapsible(0, False)   # 사이드바 완전 접힘 방지

        layout.addWidget(splitter)

    # ── 메뉴 ─────────────────────────────────────────────

    def _init_menu(self):
        mb = self.menuBar()

        # 파일 메뉴
        file_menu = mb.addMenu("파일")
        self._add(file_menu, "새 문서",        "Ctrl+N", self.editor.new_doc)
        self._add(file_menu, "폴더 열기...",   "Ctrl+K", self.sidebar.open_folder)
        self._add(file_menu, "파일 열기...",   "Ctrl+O", self.editor.open_doc)
        self._add(file_menu, "저장",           "Ctrl+S", self.editor.save_doc)
        file_menu.addSeparator()
        self._add(file_menu, "Word로 내보내기 (.docx)", None, self.editor.export_docx)
        self._add(file_menu, "PDF로 내보내기  (.pdf)",  None, self.editor.export_pdf)

        # 보기 메뉴
        view_menu = mb.addMenu("보기")
        self._add(view_menu, "사이드바 숨기기/보이기", "Ctrl+B", self._toggle_sidebar)

    def _add(self, menu, label, shortcut, slot):
        action = QAction(label, self)
        if shortcut:
            action.setShortcut(QKeySequence(shortcut))
        action.triggered.connect(slot)
        menu.addAction(action)

    # ── 상태 표시줄 ───────────────────────────────────────

    def _init_statusbar(self):
        self.char_label  = QLabel("  글자 수: 0")
        self.save_label  = QLabel("저장됨  ")
        self.mode_label  = QLabel("일반  ")

        sb = self.statusBar()
        sb.addWidget(self.char_label)
        sb.addPermanentWidget(self.mode_label)
        sb.addPermanentWidget(self.save_label)

        # 에디터에서 텍스트 바뀔 때마다 글자 수 갱신
        self.editor.text_edit.textChanged.connect(self._update_count)
        self.editor.mode_changed.connect(self.mode_label.setText)
        self.editor.saved.connect(lambda: self.save_label.setText("저장됨  "))
        self.editor.text_edit.textChanged.connect(
            lambda: self.save_label.setText("저장 안 됨  ")
        )

    # ── 슬롯 ─────────────────────────────────────────────

    def _open_file(self, path: str):
        """사이드바에서 파일 클릭 시"""
        self.editor.load_file(path)
        self.setWindowTitle(f"Roots  —  {os.path.basename(path)}")

    def _toggle_sidebar(self):
        self.sidebar.setVisible(not self.sidebar.isVisible())

    def _update_count(self):
        text  = self.editor.text_edit.toPlainText()
        chars = len(text.replace(" ", "").replace("\n", ""))
        self.char_label.setText(f"  글자 수: {chars:,}")
