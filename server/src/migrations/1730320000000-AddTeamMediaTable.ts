import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class AddTeamMediaTable1730320000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'team_media',
        columns: [
          {
            name: 'id',
            type: 'char',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'teamId',
            type: 'char',
            length: '36',
          },
          {
            name: 'userId',
            type: 'char',
            length: '36',
          },
          {
            name: 'fileId',
            type: 'char',
            length: '36',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Add foreign key to teams
    await queryRunner.createForeignKey(
      'team_media',
      new TableForeignKey({
        columnNames: ['teamId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'teams',
        onDelete: 'CASCADE',
      }),
    );

    // Add foreign key to users
    await queryRunner.createForeignKey(
      'team_media',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Add foreign key to stored_files
    await queryRunner.createForeignKey(
      'team_media',
      new TableForeignKey({
        columnNames: ['fileId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'stored_files',
        onDelete: 'CASCADE',
      }),
    );

    // Add index on teamId for performance
    await queryRunner.query('CREATE INDEX `idx_team_media_teamId` ON `team_media` (`teamId`)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('team_media');
  }
}
