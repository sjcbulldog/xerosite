import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class AddUserGroupIdToTeamMedia1761675000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add userGroupId column to team_media table
    await queryRunner.addColumn(
      'team_media',
      new TableColumn({
        name: 'userGroupId',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // Add foreign key constraint
    await queryRunner.createForeignKey(
      'team_media',
      new TableForeignKey({
        name: 'FK_team_media_user_group',
        columnNames: ['userGroupId'],
        referencedTableName: 'user_groups',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // Add index for query performance
    await queryRunner.query(
      'CREATE INDEX `IDX_team_media_userGroupId` ON `team_media` (`userGroupId`)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query('DROP INDEX `IDX_team_media_userGroupId` ON `team_media`');

    // Drop foreign key
    await queryRunner.dropForeignKey('team_media', 'FK_team_media_user_group');

    // Drop column
    await queryRunner.dropColumn('team_media', 'userGroupId');
  }
}
