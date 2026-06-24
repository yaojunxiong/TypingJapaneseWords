export type SpeakerAvatarStyle = {
  emoji: string
  background: string
  border: string
  activeBackground: string
  activeBorder: string
}

export type SpeakerEntry = {
  speakerId: string
  displayName: string
  avatarEmoji: string
  avatar: Omit<SpeakerAvatarStyle, 'emoji'>
  voiceType: 'male' | 'female'
  ttsSpeakerLabel: string
  roleBased: boolean
  requiresManualReview: boolean
  notes?: string
  aliases?: string[]
}

const AVATARS: Record<string, Omit<SpeakerAvatarStyle, 'emoji'>> = {
  pink: {
    background: '#fce7f3',
    border: '#f9a8d4',
    activeBackground: '#fbcfe8',
    activeBorder: '#ec4899',
  },
  blue: {
    background: '#dbeafe',
    border: '#93c5fd',
    activeBackground: '#bfdbfe',
    activeBorder: '#3b82f6',
  },
  amber: {
    background: '#fef3c7',
    border: '#fcd34d',
    activeBackground: '#fde68a',
    activeBorder: '#f59e0b',
  },
  green: {
    background: '#dcfce7',
    border: '#86efac',
    activeBackground: '#bbf7d0',
    activeBorder: '#22c55e',
  },
  purple: {
    background: '#f3e8ff',
    border: '#d8b4fe',
    activeBackground: '#e9d5ff',
    activeBorder: '#a855f7',
  },
  slate: {
    background: '#f1f5f9',
    border: '#cbd5e1',
    activeBackground: '#e0f2fe',
    activeBorder: '#38bdf8',
  },
  teal: {
    background: '#ccfbf1',
    border: '#5eead4',
    activeBackground: '#a7f3d0',
    activeBorder: '#14b8a6',
  },
  rose: {
    background: '#ffe4e6',
    border: '#fda4af',
    activeBackground: '#fecdd3',
    activeBorder: '#f43f5e',
  },
  indigo: {
    background: '#e0e7ff',
    border: '#a5b4fc',
    activeBackground: '#c7d2fe',
    activeBorder: '#6366f1',
  },
  cyan: {
    background: '#cffafe',
    border: '#67e8f9',
    activeBackground: '#a5f3fc',
    activeBorder: '#06b6d4',
  },
  orange: {
    background: '#ffedd5',
    border: '#fdba74',
    activeBackground: '#fed7aa',
    activeBorder: '#f97316',
  },
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
  const emoji = overrides?.avatarEmoji ?? '🧑'

  const entry: SpeakerEntry = {
    speakerId: `spk_${displayName.replace(/[^a-zA-Z0-9\u3040-\u9FFF\uF900-\uFAFF]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'unknown'}`,
    displayName,
    avatarEmoji: emoji,
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
register('佐藤', { avatarEmoji: '👩', voiceType: 'female', ttsSpeakerLabel: 'sato_female' }, 0)
register('山田', { avatarEmoji: '👨', voiceType: 'male', ttsSpeakerLabel: 'yamada_male' }, 1)
register('山田一郎', { avatarEmoji: '👨', voiceType: 'male', ttsSpeakerLabel: 'yamada_ichiro_male', requiresManualReview: true, notes: '可能和L1山田是同一人，需确认' }, 1)
register('ミラー', { avatarEmoji: '👱', voiceType: 'male', ttsSpeakerLabel: 'miller_male' }, 2)
register('サントス', { avatarEmoji: '👱', voiceType: 'male', ttsSpeakerLabel: 'santos_male', requiresManualReview: true, notes: '和サントスさん可能是同一人' }, 3)
register('キムラさん', { avatarEmoji: '👩', voiceType: 'female', ttsSpeakerLabel: 'kimura_female' }, 4)
register('クララさん', { avatarEmoji: '👩', voiceType: 'female', ttsSpeakerLabel: 'clara_female' }, 5)
register('シュミッドさん', { avatarEmoji: '👱', voiceType: 'male', ttsSpeakerLabel: 'schmidt_male' }, 6)
register('スズキさん', { avatarEmoji: '👨', voiceType: 'male', ttsSpeakerLabel: 'suzuki_male', requiresManualReview: true, notes: '和鈴木さん/铃木可能是同一人' }, 7)
register('ワンさん（Wang）', { avatarEmoji: '👩', voiceType: 'female', ttsSpeakerLabel: 'wang_female' }, 8)
register('小川さん', { avatarEmoji: '👨', voiceType: 'male', ttsSpeakerLabel: 'ogawa_male' }, 9)
register('木村さん', { avatarEmoji: '👩', voiceType: 'female', ttsSpeakerLabel: 'kimura_female', requiresManualReview: true, notes: '和キムラさん可能是同一人' }, 4)
register('松本さん', { avatarEmoji: '👨', voiceType: 'male', ttsSpeakerLabel: 'matsumoto_male', requiresManualReview: true, notes: '和松本忠史可能是同一人' }, 6)
register('松本忠史', { avatarEmoji: '👨', voiceType: 'male', ttsSpeakerLabel: 'matsumoto_tadashi_male', requiresManualReview: true, notes: '和松本さん可能是同一人' }, 6)
register('林さん', { avatarEmoji: '👨', voiceType: 'male', ttsSpeakerLabel: 'hayashi_male' }, 8)
register('渡辺さん', { avatarEmoji: '👩', voiceType: 'female', ttsSpeakerLabel: 'watanabe_female' }, 9)
register('高井さん', { avatarEmoji: '👨', voiceType: 'male', ttsSpeakerLabel: 'takai_male' }, 0)
register('铃木', { avatarEmoji: '👨', voiceType: 'male', ttsSpeakerLabel: 'suzuki_male', requiresManualReview: true, notes: '和スズキさん/鈴木さん可能是同一人' }, 7)
register('鈴木さん', { avatarEmoji: '👨', voiceType: 'male', ttsSpeakerLabel: 'suzuki_male', requiresManualReview: true, notes: '和スズキさん/铃木可能是同一人' }, 7)
register('サントスさん', { avatarEmoji: '👱', voiceType: 'male', ttsSpeakerLabel: 'santos_male', requiresManualReview: true, notes: '和サントス可能是同一人' }, 3)
register('ターコン君（B）', { avatarEmoji: '👦', voiceType: 'male', ttsSpeakerLabel: 'tarcon_male' }, 3)
register('Asuka', { avatarEmoji: '👩', voiceType: 'female', ttsSpeakerLabel: 'asuka_female' }, 4)
register('泉さん', { avatarEmoji: '👩', voiceType: 'female', ttsSpeakerLabel: 'izumi_female' }, 5)

// ---- Miller variants (same person, different naming) ----
register('ミラーさん', { avatarEmoji: '👱', voiceType: 'male', ttsSpeakerLabel: 'miller_male', requiresManualReview: true, notes: '和ミラー是同一人（Mike Miller）的不同称呼' }, 2)
register('ミラーさん（米勒先生）', { avatarEmoji: '👱', voiceType: 'male', ttsSpeakerLabel: 'miller_male', requiresManualReview: true, notes: '和ミラー是同一人' }, 2)
register('米勒先生（ミラーさん）', { avatarEmoji: '👱', voiceType: 'male', ttsSpeakerLabel: 'miller_male', requiresManualReview: true, notes: '和ミラー是同一人' }, 2)
register('Miller', { avatarEmoji: '👱', voiceType: 'male', ttsSpeakerLabel: 'miller_male', requiresManualReview: true, notes: '和ミラー是同一人' }, 2)
register('Miller (passenger)', { avatarEmoji: '👱', voiceType: 'male', ttsSpeakerLabel: 'miller_male', requiresManualReview: true, notes: '和ミラー是同一人（乘客场景）' }, 2)

// ---- Family variants ----
register('ハンスの母', { avatarEmoji: '👩', voiceType: 'female', ttsSpeakerLabel: 'hans_mother_female', requiresManualReview: true, notes: '和母親（ハンス・シュミットの母）可能是同一人' }, 4)
register('母親（ハンス・シュミットの母）', { avatarEmoji: '👩', voiceType: 'female', ttsSpeakerLabel: 'hans_mother_female', requiresManualReview: true, notes: '和ハンスの母可能是同一人' }, 4)
register('父亲（ハンズ的爸爸）', { avatarEmoji: '👨', voiceType: 'male', ttsSpeakerLabel: 'hans_father_male' }, 1)

// ---- Role-based speakers ----
register('顾客', { avatarEmoji: '🧑', voiceType: 'male', ttsSpeakerLabel: 'customer_male', roleBased: true }, 8)
register('お客様', { avatarEmoji: '🧑', voiceType: 'male', ttsSpeakerLabel: 'customer_male', roleBased: true, notes: '和顾客可能是不同人（电话场景客户）' }, 8)
register('顾客A（客A）', { avatarEmoji: '🧑', voiceType: 'male', ttsSpeakerLabel: 'customer_a_male', roleBased: true }, 8)
register('店员', { avatarEmoji: '🧑‍💼', voiceType: 'female', ttsSpeakerLabel: 'clerk_female', roleBased: true, requiresManualReview: true, notes: '和店员（店員）可能是同一角色' }, 0)
register('店员（店員）', { avatarEmoji: '🧑‍💼', voiceType: 'female', ttsSpeakerLabel: 'clerk_female', roleBased: true, requiresManualReview: true, notes: '和店员可能是同一角色' }, 0)
register('Wine Olive店员', { avatarEmoji: '🧑‍💼', voiceType: 'female', ttsSpeakerLabel: 'wine_clerk_female', roleBased: true }, 0)
register('商场工作人员', { avatarEmoji: '🧑‍💼', voiceType: 'female', ttsSpeakerLabel: 'mall_staff_female', roleBased: true }, 9)
register('工作人员', { avatarEmoji: '🧑‍💼', voiceType: 'female', ttsSpeakerLabel: 'staff_female', roleBased: true }, 9)
register('駅員', { avatarEmoji: '🧑‍💼', voiceType: 'female', ttsSpeakerLabel: 'station_staff_female', roleBased: true }, 6)
register('站员', { avatarEmoji: '🧑‍💼', voiceType: 'female', ttsSpeakerLabel: 'station_staff_female', roleBased: true, requiresManualReview: true, notes: '和駅員可能是同一角色不同语言' }, 6)
register('车站工作人员（站台）', { avatarEmoji: '🧑‍💼', voiceType: 'female', ttsSpeakerLabel: 'platform_staff_female', roleBased: true }, 6)
register('乘客', { avatarEmoji: '🧑', voiceType: 'male', ttsSpeakerLabel: 'passenger_male', roleBased: true }, 7)
register('顾客（客人）', { avatarEmoji: '🧑', voiceType: 'male', ttsSpeakerLabel: 'customer_male', roleBased: true }, 8)
register('主人', { avatarEmoji: '🧑', voiceType: 'male', ttsSpeakerLabel: 'host_male', roleBased: true, requiresManualReview: true, notes: '和主人（朋友）/友達（主人）可能是同一人' }, 5)
register('主人（朋友）', { avatarEmoji: '🧑', voiceType: 'male', ttsSpeakerLabel: 'host_male', roleBased: true, requiresManualReview: true, notes: '和主人/友達（主人）可能是同一人' }, 5)
register('友達（主人）', { avatarEmoji: '🧑', voiceType: 'male', ttsSpeakerLabel: 'friend_host_male', roleBased: true, requiresManualReview: true, notes: '和主人可能是同一人' }, 5)
register('客人（访问者）', { avatarEmoji: '🧑', voiceType: 'male', ttsSpeakerLabel: 'visitor_male', roleBased: true }, 8)
register('先生', { avatarEmoji: '👨‍🏫', voiceType: 'male', ttsSpeakerLabel: 'teacher_male', roleBased: true }, 1)
register('学生', { avatarEmoji: '🧑‍🎓', voiceType: 'female', ttsSpeakerLabel: 'student_female', roleBased: true }, 4)
register('发言学生', { avatarEmoji: '🧑‍🎓', voiceType: 'female', ttsSpeakerLabel: 'speaking_student_female', roleBased: true }, 4)
register('医生', { avatarEmoji: '👨‍⚕️', voiceType: 'male', ttsSpeakerLabel: 'doctor_male', roleBased: true }, 0)
register('警察', { avatarEmoji: '👮', voiceType: 'male', ttsSpeakerLabel: 'police_male', roleBased: true }, 1)
register('司机', { avatarEmoji: '🧑‍✈️', voiceType: 'male', ttsSpeakerLabel: 'driver_male', roleBased: true }, 2)
register('社員', { avatarEmoji: '🧑‍💼', voiceType: 'male', ttsSpeakerLabel: 'employee_male', roleBased: true }, 7)
register('課長', { avatarEmoji: '👨‍💼', voiceType: 'male', ttsSpeakerLabel: 'kacho_male', roleBased: true }, 1)
register('導遊', { avatarEmoji: '🧑‍✈️', voiceType: 'female', ttsSpeakerLabel: 'guide_female', roleBased: true }, 5)
register('导游', { avatarEmoji: '🧑‍✈️', voiceType: 'female', ttsSpeakerLabel: 'guide_female', roleBased: true }, 5)
register('游客', { avatarEmoji: '🧑', voiceType: 'male', ttsSpeakerLabel: 'tourist_male', roleBased: true }, 9)
register('司仪', { avatarEmoji: '🧑‍💼', voiceType: 'female', ttsSpeakerLabel: 'mc_female', roleBased: true, requiresManualReview: true, notes: '和主持人/主催者可能是同一角色' }, 3)
register('主持人', { avatarEmoji: '🧑‍💼', voiceType: 'female', ttsSpeakerLabel: 'host_female', roleBased: true, requiresManualReview: true, notes: '和司仪/主催者可能是同一角色' }, 3)
register('主催者', { avatarEmoji: '🧑‍💼', voiceType: 'male', ttsSpeakerLabel: 'organizer_male', roleBased: true, requiresManualReview: true, notes: '和司仪/主持人可能是同一角色' }, 3)
register('インタビュアー（司会者）', { avatarEmoji: '🧑‍💼', voiceType: 'female', ttsSpeakerLabel: 'interviewer_female', roleBased: true, requiresManualReview: true, notes: '和司仪/主持人可能是同一角色' }, 3)
register('係員（オペレーター）', { avatarEmoji: '🧑‍💼', voiceType: 'female', ttsSpeakerLabel: 'operator_female', roleBased: true }, 9)
register('優勝者', { avatarEmoji: '🏆', voiceType: 'male', ttsSpeakerLabel: 'winner_male', roleBased: true }, 2)
register('发型师', { avatarEmoji: '💇', voiceType: 'female', ttsSpeakerLabel: 'hairdresser_female', roleBased: true }, 4)
register('中介', { avatarEmoji: '🧑‍💼', voiceType: 'female', ttsSpeakerLabel: 'agent_female', roleBased: true }, 5)
register('邻居', { avatarEmoji: '🧑', voiceType: 'male', ttsSpeakerLabel: 'neighbor_male', roleBased: true }, 7)
register('同事', { avatarEmoji: '🧑‍💼', voiceType: 'male', ttsSpeakerLabel: 'colleague_male', roleBased: true }, 1)
register('同僚A', { avatarEmoji: '🧑‍💼', voiceType: 'male', ttsSpeakerLabel: 'colleague_a_male', roleBased: true }, 1)
register('同僚B', { avatarEmoji: '🧑‍💼', voiceType: 'male', ttsSpeakerLabel: 'colleague_b_male', roleBased: true }, 1)
register('迟到者', { avatarEmoji: '🧑', voiceType: 'male', ttsSpeakerLabel: 'latecomer_male', roleBased: true }, 9)
register('打电话的人', { avatarEmoji: '🧑', voiceType: 'male', ttsSpeakerLabel: 'caller_male', roleBased: true }, 7)
register('朋友/同事', { avatarEmoji: '🧑', voiceType: 'male', ttsSpeakerLabel: 'friend_colleague_male', roleBased: true }, 5)
register('朋友（说话者）', { avatarEmoji: '🧑', voiceType: 'male', ttsSpeakerLabel: 'friend_speaker_male', roleBased: true }, 5)
register('另一位朋友', { avatarEmoji: '🧑', voiceType: 'male', ttsSpeakerLabel: 'another_friend_male', roleBased: true }, 5)
register('知人', { avatarEmoji: '🧑', voiceType: 'male', ttsSpeakerLabel: 'acquaintance_male', roleBased: true }, 7)
register('知情人B', { avatarEmoji: '🧑', voiceType: 'female', ttsSpeakerLabel: 'informant_female', roleBased: true }, 4)
register('询问者A', { avatarEmoji: '🧑', voiceType: 'male', ttsSpeakerLabel: 'inquirer_male', roleBased: true, requiresManualReview: true, notes: '和質問者可能是同一角色类型' }, 1)
register('質問者', { avatarEmoji: '🧑', voiceType: 'male', ttsSpeakerLabel: 'questioner_male', roleBased: true, requiresManualReview: true, notes: '和询问者A可能是同一角色类型' }, 1)
register('A（提议者）', { avatarEmoji: '🧑', voiceType: 'male', ttsSpeakerLabel: 'proposer_male', roleBased: true }, 2)
register('说话者（転勤する人）', { avatarEmoji: '🧑', voiceType: 'male', ttsSpeakerLabel: 'transfer_person_male', roleBased: true }, 7)
register('玛丽亚', { avatarEmoji: '👩', voiceType: 'female', ttsSpeakerLabel: 'maria_female' }, 4)
register('桑托斯', { avatarEmoji: '👱', voiceType: 'male', ttsSpeakerLabel: 'santos_cn_male', requiresManualReview: true, notes: '和サントス可能是同一人（中文名）' }, 3)
register('路人（人）', { avatarEmoji: '🧑', voiceType: 'male', ttsSpeakerLabel: 'passerby_male', roleBased: true }, 6)
register('全员', { avatarEmoji: '👥', voiceType: 'male', ttsSpeakerLabel: 'everyone_male', roleBased: true }, 7)

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
    return { ...entry.avatar, emoji: entry.avatarEmoji }
  }
  return {
    emoji: '🧑',
    background: '#f1f5f9',
    border: '#cbd5e1',
    activeBackground: '#e0f2fe',
    activeBorder: '#38bdf8',
  }
}
