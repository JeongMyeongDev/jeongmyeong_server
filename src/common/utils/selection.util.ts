import { BadRequestException } from '@nestjs/common';

/**
 * 선택 영역의 유효성을 검증합니다.
 * DebatesService와 PostsService에서 동일한 로직이 중복되어 있어 통합합니다.
 */
export function validateSelection(
  sourceContent: string,
  selectedText: string,
  startOffset: number,
  endOffset: number,
) {
  if (startOffset >= endOffset || endOffset > sourceContent.length) {
    throw new BadRequestException('선택 영역 범위가 올바르지 않습니다.');
  }

  if (sourceContent.slice(startOffset, endOffset) !== selectedText) {
    throw new BadRequestException('선택한 문자열이 원문과 일치하지 않습니다.');
  }
}
