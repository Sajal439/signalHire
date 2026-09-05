require('dotenv').config({ path: require('path').resolve(__dirname, '../../../../.env') });
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

function createPrisma() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const prisma = global.prisma || createPrisma();
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;
module.exports = prisma;

