import GlobalAccessButton from '@/components/GlobalAccessButton'
import LanguageSelector from '@/components/LanguageSelector'
import './LanguageSelector.css'

function GlobalLanguageControls({ className = '' }) {
  return (
    <div className={`global-language-controls ${className}`.trim()}>
      <GlobalAccessButton />
      <LanguageSelector />
    </div>
  )
}

export default GlobalLanguageControls
