import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserEmail } from './entities/user-email.entity';
import { UserPhone } from './entities/user-phone.entity';
import { UserAddress } from './entities/user-address.entity';
import { UserState } from './enums/user-state.enum';
import { RegisterUserDto } from './dto/register-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserEmail)
    private readonly userEmailRepository: Repository<UserEmail>,
    @InjectRepository(UserPhone)
    private readonly userPhoneRepository: Repository<UserPhone>,
    @InjectRepository(UserAddress)
    private readonly userAddressRepository: Repository<UserAddress>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      relations: ['emails', 'phones', 'addresses'],
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    // Deprecated: Use findByEmail instead
    // Kept for backward compatibility during migration
    return this.findByEmail(username);
  }

  async findByEmail(email: string): Promise<User | null> {
    const userEmail = await this.userEmailRepository.findOne({
      where: { email },
      relations: ['user', 'user.emails', 'user.phones', 'user.addresses'],
    });
    
    return userEmail?.user || null;
  }

  async getUserCount(): Promise<number> {
    return this.userRepository.count();
  }

  async register(registerDto: RegisterUserDto, isFirstUser = false): Promise<User> {
    // Check if primary email already exists
    const primaryEmail = registerDto.emails.find((email) => email.isPrimary);
    if (!primaryEmail) {
      throw new BadRequestException('At least one email must be marked as primary');
    }

    const existingEmail = await this.userEmailRepository.findOne({
      where: { email: primaryEmail.email },
    });
    if (existingEmail) {
      throw new ConflictException('Email already exists');
    }

    // Ensure only one primary email
    registerDto.emails.forEach((email, index) => {
      if (index === 0 && !email.isPrimary) {
        email.isPrimary = true;
      } else if (index > 0 && email.isPrimary) {
        email.isPrimary = false;
      }
    });

    // Ensure only one primary phone if provided
    if (registerDto.phones && registerDto.phones.length > 0) {
      registerDto.phones.forEach((phone, index) => {
        if (index === 0 && !phone.isPrimary) {
          phone.isPrimary = true;
        } else if (index > 0 && phone.isPrimary) {
          phone.isPrimary = false;
        }
      });
    }

    // Ensure only one primary address if provided
    if (registerDto.addresses && registerDto.addresses.length > 0) {
      registerDto.addresses.forEach((address, index) => {
        if (index === 0 && !address.isPrimary) {
          address.isPrimary = true;
        } else if (index > 0 && address.isPrimary) {
          address.isPrimary = false;
        }
      });
    }

    // Create user with relations
    const user = this.userRepository.create({
      firstName: registerDto.firstName,
      middleName: registerDto.middleName,
      lastName: registerDto.lastName,
      password: registerDto.password,
      // First user is admin, others are pending
      state: isFirstUser ? UserState.ADMIN : UserState.PENDING,
    });

    const savedUser = await this.userRepository.save(user);

    // Create emails
    const emails = registerDto.emails.map((emailDto) =>
      this.userEmailRepository.create({
        ...emailDto,
        userId: savedUser.id,
      }),
    );
    await this.userEmailRepository.save(emails);

    // Create phones if provided
    if (registerDto.phones && registerDto.phones.length > 0) {
      const phones = registerDto.phones.map((phoneDto) =>
        this.userPhoneRepository.create({
          ...phoneDto,
          userId: savedUser.id,
        }),
      );
      await this.userPhoneRepository.save(phones);
    }

    // Create addresses if provided
    if (registerDto.addresses && registerDto.addresses.length > 0) {
      const addresses = registerDto.addresses.map((addressDto) =>
        this.userAddressRepository.create({
          ...addressDto,
          userId: savedUser.id,
        }),
      );
      await this.userAddressRepository.save(addresses);
    }

    return this.findById(savedUser.id);
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.userRepository.update(userId, {
      lastLogin: new Date(),
    });
  }

  async updateUserState(userId: string, state: UserState): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.state = state;
    await this.userRepository.save(user);

    return this.findById(userId);
  }

  async update(id: string, updateDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update basic user info
    Object.assign(user, updateDto);
    await this.userRepository.save(user);

    return this.findById(id);
  }

  async updateProfile(userId: string, updateData: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    emails?: Array<{
      id?: string | number | null;
      email: string;
      emailType: string;
      isPrimary: boolean;
    }>;
    phones?: Array<{
      id?: string | number | null;
      phoneNumber: string;
      phoneType: string;
      isPrimary: boolean;
    }>;
    addresses?: Array<{
      id?: string | number | null;
      streetLine1: string;
      streetLine2?: string;
      city: string;
      stateProvince: string;
      postalCode: string;
      country: string;
      addressType: string;
      isPrimary: boolean;
    }>;
  }): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update basic user info
    if (updateData.firstName) user.firstName = updateData.firstName;
    if (updateData.middleName !== undefined) user.middleName = updateData.middleName;
    if (updateData.lastName) user.lastName = updateData.lastName;
    await this.userRepository.save(user);

    // Update emails if provided
    if (updateData.emails) {
      // Ensure at least one email
      if (updateData.emails.length === 0) {
        throw new BadRequestException('At least one email is required');
      }

      // Get existing emails
      const existingEmails = await this.userEmailRepository.find({
        where: { userId },
      });

      // Track which emails to keep
      const emailsToKeep = new Set<number>();

      // Update or create emails
      for (const emailData of updateData.emails) {
        if (emailData.id) {
          // Update existing email
          await this.userEmailRepository.update(emailData.id, {
            email: emailData.email,
            emailType: emailData.emailType,
            isPrimary: emailData.isPrimary,
          });
          emailsToKeep.add(Number(emailData.id));
        } else {
          // Create new email
          const newEmail = this.userEmailRepository.create({
            userId,
            email: emailData.email,
            emailType: emailData.emailType,
            isPrimary: emailData.isPrimary,
          });
          const saved = await this.userEmailRepository.save(newEmail);
          emailsToKeep.add(saved.id);
        }
      }

      // Remove emails that are no longer in the list
      const emailsToRemove = existingEmails.filter(
        (email) => !emailsToKeep.has(email.id),
      );
      if (emailsToRemove.length > 0) {
        await this.userEmailRepository.remove(emailsToRemove);
      }
    }

    // Update phones if provided
    if (updateData.phones) {
      const existingPhones = await this.userPhoneRepository.find({
        where: { userId },
      });

      const phonesToKeep = new Set<number>();

      for (const phoneData of updateData.phones) {
        if (phoneData.id) {
          await this.userPhoneRepository.update(phoneData.id, {
            phoneNumber: phoneData.phoneNumber,
            phoneType: phoneData.phoneType,
            isPrimary: phoneData.isPrimary,
          });
          phonesToKeep.add(Number(phoneData.id));
        } else {
          const newPhone = this.userPhoneRepository.create({
            userId,
            phoneNumber: phoneData.phoneNumber,
            phoneType: phoneData.phoneType,
            isPrimary: phoneData.isPrimary,
          });
          const saved = await this.userPhoneRepository.save(newPhone);
          phonesToKeep.add(saved.id);
        }
      }

      const phonesToRemove = existingPhones.filter(
        (phone) => !phonesToKeep.has(phone.id),
      );
      if (phonesToRemove.length > 0) {
        await this.userPhoneRepository.remove(phonesToRemove);
      }
    }

    // Update addresses if provided
    if (updateData.addresses) {
      const existingAddresses = await this.userAddressRepository.find({
        where: { userId },
      });

      const addressesToKeep = new Set<number>();

      for (const addressData of updateData.addresses) {
        if (addressData.id) {
          await this.userAddressRepository.update(addressData.id, {
            streetLine1: addressData.streetLine1,
            streetLine2: addressData.streetLine2,
            city: addressData.city,
            stateProvince: addressData.stateProvince,
            postalCode: addressData.postalCode,
            country: addressData.country,
            addressType: addressData.addressType,
            isPrimary: addressData.isPrimary,
          });
          addressesToKeep.add(Number(addressData.id));
        } else {
          const newAddress = this.userAddressRepository.create({
            userId,
            streetLine1: addressData.streetLine1,
            streetLine2: addressData.streetLine2,
            city: addressData.city,
            stateProvince: addressData.stateProvince,
            postalCode: addressData.postalCode,
            country: addressData.country,
            addressType: addressData.addressType,
            isPrimary: addressData.isPrimary,
          });
          const saved = await this.userAddressRepository.save(newAddress);
          addressesToKeep.add(saved.id);
        }
      }

      const addressesToRemove = existingAddresses.filter(
        (address) => !addressesToKeep.has(address.id),
      );
      if (addressesToRemove.length > 0) {
        await this.userAddressRepository.remove(addressesToRemove);
      }
    }

    return this.findById(userId);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      relations: ['emails', 'phones', 'addresses'],
    });
  }

  async remove(id: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.remove(user);
  }

  async updateActiveStatus(userId: string, isActive: boolean): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.isActive = isActive;
    await this.userRepository.save(user);

    return this.findById(userId);
  }
}
