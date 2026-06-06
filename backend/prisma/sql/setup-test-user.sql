-- Create default test user
INSERT INTO "User" (id, email, password, name, role, "createdAt", "updatedAt")
VALUES (
  'default-user',
  'test@intellidocs.ai',
  '$2b$10$xOxgDp3XWZ0Y0xZ0Y0xZ0Y0xZ0Y0xZ0Y0xZ0Y0xZ0Y0xZ0Y',
  'Test User',
  'user',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;
