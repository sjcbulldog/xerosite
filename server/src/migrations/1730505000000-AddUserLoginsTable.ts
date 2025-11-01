import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class AddUserLoginsTable1730505000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'user_logins',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'user_id',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'login_time',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'ip_address',
            type: 'varchar',
            length: '45',
            isNullable: true,
          },
          {
            name: 'user_agent',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create index on user_id for efficient lookups
    await queryRunner.createIndex(
      'user_logins',
      new TableIndex({
        name: 'IDX_USER_LOGINS_USER_ID',
        columnNames: ['user_id'],
      }),
    );

    // Create index on login_time for sorting
    await queryRunner.createIndex(
      'user_logins',
      new TableIndex({
        name: 'IDX_USER_LOGINS_LOGIN_TIME',
        columnNames: ['login_time'],
      }),
    );

    // Add foreign key to users table
    await queryRunner.createForeignKey(
      'user_logins',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('user_logins');
  }
}
