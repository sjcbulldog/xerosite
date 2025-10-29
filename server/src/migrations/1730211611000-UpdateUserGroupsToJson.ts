import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateUserGroupsToJson1730211611000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the old columns
    await queryRunner.query(`
      ALTER TABLE user_groups 
      DROP COLUMN IF EXISTS roles,
      DROP COLUMN IF EXISTS subteams,
      DROP COLUMN IF EXISTS members
    `);

    // Add the new JSON column
    await queryRunner.query(`
      ALTER TABLE user_groups 
      ADD COLUMN visibility_rules JSON NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the JSON column
    await queryRunner.query(`
      ALTER TABLE user_groups 
      DROP COLUMN IF EXISTS visibility_rules
    `);

    // Recreate the old columns
    await queryRunner.query(`
      ALTER TABLE user_groups 
      ADD COLUMN roles TEXT NULL,
      ADD COLUMN subteams TEXT NULL,
      ADD COLUMN members TEXT NULL
    `);
  }
}
