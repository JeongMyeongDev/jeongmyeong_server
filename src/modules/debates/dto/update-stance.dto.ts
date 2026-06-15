import { IsIn } from 'class-validator';

export class UpdateStanceDto {
  @IsIn(['PRO', 'CON', 'NEUTRAL'])
  stance!: 'PRO' | 'CON' | 'NEUTRAL';
}
