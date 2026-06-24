export type SpeakerAvatarStyle = {
  label: string
  background: string
  border: string
  color: string
  activeBackground: string
  activeBorder: string
  activeColor: string
}

export type SpeakerEntry = {
  speakerId: string
  displayName: string
  avatarLabel: string
  avatar: Omit<SpeakerAvatarStyle, 'label'>
  voiceType: 'male' | 'female'
  ttsSpeakerLabel: string
  roleBased: boolean
  requiresManualReview: boolean
  notes?: string
  aliases?: string[]
}

const AVATARS: Record<string, Omit<SpeakerAvatarStyle, 'label'>> = {
  pink: {
    background: '#fce7f3',
    border: '#f9a8d4',
    color: '#9d174d',
    activeBackground: '#fbcfe8',
    activeBorder: '#ec4899',
    activeColor: '#831843',
  },
  blue: {
    background: '#dbeafe',
    border: '#93c5fd',
    color: '#1e40af',
    activeBackground: '#bfdbfe',
    activeBorder: '#3b82f6',
    activeColor: '#1e3a8a',
  },
  amber: {
    background: '#fef3c7',
    border: '#fcd34d',
    color: '#92400e',
    activeBackground: '#fde68a',
    activeBorder: '#f59e0b',
    activeColor: '#78350f',
  },
  green: {
    background: '#dcfce7',
    border: '#86efac',
    color: '#166534',
    activeBackground: '#bbf7d0',
    activeBorder: '#22c55e',
    activeColor: '#14532d',
  },
  purple: {
    background: '#f3e8ff',
    border: '#d8b4fe',
    color: '#6b21a8',
    activeBackground: '#e9d5ff',
    activeBorder: '#a855f7',
    activeColor: '#581c87',
  },
  slate: {
    background: '#f1f5f9',
    border: '#cbd5e1',
    color: '#475569',
    activeBackground: '#e0f2fe',
    activeBorder: '#38bdf8',
    activeColor: '#075985',
  },
  teal: {
    background: '#ccfbf1',
    border: '#5eead4',
    color: '#115e59',
    activeBackground: '#a7f3d0',
    activeBorder: '#14b8a6',
    activeColor: '#134e4a',
  },
  rose: {
    background: '#ffe4e6',
    border: '#fda4af',
    color: '#9f1239',
    activeBackground: '#fecdd3',
    activeBorder: '#f43f5e',
    activeColor: '#881337',
  },
  indigo: {
    background: '#e0e7ff',
    border: '#a5b4fc',
    color: '#3730a3',
    activeBackground: '#c7d2fe',
    activeBorder: '#6366f1',
    activeColor: '#312e81',
  },
  cyan: {
    background: '#cffafe',
    border: '#67e8f9',
    color: '#155e75',
    activeBackground: '#a5f3fc',
    activeBorder: '#06b6d4',
    activeColor: '#164e63',
  },
  orange: {
    background: '#ffedd5',
    border: '#fdba74',
    color: '#9a3412',
    activeBackground: '#fed7aa',
    activeBorder: '#f97316',
    activeColor: '#7c2d12',
  },
}

function labelFromName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  if (trimmed.startsWith('ミラー') || trimmed === 'Miller') return 'M'
  if (trimmed.startsWith('サントス')) return 'サ'
  if (trimmed.startsWith('シュミッド')) return 'シ'
  if (trimmed.startsWith('スズキ')) return 'ス'
  if (trimmed.startsWith('クララ')) return 'ク'
  if (trimmed.startsWith('キムラ')) return 'キ'
  if (trimmed.startsWith('ワン')) return 'ワ'
  if (trimmed.startsWith('ターコン')) return 'タ'
  if (trimmed.startsWith('ハン')) return 'ハ'
  if (trimmed.startsWith('Asuka')) return 'A'
  return trimmed.slice(0, 1)
}

const paletteKeys = ['pink', 'blue', 'amber', 'green', 'purple', 'teal', 'rose', 'indigo', 'cyan', 'orange'] as const
function assignColor(index: number): keyof typeof AVATARS {
  return paletteKeys[index % paletteKeys.length]
}

export const SPEAKER_REGISTRY: Record<string, SpeakerEntry> = {}

