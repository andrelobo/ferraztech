import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcrypt'
import { User, UserDocument } from '../modules/auth/schemas/user.schema'

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name)

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private configService: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    const email = this.configService.get<string>('ADMIN_EMAIL', 'admin@ferraztech.com')
    const password = this.configService.get<string>('ADMIN_PASSWORD', 'change-me')

    const existing = await this.userModel.findOne({ email }).exec()
    if (existing) {
      this.logger.log(`Admin user ${email} already exists, skipping seed`)
      return
    }

    const hashed = await bcrypt.hash(password, 10)
    await this.userModel.create({
      email,
      password: hashed,
      name: 'Admin',
    })
    this.logger.log(`Admin user ${email} created`)
  }
}
