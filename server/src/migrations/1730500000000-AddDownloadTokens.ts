import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AddDownloadTokens1730500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'message_download_tokens',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'messageId',
            type: 'uuid',
          },
          {
            name: 'fileId',
            type: 'uuid',
          },
          {
            name: 'teamId',
            type: 'uuid',
          },
          {
            name: 'token',
            type: 'varchar',
            length: '64',
            isUnique: true,
          },
          {
            name: 'expiresAt',
            type: 'timestamp',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'used',
            type: 'boolean',
            default: false,
          },
        ],
      }),
      true,
    );

    // Create indexes for better query performance
    await queryRunner.createIndex(
      'message_download_tokens',
      new TableIndex({
        name: 'IDX_MESSAGE_DOWNLOAD_TOKEN',
        columnNames: ['token'],
      }),
    );

    await queryRunner.createIndex(
      'message_download_tokens',
      new TableIndex({
        name: 'IDX_MESSAGE_DOWNLOAD_EXPIRES',
        columnNames: ['expiresAt'],
      }),
    );

    await queryRunner.createIndex(
      'message_download_tokens',
      new TableIndex({
        name: 'IDX_MESSAGE_DOWNLOAD_MESSAGE',
        columnNames: ['messageId'],
      }),
    );

    await queryRunner.createIndex(
      'message_download_tokens',
      new TableIndex({
        name: 'IDX_MESSAGE_DOWNLOAD_FILE',
        columnNames: ['fileId'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('message_download_tokens');
  }
}
