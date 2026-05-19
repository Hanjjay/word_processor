import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import { Markdown } from 'tiptap-markdown'
import '../TipTapEditor.css'

/**
 * TipTapEditor
 *
 * 모드별 동작:
 * ─────────────────────────────────────────────────────
 * 일반 / 대본 / 뮤지컬 가사
 *   - 마크다운 입력 규칙 비활성 (# 입력해도 H1 변환 안 됨)
 *   - 순수 워드프로세서처럼 동작
 *   - Ctrl+B / Ctrl+I 단축키는 유지
 *
 * 마크다운
 *   - 마크다운 입력 규칙 활성 (# → H1, ** → Bold 등)
 *   - 붙여넣기 시 마크다운 자동 파싱
 * ─────────────────────────────────────────────────────
 */
function TipTapEditor({ content, onChange, mode }) {
  const isMarkdownMode = mode === '마크다운'

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading:   { levels: [1, 2, 3, 4] },
        codeBlock: { languageClassPrefix: 'language-' },
      }),

      // 마크다운 직렬화 — 저장 포맷 유지용 (항상 포함)
      Markdown.configure({
        html:                false,
        tightLists:          true,
        bulletListMarker:    '-',
        transformPastedText: isMarkdownMode,
        transformCopiedText: false,
      }),

      Typography,

      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') return '제목을 입력하세요...'
          return isMarkdownMode
            ? "마크다운 모드: # 제목, **굵게**, - 목록, ``` 코드"
            : '여기에 글을 쓰세요...'
        },
        showOnlyCurrent: false,
      }),
    ],

    // ★ 핵심 수정
    // enableInputRules: false → # 타이핑해도 H1으로 변환되지 않음
    // enablePasteRules: false → 붙여넣기 시 마크다운 파싱 안 됨
    enableInputRules: isMarkdownMode,
    enablePasteRules: isMarkdownMode,

    content: content,

    onUpdate: ({ editor }) => {
      const markdown = editor.storage.markdown.getMarkdown()
      onChange?.(markdown)
    },

    editorProps: {
      attributes: {
        class:      `tiptap-body tiptap-mode-${mode?.replace(/\s/g, '-') ?? '일반'}`,
        spellcheck: 'false',
      },
    },
  },
  // mode가 바뀔 때 에디터 재생성 → enableInputRules 반영됨
  [isMarkdownMode])

  // 외부 content 변경 시 갱신 (문서 전환, 파일 열기 등)
  useEffect(() => {
    if (!editor) return
    const current = editor.storage.markdown.getMarkdown()
    if (current !== content) {
      editor.commands.setContent(content, false)
    }
  }, [content, editor])

  // CSS 클래스만 업데이트 (에디터 재생성 없이)
  useEffect(() => {
    if (!editor) return
    editor.setOptions({
      editorProps: {
        attributes: {
          class:      `tiptap-body tiptap-mode-${mode?.replace(/\s/g, '-') ?? '일반'}`,
          spellcheck: 'false',
        },
      },
    })
  }, [mode, editor])

  return (
    <div className="tiptap-wrap">
      <EditorContent editor={editor} />
    </div>
  )
}

export default TipTapEditor
