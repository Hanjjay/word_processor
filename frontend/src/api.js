const BASE = '/api'

async function request(method, path, body = null) {
  const options = { method, headers: { 'Content-Type': 'application/json' } }
  if (body) options.body = JSON.stringify(body)
  const res  = await fetch(`${BASE}${path}`, options)
  const data = await res.json()
  if (!res.ok || data.status === 'error') throw new Error(data.message || data.detail || '요청 실패')
  return data
}

export const api = {
  document: {
    create:   ()                         => request('POST',   '/document/new'),
    list:     ()                         => request('GET',    '/document/list'),
    get:      (id)                       => request('GET',    `/document/${id}`),
    save:     (id, title, content, mode) => request('POST',   '/document/save',     { doc_id: id, title, content, mode }),
    autosave: (id, content)              => request('POST',   '/document/autosave', { doc_id: id, content }),
    delete:   (id)                       => request('DELETE', `/document/${id}`),
    count:    (content)                  => request('POST',   '/document/count',    { content }),
  },
  snapshot: {
    take:    (docId, content, memo = '') => request('POST', '/snapshot/take',    { doc_id: docId, content, memo }),
    list:    (docId)                     => request('GET',  `/snapshot/list/${docId}`),
    get:     (snapId)                    => request('GET',  `/snapshot/${snapId}`),
    diff:    (a, b)                      => request('POST', '/snapshot/diff',    { snapshot_id_a: a, snapshot_id_b: b }),
    restore: (snapId)                    => request('POST', '/snapshot/restore', { snapshot_id: snapId }),
  },
  export: {
    docx: (content, path)               => request('POST', '/export/docx', { content, path }),
    pdf:  (htmlContent, path)           => request('POST', '/export/pdf',  { html_content: htmlContent, path }),
  },
  explorer: {
    open:    (path)          => request('POST', '/explorer/open', { path }),
    refresh: (path)          => request('GET',  `/explorer/refresh?path=${encodeURIComponent(path)}`),
    search:  (path, query)   => request('GET',  `/explorer/search?path=${encodeURIComponent(path)}&query=${encodeURIComponent(query)}`),
  },
  memo: {
    list:   ()                          => request('GET',    '/memo/list'),
    save:   (memoId, title, content)    => request('POST',   '/memo/save',   { memo_id: memoId, title, content }),
    delete: (memoId)                    => request('DELETE', `/memo/${memoId}`),
  },
}
