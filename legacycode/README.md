# Roots — 글쓰기 프로그램 (MVP)

## 빠른 시작

### 1. 의존성 설치
```bash
pip install -r requirements.txt
```

### 2. 실행
```bash
python main.py
```

---

## 폴더 구조

```
roots/
├── main.py                  # 앱 진입점
├── requirements.txt         # 패키지 목록
│
├── ui/                      # 화면 담당
│   ├── main_window.py       # 메인 창, 분할 화면, 메뉴
│   ├── editor_panel.py      # 글쓰기 에디터 (핵심)
│   ├── memo_panel.py        # 메모 · 리마인더
│   └── pomodoro_widget.py   # 뽀모도로 타이머
│
├── core/                    # 비즈니스 로직
│   ├── document.py          # 문서 데이터 모델
│   ├── snapshot.py          # 스냅샷 · diff
│   └── autosave.py          # 3초마다 자동 저장
│
├── storage/
│   └── db.py                # SQLite (~/Documents/Roots/roots.db)
│
└── export/
    ├── to_docx.py           # Word 내보내기
    └── to_pdf.py            # PDF 내보내기
```

---

## 현재 구현된 기능 (1단계 MVP)

- [x] 글쓰기 에디터 (Rich Text)
- [x] 모드 전환: 일반 / 마크다운 / 대본 / 뮤지컬 가사
- [x] 볼드 · 이탤릭 · 밑줄 서식
- [x] 글꼴 크기 변경
- [x] 분할 화면 (에디터 + 메모 패널)
- [x] 메모 패널 (메모 작성 · 저장 · 삭제)
- [x] 뽀모도로 타이머 (25분 집중 / 5분 휴식)
- [x] 글자 수 실시간 표시
- [x] 스냅샷 찍기 · 목록 보기 · diff
- [x] 3초마다 자동 저장 (SQLite)
- [x] .txt / .md 파일 열기 · 저장
- [x] .docx 열기 / 내보내기
- [x] .pdf 내보내기

## 다음 단계 (2단계)

- [ ] 코르크보드 (카드 드래그앤드롭)
- [ ] 스냅샷 diff 뷰어 다이얼로그
- [ ] 마크다운 문법 강조 (QSyntaxHighlighter)
- [ ] 웹/모바일 프리뷰 패널
- [ ] 단계별 아카이빙 (프로젝트 폴더 구조)
- [ ] HWP 읽기 지원

## 배포 (exe 파일로 만들기)

```bash
pyinstaller --windowed --name Roots main.py
```
빌드 후 `dist/Roots/` 폴더에 실행 파일이 생깁니다.
