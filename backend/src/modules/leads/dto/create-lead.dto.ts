import { IsString, IsNotEmpty, IsOptional, IsEmail } from 'class-validator'

export class CreateLeadDto {
  @IsString()
  @IsNotEmpty()
  name: string

  @IsString()
  @IsNotEmpty()
  phone: string

  @IsEmail()
  @IsOptional()
  email?: string

  @IsString()
  @IsNotEmpty()
  serviceType: string

  @IsString()
  @IsOptional()
  notes?: string
}
