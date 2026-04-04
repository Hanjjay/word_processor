from PyQt6.QtWidgets import QWidget, QHBoxLayout, QLabel, QPushButton
from PyQt6.QtCore import QTimer, Qt


class PomodoroWidget(QWidget):
    """
    상단 바에 붙는 뽀모도로 타이머.
    기본값: 집중 25분 / 휴식 5분
    """
    FOCUS_MINUTES = 25
    BREAK_MINUTES = 5

    def __init__(self):
        super().__init__()
        self.setFixedHeight(44)
        self.setStyleSheet("background-color: #f0ede8; border-bottom: 1px solid #ddd;")

        self._remaining = self.FOCUS_MINUTES * 60
        self._is_running = False
        self._is_focus = True   # True = 집중, False = 휴식
        self._cycle = 0

        self._build_ui()

        self._timer = QTimer()
        self._timer.setInterval(1000)
        self._timer.timeout.connect(self._tick)

    def _build_ui(self):
        layout = QHBoxLayout(self)
        layout.setContentsMargins(12, 0, 12, 0)

        self.mode_label = QLabel("집중")
        self.mode_label.setStyleSheet("font-weight: bold; color: #c0392b;")

        self.time_label = QLabel(self._format_time(self._remaining))
        self.time_label.setStyleSheet("font-size: 18px; font-weight: bold; min-width: 60px;")
        self.time_label.setAlignment(Qt.AlignmentFlag.AlignCenter)

        self.start_btn = QPushButton("시작")
        self.start_btn.setFixedWidth(60)
        self.start_btn.clicked.connect(self._toggle)

        self.reset_btn = QPushButton("리셋")
        self.reset_btn.setFixedWidth(60)
        self.reset_btn.clicked.connect(self._reset)

        self.cycle_label = QLabel("0 사이클")
        self.cycle_label.setStyleSheet("color: #888; font-size: 12px;")

        layout.addWidget(self.mode_label)
        layout.addSpacing(8)
        layout.addWidget(self.time_label)
        layout.addSpacing(8)
        layout.addWidget(self.start_btn)
        layout.addWidget(self.reset_btn)
        layout.addSpacing(16)
        layout.addWidget(self.cycle_label)
        layout.addStretch()

    def _toggle(self):
        if self._is_running:
            self._timer.stop()
            self._is_running = False
            self.start_btn.setText("재개")
        else:
            self._timer.start()
            self._is_running = True
            self.start_btn.setText("일시정지")

    def _reset(self):
        self._timer.stop()
        self._is_running = False
        self._is_focus = True
        self._remaining = self.FOCUS_MINUTES * 60
        self._update_display()
        self.start_btn.setText("시작")

    def _tick(self):
        self._remaining -= 1
        self._update_display()

        if self._remaining <= 0:
            self._switch_mode()

    def _switch_mode(self):
        self._timer.stop()
        self._is_running = False
        self.start_btn.setText("시작")

        if self._is_focus:
            # 집중 → 휴식
            self._cycle += 1
            self._is_focus = False
            self._remaining = self.BREAK_MINUTES * 60
            self.mode_label.setText("휴식")
            self.mode_label.setStyleSheet("font-weight: bold; color: #27ae60;")
            self.cycle_label.setText(f"{self._cycle} 사이클")
        else:
            # 휴식 → 집중
            self._is_focus = True
            self._remaining = self.FOCUS_MINUTES * 60
            self.mode_label.setText("집중")
            self.mode_label.setStyleSheet("font-weight: bold; color: #c0392b;")

        self._update_display()

    def _update_display(self):
        self.time_label.setText(self._format_time(self._remaining))

    @staticmethod
    def _format_time(seconds: int) -> str:
        m, s = divmod(seconds, 60)
        return f"{m:02d}:{s:02d}"
