import './Toolbar.css'

function Toolbar({ mode, onModeChange, onSave, onSnapshot, splitMode, onToggleSplit }) {
  return (
    <div className="toolbar">
      <select className="toolbar-select" value={mode} onChange={e => onModeChange(e.target.value)}>
        <option>일반</option>
        <option>마크다운</option>
        <option>대본</option>
        <option>뮤지컬 가사</option>
      </select>

      <div className="toolbar-divider" />

      <button className="toolbar-btn"><b>B</b></button>
      <button className="toolbar-btn"><i>I</i></button>
      <button className="toolbar-btn"><u>U</u></button>

      <div className="toolbar-divider" />

      <button className="toolbar-btn save" onClick={onSave}>저장</button>
      <button className="toolbar-btn snap" onClick={onSnapshot}>스냅샷</button>

      <div className="toolbar-divider" />

      <button
        className={`toolbar-btn split ${splitMode ? 'active' : ''}`}
        onClick={onToggleSplit}
        title={splitMode ? '분할 닫기' : '화면 분할'}
      >
        {splitMode ? '⬛ 분할 닫기' : '◫ 분할'}
      </button>
    </div>
  )
}

export default Toolbar
