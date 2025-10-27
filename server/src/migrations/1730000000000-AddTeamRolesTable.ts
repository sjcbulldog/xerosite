import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTeamRolesTable1730000000000 implements MigrationInterface {
  name = 'AddTeamRolesTable1730000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`team_roles\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`teamId\` varchar(36) NOT NULL,
        \`roleName\` varchar(50) NOT NULL,
        \`isRemovable\` tinyint NOT NULL DEFAULT 0,
        \`excludedRoles\` text NULL,
        \`excludedGroups\` text NULL,
        \`sortOrder\` int NOT NULL DEFAULT 0,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`IDX_team_roles_teamId\` (\`teamId\`),
        CONSTRAINT \`FK_team_roles_teamId\` FOREIGN KEY (\`teamId\`) REFERENCES \`teams\` (\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Initialize default roles for existing teams
    await queryRunner.query(`
      INSERT INTO \`team_roles\` (\`teamId\`, \`roleName\`, \`isRemovable\`, \`excludedRoles\`, \`excludedGroups\`, \`sortOrder\`)
      SELECT 
        t.id,
        'admin',
        0,
        NULL,
        NULL,
        0
      FROM \`teams\` t
    `);

    await queryRunner.query(`
      INSERT INTO \`team_roles\` (\`teamId\`, \`roleName\`, \`isRemovable\`, \`excludedRoles\`, \`excludedGroups\`, \`sortOrder\`)
      SELECT 
        t.id,
        'Mentor',
        1,
        'Student,Parent',
        'student-group',
        1
      FROM \`teams\` t
    `);

    await queryRunner.query(`
      INSERT INTO \`team_roles\` (\`teamId\`, \`roleName\`, \`isRemovable\`, \`excludedRoles\`, \`excludedGroups\`, \`sortOrder\`)
      SELECT 
        t.id,
        'Student',
        1,
        'Mentor,Parent',
        'mentor-group',
        2
      FROM \`teams\` t
    `);

    await queryRunner.query(`
      INSERT INTO \`team_roles\` (\`teamId\`, \`roleName\`, \`isRemovable\`, \`excludedRoles\`, \`excludedGroups\`, \`sortOrder\`)
      SELECT 
        t.id,
        'Parent',
        1,
        'Mentor,Student',
        'mentor-group,student-group',
        3
      FROM \`teams\` t
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`team_roles\``);
  }
}
