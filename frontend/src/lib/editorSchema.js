import { getSchema } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'

// Shared with EditorPane's live editor so the headless schema used for
// seeding a Y.Doc always matches the schema the editor actually renders.
// Typography/Placeholder/Markdown add no schema nodes/marks, so StarterKit
// alone is sufficient to reconstruct the document schema.
export const starterKitConfig = {
  heading:   { levels: [1, 2, 3, 4] },
  codeBlock: { languageClassPrefix: 'language-' },
}

let cachedSchema = null

export function getDocSchema() {
  if (!cachedSchema) {
    cachedSchema = getSchema([StarterKit.configure(starterKitConfig)])
  }
  return cachedSchema
}
