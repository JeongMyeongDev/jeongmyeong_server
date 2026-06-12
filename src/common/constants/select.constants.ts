import { Prisma } from '@prisma/client';
import { PrismaService } from '../../modules/prisma/prisma.service';

/**
 * SelectionTarget의 공통 select 객체
 */
export const selectionTargetSelect = {
  id: true,
  debateId: true,
  sourceType: true,
  sourceId: true,
  selectedText: true,
  startOffset: true,
  endOffset: true,
  creator: {
    select: { id: true, nickname: true, profileImage: true },
  },
  createdAt: true,
} satisfies Prisma.SelectionTargetSelect;

/**
 * Consensus의 공통 select 객체
 */
export const consensusSelect = {
  id: true,
  debateId: true,
  selectionTargetId: true,
  creatorId: true,
  term: true,
  title: true,
  content: true,
  status: true,
  resultSummary: true,
  approvedAt: true,
  closedAt: true,
  createdAt: true,
  updatedAt: true,
  creator: {
    select: { id: true, nickname: true, profileImage: true },
  },
  selectionTarget: {
    select: selectionTargetSelect,
  },
} satisfies Prisma.ConsensusSelect;

/**
 * Debate 목록 요약용 select 객체
 */
export const debateListSelect = {
  id: true,
  title: true,
  description: true,
  debateType: true,
  status: true,
  createdAt: true,
  archivedAt: true,
  creator: {
    select: { id: true, nickname: true },
  },
  tagMaps: {
    select: {
      tag: { select: { id: true, name: true } },
    },
  },
  _count: {
    select: { participants: true },
  },
} satisfies Prisma.DebateSelect;

/**
 * Debate 상세 조회용 select 객체 (목록 + profileImage + definitions)
 */
export const debateSummarySelect = {
  ...debateListSelect,
  creator: {
    select: { id: true, nickname: true, profileImage: true },
  },
  participants: {
    orderBy: { joinedAt: 'asc' },
    select: {
      id: true,
      joinedAt: true,
      roleInDebate: true,
      user: {
        select: { id: true, nickname: true, profileImage: true },
      },
    },
  },
  definitions: {
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      term: true,
      content: true,
      createdAt: true,
    },
  },
} satisfies Prisma.DebateSelect;

/**
 * _count.participants를 participantCount로 변환하는 헬퍼
 */
export function withParticipantCount<T extends { _count?: { participants: number } }>(
  debate: T,
) {
  const { _count, ...rest } = debate;
  return {
    ...rest,
    participantCount: _count?.participants ?? 0,
  };
}

/**
 * 합의안에 투표 요약 정보(approveCount, rejectCount, commentCount, myVote)를 추가합니다.
 * DebatesService와 ConsensusesService에서 동일하게 사용됩니다.
 */
export async function withConsensusVoteSummary<T extends { id: string }>(
  prisma: PrismaService,
  consensus: T,
  userId?: string,
) {
  const [approveCount, rejectCount, commentCount] = await prisma.$transaction([
    prisma.consensusVote.count({
      where: { consensusId: consensus.id, voteType: 'APPROVE' },
    }),
    prisma.consensusVote.count({
      where: { consensusId: consensus.id, voteType: 'REJECT' },
    }),
    prisma.consensusVote.count({
      where: {
        consensusId: consensus.id,
        OR: [{ voteType: 'COMMENT' }, { comment: { not: null } }],
      },
    }),
  ]);

  const myVote = userId
    ? await prisma.consensusVote.findUnique({
        where: { consensusId_userId: { consensusId: consensus.id, userId } },
        select: {
          id: true,
          consensusId: true,
          userId: true,
          voteType: true,
          comment: true,
          updatedAt: true,
        },
      })
    : null;

  return {
    ...consensus,
    approveCount,
    rejectCount,
    commentCount,
    myVote,
  };
}
