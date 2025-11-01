import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddTimezoneToTeams1730331000000 implements MigrationInterface {
  name = 'AddTimezoneToTeams1730331000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the timezone column
    await queryRunner.addColumn(
      'teams',
      new TableColumn({
        name: 'timezone',
        type: 'varchar',
        length: '100',
        default: "'America/New_York'",
      }),
    );

    // Set all existing teams to America/New_York by default
    await queryRunner.query(`UPDATE teams SET timezone = 'America/New_York'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the timezone column
    await queryRunner.dropColumn('teams', 'timezone');
  }
}
