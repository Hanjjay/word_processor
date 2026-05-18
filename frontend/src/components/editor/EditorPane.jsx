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
  const [editorKey, setEditorKey] = useState(0)  // 재생성 트리거

  const docRef     = useRef(null)
  const contentRef = useRef('')
  const prevMode   = useRef(mode)
  const timerRef   = useRef(null)
  const isMarkdown = mode === '마크다운'

  // ── mode 변경 → editorKey 증가 → 에디터 재생성 ────────
  useEffect(() => {
    if (prevMode.current === mode) return
    prevMode.current = mode
    // contentRef는 그대로 → 재생성된 에디터에 복원됨
    setEditorKey(k => k + 1)
  }, [mode])

  // ── TipTap 에디터 ─────────────────────────────────────
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
    enableInputRules: isMarkdown,   // 재생성 시 올바르게 적용
    enablePasteRules: isMarkdown,
    content: contentRef.current,   // 이전 내용 복원
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
  }, [editorKey])   // editorKey 바뀔 때만 재생성

  // ── 문서 로드 ──────────────────────────────────────────
  useEffect(() => {
    if (!editor || !docId) return
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

  // ── 수동 저장 등록 ─────────────────────────────────────
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