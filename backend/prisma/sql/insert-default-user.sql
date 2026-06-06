-- Insert default-user if it doesn't exist
INSERT INTO "User" (id, email, password, name, role, "createdAt", "updatedAt")
VALUES (
  'default-user',
  'default@intellidocs.ai',
  '$2b$10$test.hash.placeholder',
  'Default User',
  'user',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET "updatedAt" = NOW();

-- Verify
SELECT id, email, name FROM "User" WHERE id = 'default-user';
