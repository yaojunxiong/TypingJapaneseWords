'use client'

import { useEffect, useState } from 'react'

type Props = {
  lang: 'zh' | 'en'
}

function t(lang: Props['lang'], zh: string, en: string) {
  return lang === 'en' ? en : zh
}

export default function SettingsPracticeControls({ lang }: Props) {
  const [voiceOn, setVoiceOn] = useState(true)
  const [sfxOn, setSfxOn] = useState(true)

  useEffect(() => {
    try {
      setVoiceOn(localStorage.getItem('minna.practice.voice.v1') !== '0')
      setSfxOn(localStorage.getItem('minna.practice.sfx.v1') !== '0')
    } catch {}
  }, [])

  function toggleVoice() {
    const next = !voiceOn
    setVoiceOn(next)
    try { localStorage.setItem('minna.practice.voice.v1', next ? '1' : '0') } catch {}
  }

  function toggleSfx() {
    const next = !sfxOn
    setSfxOn(next)
    try { localStorage.setItem('minna.practice.sfx.v1', next ? '1' : '0') } catch {}
  }

  return (
    <section className="card">
      <h2>{t(lang, '练习音频', 'Practice Audio')}</h2>
      <p className="small">{t(lang, '统一控制练习页语音与音效。', 'Control voice and sound effects for practice pages.')}</p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className="practiceSwitch" onClick={toggleVoice}>
          {voiceOn ? t(lang, '语音开', 'Voice On') : t(lang, '语音关', 'Voice Off')}
        </button>
        <button className="practiceSwitch" onClick={toggleSfx}>
          {sfxOn ? t(lang, '音效开', 'SFX On') : t(lang, '音效关', 'SFX Off')}
        </button>
      </div>
    </section>
  )
}
