import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IsCommunityText } from '../../../common/validators/community-text.validator';

export class CreateChildDebateDto {
  @IsString()
  @IsNotEmpty()
  @IsCommunityText()
  title!: string;

  @IsString()
  @IsNotEmpty()
  @IsCommunityText()
  description!: string;

  @IsOptional()
  @IsIn(['FREE', 'CONSENSUS', 'PROS_CONS'])
  debateType?: 'FREE' | 'CONSENSUS' | 'PROS_CONS';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsCommunityText({ each: true })
  tags?: string[];
}
