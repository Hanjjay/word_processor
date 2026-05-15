import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import { Markdown } from 'tiptap-markdown'
import './TipTapEditor.css'

/**
 * TipTapEditor
 *
 * - IME(한글/일본어/중국어) 네이티브 처리 — 끊김 없음
 * - 마크다운 단축키 항상 활성화
 *   # + 스페이스 → H1
 *   ## + 스페이스 → H2
 *   **text** → Bold
 *   *text* → Italic
 *   - + 스페이스 → 목록
 *   ``` → 코드블록
 * - 저장 포맷: 마크다운 텍스트 (DB·파일과 호환)
 *
 * props:
 *   content  — 마크다운 텍스트 (string)
 *   onChange — 내용 변경 시 마크다운 텍스트로 반환
 *   mode     — '일반' | '마크다운' | '대본' | '뮤지컬 가사'
 */
function TipTapEditor({ content, onChange, mode }) {

  const editor = useEditor({
    extensions: [
      // 기본 서식 모음
      // Bold, Italic, Strike, Code, Heading(H1-H6),
      // BulletList, OrderedList, CodeBlock, Blockquote,
      // HorizontalRule, HardBreak 포함
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        codeBlock: { languageClassPrefix: 'language-' },
      }),

      // 마크다운 입력 규칙 + 직렬화
      // # → H1, **굵게**, *기울임*, - 목록, ``` 코드블록 등
      Markdown.configure({
        html:                false,   // HTML 태그 비활성화
        tightLists:          true,
        tightListClass:      'tight',
        bulletListMarker:    '-',
        linkify:             false,
        breaks:              false,
        transformPastedText: true,    // 붙여넣기 시 마크다운 파싱
        transformCopiedText: false,
      }),

      // 타이포그래피 자동 교정
      // "..." → "…", "--" → "—" 등
      Typography,

      // 빈 에디터 플레이스홀더
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') return '제목을 입력하세요...'
          return "글을 쓰거나 '/' 를 눌러 명령어를 사용하세요..."
        },
        showOnlyCurrent: false,
      }),
    ],

    // 초기 마크다운 → ProseMirror 문서로 변환
    content: content,

    // ── IME 핵심: ProseMirror가 직접 DOM 제어
    // React state와 무관하게 타이핑 처리 → 끊김 없음
    onUpdate: ({ editor }) => {
      // ProseMirror 문서 → 마크다운 텍스트로 변환해서 부모에 전달
      const markdown = editor.storage.markdown.getMarkdown()
      onChange?.(markdown)
    },

    editorProps: {
      attributes: {
        class: `tiptap-body tiptap-mode-${mode?.replace(/\s/g, '-') ?? '일반'}`,
        spellcheck: 'false',
      },
    },
  })

  // content prop 이 외부에서 바뀔 때 에디터 갱신
  // (파일 열기, 문서 전환 등)
  useEffect(() => {
    if (!editor) return
    const current = editor.storage.markdown.getMarkdown()
    // 내용이 다를 때만 갱신 (타이핑 중 불필요한 리셋 방지)
    if (current !== content) {
      editor.commands.setContent(content, false)
    }
  }, [content, editor])

  // 모드 변경 시 CSS 클래스 업데이트
  useEffect(() => {
    if (!editor) return
    editor.setOptions({
      editorProps: {
        attributes: {
          class: `tiptap-body tiptap-mode-${mode?.replace(/\s/g, '-') ?? '일반'}`,
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
