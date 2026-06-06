/**
 * Create default test user in database
 */

const { execSync } = require('child_process');

console.log('Creating default test user...');

const sql = `
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
`;

try {
  execSync(`docker exec intellidocs-postgres psql -U intellidocs -d intellidocs_db -c "${sql.replace(/\n/g, ' ')}"`, {
    stdio: 'inherit'
  });
  console.log('✅ Test user created successfully!');
} catch (error) {
  console.error('❌ Failed to create test user:', error.message);
  process.exit(1);
}
