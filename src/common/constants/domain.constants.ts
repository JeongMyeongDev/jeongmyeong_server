export const DEFAULT_CLIENT_URL = 'http://localhost:5173';
export const API_PREFIX = process.env.API_PREFIX ?? 'api';
export const PORT = Number(process.env.PORT ?? 3000);

export const DEBATE_TYPES = ['FREE', 'CONSENSUS', 'PROS_CONS'] as const;
export const DEBATE_STATUSES = ['OPEN', 'CLOSED', 'ARCHIVED'] as const;
export const CLOSE_CONDITION_TYPES = ['TIME_LIMIT', 'MANUAL', 'TARGET_REACHED'] as const;
export const SORT_FIELDS = ['createdAt', 'archivedAt', 'updatedAt'] as const;
export const SORT_DIRECTIONS = ['asc', 'desc'] as const;
export const DEFAULT_CHILD_DEBATE_TYPE = 'FREE' as const;
export const DEBATE_STANCES = ['PRO', 'CON', 'NEUTRAL'] as const;
export const SELECTION_SOURCES = ['POST', 'COMMENT'] as const;

export type DebateTypeValue = (typeof DEBATE_TYPES)[number];
export type DebateStatusValue = (typeof DEBATE_STATUSES)[number];
export type CloseConditionTypeValue = (typeof CLOSE_CONDITION_TYPES)[number];
export type SortFieldValue = (typeof SORT_FIELDS)[number];
export type SortDirectionValue = (typeof SORT_DIRECTIONS)[number];
export type DebateStanceValue = (typeof DEBATE_STANCES)[number];
export type SelectionSourceValue = (typeof SELECTION_SOURCES)[number];