function register(
  displayName: string,
  overrides?: Partial<SpeakerEntry>,
  colorIndex?: number,
): SpeakerEntry {
  const existing = Object.values(SPEAKER_REGISTRY).find(
    e => e.displayName === displayName || e.aliases?.includes(displayName),
  )
  if (existing) return existing

  const idx = colorIndex ?? Object.keys(SPEAKER_REGISTRY).length
  const color = assignColor(idx)
  const label = overrides?.avatarLabel ?? labelFromName(displayName)

  const entry: SpeakerEntry = {
    speakerId: `spk_${displayName.replace(/[^a-zA-Z0-9\u3040-\u9FFF\uF900-\uFAFF]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'unknown'}`,
    displayName,
    avatarLabel: label,
    avatar: { ...AVATARS[color] },
    voiceType: 'male',
    ttsSpeakerLabel: '',
    roleBased: false,
    requiresManualReview: false,
    ...overrides,
  }
  SPEAKER_REGISTRY[entry.speakerId] = entry
  return entry
}

function alias(main: string, ...aliases: string[]) {
  const entry = Object.values(SPEAKER_REGISTRY).find(e => e.displayName === main)
  if (entry) {
    entry.aliases = [...(entry.aliases || []), ...aliases]
  }
}

// ---- Named characters ----
register('佐藤', { avatarLabel: '佐', voiceType: 'female', ttsSpeakerLabel: 'sato_female' }, 0)
register('山田', { avatarLabel: '山', voiceType: 'male', ttsSpeakerLabel: 'yamada_male' }, 1)
register('山田一郎', { avatarLabel: '山', voiceType: 'male', ttsSpeakerLabel: 'yamada_ichiro_male', requiresManualReview: true, notes: '可能和L1山田是同一人，需确认' }, 1)
register('ミラー', { avatarLabel: 'M', voiceType: 'male', ttsSpeakerLabel: 'miller_male' }, 2)
register('サントス', { avatarLabel: 'サ', voiceType: 'male', ttsSpeakerLabel: 'santos_male', requiresManualReview: true, notes: '和サントスさん可能是同一人' }, 3)
register('キムラさん', { avatarLabel: 'キ', voiceType: 'female', ttsSpeakerLabel: 'kimura_female' }, 4)
register('クララさん', { avatarLabel: 'ク', voiceType: 'female', ttsSpeakerLabel: 'clara_female' }, 5)
register('シュミッドさん', { avatarLabel: 'シ', voiceType: 'male', ttsSpeakerLabel: 'schmidt_male' }, 6)
register('スズキさん', { avatarLabel: 'ス', voiceType: 'male', ttsSpeakerLabel: 'suzuki_male', requiresManualReview: true, notes: '和鈴木さん/铃木可能是同一人' }, 7)
register('ワンさん（Wang）', { avatarLabel: 'ワ', voiceType: 'female', ttsSpeakerLabel: 'wang_female' }, 8)
register('小川さん', { avatarLabel: '小', voiceType: 'male', ttsSpeakerLabel: 'ogawa_male' }, 9)
register('木村さん', { avatarLabel: '木', voiceType: 'female', ttsSpeakerLabel: 'kimura_female', requiresManualReview: true, notes: '和キムラさん可能是同一人' }, 4)
register('松本さん', { avatarLabel: '松', voiceType: 'male', ttsSpeakerLabel: 'matsumoto_male', requiresManualReview: true, notes: '和松本忠史可能是同一人' }, 6)
register('松本忠史', { avatarLabel: '松', voiceType: 'male', ttsSpeakerLabel: 'matsumoto_tadashi_male', requiresManualReview: true, notes: '和松本さん可能是同一人' }, 6)
register('林さん', { avatarLabel: '林', voiceType: 'male', ttsSpeakerLabel: 'hayashi_male' }, 8)
register('渡辺さん', { avatarLabel: '渡', voiceType: 'female', ttsSpeakerLabel: 'watanabe_female' }, 9)
register('高井さん', { avatarLabel: '高', voiceType: 'male', ttsSpeakerLabel: 'takai_male' }, 0)
register('铃木', { avatarLabel: '鈴', voiceType: 'male', ttsSpeakerLabel: 'suzuki_male', requiresManualReview: true, notes: '和スズキさん/鈴木さん可能是同一人' }, 7)
register('鈴木さん', { avatarLabel: '鈴', voiceType: 'male', ttsSpeakerLabel: 'suzuki_male', requiresManualReview: true, notes: '和スズキさん/铃木可能是同一人' }, 7)
register('サントスさん', { avatarLabel: 'サ', voiceType: 'male', ttsSpeakerLabel: 'santos_male', requiresManualReview: true, notes: '和サントス可能是同一人' }, 3)
register('ターコン君（B）', { avatarLabel: 'タ', voiceType: 'male', ttsSpeakerLabel: 'tarcon_male' }, 3)
register('Asuka', { avatarLabel: 'A', voiceType: 'female', ttsSpeakerLabel: 'asuka_female' }, 4)
register('泉さん', { avatarLabel: '泉', voiceType: 'female', ttsSpeakerLabel: 'izumi_female' }, 5)

