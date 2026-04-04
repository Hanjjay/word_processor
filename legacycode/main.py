import sys
from PyQt6.QtGui import QFileSystemModel
from ui.main_window import MainWindow
from PyQt6.QtWidgets import QApplication


def main():
    app = QApplication(sys.argv)
    app.setApplicationName("Roots")
    app.setOrganizationName("Roots")

    window = MainWindow()
    window.show()

    sys.exit(app.exec())


if __name__ == "__main__":
    main()
