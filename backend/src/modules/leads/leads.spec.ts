import { Test, TestingModule } from '@nestjs/testing'
import { getModelToken } from '@nestjs/mongoose'
import { LeadsService } from './leads.service'
import { LeadsController } from './leads.controller'
import { Lead } from './schemas/lead.schema'
import { CreateLeadDto } from './dto/create-lead.dto'
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto'

const mockLead = {
  _id: 'lead-id-1',
  name: 'João Silva',
  phone: '5511999999999',
  email: 'joao@email.com',
  serviceType: 'consultoria',
  status: 'new',
  notes: '',
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockLeadModel = {
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  exec: jest.fn(),
}

describe('LeadsModule', () => {
  let controller: LeadsController
  let service: LeadsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeadsController],
      providers: [
        LeadsService,
        {
          provide: getModelToken(Lead.name),
          useValue: mockLeadModel,
        },
      ],
    }).compile()

    controller = module.get<LeadsController>(LeadsController)
    service = module.get<LeadsService>(LeadsService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('LeadsService', () => {
    it('should create a lead', async () => {
      const dto: CreateLeadDto = {
        name: 'João Silva',
        phone: '5511999999999',
        email: 'joao@email.com',
        serviceType: 'consultoria',
      }
      mockLeadModel.create.mockResolvedValue(mockLead)
      const result = await service.create(dto)
      expect(result).toEqual(mockLead)
      expect(mockLeadModel.create).toHaveBeenCalledWith(dto)
    })

    it('should find all leads with filters', async () => {
      const mockExec = jest.fn().mockResolvedValue([mockLead])
      const mockSort = jest.fn().mockReturnValue({ exec: mockExec })
      const mockFind = jest.fn().mockReturnValue({ sort: mockSort })
      mockLeadModel.find.mockImplementation(mockFind)

      const result = await service.findAll({ status: 'new' })
      expect(result).toEqual([mockLead])
      expect(mockFind).toHaveBeenCalledWith({ status: 'new' })
    })

    it('should find one lead by id', async () => {
      const mockExec = jest.fn().mockResolvedValue(mockLead)
      mockLeadModel.findById.mockReturnValue({ exec: mockExec })
      const result = await service.findOne('lead-id-1')
      expect(result).toEqual(mockLead)
      expect(mockLeadModel.findById).toHaveBeenCalledWith('lead-id-1')
    })

    it('should update lead status', async () => {
      const dto: UpdateLeadStatusDto = { status: 'contacted' }
      const updated = { ...mockLead, status: 'contacted' }
      const mockExec = jest.fn().mockResolvedValue(updated)
      mockLeadModel.findByIdAndUpdate.mockReturnValue({ exec: mockExec })
      const result = await service.updateStatus('lead-id-1', dto)
      expect(result).toEqual(updated)
      expect(mockLeadModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'lead-id-1',
        { status: 'contacted' },
        { new: true },
      )
    })
  })

  describe('LeadsController', () => {
    it('should create a lead via POST', async () => {
      const dto: CreateLeadDto = {
        name: 'João Silva',
        phone: '5511999999999',
        email: 'joao@email.com',
        serviceType: 'consultoria',
      }
      jest.spyOn(service, 'create').mockResolvedValue(mockLead as any)
      const result = await controller.create(dto)
      expect(result).toEqual(mockLead)
    })

    it('should list leads via GET', async () => {
      jest.spyOn(service, 'findAll').mockResolvedValue([mockLead] as any)
      const result = await controller.findAll('new', undefined)
      expect(result).toEqual([mockLead])
    })

    it('should get one lead via GET/:id', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockLead as any)
      const result = await controller.findOne('lead-id-1')
      expect(result).toEqual(mockLead)
    })

    it('should update status via PATCH/:id/status', async () => {
      const dto: UpdateLeadStatusDto = { status: 'contacted' }
      const updated = { ...mockLead, status: 'contacted' }
      jest.spyOn(service, 'updateStatus').mockResolvedValue(updated as any)
      const result = await controller.updateStatus('lead-id-1', dto)
      expect(result).toEqual(updated)
    })
  })
})
