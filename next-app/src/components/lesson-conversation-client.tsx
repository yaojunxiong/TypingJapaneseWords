'use client'

import { useState, useEffect, useRef } from 'react'
import { saveRecording, getRecentRecordings, deleteRecording, type RecordingEntry } from '@/lib/conversation-recordings'
import {
  calculateTextAccuracy, calculateKeywordAccuracy, calculateDurationScore,
  calculateOverallScore, generateFeedback, getExpectedDuration
} from '@/lib/conversation-speech-score'
import { parseTimeToSeconds } from '@/lib/parse-time'
import { recordLearningEvent } from '@/lib/learning-event-log'
import { getEncouragementMessage, getLessonCompletionMessage } from '@/lib/learning-encouragement'

type ConversationItem = {
  id: string
  speaker: string
  jp: string
  kana: string
  zh: string
  keyword: string
  videoStart?: string | number
  videoEnd?: string | number
}

type Props = {
  lessonNo: number
  lang: 'zh' | 'en'
  items: ConversationItem[]
  videoUrl: string
}

const FAMILIARITY_KEY = 'minna.conversation.familiarity.v1'
type FamiliarityMap = Record<string, { status: 'known' | 'unfamiliar'; count: number }>

function readFamiliarity(): FamiliarityMap {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem(FAMILIARITY_KEY) || '{}') } catch { return {} }
}
function writeFamiliarity(data: FamiliarityMap) {
  try { localStorage.setItem(FAMILIARITY_KEY, JSON.stringify(data)) } catch {}
}

function t(lang: 'zh' | 'en', zh: string, en: string) { return lang === 'en' ? en : zh }

