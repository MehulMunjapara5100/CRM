const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

function prepareServerlessSqlite() {
  if (!process.env.VERCEL || process.env.DATABASE_URL !== 'file:/tmp/dev.db') return;

  const targetPath = '/tmp/dev.db';
  if (fs.existsSync(targetPath)) return;

  const sourcePath = path.join(__dirname, '..', '..', 'prisma', 'dev.db');
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, targetPath);
  }
}

prepareServerlessSqlite();

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
});

module.exports = prisma;