// ---- Miller variants (same person, different naming) ----
register('ミラーさん', { avatarLabel: 'M', voiceType: 'male', ttsSpeakerLabel: 'miller_male', requiresManualReview: true, notes: '和ミラー是同一人（Mike Miller）的不同称呼' }, 2)
register('ミラーさん（米勒先生）', { avatarLabel: 'M', voiceType: 'male', ttsSpeakerLabel: 'miller_male', requiresManualReview: true, notes: '和ミラー是同一人' }, 2)
register('米勒先生（ミラーさん）', { avatarLabel: 'M', voiceType: 'male', ttsSpeakerLabel: 'miller_male', requiresManualReview: true, notes: '和ミラー是同一人' }, 2)
register('Miller', { avatarLabel: 'M', voiceType: 'male', ttsSpeakerLabel: 'miller_male', requiresManualReview: true, notes: '和ミラー是同一人' }, 2)
register('Miller (passenger)', { avatarLabel: 'M', voiceType: 'male', ttsSpeakerLabel: 'miller_male', requiresManualReview: true, notes: '和ミラー是同一人（乘客场景）' }, 2)

// ---- Family variants ----
register('ハンスの母', { avatarLabel: '母', voiceType: 'female', ttsSpeakerLabel: 'hans_mother_female', requiresManualReview: true, notes: '和母親（ハンス・シュミットの母）可能是同一人' }, 4)
register('母親（ハンス・シュミットの母）', { avatarLabel: '母', voiceType: 'female', ttsSpeakerLabel: 'hans_mother_female', requiresManualReview: true, notes: '和ハンスの母可能是同一人' }, 4)
register('父亲（ハンズ的爸爸）', { avatarLabel: '父', voiceType: 'male', ttsSpeakerLabel: 'hans_father_male' }, 1)

