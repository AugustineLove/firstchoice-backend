
import { prisma } from '../src/config/prisma';

async function main() {
  await prisma.trade.createMany({
    skipDuplicates: true,
    data: [
      { name: 'Electrician', icon: '⚡', sortOrder: 1 },
      { name: 'Plumber', icon: '🚰', sortOrder: 2 },
      { name: 'Carpenter', icon: '🪚', sortOrder: 3 },
      { name: 'Mason', icon: '🧱', sortOrder: 4 },
      { name: 'Painter', icon: '🎨', sortOrder: 5 },
      { name: 'Mechanic', icon: '🔧', sortOrder: 6 },
    ],
  });

  console.log('Trades seeded successfully.');
}

main()
  .catch((error) => {
    console.error('Failed to seed trades:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
