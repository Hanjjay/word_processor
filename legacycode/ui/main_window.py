import os
from PyQt6.QtGui import QFileSystemModel
from PyQt6.QtWidgets import (
    QMainWindow, QWidget, QHBoxLayout, QVBoxLayout,
    QSplitter, QLabel
)
from PyQt6.QtCore import Qt
from PyQt6.QtGui import QAction, QKeySequence

from ui.editor_panel import EditorPanel
from ui.memo_panel import MemoPanel
from ui.pomodoro_widget import PomodoroWidget
from ui.file_tree import FileTree
from ui.activity_bar import ActivityBar
from core.autosave import AutoSave
from storage.db import Database


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Roots")
        self.resize(1400, 900)
        self.setMinimumSize(900, 600)
        self.setStyleSheet("QMainWindow { background-color: #1e1e1e; }")

        self.db = Database()
        self.db.init()

        self._build_ui()
        self._build_menu()
        self._build_statusbar()

        self.autosave = AutoSave(self.editor_panel, self.db)
        self.autosave.saved.connect(lambda: self.save_label.setText("저장됨"))
        self.autosave.start()

    # ── UI 구성 ──────────────────────────────────────────

    def _build_ui(self):
        central = QWidget()
        self.setCentralWidget(central)

        root = QHBoxLayout(central)
        root.setContentsMargins(0, 0, 0, 0)
        root.setSpacing(0)

        # 1. 액티비티 바 (맨 왼쪽 아이콘 열)
        self.activity_bar = ActivityBar()
        self.activity_bar.tab_changed.connect(self._on_activity_tab)
        root.addWidget(self.activity_bar)

        # 2. 파일 트리 사이드바
        self.file_tree = FileTree()
        self.file_tree.file_opened.connect(self._on_file_opened)
        self.file_tree.setFixedWidth(240)
        root.addWidget(self.file_tree)

        # 3. 에디터 + 메모 분할
        right_splitter = QSplitter(Qt.Orientation.Horizontal)
        right_splitter.setHandleWidth(1)
        right_splitter.setStyleSheet("QSplitter::handle { background: #3c3c3c; }")

        # 에디터 컨테이너
        editor_wrap = QWidget()
        editor_wrap.setStyleSheet("background-color: #1e1e1e;")
        ew_layout = QVBoxLayout(editor_wrap)
        ew_layout.setContentsMargins(0, 0, 0, 0)
        ew_layout.setSpacing(0)

        self.pomodoro = PomodoroWidget()
        ew_layout.addWidget(self.pomodoro)

        self.editor_panel = EditorPanel()
        ew_layout.addWidget(self.editor_panel)

        self.memo_panel = MemoPanel()
        self.memo_panel.setVisible(False)

        right_splitter.addWidget(editor_wrap)
        right_splitter.addWidget(self.memo_panel)
        right_splitter.setSizes([1000, 300])

        root.addWidget(right_splitter)

        # 글자 수 실시간 연결
        self.editor_panel.editor.textChanged.connect(self._update_statusbar)

    # ── 메뉴 ─────────────────────────────────────────────

    def _build_menu(self):
        mb = self.menuBar()
        mb.setStyleSheet("""
            QMenuBar {
                background-color: #2d2d2d;
                color: #cccccc;
                border-bottom: 1px solid #3c3c3c;
                padding: 2px 0;
            }
            QMenuBar::item:selected { background-color: #3c3c3c; }
            QMenu {
                background-color: #252526;
                color: #cccccc;
                border: 1px solid #454545;
            }
            QMenu::item:selected { background-color: #094771; }
        """)

        fm = mb.addMenu("파일")
        self._act(fm, "새 문서",       "Ctrl+N",       self.editor_panel.new_document)
        self._act(fm, "폴더 열기...",  "Ctrl+K",       self.file_tree.open_folder)
        self._act(fm, "파일 열기...",  "Ctrl+O",       self.editor_panel.open_document)
        self._act(fm, "저장",          "Ctrl+S",       self.editor_panel.save_document)
        fm.addSeparator()
        self._act(fm, ".docx 내보내기", None,          self.editor_panel.export_docx)
        self._act(fm, ".pdf 내보내기",  None,          self.editor_panel.export_pdf)

        vm = mb.addMenu("보기")
        self._act(vm, "메모 패널 토글", "Ctrl+Shift+M", self._toggle_memo)
        self._act(vm, "사이드바 토글",  "Ctrl+B",       self._toggle_sidebar)

        sm = mb.addMenu("스냅샷")
        self._act(sm, "스냅샷 찍기",  "Ctrl+Shift+S", self.editor_panel.take_snapshot)
        self._act(sm, "스냅샷 목록",  None,           self.editor_panel.show_snapshots)

    def _act(self, menu, label, shortcut, slot):
        a = QAction(label, self)
        if shortcut:
            a.setShortcut(QKeySequence(shortcut))
        a.triggered.connect(slot)
        menu.addAction(a)

    # ── 상태 표시줄 ───────────────────────────────────────

    def _build_statusbar(self):
        sb = self.statusBar()
        sb.setStyleSheet("""
            QStatusBar {
                background-color: #007acc;
                color: white;
                font-size: 12px;
                padding: 0 8px;
            }
        """)
        self.word_count_label = QLabel("글자 수: 0  /  단어: 0")
        self.save_label = QLabel("저장됨")
        self.mode_label = QLabel("일반")
        sb.addWidget(self.word_count_label)
        sb.addPermanentWidget(self.mode_label)
        sb.addPermanentWidget(self.save_label)

        self.editor_panel.mode_changed.connect(self.mode_label.setText)

    # ── 슬롯 ─────────────────────────────────────────────

    def _on_activity_tab(self, tab: str):
        self.file_tree.setVisible(tab == "explorer")
        if tab == "memo":
            self.memo_panel.setVisible(True)

    def _on_file_opened(self, path: str):
        self.editor_panel.open_file(path)
        self.setWindowTitle(f"Roots — {os.path.basename(path)}")

    def _toggle_memo(self):
        self.memo_panel.setVisible(not self.memo_panel.isVisible())

    def _toggle_sidebar(self):
        self.file_tree.setVisible(not self.file_tree.isVisible())

    def _update_statusbar(self):
        text = self.editor_panel.editor.toPlainText()
        chars = len(text.replace(" ", "").replace("\n", ""))
        words = len(text.split())
        self.word_count_label.setText(f"글자 수: {chars:,}  /  단어: {words:,}")
        self.save_label.setText("저장 안 됨")

    def closeEvent(self, event):
        self.autosave.stop()
        event.accept()
