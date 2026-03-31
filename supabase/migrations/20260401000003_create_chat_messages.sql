-- Create chat_messages table
CREATE TABLE chat_messages (
  id text PRIMARY KEY,
  workspace_id text,
  sender_id text NOT NULL,
  sender_name varchar(255) NOT NULL,
  sender_role varchar(50) NOT NULL,
  message text NOT NULL,
  file_url text,
  file_name text,
  file_type varchar(50),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_chat_messages_workspace_id ON chat_messages (workspace_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages (created_at);
