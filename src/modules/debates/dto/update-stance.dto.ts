import { IsIn } from 'class-validator';
import { DEBATE_STANCES, type DebateStanceValue } from '../../../common/constants/domain.constants';

export class UpdateStanceDto {
  @IsIn(DEBATE_STANCES)
  stance!: DebateStanceValue;
}
