const DELETED_USER_NICKNAME_PATTERN = /^deleted_user_[a-z0-9]+_\d+$/i;

type RecordValue = string | number | boolean | null | undefined | Date | Record<string, unknown> | unknown[];

const isRecord = (value: unknown): value is Record<string, RecordValue> =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date);

const isDeletedUserRecord = (value: Record<string, RecordValue>) =>
  value.status === 'DELETED' ||
  (typeof value.nickname === 'string' && DELETED_USER_NICKNAME_PATTERN.test(value.nickname));

export const maskDeletedUserDisplay = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(maskDeletedUserDisplay);
  }

  if (!isRecord(value)) {
    return value;
  }

  const next = Object.fromEntries(
    Object.entries(value).map(([key, childValue]) => [key, maskDeletedUserDisplay(childValue)]),
  ) as Record<string, unknown>;

  if (isDeletedUserRecord(value)) {
    next.nickname = '탈퇴한 사용자';
    if ('profileImage' in next) {
      next.profileImage = null;
    }
  }

  return next;
};