// ---- Role-based speakers ----
register('顾客', { avatarLabel: '顾', voiceType: 'male', ttsSpeakerLabel: 'customer_male', roleBased: true }, 8)
register('お客様', { avatarLabel: '客', voiceType: 'male', ttsSpeakerLabel: 'customer_male', roleBased: true, notes: '和顾客可能是不同人（电话场景客户）' }, 8)
register('顾客A（客A）', { avatarLabel: '客', voiceType: 'male', ttsSpeakerLabel: 'customer_a_male', roleBased: true }, 8)
register('店员', { avatarLabel: '店', voiceType: 'female', ttsSpeakerLabel: 'clerk_female', roleBased: true, requiresManualReview: true, notes: '和店员（店員）可能是同一角色' }, 0)
register('店员（店員）', { avatarLabel: '店', voiceType: 'female', ttsSpeakerLabel: 'clerk_female', roleBased: true, requiresManualReview: true, notes: '和店员可能是同一角色' }, 0)
register('Wine Olive店员', { avatarLabel: '店', voiceType: 'female', ttsSpeakerLabel: 'wine_clerk_female', roleBased: true }, 0)
register('商场工作人员', { avatarLabel: '商', voiceType: 'female', ttsSpeakerLabel: 'mall_staff_female', roleBased: true }, 9)
register('工作人员', { avatarLabel: '工', voiceType: 'female', ttsSpeakerLabel: 'staff_female', roleBased: true }, 9)
register('駅員', { avatarLabel: '駅', voiceType: 'female', ttsSpeakerLabel: 'station_staff_female', roleBased: true }, 6)
register('站员', { avatarLabel: '站', voiceType: 'female', ttsSpeakerLabel: 'station_staff_female', roleBased: true, requiresManualReview: true, notes: '和駅員可能是同一角色不同语言' }, 6)
register('车站工作人员（站台）', { avatarLabel: '站', voiceType: 'female', ttsSpeakerLabel: 'platform_staff_female', roleBased: true }, 6)
register('乘客', { avatarLabel: '乘', voiceType: 'male', ttsSpeakerLabel: 'passenger_male', roleBased: true }, 7)
register('顾客（客人）', { avatarLabel: '顾', voiceType: 'male', ttsSpeakerLabel: 'customer_male', roleBased: true }, 8)
register('主人', { avatarLabel: '主', voiceType: 'male', ttsSpeakerLabel: 'host_male', roleBased: true, requiresManualReview: true, notes: '和主人（朋友）/友達（主人）可能是同一人' }, 5)
register('主人（朋友）', { avatarLabel: '主', voiceType: 'male', ttsSpeakerLabel: 'host_male', roleBased: true, requiresManualReview: true, notes: '和主人/友達（主人）可能是同一人' }, 5)
register('友達（主人）', { avatarLabel: '友', voiceType: 'male', ttsSpeakerLabel: 'friend_host_male', roleBased: true, requiresManualReview: true, notes: '和主人可能是同一人' }, 5)
register('客人（访问者）', { avatarLabel: '客', voiceType: 'male', ttsSpeakerLabel: 'visitor_male', roleBased: true }, 8)
register('先生', { avatarLabel: '先', voiceType: 'male', ttsSpeakerLabel: 'teacher_male', roleBased: true }, 1)
register('学生', { avatarLabel: '学', voiceType: 'female', ttsSpeakerLabel: 'student_female', roleBased: true }, 4)
register('发言学生', { avatarLabel: '发', voiceType: 'female', ttsSpeakerLabel: 'speaking_student_female', roleBased: true }, 4)
register('医生', { avatarLabel: '医', voiceType: 'male', ttsSpeakerLabel: 'doctor_male', roleBased: true }, 0)
register('警察', { avatarLabel: '警', voiceType: 'male', ttsSpeakerLabel: 'police_male', roleBased: true }, 1)
register('司机', { avatarLabel: '司', voiceType: 'male', ttsSpeakerLabel: 'driver_male', roleBased: true }, 2)
register('社員', { avatarLabel: '社', voiceType: 'male', ttsSpeakerLabel: 'employee_male', roleBased: true }, 7)
register('課長', { avatarLabel: '課', voiceType: 'male', ttsSpeakerLabel: 'kacho_male', roleBased: true }, 1)
register('導遊', { avatarLabel: '导', voiceType: 'female', ttsSpeakerLabel: 'guide_female', roleBased: true }, 5)
register('导游', { avatarLabel: '导', voiceType: 'female', ttsSpeakerLabel: 'guide_female', roleBased: true }, 5)
register('游客', { avatarLabel: '游', voiceType: 'male', ttsSpeakerLabel: 'tourist_male', roleBased: true }, 9)
register('司仪', { avatarLabel: '司', voiceType: 'female', ttsSpeakerLabel: 'mc_female', roleBased: true, requiresManualReview: true, notes: '和主持人/主催者可能是同一角色' }, 3)
register('主持人', { avatarLabel: '主', voiceType: 'female', ttsSpeakerLabel: 'host_female', roleBased: true, requiresManualReview: true, notes: '和司仪/主催者可能是同一角色' }, 3)
register('主催者', { avatarLabel: '主', voiceType: 'male', ttsSpeakerLabel: 'organizer_male', roleBased: true, requiresManualReview: true, notes: '和司仪/主持人可能是同一角色' }, 3)
register('インタビュアー（司会者）', { avatarLabel: '司', voiceType: 'female', ttsSpeakerLabel: 'interviewer_female', roleBased: true, requiresManualReview: true, notes: '和司仪/主持人可能是同一角色' }, 3)
register('係員（オペレーター）', { avatarLabel: '係', voiceType: 'female', ttsSpeakerLabel: 'operator_female', roleBased: true }, 9)
register('優勝者', { avatarLabel: '優', voiceType: 'male', ttsSpeakerLabel: 'winner_male', roleBased: true }, 2)
register('发型师', { avatarLabel: '发', voiceType: 'female', ttsSpeakerLabel: 'hairdresser_female', roleBased: true }, 4)
register('中介', { avatarLabel: '中', voiceType: 'female', ttsSpeakerLabel: 'agent_female', roleBased: true }, 5)
register('邻居', { avatarLabel: '邻', voiceType: 'male', ttsSpeakerLabel: 'neighbor_male', roleBased: true }, 7)
register('同事', { avatarLabel: '同', voiceType: 'male', ttsSpeakerLabel: 'colleague_male', roleBased: true }, 1)
register('同僚A', { avatarLabel: '同', voiceType: 'male', ttsSpeakerLabel: 'colleague_a_male', roleBased: true }, 1)
register('同僚B', { avatarLabel: '同', voiceType: 'male', ttsSpeakerLabel: 'colleague_b_male', roleBased: true }, 1)
register('迟到者', { avatarLabel: '迟', voiceType: 'male', ttsSpeakerLabel: 'latecomer_male', roleBased: true }, 9)
register('打电话的人', { avatarLabel: '电', voiceType: 'male', ttsSpeakerLabel: 'caller_male', roleBased: true }, 7)
register('朋友/同事', { avatarLabel: '朋', voiceType: 'male', ttsSpeakerLabel: 'friend_colleague_male', roleBased: true }, 5)
register('朋友（说话者）', { avatarLabel: '朋', voiceType: 'male', ttsSpeakerLabel: 'friend_speaker_male', roleBased: true }, 5)
register('另一位朋友', { avatarLabel: '朋', voiceType: 'male', ttsSpeakerLabel: 'another_friend_male', roleBased: true }, 5)
register('知人', { avatarLabel: '知', voiceType: 'male', ttsSpeakerLabel: 'acquaintance_male', roleBased: true }, 7)
register('知情人B', { avatarLabel: '知', voiceType: 'female', ttsSpeakerLabel: 'informant_female', roleBased: true }, 4)
register('询问者A', { avatarLabel: '询', voiceType: 'male', ttsSpeakerLabel: 'inquirer_male', roleBased: true, requiresManualReview: true, notes: '和質問者可能是同一角色类型' }, 1)
register('質問者', { avatarLabel: '質', voiceType: 'male', ttsSpeakerLabel: 'questioner_male', roleBased: true, requiresManualReview: true, notes: '和询问者A可能是同一角色类型' }, 1)
register('A（提议者）', { avatarLabel: 'A', voiceType: 'male', ttsSpeakerLabel: 'proposer_male', roleBased: true }, 2)
register('说话者（転勤する人）', { avatarLabel: '说', voiceType: 'male', ttsSpeakerLabel: 'transfer_person_male', roleBased: true }, 7)
register('玛丽亚', { avatarLabel: '玛', voiceType: 'female', ttsSpeakerLabel: 'maria_female', roleBased: false }, 4)
register('桑托斯', { avatarLabel: '桑', voiceType: 'male', ttsSpeakerLabel: 'santos_cn_male', roleBased: false, requiresManualReview: true, notes: '和サントス可能是同一人（中文名）' }, 3)
register('路人（人）', { avatarLabel: '路', voiceType: 'male', ttsSpeakerLabel: 'passerby_male', roleBased: true }, 6)
register('全员', { avatarLabel: '全', voiceType: 'male', ttsSpeakerLabel: 'everyone_male', roleBased: true }, 7)

