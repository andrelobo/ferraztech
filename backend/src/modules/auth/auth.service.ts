import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcrypt'
import { User, UserDocument } from './schemas/user.schema'
import { LoginDto } from './dto/login.dto'

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(dto: LoginDto): Promise<{ access_token: string }> {
    const user = await this.userModel.findOne({ email: dto.email }).exec()
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas')
    }

    const isMatch = await bcrypt.compare(dto.password, user.password)
    if (!isMatch) {
      throw new UnauthorizedException('Credenciais inválidas')
    }

    const payload = { sub: user._id, email: user.email }
    const access_token = this.jwtService.sign(payload)

    return { access_token }
  }
}
