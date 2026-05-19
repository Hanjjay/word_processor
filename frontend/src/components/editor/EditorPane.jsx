import { useState, useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit   from '@tiptap/starter-kit'
import Placeholder  from '@tiptap/extension-placeholder'
import Typography   from '@tiptap/extension-typography'
import { Markdown } from 'tiptap-markdown'
import { api }      from '../../api'
import './EditorPane.css'
import './TipTapEditor.css'

function EditorPane({ docId, mode, onSaved, isFocused, onFocus }) {
  const [saveState, setSaveState] = useState('저장됨')
  const [docTitle,  setDocTitle]  = useState('')
  const [editorKey, setEditorKey] = useState(0)

  const docRef          = useRef(null)
  const contentRef      = useRef('')      // 마크다운 문자열 (DB 저장용)
  const jsonRef         = useRef(null)    // ★ TipTap JSON 상태 (모드 전환 복원용)
  const cursorRef       = useRef(null)    // ★ 커서 위치 (포커스 복원용)
  const prevMode        = useRef(mode)
  const timerRef        = useRef(null)
  const isModeSwitching = useRef(false)

  const isMarkdown = mode === '마크다운'

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading:   { levels: [1, 2, 3, 4] },
        codeBlock: { languageClassPrefix: 'language-' },
      }),
      Markdown.configure({
        html:                false,
        tightLists:          true,
        bulletListMarker:    '-',
        transformPastedText: isMarkdown,
        transformCopiedText: false,
      }),
      Typography,
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') return '제목을 입력하세요...'
          return isMarkdown
            ? "마크다운: # 제목  **굵게**  - 목록  ``` 코드"
            : '여기에 글을 쓰세요...'
        },
        showOnlyCurrent: false,
      }),
    ],
    enableInputRules: isMarkdown,
    enablePasteRules: isMarkdown,
    content: jsonRef.current || contentRef.current || '',
    onUpdate: ({ editor }) => {
      const md = editor.storage.markdown.getMarkdown()
      contentRef.current = md
      setSaveState('저장 안 됨')
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(async () => {
        if (!docRef.current) return
        try {
          await api.document.autosave(docRef.current.id, md)
          setSaveState('저장됨')
          onSaved?.()
        } catch (e) { console.error(e) }
      }, 3000)
    },
    onFocus: () => onFocus?.(),
    editorProps: {
      attributes: {
        class:      `tiptap-body tiptap-mode-${(mode ?? '일반').replace(/\s/g, '-')}`,
        spellcheck: 'false',
      },
    },
  }, [editorKey])

  // ── mode 변경 ─────────────────────────────────────────
  useEffect(() => {
    if (prevMode.current === mode) return
    prevMode.current = mode

    if (editor && !editor.isDestroyed) {
      // ★ 마크다운(DB용) + JSON(빈줄 보존용) 동시 저장
      contentRef.current = editor.storage.markdown.getMarkdown()
      jsonRef.current    = editor.getJSON()

      // ★ 현재 커서 위치 저장 (포커스 복원용)
      const { from } = editor.state.selection
      cursorRef.current = from
    }

    isModeSwitching.current = true
    setEditorKey(k => k + 1)
  }, [mode, editor])

  // ── 문서 로드 ─────────────────────────────────────────
  useEffect(() => {
    if (!editor || !docId) return

    // ★ 모드 전환으로 인한 editor 재생성 → DB 로드 건너뜀
    if (isModeSwitching.current) {
      isModeSwitching.current = false

      // ★ JSON으로 복원 (빈줄·서식 구조 완벽 보존)
      if (jsonRef.current) {
        editor.commands.setContent(jsonRef.current, false)
        jsonRef.current = null
      } else {
        editor.commands.setContent(contentRef.current, false)
      }

      // ★ 커서 위치 복원 + 포커스
      setTimeout(() => {
        if (!editor || editor.isDestroyed) return
        const docSize = editor.state.doc.content.size
        const pos     = Math.min(cursorRef.current ?? 0, docSize - 1)
        editor.commands.focus()
        try {
          editor.commands.setTextSelection(pos)
        } catch {
          editor.commands.focus('end')
        }
      }, 0)

      return
    }

    // 진짜 문서 전환 → DB 로드
    jsonRef.current    = null
    cursorRef.current  = null
    api.document.get(docId)
      .then(res => {
        docRef.current     = res.data
        const c            = res.data.content ?? ''
        contentRef.current = c
        setDocTitle(res.data.title ?? '')
        setSaveState('저장됨')
        editor.commands.setContent(c, false)
      })
      .catch(err => console.error('문서 로드 실패:', err))
  }, [docId, editor])

  // ── 수동 저장 ─────────────────────────────────────────
  useEffect(() => {
    if (!isFocused) return
    window.__activePaneSave = async () => {
      if (!docRef.current) return
      try {
        setSaveState('저장 중...')
        await api.document.save(
          docRef.current.id,
          docRef.current.title,
          contentRef.current,
          mode,
        )
        setSaveState('저장됨')
        onSaved?.()
      } catch (e) {
        console.error(e)
        setSaveState('저장 실패')
      }
    }
  }, [isFocused, mode, onSaved])

  if (!docId) {
    return (
      <div className="epane-empty">
        <p>문서를 선택하거나 여기로 드롭하세요</p>
      </div>
    )
  }

  return (
    <div className={`epane ${isFocused ? 'focused' : ''}`} onClick={onFocus}>
      <div className="epane-header">
        <span className="epane-title">{docTitle || '제목 없음'}</span>
        <span className={`epane-save ${saveState === '저장됨' ? 'saved' : 'unsaved'}`}>
          {saveState}
        </span>
      </div>
      <div className="epane-canvas">
        <div className="a4-paper">
          <div className="tiptap-wrap">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default EditorPane
