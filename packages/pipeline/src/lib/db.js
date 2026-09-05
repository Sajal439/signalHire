require('dotenv').config({ path: require('path').resolve(__dirname, '../../../../.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;
module.exports = prisma;
