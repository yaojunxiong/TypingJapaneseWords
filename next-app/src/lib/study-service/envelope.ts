/**
 * Envelope builder — assembles a complete StudyLessonEnvelope
 * from the canonical teaching dataset embedded in the Study Service.
 */
import type {
  StudyLessonEnvelope,
  SimulationEnrichment,
  LessonMedia,
} from '@/types/study-api';
import type { SimulationSourceData } from '@/types/study-api';
import { getStudyLessonDetail, listStudyLessonSummaries } from './service';

export async function buildLessonEnvelope(
  lessonNo: number,
): Promise<StudyLessonEnvelope | null> {
  // 1. Load lesson detail
  const lessonDetail = await getStudyLessonDetail(lessonNo);
  if (!lessonDetail) return null;

  // 2. Load lesson summaries for navigation
  const allSummaries = await listStudyLessonSummaries();

  // 3. Load simulation enrichment from embedded JSON
  let simulation: SimulationEnrichment | null = null;
  try {
    const simModule = await import(
      `@/data/minna/simulation/lesson-${String(lessonNo).padStart(2, '0')}.json`
    );
    const simData = (simModule as { default?: unknown; [key: string]: unknown }).default
      ?? simModule;
    simulation = simulationDataToEnrichment(simData as SimulationSourceData);
  } catch {
    return null;
  }

  if (!simulation) return null;

  // 4. Extract conversation image URL from lesson media
  const sceneImage = lessonDetail.media.find(
    (m) => m.kind === 'scene_image',
  );
  const conversationImageUrl = sceneImage?.url
    ?? simulation.scene.image
    ?? null;

  // 5. Build audio URL map — key by line sequence + speaker
  const audioUrls: Record<string, string> = {};
  const audioMediaMap = new Map<string, LessonMedia>(
    lessonDetail.media
      .filter((m) => m.kind === 'original_audio')
      .map((m) => [m.mediaId, m]),
  );

  for (const line of lessonDetail.lines) {
    if (line.audioMediaId) {
      const media = audioMediaMap.get(line.audioMediaId);
      if (media?.url) {
        const key = `${line.roleId ?? 'unknown'}:${line.japanese.slice(0, 20)}`;
        audioUrls[key] = media.url;
      }
    }
  }

  // Supplement with simulation node audio URLs
  for (const node of simulation.nodes) {
    if (node.audio) {
      const key = `${node.speaker}:${(node.targetText ?? '').slice(0, 20)}`;
      if (!audioUrls[key]) {
        audioUrls[key] = node.audio;
      }
    }
  }

  return {
    lesson: lessonDetail,
    summaries: allSummaries,
    conversationImageUrl,
    audioUrls,
    simulation,
    meta: {
      schemaVersion: '1',
      datasetVersion: simulation.quality?.notes ?? 'canonical',
      generatedAt: new Date().toISOString(),
    },
  };
}

function simulationDataToEnrichment(data: SimulationSourceData): SimulationEnrichment {
  return {
    scene: data.scene ?? {},
    characters: data.characters ?? [],
    nodes: data.nodes ?? [],
    learnerStates: data.learnerStates ?? {},
    redirectPolicy: data.redirectPolicy ?? {},
    observationSchema: data.observationSchema ?? {},
    quality: data.quality ?? {
      verifiedBy: 'unknown',
      verifiedAt: '',
      notes: 'missing quality metadata',
    },
  };
}
