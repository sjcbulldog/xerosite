import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class AddStoredFilesTable1730310063000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create stored_files table
    await queryRunner.createTable(
      new Table({
        name: 'stored_files',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'originalFilename',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'storedFilename',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'subsystem',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'userId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'fileSize',
            type: 'bigint',
          },
          {
            name: 'mimeType',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Add foreign key to users table
    await queryRunner.createForeignKey(
      'stored_files',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Add index on subsystem for faster queries
    await queryRunner.query(
      `CREATE INDEX idx_stored_files_subsystem ON stored_files(subsystem)`,
    );

    // Add index on userId for faster queries
    await queryRunner.query(
      `CREATE INDEX idx_stored_files_userId ON stored_files(userId)`,
    );

    // Update team_messages table to use file IDs instead of JSON attachments
    await queryRunner.query(
      `ALTER TABLE team_messages ADD COLUMN attachmentFileIds TEXT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove column from team_messages
    await queryRunner.query(
      `ALTER TABLE team_messages DROP COLUMN attachmentFileIds`,
    );

    // Drop indexes
    await queryRunner.query(`DROP INDEX idx_stored_files_userId ON stored_files`);
    await queryRunner.query(
      `DROP INDEX idx_stored_files_subsystem ON stored_files`,
    );

    // Drop foreign key
    const table = await queryRunner.getTable('stored_files');
    const foreignKey = table?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('userId') !== -1,
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey('stored_files', foreignKey);
    }

    // Drop table
    await queryRunner.dropTable('stored_files');
  }
}
