/**
 * Envelope validator for Study Service responses.
 */
import type { StudyLessonEnvelope, SimulationEnrichment } from '@/types/study-api';

export interface EnvelopeValidationError {
  field: string;
  message: string;
}

export function validateSimulationEnrichment(
  data: unknown,
): { valid: false; errors: EnvelopeValidationError[] } | { valid: true; value: SimulationEnrichment } {
  const errors: EnvelopeValidationError[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: [{ field: 'enrichment', message: 'not an object' }] };
  }

  const d = data as Record<string, unknown>;

  if (!d.scene || typeof d.scene !== 'object') {
    errors.push({ field: 'simulation.scene', message: 'missing or invalid scene' });
  }

  if (!Array.isArray(d.characters)) {
    errors.push({ field: 'simulation.characters', message: 'missing or invalid characters array' });
  }

  if (!Array.isArray(d.nodes)) {
    errors.push({ field: 'simulation.nodes', message: 'missing or invalid nodes array' });
  }

  if (!d.learnerStates || typeof d.learnerStates !== 'object') {
    errors.push({ field: 'simulation.learnerStates', message: 'missing or invalid learnerStates' });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, value: d as unknown as SimulationEnrichment };
}

export function validateStudyLessonEnvelope(
  data: unknown,
): { valid: false; errors: EnvelopeValidationError[] } | { valid: true; value: StudyLessonEnvelope } {
  const errors: EnvelopeValidationError[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: [{ field: 'envelope', message: 'not an object' }] };
  }

  const d = data as Record<string, unknown>;

  if (!d.lesson || typeof d.lesson !== 'object') {
    errors.push({ field: 'lesson', message: 'missing or invalid' });
  }

  if (!Array.isArray(d.summaries)) {
    errors.push({ field: 'summaries', message: 'missing or invalid' });
  }

  if (!d.simulation || typeof d.simulation !== 'object') {
    errors.push({ field: 'simulation', message: 'missing or invalid' });
  }

  if (!d.meta || typeof d.meta !== 'object') {
    errors.push({ field: 'meta', message: 'missing or invalid' });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, value: d as unknown as StudyLessonEnvelope };
}
