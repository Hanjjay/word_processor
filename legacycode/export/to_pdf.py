def export_to_pdf(html_content: str, output_path: str) -> None:
    """
    에디터의 HTML을 PDF로 저장합니다.
    pip install weasyprint 필요.
    """
    try:
        from weasyprint import HTML, CSS
    except ImportError:
        raise ImportError("weasyprint가 설치되지 않았습니다.\n터미널에서: pip install weasyprint")

    # 기본 CSS 스타일 (A4, 한국어 폰트)
    css = CSS(string="""
        @page {
            size: A4;
            margin: 2.5cm 3cm;
        }
        body {
            font-family: 'Malgun Gothic', 'NanumGothic', sans-serif;
            font-size: 11pt;
            line-height: 1.8;
            color: #1a1a1a;
        }
        h1 { font-size: 20pt; margin-top: 1.5em; }
        h2 { font-size: 16pt; margin-top: 1.2em; }
        h3 { font-size: 13pt; margin-top: 1em; }
        p  { margin: 0.4em 0; }
    """)

    # Qt의 toHtml()은 완전한 HTML 문서를 반환하므로 바로 사용
    HTML(string=html_content).write_pdf(output_path, stylesheets=[css])
