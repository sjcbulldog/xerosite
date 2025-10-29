import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { UserEmail } from './entities/user-email.entity';
import { UserPhone } from './entities/user-phone.entity';
import { UserAddress } from './entities/user-address.entity';
import { SubteamLeadPosition } from '../teams/entities/subteam-lead-position.entity';
import { SubteamMember } from '../teams/entities/subteam-member.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserEmail, UserPhone, UserAddress, SubteamLeadPosition, SubteamMember])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
