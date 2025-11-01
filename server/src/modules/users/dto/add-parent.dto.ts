import { IsEmail, IsNotEmpty } from 'class-validator';

export class AddParentDto {
  @IsEmail()
  @IsNotEmpty()
  parentEmail: string;
}
