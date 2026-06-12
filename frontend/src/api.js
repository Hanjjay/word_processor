const BASE = '/api'

async function request(method, path, body = null) {
  const options = { method, headers: { 'Content-Type': 'application/json' } }
  if (body) options.body = JSON.stringify(body)
  const res  = await fetch(`${BASE}${path}`, options)
  const data = await res.json()
  if (!res.ok || data.status === 'error') {
    throw new Error(data.message || data.detail || '요청 실패')
  }
  return data
}

export const api = {

  // ── 프로젝트 ─────────────────────────────────────────
  project: {
    list:    ()                              => request('GET',    '/project/list'),
    get:     (id)                            => request('GET',    `/project/${id}`),
    create:  (title, description='')        => request('POST',   '/project/create', { title, description }),
    update:  (id, patch)                    => request('PATCH',  `/project/${id}`, patch),
    delete:  (id)                           => request('DELETE', `/project/${id}`),
    reorder: (ordered_ids)                  => request('POST',   '/project/reorder', { ordered_ids }),
    tree:    (id)                           => request('GET',    `/project/${id}/tree`),
  },

  // ── 섹션 ─────────────────────────────────────────────
  section: {
    create:  (project_id, name, section_type='folder', parent_id=null) =>
               request('POST',   '/section/create', { project_id, name, section_type, parent_id }),
    update:  (id, patch)                    => request('PATCH',  `/section/${id}`, patch),
    move:    (id, new_parent_id)            => request('PATCH',  `/section/${id}/move`, { new_parent_id }),
    reorder: (sibling_ids)                  => request('POST',   '/section/reorder', { sibling_ids }),
    delete:  (id)                           => request('DELETE', `/section/${id}`),
  },

  // ── 문서 ─────────────────────────────────────────────
  document: {
    create:   (project_id, section_id=null, title='제목 없음', mode='일반') =>
                request('POST',   '/document/new',      { project_id, section_id, title, mode }),
    list:     (project_id, section_id=null) => request('GET',    `/document/list?project_id=${project_id}&section_id=${section_id ?? ''}`),
    listAll:  (project_id)                  => request('GET',    `/document/list-all?project_id=${project_id}`),
    get:      (id)                          => request('GET',    `/document/${id}`),
    save:     (id, title, content, mode, content_json=null) =>
                request('POST',   '/document/save',     { doc_id: id, title, content, mode, content_json }),
    autosave: (id, content, content_json=null) =>
                request('POST',   '/document/autosave', { doc_id: id, content, content_json }),
    move:     (id, new_section_id)          => request('PATCH',  `/document/${id}/move`, { new_section_id }),
    reorder:  (sibling_ids)                 => request('POST',   '/document/reorder',  { sibling_ids }),
    delete:   (id)                          => request('DELETE', `/document/${id}`),
    count:    (content)                     => request('POST',   '/document/count',    { content }),
  },

  // ── 스냅샷 ───────────────────────────────────────────
  snapshot: {
    take:    (doc_id, content, memo='')     => request('POST', '/snapshot/take',    { doc_id, content, memo }),
    list:    (doc_id)                       => request('GET',  `/snapshot/list/${doc_id}`),
    get:     (id)                           => request('GET',  `/snapshot/${id}`),
    diff:    (a, b)                         => request('POST', '/snapshot/diff',    { snapshot_id_a: a, snapshot_id_b: b }),
    restore: (id)                           => request('POST', '/snapshot/restore', { snapshot_id: id }),
  },

  // ── 내보내기 ─────────────────────────────────────────
  export: {
    docx: (content, path)                   => request('POST', '/export/docx', { content, path }),
    pdf:  (html_content, path)              => request('POST', '/export/pdf',  { html_content, path }),
  },

  // ── 파일 탐색기 ──────────────────────────────────────
  explorer: {
    open:    (path)                         => request('POST', '/explorer/open', { path }),
    refresh: (path)                         => request('GET',  `/explorer/refresh?path=${encodeURIComponent(path)}`),
    search:  (path, query)                  => request('GET',  `/explorer/search?path=${encodeURIComponent(path)}&query=${encodeURIComponent(query)}`),
    read:    (path)                         => request('GET',  `/explorer/read?path=${encodeURIComponent(path)}`),
  },

  // ── 메모 ─────────────────────────────────────────────
  memo: {
    list:   (project_id, doc_id=null)       => request('GET',    `/memo/list?project_id=${project_id}${doc_id ? `&doc_id=${doc_id}` : ''}`),
    save:   (project_id, content, doc_id=null, memo_id=0) =>
              request('POST',   '/memo/save', { memo_id, project_id, document_id: doc_id, content }),
    done:   (id, is_done)                   => request('PATCH',  `/memo/${id}`, { is_done }),
    delete: (id)                            => request('DELETE', `/memo/${id}`),
  },
}
