import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';

const MAX_COMMUNITY_TEXT_LENGTH = 5000;

export const getCommunityTextValidationError = (input: string) => {
  const text = input.normalize('NFC');

  if (text.length > MAX_COMMUNITY_TEXT_LENGTH) {
    return '내용은 5000자 이하로 입력해 주세요.';
  }

  if (/\p{Mark}{4,}/u.test(text)) {
    return '같은 문자에 특수 기호가 과도하게 반복되었습니다.';
  }

  if (/(.)\1{30,}/u.test(text)) {
    return '같은 문자를 과도하게 반복할 수 없습니다.';
  }

  return null;
};

export const validateCommunityText = (input: string) => {
  const errorMessage = getCommunityTextValidationError(input);
  if (errorMessage) {
    throw new Error(errorMessage);
  }
};

export const IsCommunityText = (validationOptions?: ValidationOptions) => {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isCommunityText',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return true;
          return getCommunityTextValidationError(value) === null;
        },
        defaultMessage(args: ValidationArguments) {
          const value = args.value as unknown;
          if (typeof value !== 'string') {
            return '내용을 문자열로 입력해 주세요.';
          }
          return (
            getCommunityTextValidationError(value) ??
            '내용을 입력할 수 없습니다.'
          );
        },
      },
    });
  };
};
