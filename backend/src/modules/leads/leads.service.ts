import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Lead, LeadDocument } from './schemas/lead.schema'
import { CreateLeadDto } from './dto/create-lead.dto'
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto'

@Injectable()
export class LeadsService {
  constructor(
    @InjectModel(Lead.name) private leadModel: Model<LeadDocument>,
  ) {}

  async create(dto: CreateLeadDto): Promise<Lead> {
    return this.leadModel.create(dto)
  }

  async findAll(filters: {
    status?: string
    serviceType?: string
  }): Promise<Lead[]> {
    const query: any = {}
    if (filters.status) query.status = filters.status
    if (filters.serviceType) query.serviceType = filters.serviceType
    return this.leadModel.find(query).sort({ createdAt: -1 }).exec()
  }

  async findOne(id: string): Promise<Lead> {
    const lead = await this.leadModel.findById(id).exec()
    if (!lead) throw new NotFoundException('Lead not found')
    return lead
  }

  async updateStatus(id: string, dto: UpdateLeadStatusDto): Promise<Lead> {
    const lead = await this.leadModel
      .findByIdAndUpdate(id, { status: dto.status }, { new: true })
      .exec()
    if (!lead) throw new NotFoundException('Lead not found')
    return lead
  }
}
