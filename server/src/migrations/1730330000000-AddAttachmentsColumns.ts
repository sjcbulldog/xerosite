import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAttachmentsColumns1730330000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add attachments column to email_queue table
    await queryRunner.addColumn(
      'email_queue',
      new TableColumn({
        name: 'attachments',
        type: 'json',
        isNullable: true,
      }),
    );

    // Add attachments column to team_messages table
    await queryRunner.addColumn(
      'team_messages',
      new TableColumn({
        name: 'attachments',
        type: 'json',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove attachments column from email_queue table
    await queryRunner.dropColumn('email_queue', 'attachments');

    // Remove attachments column from team_messages table
    await queryRunner.dropColumn('team_messages', 'attachments');
  }
}
