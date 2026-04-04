import sys
import os

# 현재 파일 위치를 경로에 추가 (어느 폴더에서 실행해도 동작)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from PyQt6.QtWidgets import QApplication
from PyQt6.QtGui import QFont
from ui.main_window import MainWindow


def main():
    app = QApplication(sys.argv)

    # 기본 폰트 설정
    app.setFont(QFont("맑은 고딕", 10))
    app.setApplicationName("Roots")

    window = MainWindow()
    window.show()

    sys.exit(app.exec())


if __name__ == "__main__":
    main()