export default function LessonConversationClient({ lessonNo, lang, items, videoUrl }: Props) {
  const [idx, setIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [familiarity, setFamiliarity] = useState<FamiliarityMap>({})
  const [done, setDone] = useState<Record<string, boolean>>({})
  const [mode, setMode] = useState<'all' | 'weak'>('all')
  const [recording, setRecording] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [recentRecordings, setRecentRecordings] = useState<RecordingEntry[]>([])
  const [speechSupported, setSpeechSupported] = useState(true)
  const [analyzingId, setAnalyzingId] = useState<number | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const recognitionRef = useRef<any>(null)
  const audioBlobRef = useRef<Blob | null>(null)

  const [encouragement, setEncouragement] = useState('')

  async function logEvent(evt: {
    eventType: string; contentType: string; contentId: string; contentText?: string
    result?: string; score?: number; accuracy?: Record<string, number>; metadata?: Record<string, unknown>
  }) {
    try {
      await recordLearningEvent({
        lessonNo,
        stage: mode === 'weak' ? 'review' : 'conversation',
        contentType: evt.contentType as any,
        contentId: evt.contentId,
        contentText: evt.contentText,
        eventType: evt.eventType as any,
        result: evt.result as any,
        score: evt.score,
        accuracy: evt.accuracy as any,
        metadata: evt.metadata,
      })
    } catch {}
  }

  useEffect(() => {
    setFamiliarity(readFamiliarity())
    setSpeechSupported(typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window))
  }, [])

  useEffect(() => {
    if (!items.length) return
    if (items[idx]) {
      loadRecent(items[idx].id)
      const item = items[idx]
      logEvent({ eventType: 'view_content', contentType: 'conversation_sentence', contentId: item.id, contentText: item.jp })
    }
  }, [idx, items])

  const displayItems = mode === 'weak'
    ? items.filter(item => familiarity[item.id]?.status === 'unfamiliar')
    : items
  const safeIdx = Math.min(idx, displayItems.length - 1)
  const current = displayItems[safeIdx]
  const allDone = displayItems.length > 0 && displayItems.every(item => done[item.id])

  async function loadRecent(conversationId: string) {
    try {
      const recs = await getRecentRecordings(lessonNo, conversationId, 10)
      setRecentRecordings(recs)
    } catch {}
  }

  function handleReveal() {
    setRevealed(true)
    if (current) {
      setEncouragement(getEncouragementMessage('reveal_answer'))
      logEvent({ eventType: 'reveal_answer', contentType: 'conversation_sentence', contentId: current.id, contentText: current.jp })
    }
  }

  function handleKnown() {
    const next = { ...familiarity, [current.id]: { status: 'known' as const, count: (familiarity[current.id]?.count || 0) + 1 } }
    writeFamiliarity(next)
    setFamiliarity(next)
    setDone({ ...done, [current.id]: true })
    setRevealed(false)
    setAudioUrl(null)
    setEncouragement(getEncouragementMessage('mark_known'))
    logEvent({ eventType: 'mark_known', contentType: 'conversation_sentence', contentId: current.id, contentText: current.jp, result: 'known' })
    if (safeIdx + 1 < displayItems.length) setIdx(safeIdx + 1)
    else checkStageComplete()
  }

  function handleUnfamiliar() {
    const prev = familiarity[current.id]
    const count = (prev?.count || 0) + 1
    const next = { ...familiarity, [current.id]: { status: 'unfamiliar' as const, count } }
    writeFamiliarity(next)
    setFamiliarity(next)
    setDone({ ...done, [current.id]: true })
    setRevealed(false)
    setAudioUrl(null)
    setEncouragement(getEncouragementMessage('mark_weak'))
    logEvent({ eventType: 'mark_weak', contentType: 'conversation_sentence', contentId: current.id, contentText: current.jp, result: 'weak' })
    if (safeIdx + 1 < displayItems.length) setIdx(safeIdx + 1)
    else checkStageComplete()
  }

  function checkStageComplete() {
    const allDoneNow = displayItems.length > 0 && displayItems.every(item => done[item.id])
    if (allDoneNow) {
      setEncouragement(getLessonCompletionMessage(lessonNo))
      logEvent({ eventType: 'stage_complete', contentType: 'conversation_sentence', contentId: `l${String(lessonNo).padStart(2, '0')}-conv`, result: 'completed' })
    }
  }

  function handleRestart() {
    const lessonItemIds = new Set(items.map(item => item.id))
    const current = readFamiliarity()
    for (const id of lessonItemIds) delete current[id]
    writeFamiliarity(current)
    setFamiliarity(current)
    setDone({})
    setIdx(0)
    setRevealed(false)
    setAudioUrl(null)
  }

  function handleResetWeak() {
    setDone({})
    setIdx(0)
    setRevealed(false)
    setAudioUrl(null)
  }

  function toggleMode() {
    setMode(m => m === 'all' ? 'weak' : 'all')
    setDone({})
    setIdx(0)
    setRevealed(false)
    setAudioUrl(null)
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm'
      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      chunksRef.current = []
      audioBlobRef.current = null
      setAudioUrl(null)
      setRecordingDuration(0)

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: mimeType })
        audioBlobRef.current = blob
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        const duration = recordingDuration

        let recognizedText = ''
        let textAccuracy = 0
        let keywordAccuracy = 0
        let durationScore = 0
        let overallScore = 0
        let feedback = ''

        if (speechSupported) {
          try {
            const text = await recognizeSpeech(blob)
            recognizedText = text
            const expected = current.jp
            textAccuracy = calculateTextAccuracy(expected, text)
            keywordAccuracy = calculateKeywordAccuracy(expected, text)
            const expectedDuration = getExpectedDuration(expected)
            durationScore = calculateDurationScore(expectedDuration, duration * 1000)
            overallScore = calculateOverallScore(textAccuracy, keywordAccuracy, durationScore)
            feedback = generateFeedback(overallScore, textAccuracy, keywordAccuracy)
          } catch {}
        } else {
          feedback = '当前浏览器暂不支持自动识别，可先保存录音，后续再分析。'
        }

        try {
          const id = await saveRecording({
            lessonNo,
            conversationId: current.id,
            sentenceText: current.jp,
            createdAt: new Date().toISOString(),
            durationMs: duration * 1000,
            mimeType,
            audioBlob: blob,
            recognizedText,
            textAccuracy,
            keywordAccuracy,
            durationScore,
            overallScore,
            feedback,
          })
          setAnalyzingId(id)
          await loadRecent(current.id)
          logEvent({
            eventType: 'save_recording', contentType: 'recording',
            contentId: `${current.id}-rec-${id}`,
            metadata: { durationMs: duration * 1000, mimeType, sentenceId: current.id }
          })
          if (overallScore > 0) {
            const msg = getEncouragementMessage('speech_scored', undefined, overallScore)
            setEncouragement(msg)
            logEvent({
              eventType: 'speech_scored', contentType: 'conversation_sentence',
              contentId: current.id, contentText: current.jp,
              score: overallScore,
              accuracy: { textAccuracy, keywordAccuracy, durationScore, overallScore },
            })
          }
        } catch {}
      }

      timerRef.current = setInterval(() => {
        setRecordingDuration(d => d + 1)
      }, 1000)

      logEvent({ eventType: 'start_recording', contentType: 'conversation_sentence', contentId: current.id, contentText: current.jp })
      recorder.start()
      setRecording(true)
    } catch {}
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    setRecording(false)
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  function playRecording(url: string) {
    const audio = new Audio(url)
    audio.play().catch(() => {})
  }

  async function handleDeleteRecording(id: number) {
    try {
      await deleteRecording(id)
      await loadRecent(current.id)
    } catch {}
  }

  function formatDuration(ms: number): string {
    const s = Math.floor(ms / 1000)
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  if (!items.length) {
    return (
      <div>
        <section className="card">
          <p className="small">{t(lang, '本课暂无会话内容。', 'No conversation content for this lesson.')}</p>
        </section>
      </div>
    )
  }

  if (allDone) {
    const unfamiliarCount = Object.values(familiarity).filter(f => f.status === 'unfamiliar').length
    return (
      <div>
        <section className="heroCard card" style={{ textAlign: 'center' }}>
          <h2>{t(lang, '会话背诵完成！', 'Conversation Complete!')}</h2>
          <p className="small">
            {t(lang, `共 ${displayItems.length} 句，${unfamiliarCount} 句需要继续练习。`,
              `Total ${displayItems.length} sentences. ${unfamiliarCount} need more practice.`)}
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
            <button className="btn" onClick={handleRestart} style={{ minWidth: 120 }}>
              {t(lang, '重新练习全部', 'Restart All')}
            </button>
            {unfamiliarCount > 0 ? (
              <button className="btn ghost" onClick={() => { setMode('weak'); setDone({}); setIdx(0); }}>
                {t(lang, `只练不熟 (${unfamiliarCount})`, `Practice Weak (${unfamiliarCount})`)}
              </button>
            ) : null}
          </div>
        </section>
      </div>
    )
  }

  return (
    <div>
      <section className="heroCard card">
        <h2>{t(lang, `第 ${lessonNo} 课 · 会话背诵`, `Lesson ${lessonNo} · Conversation`)}</h2>
        <p className="small">
          {t(lang,
            `来源：大家的日本語字幕播放器  · ${displayItems.length} 句`,
            `Source: Minna no Nihongo  · ${displayItems.length} sentences`)}
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 100, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(Object.keys(done).length / displayItems.length) * 100}%`, background: '#0284c7', borderRadius: 3 }} />
          </div>
          <span className="small">{Object.keys(done).length}/{displayItems.length}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <button className="btn ghost" onClick={toggleMode} style={{ fontSize: 12, padding: '4px 10px' }}>
            {mode === 'all'
              ? t(lang, '只练不熟', 'Practice Weak')
              : t(lang, '全部练习', 'All Sentences')}
          </button>
          {mode === 'weak' ? (
            <span className="small" style={{ color: '#d97706' }}>
              {t(lang, '不熟句模式', 'Weak Sentence Mode')}
            </span>
          ) : null}
        </div>
      </section>

      {current ? (
        <SentenceCard
          key={current.id + '-' + mode}
          item={current}
          lang={lang}
          revealed={revealed}
          onReveal={handleReveal}
          onKnown={handleKnown}
          onUnfamiliar={handleUnfamiliar}
          recording={recording}
          recordingDuration={recordingDuration}
          audioUrl={audioUrl}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          onPlayRecording={playRecording}
          recentRecordings={recentRecordings}
          onDeleteRecording={handleDeleteRecording}
          speechSupported={speechSupported}
          analyzingId={analyzingId}
          familiarity={familiarity[current.id]}
          videoUrl={videoUrl}
          onPlaySourceAudio={(id, jp) => {
            logEvent({ eventType: 'play_source_audio', contentType: 'conversation_sentence', contentId: id, contentText: jp })
            setEncouragement(getEncouragementMessage('play_source_audio'))
          }}
        />
      ) : null}

      {encouragement ? (
        <section className="card" style={{ background: '#f0fdf4', borderLeft: '4px solid #22c55e' }}>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>💬 {encouragement}</p>
        </section>
      ) : null}
    </div>
  )
}

function SentenceCard({
  item, lang, revealed, onReveal, onKnown, onUnfamiliar,
  recording, recordingDuration, audioUrl,
  onStartRecording, onStopRecording, onPlayRecording,
  recentRecordings, onDeleteRecording, speechSupported, analyzingId, familiarity, videoUrl,
  onPlaySourceAudio,
}: {
  item: ConversationItem
  lang: 'zh' | 'en'
  revealed: boolean
  onReveal: () => void
  onKnown: () => void
  onUnfamiliar: () => void
  recording: boolean
  recordingDuration: number
  audioUrl: string | null
  onStartRecording: () => void
  onStopRecording: () => void
  onPlayRecording: (url: string) => void
  recentRecordings: RecordingEntry[]
  onDeleteRecording: (id: number) => void
  speechSupported: boolean
  analyzingId: number | null
  familiarity?: { status: string; count: number }
  videoUrl: string
  onPlaySourceAudio?: (id: string, jp: string) => void
}) {
  return (
    <section className="card" style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <p className="small" style={{ margin: 0 }}>
          {item.speaker ? `👤 ${item.speaker}` : ''}
        </p>
        {familiarity ? (
          <span className="metaPill" style={{ background: familiarity.status === 'known' ? '#d1fae5' : '#fef3c7', color: familiarity.status === 'known' ? '#065f46' : '#92400e' }}>
            {familiarity.status === 'known' ? t(lang, '已掌握', 'Known') : t(lang, '不熟', 'Weak')}
          </span>
        ) : null}
      </div>

      <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
        {item.keyword ? `【${item.keyword}】` : ''} {item.zh}
      </p>

      {!revealed ? (
        <button className="btn" onClick={onReveal} style={{ marginTop: 12, minWidth: 140 }}>
          {t(lang, '显示答案', 'Show Answer')}
        </button>
      ) : (
        <>
          <p className="breakWord" style={{ fontSize: 22, fontWeight: 700, marginTop: 16, marginBottom: 4 }}>{item.jp}</p>
          {item.kana && item.kana !== item.jp ? (
            <p className="small" style={{ marginTop: 4 }}>{item.kana}</p>
          ) : null}
        </>
      )}

      {revealed ? (
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <button className="btn" onClick={onKnown} style={{ minWidth: 100 }}>
            {t(lang, '我会了', 'Got it')}
          </button>
          <button className="btn ghost" onClick={onUnfamiliar} style={{ minWidth: 100 }}>
            {t(lang, '不熟', 'Not familiar')}
          </button>
        </div>
      ) : null}

      {revealed && videoUrl ? (
        <div style={{ marginTop: 16, borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>
            {t(lang, '🔊 原声练习', '🔊 Source Audio')}
          </h4>
          <SentenceSourceAudioPlayer
            videoUrl={videoUrl}
            videoStart={item.videoStart}
            videoEnd={item.videoEnd}
            lang={lang}
            onPlay={() => onPlaySourceAudio?.(item.id, item.jp)}
          />
        </div>
      ) : null}

      {revealed ? (
        <div style={{ marginTop: 16, borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>
            {t(lang, '🎤 跟读录音', '🎤 Recording')}
          </h4>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {!recording ? (
              <button className="btn" onClick={onStartRecording} style={{ padding: '6px 12px', fontSize: 13 }}>
                {t(lang, '开始跟读录音', 'Start Recording')}
              </button>
            ) : (
              <button className="btn" onClick={onStopRecording} style={{ padding: '6px 12px', fontSize: 13, background: '#dc2626' }}>
                {t(lang, '停止并保存', 'Stop & Save')}
              </button>
            )}
            {recording ? (
              <span style={{ color: '#dc2626', fontSize: 13 }}>
                🔴 {Math.floor(recordingDuration / 60)}:{String(recordingDuration % 60).padStart(2, '0')}
              </span>
            ) : null}
            {audioUrl ? (
              <button className="btn ghost" onClick={() => onPlayRecording(audioUrl)} style={{ padding: '6px 12px', fontSize: 13 }}>
                {t(lang, '播放本次录音', 'Play Recording')}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {revealed && recentRecordings.length > 0 ? (
        <div style={{ marginTop: 12, borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>
            {t(lang, '📋 最近10次录音', '📋 Recent 10 Recordings')}
          </h4>
          {recentRecordings.map((rec, ri) => (
            <div key={rec.id ?? ri} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0',
              borderBottom: ri < recentRecordings.length - 1 ? '1px solid #f1f5f9' : 'none',
              fontSize: 13
            }}>
              <span className="small" style={{ minWidth: 36, fontSize: 11 }}>
                {formatTime(rec.createdAt)}
              </span>
              <button className="btn" onClick={() => playRecordingBlob(rec.audioBlob, rec.mimeType)}
                style={{ padding: '2px 8px', fontSize: 11 }}>
                ▶
              </button>
              {rec.textAccuracy > 0 ? (
                <span style={{ fontSize: 11, color: scoreColor(rec.overallScore) }}>
                  {t(lang, `评分: ${rec.overallScore}`, `Score: ${rec.overallScore}`)}
                </span>
              ) : null}
              {rec.recognizedText ? (
                <span className="small" style={{ fontSize: 10, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {rec.recognizedText}
                </span>
              ) : null}
              <button onClick={() => rec.id !== undefined && onDeleteRecording(rec.id)}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 14 }}>
                ✕
              </button>
            </div>
          ))}
          {analyzingId && !speechSupported && (
            <p className="small" style={{ marginTop: 6, fontSize: 11, color: '#d97706' }}>
              {t(lang, '当前浏览器暂不支持自动识别，可先保存录音，后续再分析。',
                'Speech recognition not supported. Recording saved for later analysis.')}
            </p>
          )}
        </div>
      ) : null}

      {revealed && recentRecordings.length > 0 && recentRecordings[0]?.overallScore > 0 && (
        <div style={{ marginTop: 12, borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>
            {t(lang, '📊 最新准确率分析', '📊 Latest Accuracy')}
          </h4>
          <AccuracyDisplay recording={recentRecordings[0]} lang={lang} />
        </div>
      )}
    </section>
  )
}

function SentenceSourceAudioPlayer({ videoUrl, videoStart, videoEnd, lang, onPlay }: {
  videoUrl: string
  videoStart?: string | number
  videoEnd?: string | number
  lang: 'zh' | 'en'
  onPlay?: () => void
}) {
  const startSec = parseTimeToSeconds(videoStart)
  const endSec = parseTimeToSeconds(videoEnd)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [playing, setPlaying] = useState(false)

  const hasTimes = videoUrl && startSec >= 0 && endSec > startSec

  function handlePlay() {
    if (!hasTimes) return
    let video = videoRef.current
    if (!video) {
      video = document.createElement('video')
      video.crossOrigin = 'anonymous'
      video.preload = 'auto'
      video.style.display = 'none'
      document.body.appendChild(video)
      videoRef.current = video
    }

    video.src = videoUrl
    video.currentTime = startSec
    setPlaying(true)

    const onTimeUpdate = () => {
      if (video && video.currentTime >= endSec) {
        video.pause()
        setPlaying(false)
        video.removeEventListener('timeupdate', onTimeUpdate)
      }
    }
    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('ended', () => setPlaying(false), { once: true })
    video.addEventListener('pause', () => setPlaying(false), { once: true })

    video.play().catch(() => setPlaying(false))
    onPlay?.()
  }

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      {hasTimes ? (
        <button className="btn" onClick={handlePlay} disabled={playing}
          style={{ padding: '6px 12px', fontSize: 13, opacity: playing ? 0.7 : 1 }}>
          {playing
            ? t(lang, '播放中...', 'Playing...')
            : t(lang, '播放原声', 'Play Audio')}
        </button>
      ) : (
        <span className="small" style={{ color: '#94a3b8' }}>
          {t(lang, '暂无原声时间轴', 'No audio timeline')}
        </span>
      )}
      {videoUrl ? (
        <a className="btn ghost" href={videoUrl} target="_blank" rel="noopener noreferrer"
          style={{ padding: '6px 12px', fontSize: 13 }}>
          {t(lang, '播放视频', 'Play Video')}
        </a>
      ) : null}
    </div>
  )
}

function AccuracyDisplay({ recording, lang }: { recording: RecordingEntry; lang: 'zh' | 'en' }) {
  const items = [
    { label: t(lang, '识别文本', 'Recognized'), value: recording.recognizedText || '-' },
    { label: t(lang, '文字准确率', 'Text Accuracy'), value: `${recording.textAccuracy}%` },
    { label: t(lang, '关键词命中率', 'Keyword Accuracy'), value: `${recording.keywordAccuracy}%` },
    { label: t(lang, '语速接近度', 'Speed Score'), value: `${recording.durationScore}%` },
    { label: t(lang, '综合评分', 'Overall'), value: `${recording.overallScore}%`, bold: true },
  ]
  return (
    <div>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: 13 }}>
          <span className="small">{item.label}</span>
          <span style={{ fontWeight: item.bold ? 700 : 400, color: item.bold ? scoreColor(recording.overallScore) : undefined }}>
            {item.value}
          </span>
        </div>
      ))}
      {recording.feedback ? (
        <p style={{ marginTop: 4, fontSize: 12, color: '#64748b' }}>{recording.feedback}</p>
      ) : null}
    </div>
  )
}

function scoreColor(score: number): string {
  if (score >= 90) return '#16a34a'
  if (score >= 70) return '#ca8a04'
  return '#dc2626'
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch { return '' }
}

function playRecordingBlob(blob: Blob, mimeType: string) {
  try {
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    audio.play().catch(() => {})
    audio.onended = () => URL.revokeObjectURL(url)
  } catch {}
}

function recognizeSpeech(audioBlob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      reject(new Error('Speech recognition not supported'))
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'ja-JP'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    let finalText = ''

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript
        }
      }
    }

    recognition.onerror = () => {
      reject(new Error('Recognition error'))
    }

    recognition.onend = () => {
      resolve(finalText || '')
    }

    try {
      recognition.start()
    } catch {
      reject(new Error('Failed to start recognition'))
    }

    setTimeout(() => {
      try { recognition.stop() } catch {}
    }, 10000)
  })
}


export const FamiliaritySection = ({ items, lang, familiarity, onRestart, onPracticeWeak }: {
  items: ConversationItem[]
  lang: 'zh' | 'en'
  familiarity: FamiliarityMap
  onRestart: () => void
  onPracticeWeak: () => void
}) => {
  const weakCount = Object.values(familiarity).filter(f => f.status === 'unfamiliar').length
  return (
    <section className="card" style={{ textAlign: 'center' }}>
      <h3>{t(lang, '不熟句复习', 'Weak Sentence Review')}</h3>
      <p className="small">
        {t(lang, `共 ${items.length} 句，不熟 ${weakCount} 句`,
          `${items.length} sentences, ${weakCount} weak`)}
      </p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="btn" onClick={onRestart} style={{ minWidth: 120 }}>
          {t(lang, '重新练习全部', 'Practice All')}
        </button>
        {weakCount > 0 ? (
          <button className="btn ghost" onClick={onPracticeWeak} style={{ minWidth: 120 }}>
            {t(lang, `只练不熟 (${weakCount})`, `Practice Weak (${weakCount})`)}
          </button>
        ) : null}
      </div>
    </section>
  )
}
