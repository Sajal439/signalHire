const prisma = require('../lib/db');
const { log } = require('../lib/logger');
const { genAI, withRetry } = require('../lib/gemini');

async function embedJobs() {
  log('embed', 'Starting embedding process with Gemini text-embedding-004');
  const EMBED_BATCH_SIZE = parseInt(process.env.EMBED_BATCH_SIZE || '20', 10);
  const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  
  let totalEmbedded = 0;
  let status = 'success';
  let details = { embedded: 0, error: null };
  
  try {
    while (true) {
      const jobs = await prisma.job.findMany({
        where: { embeddedAt: null },
        take: EMBED_BATCH_SIZE
      });
      
      if (jobs.length === 0) break;
      
      const inputs = jobs.map(j => `${j.title}\n${j.company}\n${j.description}`.substring(0, 8000));
      
      const embeddings = await withRetry(async () => {
        const batchRes = await embeddingModel.batchEmbedContents({
          requests: inputs.map(text => ({
            content: { role: 'user', parts: [{ text }] }
          }))
        });
        return batchRes.embeddings.map(e => e.values);
      });
      
      for (let idx = 0; idx < jobs.length; idx++) {
        await prisma.job.update({
          where: { id: jobs[idx].id },
          data: { 
            embedding: embeddings[idx],
            embeddedAt: new Date()
          }
        });
      }
      
      totalEmbedded += jobs.length;
      log('embed', `Embedded batch of ${jobs.length} jobs`);
    }
    
    details.embedded = totalEmbedded;
    log('embed', 'Embedding process complete', { embedded: totalEmbedded });
  } catch (err) {
    status = 'error';
    details.error = err.message;
    log('embed', 'Embedding process failed', { error: err.message });
  }
  
  await prisma.pipelineRun.create({
    data: {
      stage: 'embed',
      status,
      details,
      finishedAt: new Date()
    }
  });
}

if (require.main === module) {
  embedJobs().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { embedJobs };
