import { useState, useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit    from '@tiptap/starter-kit'
import Placeholder   from '@tiptap/extension-placeholder'
import Typography    from '@tiptap/extension-typography'
import Collaboration from '@tiptap/extension-collaboration'
import { Markdown }  from 'tiptap-markdown'
import { api }       from '../../api'
import { starterKitConfig } from '../../lib/editorSchema'
import {
  peekYDoc, acquireYDoc, releaseYDoc, seedIfEmpty,
  claimSeeder, setLegacySeedMarkdown, takeLegacySeedMarkdown,
} from '../../lib/yjsRegistry'
import './EditorPane.css'
import './TipTapEditor.css'

/**
 * 같은 docId를 여는 모든 Pane는 yjsRegistry의 같은 Y.Doc을 공유한다 (Single
 * Source of Truth).각 Pane은 TipTap Collaboration Extension으로 그 Y.Doc에
 * 바인딩된 자신만의 EditorView를 갖는다 — 문서는 하나, 뷰는 여러 개.
 * 한쪽에서 입력하면 Yjs 트랜잭션이 공유 Y.Doc을 갱신하고, 바인딩된 다른
 * Pane의 뷰가 즉시 재렌더링된다. Cursor/Selection/Scroll은 뷰(EditorView)
 * 소유라서 자동으로 Pane별 독립 유지된다.
 */
function EditorPane({ docId, mode, onSaved, onSaveState, isFocused, onFocus }) {
  const [docTitle,  setDocTitle]  = useState('')
  const [editorKey, setEditorKey] = useState(0)
  const [saveState, setSaveState] = useState('저장됨')

  const isMarkdown = mode === '마크다운'

  // side-effect-free — safe to call every render (StrictMode double-render 포함),
  // useEditor가 항상 유효한 Y.Doc을 extensions에 넘길 수 있게 보장한다.
  // 실제 refCount 증감(acquire/release)은 아래 docId effect에서만 일어난다.
  const entry = docId ? peekYDoc(docId) : null

  const docRef          = useRef(null)
  const contentRef      = useRef('')
  const contentJsonRef  = useRef(null)   // TipTap JSON (구조 보존 저장용)
  const cursorRef       = useRef(null)
  const prevModeRef     = useRef(mode)
  const prevEntryRef    = useRef(entry) // 직전 렌더의 Y.Doc entry — 바뀌면 editor를 새 entry에 rebind
  const timerRef        = useRef(null)
  const isFocusedRef    = useRef(isFocused)

  useEffect(() => { isFocusedRef.current = isFocused }, [isFocused])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        ...starterKitConfig,
        history: false, // undo/redo는 Collaboration extension이 Y.UndoManager로 관리
      }),
      ...(entry ? [Collaboration.configure({ document: entry.ydoc })] : []),
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
    onUpdate: ({ editor }) => {
      setSaveState('저장 안 됨')
      onSaveState?.('저장 안 됨')
      window.dispatchEvent(new CustomEvent('doc-savestate', {
        detail: { docId: docRef.current?.id, state: '저장 안 됨' }
      }))

      // 공유 Y.Doc이라 모든 Pane에서 onUpdate가 뜬다 — 실제 autosave 네트워크
      // 호출은 지금 포커스된(=사용자가 입력 중인) Pane 하나만 담당한다.
      if (!isFocusedRef.current) return

      const md   = editor.storage.markdown.getMarkdown()
      const json = editor.getJSON()
      contentRef.current     = md
      contentJsonRef.current = json

      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(async () => {
        if (!docRef.current) return
        try {
          await api.document.autosave(docRef.current.id, md, json)
          setSaveState('저장됨')
          onSaveState?.('저장됨')
          window.dispatchEvent(new CustomEvent('doc-savestate', {
            detail: { docId: docRef.current?.id, state: '저장됨' }
          }))
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

  // mode 변경 (일반 ↔ 마크다운) — 내용은 Y.Doc에 남아있으므로 커서 위치만 보존하고 remount
  useEffect(() => {
    if (prevModeRef.current === mode) return
    prevModeRef.current = mode
    if (editor && !editor.isDestroyed) {
      cursorRef.current = editor.state.selection.from
    }
    setEditorKey(k => k + 1)
  }, [mode, editor])

  // 문서 전환 — docId별 공유 Y.Doc을 얻고(refcount++), 처음 여는 문서면 서버 콘텐츠로 시딩
  useEffect(() => {
    // editor가 이미 다른 entry(또는 없음)에 바인딩된 채 마운트돼 있었다면 새
    // entry로 rebind하기 위해 remount 필요. 진짜 첫 렌더라면 useEditor가 이미
    // 이번 렌더에서 계산된 entry로 바로 생성했으므로 remount 불필요.
    const previousEntry = prevEntryRef.current
    prevEntryRef.current = entry

    if (!docId) return

    if (previousEntry !== entry) {
      cursorRef.current = null
      setEditorKey(k => k + 1)
    }

    acquireYDoc(docId) // refCount++ for this pane (entry itself came from peekYDoc in render, above)

    // 이 docId를 아무도 연 적 없으면 이 Pane이 시더(seeder)가 된다.
    // await 이전에 동기적으로 claim해야 동시에 열리는 다른 Pane과 경합하지 않는다.
    const isSeeder = claimSeeder(entry)

    let cancelled = false
    api.document.get(docId)
      .then(res => {
        if (cancelled) return
        docRef.current = res.data
        setDocTitle(res.data.title ?? '')
        contentRef.current     = res.data.content ?? ''
        contentJsonRef.current = res.data.content_json ?? null
        setSaveState('저장됨')
        onSaveState?.('저장됨')

        if (isSeeder) {
          const json = res.data.content_json ?? null
          if (json) {
            seedIfEmpty(entry, json)
          } else {
            // 구버전 문서(content_json 없음): 마크다운 파싱은 실제 editor 인스턴스가
            // 필요하므로, editor가 마운트되면 그때 setContent로 1회 시딩한다.
            setLegacySeedMarkdown(entry, res.data.content ?? '')
          }
        }
      })
      .catch(err => console.error('문서 로드 실패:', err))

    return () => {
      cancelled = true
      releaseYDoc(docId)
    }
  }, [docId, entry])

  // editor remount 후: 구버전 마크다운 시딩(필요시) + 커서 위치 복원
  useEffect(() => {
    if (!editor || editor.isDestroyed || !entry) return

    const legacyMd = takeLegacySeedMarkdown(entry)
    if (legacyMd != null && entry.ydoc.getXmlFragment('default').length === 0) {
      editor.commands.setContent(legacyMd, false)
    }

    const pos = cursorRef.current
    if (pos != null) {
      setTimeout(() => {
        if (!editor || editor.isDestroyed) return
        const docSize = editor.state.doc.content.size
        editor.commands.focus()
        try { editor.commands.setTextSelection(Math.min(pos, docSize - 1)) }
        catch { editor.commands.focus('end') }
      }, 0)
    }
  }, [editor, entry])

  // 동일 docId 분할 패널 간 저장 상태 동기화
  useEffect(() => {
    const handler = (e) => {
      if (e.detail.docId && docRef.current?.id === e.detail.docId) {
        setSaveState(e.detail.state)
      }
    }
    window.addEventListener('doc-savestate', handler)
    return () => window.removeEventListener('doc-savestate', handler)
  }, [])

  // 수동 저장
  useEffect(() => {
    if (!isFocused) return
    window.__activePaneSave = async () => {
      if (!docRef.current) return
      try {
        setSaveState('저장 중...')
        onSaveState?.('저장 중...')
        await api.document.save(
          docRef.current.id,
          docRef.current.title,
          contentRef.current,
          mode,
          contentJsonRef.current,
        )
        setSaveState('저장됨')
        onSaveState?.('저장됨')
        window.dispatchEvent(new CustomEvent('doc-savestate', {
          detail: { docId: docRef.current?.id, state: '저장됨' }
        }))
        onSaved?.()
      } catch (e) {
        console.error(e)
        setSaveState('저장 실패')
        onSaveState?.('저장 실패')
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
          {saveState === '저장됨' ? '저장됨 ✓' : saveState === '저장 안 됨' ? '수정됨 ●' : saveState}
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
