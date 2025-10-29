import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AddEmailQueue1730206000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'email_queue',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'to',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'originalTo',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'subject',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'htmlContent',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'template',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'context',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'processing', 'sent', 'failed'],
            default: "'pending'",
          },
          {
            name: 'attempts',
            type: 'int',
            default: 0,
          },
          {
            name: 'lastError',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'sentAt',
            type: 'datetime',
            isNullable: true,
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

    // Create index on status for efficient queue processing
    await queryRunner.createIndex(
      'email_queue',
      new TableIndex({
        name: 'IDX_EMAIL_QUEUE_STATUS',
        columnNames: ['status'],
      }),
    );

    // Create index on createdAt for ordering
    await queryRunner.createIndex(
      'email_queue',
      new TableIndex({
        name: 'IDX_EMAIL_QUEUE_CREATED_AT',
        columnNames: ['createdAt'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('email_queue');
  }
}
