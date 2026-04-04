from PyQt6.QtWidgets import QWidget, QVBoxLayout, QPushButton, QLabel
from PyQt6.QtCore import Qt, pyqtSignal
from PyQt6.QtGui import QFont


class ActivityBar(QWidget):
    """
    VS Code 맨 왼쪽의 아이콘 바.
    탭을 누르면 tab_changed 시그널을 발생시킵니다.
    """
    tab_changed = pyqtSignal(str)   # "explorer" | "memo" | "snapshot"

    def __init__(self):
        super().__init__()
        self.setFixedWidth(48)
        self.setStyleSheet("""
            QWidget {
                background-color: #333333;
                border-right: 1px solid #252526;
            }
        """)
        self._active = "explorer"
        self._buttons = {}
        self._build_ui()

    def _build_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 8, 0, 8)
        layout.setSpacing(0)
        layout.setAlignment(Qt.AlignmentFlag.AlignTop)

        tabs = [
            ("explorer",  "📁", "탐색기"),
            ("memo",      "📝", "메모"),
            ("snapshot",  "📸", "스냅샷"),
        ]

        for key, icon, tooltip in tabs:
            btn = QPushButton(icon)
            btn.setToolTip(tooltip)
            btn.setFixedSize(48, 48)
            btn.setFont(QFont("Segoe UI Emoji", 16))
            btn.setCheckable(True)
            btn.setChecked(key == self._active)
            btn.setStyleSheet(self._btn_style())
            btn.clicked.connect(lambda checked, k=key: self._on_click(k))
            layout.addWidget(btn)
            self._buttons[key] = btn

        layout.addStretch()

    def _btn_style(self):
        return """
            QPushButton {
                background-color: transparent;
                border: none;
                border-left: 2px solid transparent;
                color: #858585;
            }
            QPushButton:hover {
                color: #cccccc;
                background-color: #2a2a2a;
            }
            QPushButton:checked {
                color: #ffffff;
                border-left: 2px solid #007acc;
                background-color: #2d2d2d;
            }
        """

    def _on_click(self, key: str):
        for k, btn in self._buttons.items():
            btn.setChecked(k == key)
        self._active = key
        self.tab_changed.emit(key)
