import './A4Paper.css'

const fontMap = {
  '일반':        { fontFamily: '"Malgun Gothic", sans-serif', fontSize: '11pt' },
  '마크다운':    { fontFamily: '"Consolas", monospace',       fontSize: '11pt' },
  '대본':        { fontFamily: '"Courier New", monospace',    fontSize: '11pt' },
  '뮤지컬 가사': { fontFamily: '"Malgun Gothic", sans-serif', fontSize: '12pt' },
}

function A4Paper({ content, onChange, mode }) {
  const style = fontMap[mode] || fontMap['일반']
  return (
    <div className="a4-paper">
      <textarea
        className="a4-textarea"
        value={content}
        onChange={e => onChange(e.target.value)}
        placeholder="여기에 글을 쓰세요..."
        spellCheck={false}
        style={style}
      />
    </div>
  )
}

export default A4Paper
