import { prisma } from './config/prisma';
(async () => {
  await prisma.trade.createMany({ skipDuplicates: true, data: [
    { name: 'Electrician', icon: '⚡', sortOrder: 1 },
    { name: 'Plumber', icon: '🚰', sortOrder: 2 },
    { name: 'Carpenter', icon: '🪚', sortOrder: 3 },
    { name: 'Mason', icon: '🧱', sortOrder: 4 },
    { name: 'Painter', icon: '🎨', sortOrder: 5 },
    { name: 'Mechanic', icon: '🔧', sortOrder: 6 },
  ]});
  console.log('done');
})();