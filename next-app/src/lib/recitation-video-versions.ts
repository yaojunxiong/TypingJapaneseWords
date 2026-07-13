const TITLE_MARKER = '教材原声会话视频'

export type OriginalAudioLinePlanItem = {
  audioSource?: string
}

export type RecitationVideoProjectRow = {
  id: string
  lesson_no: number
  title: string | null
  template_type: string | null
  line_plan: OriginalAudioLinePlanItem[] | null
  background_url: string | null
  public_video_url: string | null
  published_at: string | null
}

export type PublicRecitationVideo = {
  id: string
  lessonNo: number
  title: string
  versionKey: string
  versionNo: number
  versionLabel: string
  versionLabelEn: string
  thumbnailUrl: string
  publicVideoUrl: string
  publishedAt: string
  audioType: '教材原声'
}

function isPureOriginalAudioProject(project: RecitationVideoProjectRow) {
  if (!project.title?.includes(TITLE_MARKER)) return false
  if (!project.public_video_url || !project.published_at) return false

  const lines = Array.isArray(project.line_plan) ? project.line_plan : []
  const effectiveLines = lines.filter((line) => line.audioSource !== 'skip')
  return effectiveLines.length > 0 &&
    effectiveLines.every((line) => line.audioSource === 'original_audio')
}

function editionName(project: RecitationVideoProjectRow) {
  if (
    project.template_type?.startsWith('storyboard_vertical') ||
    project.title?.includes('分镜图解版') ||
    project.title?.includes('分镜版')
  ) {
    return { label: '分镜图解版', labelEn: 'Storyboard edition' }
  }

  const titleVersion = project.title
    ?.split('·')
    .slice(2)
    .join('·')
    .trim()
    .replace(/^V\d+\s*/i, '')
    .trim()
  if (titleVersion) {
    return { label: titleVersion, labelEn: titleVersion }
  }

  return { label: '原会话图版', labelEn: 'Original artwork edition' }
}

function publishedTime(project: RecitationVideoProjectRow) {
  const value = Date.parse(project.published_at || '')
  return Number.isFinite(value) ? value : 0
}

export function buildPublicRecitationVideos(
  projects: RecitationVideoProjectRow[]
): PublicRecitationVideo[] {
  const eligible = projects.filter(isPureOriginalAudioProject)
  const versionNumberById = new Map<string, number>()
  const projectsByLesson = new Map<number, RecitationVideoProjectRow[]>()

  for (const project of eligible) {
    const lessonProjects = projectsByLesson.get(project.lesson_no) || []
    lessonProjects.push(project)
    projectsByLesson.set(project.lesson_no, lessonProjects)
  }

  for (const lessonProjects of projectsByLesson.values()) {
    lessonProjects
      .sort((a, b) => publishedTime(a) - publishedTime(b) || a.id.localeCompare(b.id))
      .forEach((project, index) => versionNumberById.set(project.id, index + 1))
  }

  return eligible
    .sort((a, b) =>
      a.lesson_no - b.lesson_no ||
      publishedTime(b) - publishedTime(a) ||
      a.id.localeCompare(b.id)
    )
    .map((project) => {
      const versionNo = versionNumberById.get(project.id) || 1
      const edition = editionName(project)
      return {
        id: project.id,
        lessonNo: project.lesson_no,
        title: project.title || `第${project.lesson_no}课 · ${TITLE_MARKER}`,
        versionKey: `lesson-${String(project.lesson_no).padStart(2, '0')}-${project.id}`,
        versionNo,
        versionLabel: `V${versionNo} · ${edition.label}`,
        versionLabelEn: `V${versionNo} · ${edition.labelEn}`,
        thumbnailUrl: project.background_url ||
          `/minna/lessons/lesson-${String(project.lesson_no).padStart(2, '0')}/conversation-anime-mobile.webp`,
        publicVideoUrl: project.public_video_url as string,
        publishedAt: project.published_at as string,
        audioType: '教材原声' as const,
      }
    })
}
