import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const defaultDbUrl = 'postgresql://postgres:postgres@localhost:5432/jeongmyeong?schema=public';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? defaultDbUrl,
  },
});
