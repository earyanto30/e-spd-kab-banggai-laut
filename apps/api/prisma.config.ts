import { defineConfig } from 'prisma/config';
import path from 'node:path';
import fs from 'node:fs';

const searchStarts = [process.cwd(), __dirname];
for (const start of searchStarts) {
  let dir = start;
  for (let i = 0; i < 6; i++) {
    const candidate = path.resolve(dir, '.env');
    if (fs.existsSync(candidate) && process.loadEnvFile) {
      process.loadEnvFile(candidate);
      break;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'node prisma/seed.js',
  },
});
