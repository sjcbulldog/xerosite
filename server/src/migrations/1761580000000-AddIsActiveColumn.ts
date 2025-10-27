import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddIsActiveColumn1761580000000 implements MigrationInterface {
  name = 'AddIsActiveColumn1761580000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the is_active column
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'is_active',
        type: 'boolean',
        default: true,
      }),
    );

    // Set all existing users to active by default
    await queryRunner.query(
      `UPDATE users SET is_active = 1`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the is_active column
    await queryRunner.dropColumn('users', 'is_active');
  }
}
