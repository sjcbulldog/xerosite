import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class AddEventAttendance1730240000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'event_attendance',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'eventId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'userId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'instanceDate',
            type: 'datetime',
          },
          {
            name: 'attendance',
            type: 'varchar',
            length: '20',
            default: "'not-sure'",
          },
          {
            name: 'createdAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create unique index on eventId, userId, and instanceDate
    await queryRunner.createIndex(
      'event_attendance',
      new TableIndex({
        name: 'IDX_EVENT_USER_INSTANCE',
        columnNames: ['eventId', 'userId', 'instanceDate'],
        isUnique: true,
      }),
    );

    // Add foreign key to team_events
    await queryRunner.createForeignKey(
      'event_attendance',
      new TableForeignKey({
        columnNames: ['eventId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'team_events',
        onDelete: 'CASCADE',
      }),
    );

    // Add foreign key to users
    await queryRunner.createForeignKey(
      'event_attendance',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first
    const table = await queryRunner.getTable('event_attendance');
    if (table) {
      const eventForeignKey = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('eventId') !== -1,
      );
      const userForeignKey = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('userId') !== -1,
      );

      if (eventForeignKey) {
        await queryRunner.dropForeignKey('event_attendance', eventForeignKey);
      }
      if (userForeignKey) {
        await queryRunner.dropForeignKey('event_attendance', userForeignKey);
      }
    }

    // Drop index
    await queryRunner.dropIndex('event_attendance', 'IDX_EVENT_USER_INSTANCE');

    // Drop table
    await queryRunner.dropTable('event_attendance');
  }
}
