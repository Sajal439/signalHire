const prisma = require('../lib/db');
const { log } = require('../lib/logger');
const TelegramBot = require('node-telegram-bot-api');

async function runNotify() {
  log('notify', 'Starting notify process');
  
  const token = process.env.TELEGRAM_BOT_TOKEN;
  let bot = null;
  
  if (!token) {
    log('notify', 'TELEGRAM_BOT_TOKEN not set, skipping notifications');
  } else {
    bot = new TelegramBot(token, { polling: false });
  }
  
  const DIGEST_TOP_N = parseInt(process.env.DIGEST_TOP_N || '10', 10);
  let status = 'success';
  let details = { notified: 0, errors: [] };
  
  try {
    const users = await prisma.user.findMany({
      where: {
        telegramChatId: { not: null }
      }
    });
    
    for (const user of users) {
      if (!bot) continue;
      
      try {
        const matches = await prisma.jobMatch.findMany({
          where: {
            userId: user.id,
            llmScore: { not: null },
            notifiedAt: null
          },
          orderBy: {
            llmScore: 'desc'
          },
          take: DIGEST_TOP_N,
          include: { job: true }
        });
        
        if (matches.length === 0) continue;
        
        let message = '🎯 *Your Daily Job Digest*\n\n';
        
        matches.forEach((match, idx) => {
          const escapeMd = (str) => String(str || '').replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
          
          message += `${idx + 1}\\. *${escapeMd(match.job.company)}* \\— ${escapeMd(match.job.title)}\n`;
          message += `   Score: ${match.llmScore}/100\n`;
          message += `   _Why: ${escapeMd(match.llmReason)}_\n`;
          message += `   🔗 [Link](${escapeMd(match.job.url)})\n\n`;
        });
        
        await bot.sendMessage(user.telegramChatId, message, { parse_mode: 'MarkdownV2' });
        
        await prisma.jobMatch.updateMany({
          where: { id: { in: matches.map(m => m.id) } },
          data: { notifiedAt: new Date() }
        });
        
        details.notified += matches.length;
      } catch (userErr) {
        log('notify', `Error notifying user ${user.id}`, { error: userErr.message });
        details.errors.push(`User ${user.id}: ${userErr.message}`);
      }
    }
    
    log('notify', 'Notify process complete', details);
  } catch (err) {
    status = 'error';
    details.errors.push(err.message);
    log('notify', 'Notify process failed', { error: err.message });
  }
  
  await prisma.pipelineRun.create({
    data: {
      stage: 'notify',
      status,
      details,
      finishedAt: new Date()
    }
  });
}

if (require.main === module) {
  runNotify().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { runNotify };
