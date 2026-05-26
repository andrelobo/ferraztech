import { IsString, IsIn } from 'class-validator'

export class UpdateLeadStatusDto {
  @IsString()
  @IsIn(['new', 'contacted', 'qualified', 'converted', 'lost'])
  status: string
}