// ---- Aliases for same-person detection ----
alias('ミラー', 'ミラーさん', 'ミラーさん（米勒先生）', '米勒先生（ミラーさん）', 'Miller', 'Miller (passenger)')
alias('サントス', 'サントスさん', '桑托斯')
alias('キムラさん', '木村さん')
alias('スズキさん', '鈴木さん', '铃木')
alias('松本さん', '松本忠史')
alias('ハンスの母', '母親（ハンス・シュミットの母）')
alias('駅員', '站员')
alias('主人', '主人（朋友）')
alias('司仪', '主持人', '主催者', 'インタビュアー（司会者）')
alias('询问者A', '質問者')
alias('店员', '店员（店員）')
alias('顾客', 'お客様')

export function getSpeaker(displayName: string): SpeakerEntry | undefined {
  const direct = Object.values(SPEAKER_REGISTRY).find(e => e.displayName === displayName)
  if (direct) return direct
  const aliased = Object.values(SPEAKER_REGISTRY).find(e => e.aliases?.includes(displayName))
  if (aliased) return aliased
  return undefined
}

export function resolveSpeakerAvatar(displayName: string): SpeakerAvatarStyle {
  const entry = getSpeaker(displayName)
  if (entry) {
    return { ...entry.avatar, label: entry.avatarLabel }
  }
  const label = displayName.trim().slice(0, 1) || '?'
  return {
    label,
    background: '#f1f5f9',
    border: '#cbd5e1',
    color: '#475569',
    activeBackground: '#e0f2fe',
    activeBorder: '#38bdf8',
    activeColor: '#075985',
  }
}
