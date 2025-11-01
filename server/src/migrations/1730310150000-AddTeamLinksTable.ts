import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class AddTeamLinksTable1730310150000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'team_links',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'teamId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '200',
          },
          {
            name: 'url',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'displayOrder',
            type: 'int',
            default: 0,
          },
          {
            name: 'createdAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'team_links',
      new TableForeignKey({
        columnNames: ['teamId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'teams',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.query(`CREATE INDEX idx_team_links_teamId ON team_links(teamId)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_team_links_teamId ON team_links`);

    const table = await queryRunner.getTable('team_links');
    const foreignKey = table?.foreignKeys.find((fk) => fk.columnNames.indexOf('teamId') !== -1);
    if (foreignKey) {
      await queryRunner.dropForeignKey('team_links', foreignKey);
    }

    await queryRunner.dropTable('team_links');
  }
}
