import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddUserStateColumn1729814400000 implements MigrationInterface {
  name = 'AddUserStateColumn1729814400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the new state column
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'state',
        type: 'enum',
        enum: ['pending', 'active', 'disabled'],
        default: "'pending'",
      }),
    );

    // Set existing users to 'active' state (they were previously active if is_active was true)
    await queryRunner.query(
      `UPDATE users SET state = 'active' WHERE is_active = 1`,
    );

    // Set existing users to 'disabled' state (they were previously inactive if is_active was false)
    await queryRunner.query(
      `UPDATE users SET state = 'disabled' WHERE is_active = 0`,
    );

    // Set the first user (lowest ID) to 'active' if no users are active
    await queryRunner.query(`
      UPDATE users 
      SET state = 'active' 
      WHERE id = (SELECT id FROM (SELECT MIN(id) as id FROM users) as temp)
      AND NOT EXISTS (SELECT 1 FROM users WHERE state = 'active')
    `);

    // Drop the old is_active column
    await queryRunner.dropColumn('users', 'is_active');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add back the is_active column
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'is_active',
        type: 'boolean',
        default: true,
      }),
    );

    // Convert state back to is_active
    await queryRunner.query(
      `UPDATE users SET is_active = 1 WHERE state = 'active'`,
    );
    await queryRunner.query(
      `UPDATE users SET is_active = 0 WHERE state IN ('pending', 'disabled')`,
    );

    // Drop the state column
    await queryRunner.dropColumn('users', 'state');
  }
}