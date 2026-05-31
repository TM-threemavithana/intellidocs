import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating test user...');

  const hashedPassword = await bcrypt.hash('test123', 10);

  const user = await prisma.user.upsert({
    where: { email: 'test@intellidocs.ai' },
    update: {},
    create: {
      id: 'test-user-id',
      email: 'test@intellidocs.ai',
      password: hashedPassword,
      name: 'Test User',
      role: 'user',
    },
  });

  console.log('✅ Test user created:', user);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
