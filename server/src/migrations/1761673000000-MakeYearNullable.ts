import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeYearNullable1761673000000 implements MigrationInterface {
  name = 'MakeYearNullable1761673000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Make the year column nullable
    await queryRunner.query(`ALTER TABLE \`team_media\` MODIFY \`year\` int NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Make the year column non-nullable again (only if all records have a year)
    await queryRunner.query(`ALTER TABLE \`team_media\` MODIFY \`year\` int NOT NULL`);
  }
}
