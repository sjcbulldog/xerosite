-- Add attachments column to email_queue table
ALTER TABLE email_queue ADD COLUMN IF NOT EXISTS attachments JSON NULL;

-- Add attachments column to team_messages table  
ALTER TABLE team_messages ADD COLUMN IF NOT EXISTS attachments JSON NULL;
