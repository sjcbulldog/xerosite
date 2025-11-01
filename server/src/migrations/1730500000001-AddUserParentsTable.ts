import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserParentsTable1730500000001 implements MigrationInterface {
  name = 'AddUserParentsTable1730500000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`user_parents\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`userId\` varchar(36) NOT NULL COMMENT 'The child user ID',
        \`parentUserId\` varchar(36) NULL COMMENT 'The parent user ID (if they are registered)',
        \`parentEmail\` varchar(255) NOT NULL COMMENT 'The parent email address',
        \`status\` enum('pending', 'accepted', 'declined') NOT NULL DEFAULT 'pending' COMMENT 'Status of parent relationship',
        \`invitationSentAt\` datetime NULL COMMENT 'When invitation email was sent',
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`IDX_user_parents_userId\` (\`userId\`),
        KEY \`IDX_user_parents_parentUserId\` (\`parentUserId\`),
        KEY \`IDX_user_parents_parentEmail\` (\`parentEmail\`),
        UNIQUE KEY \`UQ_user_parents_userId_parentEmail\` (\`userId\`, \`parentEmail\`),
        CONSTRAINT \`FK_user_parents_userId\` FOREIGN KEY (\`userId\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT \`FK_user_parents_parentUserId\` FOREIGN KEY (\`parentUserId\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`user_parents\``);
  }
}
