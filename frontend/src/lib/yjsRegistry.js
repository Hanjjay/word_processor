import * as Y from 'yjs'
import { prosemirrorJSONToYXmlFragment } from '@tiptap/y-tiptap'
import { getDocSchema } from './editorSchema'

/**
 * docId -> shared Y.Doc registry.
 *
 * Single source of truth for a document's content: every EditorPane showing
 * the same docId binds TipTap's Collaboration extension to the same Y.Doc
 * instance, so edits made through ProseMirror's transaction/sync plugin are
 * visible to every bound view immediately (no network, no manual broadcast).
 *
 * Refcounted so the Y.Doc is created on first open and destroyed once the
 * last pane showing it closes. Destroy is deferred a tick so React
 * StrictMode's mount/unmount/mount and rapid pane open/close churn don't
 * tear down a Y.Doc that's about to be reacquired.
 *
 * Later multi-user collab (y-websocket/y-webrtc) attaches here: give an
 * entry a `provider` field created alongside its Y.Doc.
 */

const registry = new Map()
const DESTROY_GRACE_MS = 0

function createEntry() {
  return {
    ydoc: new Y.Doc(),
    refCount: 0,
    loaded: false,       // initial server content has been seeded into this Y.Doc
    pendingDestroy: null,
  }
}

/**
 * Get (creating if needed) the entry for a docId without touching refCount.
 * Pure/idempotent enough to call during render (e.g. so useEditor's
 * extensions array always has a real Y.Doc, even before the acquiring
 * effect below has run) — safe under React StrictMode's double-render
 * since it never increments refCount.
 */
export function peekYDoc(docId) {
  let entry = registry.get(docId)
  if (!entry) {
    entry = createEntry()
    registry.set(docId, entry)
  }
  if (entry.pendingDestroy) {
    clearTimeout(entry.pendingDestroy)
    entry.pendingDestroy = null
  }
  return entry
}

export function acquireYDoc(docId) {
  const entry = peekYDoc(docId)
  entry.refCount += 1
  return entry
}

export function releaseYDoc(docId) {
  const entry = registry.get(docId)
  if (!entry) return
  entry.refCount -= 1
  if (entry.refCount > 0) return

  entry.pendingDestroy = setTimeout(() => {
    const current = registry.get(docId)
    if (current !== entry || current.refCount > 0) return
    entry.ydoc.destroy()
    registry.delete(docId)
  }, DESTROY_GRACE_MS)
}

/**
 * Seed a freshly-created Y.Doc with a document's saved TipTap JSON, headless
 * (no live editor/view required). No-op if the Y.Doc already has content —
 * safe to call even if two callers race, since only one will see an empty
 * fragment.
 */
export function seedIfEmpty(entry, json) {
  if (!json) return false
  const fragment = entry.ydoc.getXmlFragment('default')
  if (fragment.length > 0) return false
  prosemirrorJSONToYXmlFragment(getDocSchema(), json, fragment)
  return true
}

/**
 * Claim exactly one pane as the "seeder" responsible for populating a
 * newly-created Y.Doc from the server. Callers must call this synchronously
 * (before any await) so two panes opening the same never-before-seen docId
 * in the same tick don't both seed and duplicate content.
 */
export function claimSeeder(entry) {
  if (entry.loaded) return false
  entry.loaded = true
  return true
}

// Legacy (pre content_json) markdown-only docs can't be converted to Y.Doc
// headlessly (parsing markdown needs a live editor's Markdown extension), so
// the seeder stashes it here for the editor-ready effect to apply once mounted.
export function setLegacySeedMarkdown(entry, md) {
  entry.legacySeedMarkdown = md
}

export function takeLegacySeedMarkdown(entry) {
  const md = entry.legacySeedMarkdown
  entry.legacySeedMarkdown = null
  return md
}
