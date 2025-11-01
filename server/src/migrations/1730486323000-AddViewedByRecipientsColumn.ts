import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddViewedByRecipientsColumn1730486323000 implements MigrationInterface {
  name = 'AddViewedByRecipientsColumn1730486323000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`team_messages\` ADD \`viewedByRecipients\` text NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`team_messages\` DROP COLUMN \`viewedByRecipients\``,
    );
  }
}
