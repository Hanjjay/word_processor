import { useState, useEffect, useRef } from 'react'
import './MenuBar.css'

/**
 * MenuBar
 * 파일 / 편집 / 보기 / 입력 / 서식 / 검토 / 도구 / 창 / 도움말
 *
 * props:
 *   editor       — TipTap editor 인스턴스 (서식 메뉴 실행용)
 *   mode         — 현재 에디터 모드
 *   onModeChange — 모드 변경 콜백
 *   onSave       — 저장 콜백
 *   onSnapshot   — 스냅샷 콜백
 *   onExportDocx — Word 내보내기
 *   onExportPdf  — PDF 내보내기
 *   onNewDoc     — 새 문서
 *   onNewProject — 새 프로젝트
 */
function MenuBar({
  editor, mode, onModeChange,
  onSave, onSnapshot,
  onExportDocx, onExportPdf,
  onNewDoc, onNewProject,
}) {
  const [openMenu, setOpenMenu] = useState(null)
  const barRef = useRef(null)

  // 메뉴 바깥 클릭 시 닫기
  useEffect(() => {
    const handler = (e) => {
      if (barRef.current && !barRef.current.contains(e.target)) {
        setOpenMenu(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (menu) => setOpenMenu(p => p === menu ? null : menu)
  const close  = () => setOpenMenu(null)

  // 에디터 명령 실행 헬퍼
  const cmd = (fn) => {
    fn?.()
    close()
  }

  // ── 메뉴 정의 ────────────────────────────────────────
  const menus = [
    {
      id: '파일', items: [
        { label: '새 문서',      shortcut: 'Ctrl+N', action: () => cmd(onNewDoc) },
        { label: '새 프로젝트',  shortcut: '',       action: () => cmd(onNewProject) },
        { type: 'divider' },
        { label: '저장',         shortcut: 'Ctrl+S', action: () => cmd(onSave) },
        { type: 'divider' },
        { label: 'Word로 내보내기 (.docx)', shortcut: '', action: () => cmd(onExportDocx) },
        { label: 'PDF로 내보내기 (.pdf)',   shortcut: '', action: () => cmd(onExportPdf) },
      ]
    },
    {
      id: '편집', items: [
        { label: '실행 취소',   shortcut: 'Ctrl+Z',   action: () => cmd(() => editor?.commands.undo()) },
        { label: '다시 실행',   shortcut: 'Ctrl+Y',   action: () => cmd(() => editor?.commands.redo()) },
        { type: 'divider' },
        { label: '전체 선택',   shortcut: 'Ctrl+A',   action: () => cmd(() => editor?.commands.selectAll()) },
        { type: 'divider' },
        { label: '찾기',        shortcut: 'Ctrl+F',   action: () => { close(); alert('준비 중인 기능입니다.') } },
      ]
    },
    {
      id: '보기', items: [
        { label: '일반 모드',        shortcut: '',   action: () => cmd(() => onModeChange('일반')),        checked: mode === '일반' },
        { label: '마크다운 모드',    shortcut: 'F3', action: () => cmd(() => onModeChange('마크다운')),    checked: mode === '마크다운' },
        { label: '대본 모드',        shortcut: '',   action: () => cmd(() => onModeChange('대본')),        checked: mode === '대본' },
        { label: '뮤지컬 가사 모드', shortcut: '',   action: () => cmd(() => onModeChange('뮤지컬 가사')), checked: mode === '뮤지컬 가사' },
      ]
    },
    {
      id: '서식', items: [
        { label: '제목 1',   shortcut: '', action: () => cmd(() => editor?.chain().focus().toggleHeading({ level: 1 }).run()), disabled: mode !== '마크다운' },
        { label: '제목 2',   shortcut: '', action: () => cmd(() => editor?.chain().focus().toggleHeading({ level: 2 }).run()), disabled: mode !== '마크다운' },
        { label: '제목 3',   shortcut: '', action: () => cmd(() => editor?.chain().focus().toggleHeading({ level: 3 }).run()), disabled: mode !== '마크다운' },
        { type: 'divider' },
        { label: '굵게',     shortcut: 'Ctrl+B', action: () => cmd(() => editor?.chain().focus().toggleBold().run()) },
        { label: '기울임',   shortcut: 'Ctrl+I', action: () => cmd(() => editor?.chain().focus().toggleItalic().run()) },
        { label: '취소선',   shortcut: '',       action: () => cmd(() => editor?.chain().focus().toggleStrike().run()) },
        { type: 'divider' },
        { label: '인용문',   shortcut: '', action: () => cmd(() => editor?.chain().focus().toggleBlockquote().run()), disabled: mode !== '마크다운' },
        { label: '코드 블록',shortcut: '', action: () => cmd(() => editor?.chain().focus().toggleCodeBlock().run()),  disabled: mode !== '마크다운' },
        { label: '구분선',   shortcut: '', action: () => cmd(() => editor?.chain().focus().setHorizontalRule().run()),disabled: mode !== '마크다운' },
      ]
    },
    {
      id: '검토', items: [
        { label: '스냅샷 저장',  shortcut: 'Ctrl+Shift+S', action: () => cmd(onSnapshot) },
        { type: 'divider' },
        { label: '단어 수 확인', shortcut: '', action: () => { close(); alert('하단 상태 표시줄에서 확인하세요.') } },
      ]
    },
    {
      id: '도구', items: [
        { label: '설정', shortcut: '', action: () => { close(); alert('준비 중인 기능입니다.') } },
      ]
    },
    {
      id: '도움말', items: [
        {
          label: '단축키 목록', shortcut: '', action: () => {
            close()
            alert(
              '단축키 목록\n' +
              '─────────────────\n' +
              'Ctrl+S      저장\n' +
              'Ctrl+N      새 문서\n' +
              'Ctrl+Z      실행 취소\n' +
              'Ctrl+Y      다시 실행\n' +
              'F3          마크다운 모드 전환\n' +
              'Ctrl+B      굵게\n' +
              'Ctrl+I      기울임\n' +
              'Ctrl+Shift+S  스냅샷 저장'
            )
          }
        },
        { type: 'divider' },
        { label: 'Roots 정보', shortcut: '', action: () => { close(); alert('Roots v2.0\n글쓰기 프로그램') } },
      ]
    },
  ]

  return (
    <div className="menubar" ref={barRef}>
      {/* 앱 로고 */}
      <div className="menubar-logo">ROOTS</div>

      {/* 메뉴 항목들 */}
      <div className="menubar-items">
        {menus.map(menu => (
          <div key={menu.id} className="menubar-item">
            <button
              className={`menubar-btn ${openMenu === menu.id ? 'active' : ''}`}
              onClick={() => toggle(menu.id)}
            >
              {menu.id}
            </button>

            {openMenu === menu.id && (
              <div className="dropdown">
                {menu.items.map((item, idx) =>
                  item.type === 'divider' ? (
                    <div key={idx} className="dropdown-divider" />
                  ) : (
                    <button
                      key={idx}
                      className={`dropdown-item ${item.disabled ? 'disabled' : ''}`}
                      onClick={item.disabled ? undefined : item.action}
                    >
                      <span className="dropdown-label">
                        {item.checked && <span className="dropdown-check">✓ </span>}
                        {item.label}
                      </span>
                      {item.shortcut && (
                        <span className="dropdown-shortcut">{item.shortcut}</span>
                      )}
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default MenuBar
