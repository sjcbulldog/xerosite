import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMembershipStatusToUserTeams1761503541370 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add status column to user_teams table
        await queryRunner.query(`
            ALTER TABLE user_teams 
            ADD COLUMN status ENUM('pending', 'active', 'disabled') 
            NOT NULL DEFAULT 'pending'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove status column from user_teams table
        await queryRunner.query(`
            ALTER TABLE user_teams 
            DROP COLUMN status
        `);
    }

}
