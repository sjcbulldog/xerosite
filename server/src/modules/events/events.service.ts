import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { TeamEvent } from './entities/team-event.entity';
import { CreateEventDto, UpdateEventDto, EventResponseDto } from './dto/event.dto';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(TeamEvent)
    private readonly eventRepository: Repository<TeamEvent>,
  ) {}

  async create(createEventDto: CreateEventDto, userId: string): Promise<EventResponseDto> {
    const event = this.eventRepository.create({
      ...createEventDto,
      startDateTime: new Date(createEventDto.startDateTime),
      endDateTime: createEventDto.endDateTime ? new Date(createEventDto.endDateTime) : null,
      recurrenceEndDate: createEventDto.recurrenceEndDate ? new Date(createEventDto.recurrenceEndDate) : null,
      createdBy: userId,
    });

    const savedEvent = await this.eventRepository.save(event);
    return this.transformToResponse(savedEvent);
  }

  async findAllForTeam(teamId: string): Promise<EventResponseDto[]> {
    const events = await this.eventRepository.find({
      where: { teamId },
      order: { startDateTime: 'ASC' },
    });

    return events.map((event) => this.transformToResponse(event));
  }

  async findByDateRange(
    teamId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<EventResponseDto[]> {
    const events = await this.eventRepository.find({
      where: {
        teamId,
        startDateTime: Between(startDate, endDate),
      },
      order: { startDateTime: 'ASC' },
    });

    return events.map((event) => this.transformToResponse(event));
  }

  async findOne(id: string): Promise<EventResponseDto> {
    const event = await this.eventRepository.findOne({ where: { id } });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return this.transformToResponse(event);
  }

  async update(id: string, updateEventDto: UpdateEventDto): Promise<EventResponseDto> {
    const event = await this.eventRepository.findOne({ where: { id } });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    // Update fields
    if (updateEventDto.name !== undefined) event.name = updateEventDto.name;
    if (updateEventDto.description !== undefined) event.description = updateEventDto.description;
    if (updateEventDto.location !== undefined) event.location = updateEventDto.location;
    if (updateEventDto.startDateTime !== undefined) event.startDateTime = new Date(updateEventDto.startDateTime);
    if (updateEventDto.endDateTime !== undefined) event.endDateTime = updateEventDto.endDateTime ? new Date(updateEventDto.endDateTime) : null;
    if (updateEventDto.recurrenceType !== undefined) event.recurrenceType = updateEventDto.recurrenceType;
    if (updateEventDto.recurrencePattern !== undefined) event.recurrencePattern = updateEventDto.recurrencePattern;
    if (updateEventDto.recurrenceEndDate !== undefined) event.recurrenceEndDate = updateEventDto.recurrenceEndDate ? new Date(updateEventDto.recurrenceEndDate) : null;
    if (updateEventDto.userGroupId !== undefined) event.userGroupId = updateEventDto.userGroupId;

    const updatedEvent = await this.eventRepository.save(event);
    return this.transformToResponse(updatedEvent);
  }

  async remove(id: string): Promise<void> {
    const event = await this.eventRepository.findOne({ where: { id } });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    await this.eventRepository.remove(event);
  }

  private transformToResponse(event: TeamEvent): EventResponseDto {
    return {
      id: event.id,
      teamId: event.teamId,
      name: event.name,
      description: event.description,
      location: event.location,
      startDateTime: event.startDateTime,
      endDateTime: event.endDateTime,
      recurrenceType: event.recurrenceType,
      recurrencePattern: event.recurrencePattern,
      recurrenceEndDate: event.recurrenceEndDate,
      userGroupId: event.userGroupId,
      createdBy: event.createdBy,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };
  }
}
