import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class RemoveMessageDeliveryMethod1730500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove the messageDeliveryMethod column from user_preferences table
    await queryRunner.dropColumn('user_preferences', 'messageDeliveryMethod');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add the messageDeliveryMethod column if we need to rollback
    await queryRunner.addColumn(
      'user_preferences',
      new TableColumn({
        name: 'messageDeliveryMethod',
        type: 'varchar',
        length: '10',
        default: "'email'",
      }),
    );
  }
}
