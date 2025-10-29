import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class AddUserGroupsTable1730211610000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'user_groups',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'team_id',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'is_public',
            type: 'boolean',
            default: false,
          },
          {
            name: 'created_by',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'roles',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'subteams',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'members',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            name: 'FK_user_groups_team',
            columnNames: ['team_id'],
            referencedTableName: 'teams',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
        indices: [
          {
            name: 'IDX_user_groups_team_id',
            columnNames: ['team_id'],
          },
          {
            name: 'IDX_user_groups_created_by',
            columnNames: ['created_by'],
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('user_groups');
  }
}
