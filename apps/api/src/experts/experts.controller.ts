import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '../auth/auth.guards';
import { CreateAssignmentDto, CreateClientDto, UpdateAssignmentDto, UpdateClientDto } from './experts.dto';
import { ExpertsService } from './experts.service';

/** Uzman paneli uçları — yalnızca EXPERT (ve yönetici) rolleri; kapsam istekteki uzmanın danışanları. */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('EXPERT', 'ADMIN', 'SUPER_ADMIN')
@Controller('experts')
export class ExpertsController {
  constructor(private readonly experts: ExpertsService) {}

  @Get('clients')
  listClients(@CurrentUser('id') userId: string) {
    return this.experts.listClients(userId);
  }

  @Post('clients')
  createClient(@CurrentUser('id') userId: string, @Body() dto: CreateClientDto) {
    return this.experts.createClient(userId, dto);
  }

  @Get('clients/:id')
  getClient(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.experts.getClient(userId, id);
  }

  @Patch('clients/:id')
  updateClient(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: UpdateClientDto) {
    return this.experts.updateClient(userId, id, dto);
  }

  @Delete('clients/:id')
  deleteClient(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.experts.deleteClient(userId, id);
  }

  /** Danışanın (hesabı bağlıysa) gerçek bilişsel test oturumları. */
  @Get('clients/:id/sessions')
  clientSessions(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.experts.clientSessions(userId, id);
  }

  @Get('assignments')
  listAssignments(@CurrentUser('id') userId: string, @Query('clientId') clientId?: string) {
    return this.experts.listAssignments(userId, clientId || undefined);
  }

  @Post('assignments')
  createAssignment(@CurrentUser('id') userId: string, @Body() dto: CreateAssignmentDto) {
    return this.experts.createAssignment(userId, dto);
  }

  @Patch('assignments/:id')
  updateAssignment(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: UpdateAssignmentDto) {
    return this.experts.updateAssignment(userId, id, dto);
  }

  @Delete('assignments/:id')
  deleteAssignment(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.experts.deleteAssignment(userId, id);
  }
}
