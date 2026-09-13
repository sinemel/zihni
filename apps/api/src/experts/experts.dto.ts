import { Transform } from 'class-transformer';
import { IsDateString, IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** Formlar boş alanı "" gönderir; doğrulamada "yok" sayılsın (ValidationPipe transform: true). */
const EmptyToUndefined = () => Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value));

export class CreateClientDto {
  @IsString() @MinLength(1) @MaxLength(80) firstName!: string;
  @IsString() @MinLength(1) @MaxLength(80) lastName!: string;
  @EmptyToUndefined() @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  /** ISO tarih (YYYY-MM-DD). Boş string gönderilirse yok sayılır. */
  @EmptyToUndefined() @IsOptional() @IsDateString() birthDate?: string;
}

export class UpdateClientDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(80) firstName?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(80) lastName?: string;
  @EmptyToUndefined() @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @EmptyToUndefined() @IsOptional() @IsDateString() birthDate?: string;
}

export const ASSIGNMENT_STATUSES = ['PENDING', 'COMPLETED', 'CANCELED'] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export class CreateAssignmentDto {
  @IsString() clientId!: string;
  /** Test kataloğu id'si (Test.slug), örn. "sustained-attention". */
  @IsString() testId!: string;
  @EmptyToUndefined() @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

export class UpdateAssignmentDto {
  @IsOptional() @IsIn(ASSIGNMENT_STATUSES) status?: AssignmentStatus;
  @EmptyToUndefined() @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}
