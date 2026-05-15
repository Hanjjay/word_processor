import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../../api'
import Toolbar      from './Toolbar'
import TipTapEditor from './TipTapEditor'
import StatusBar    from './StatusBar'
import './Editor.css'

/**
 * Editor.jsx — TipTap 통합 버전
 *
 * 모드에 따라 TipTapEditor에 다른 CSS 클래스가 적용됩니다.
 * 에디터 자체는 항상 동일 — 모드는 스타일과 기능의 차이입니다.
 *
 * 일반        → 기본 폰트, 마크다운 단축키 활성
 * 마크다운    → 동일 (모드 표시만 다름)
 * 대본        → Courier New 폰트, 넓은 줄간격
 * 뮤지컬 가사 → 큰 폰트, 매우 넓은 줄간격
 */
function Editor({ docId, fileData }) {
  const [doc,       setDoc]       = useState(null)
  const [content,   setContent]   = useState('')
  const [mode,      setMode]      = useState('일반')
  const [charCount, setCharCount] = useState(0)
  const [saveState, setSaveState] = useState('저장됨')
  const [title,     setTitle]     = useState('')
  const autosaveTimer = useRef(null)

  // ── DB 문서 로드 ─────────────────────────────────────
  useEffect(() => {
    if (!docId) return
    api.document.get(docId)
      .then(res => {
        setDoc(res.data)
        setContent(res.data.content ?? '')
        setMode(res.data.mode ?? '일반')
        setTitle(res.data.title ?? '')
        setSaveState('저장됨')
        setCharCount((res.data.content ?? '').replace(/\s/g, '').length)
      })
      .catch(console.error)
  }, [docId])

  // ── 탐색기 파일 로드 ──────────────────────────────────
  useEffect(() => {
    if (!fileData) return
    setContent(fileData.content ?? '')
    setMode(fileData.mode ?? '일반')
    setTitle(fileData.filename ?? '')
    setDoc(null)
    setSaveState('파일 열기')
    setCharCount((fileData.content ?? '').replace(/\s/g, '').length)
  }, [fileData])

  // ── F3: 일반 ↔ 마크다운 토글 ─────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'F3') {
        e.preventDefault()
        setMode(p => p === '마크다운' ? '일반' : '마크다운')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ── Ctrl+S ────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [docId, doc, content, mode, title])

  // ── 내용 변경 + 자동 저장 ────────────────────────────
  const handleContentChange = useCallback((markdown) => {
    setContent(markdown)
    setSaveState('저장 안 됨')
    setCharCount(markdown.replace(/\s/g, '').length)

    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(() => {
      if (!docId) return
      api.document.autosave(docId, markdown)
        .then(() => setSaveState('저장됨'))
        .catch(console.error)
    }, 3000)
  }, [docId])

  // ── 수동 저장 ────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!docId || !doc) return
    try {
      await api.document.save(docId, title || doc.title, content, mode)
      setSaveState('저장됨')
    } catch (e) { alert(e.message) }
  }, [docId, doc, content, mode, title])

  // ── 스냅샷 ───────────────────────────────────────────
  const handleSnapshot = useCallback(async () => {
    if (!docId) return
    const memo = window.prompt('스냅샷 메모 (선택사항)') ?? ''
    try {
      await api.snapshot.take(docId, content, memo)
      alert('스냅샷이 저장되었습니다.')
    } catch (e) { alert(e.message) }
  }, [docId, content])

  // ── 미선택 상태 ──────────────────────────────────────
  if (!docId && !fileData) {
    return (
      <div className="editor-empty">
        <div className="editor-empty-inner">
          <p>왼쪽에서 문서를 선택하거나 새 문서를 만드세요</p>
          <p className="editor-empty-hint">F3 — 마크다운 모드 전환</p>
        </div>
      </div>
    )
  }

  return (
    <div className="editor-wrap">

      {/* 툴바 */}
      <Toolbar
        mode={mode}
        onModeChange={setMode}
        onSave={handleSave}
        onSnapshot={handleSnapshot}
      />

      {/* 제목 */}
      <div className="editor-title-wrap">
        <input
          className="editor-title-input"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="제목 없음"
        />
      </div>

      {/* 에디터 — TipTap 단일 컴포넌트 */}
      <div className="editor-canvas">
        <div className="a4-paper">
          <TipTapEditor
            content={content}
            onChange={handleContentChange}
            mode={mode}
          />
        </div>
      </div>

      {/* 상태 표시줄 */}
      <StatusBar charCount={charCount} mode={mode} saveState={saveState} />
    </div>
  )
}

export default Editor
