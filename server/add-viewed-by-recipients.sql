-- Add viewedByRecipients column to team_messages table
-- This tracks which users have viewed the message attachments

ALTER TABLE `team_messages` ADD COLUMN `viewedByRecipients` TEXT NULL;
