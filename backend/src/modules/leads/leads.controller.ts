import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common'
import { LeadsService } from './leads.service'
import { CreateLeadDto } from './dto/create-lead.dto'
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

@UseGuards(JwtAuthGuard)
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  create(@Body() dto: CreateLeadDto) {
    return this.leadsService.create(dto)
  }

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('serviceType') serviceType?: string,
  ) {
    return this.leadsService.findAll({ status, serviceType })
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.leadsService.findOne(id)
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateLeadStatusDto,
  ) {
    return this.leadsService.updateStatus(id, dto)
  }
}
