export const AUTH_MESSAGES = {
  SUSPENDED_ACCOUNT: '정지된 계정입니다. 제재 내역을 확인해 주세요.',
} as const;

export const DEBATE_MESSAGES = {
  CONSENSUS_BLOCK: '진행 중인 합의 또는 하위 토론이 있어 새 의견을 작성할 수 없습니다.',
  CLOSED_WRITE: '종료된 토론에서는 새 내용을 작성할 수 없습니다.',
  ARCHIVED_WRITE: '아카이브된 토론은 읽기 전용입니다.',
  PROS_CONS_STANCE_REQUIRED: '찬반 토론에서는 입장을 선택해야 의견을 작성할 수 있습니다.',
  NOT_FOUND: '토론을 찾을 수 없습니다.',
  SELECTION_TARGET_NOT_FOUND: '선택 대상을 찾을 수 없습니다.',
  SELECTION_TARGET_NOT_IN_DEBATE: '선택 대상이 요청한 토론에 속하지 않습니다.',
  DUPLICATE_CONSENSUS: '동일한 합의안이 이미 제안되어 있습니다.',
  ALREADY_CLOSED: '이미 종료된 토론입니다.',
  ALREADY_ARCHIVED: '이미 아카이브된 토론입니다.',
  ONLY_CLOSED_CAN_ARCHIVE: '종료된 토론만 아카이브할 수 있습니다.',
  CLOSE_BLOCKED: '진행 중인 합의 또는 하위 토론이 있어 토론을 종료할 수 없습니다.',
} as const;
