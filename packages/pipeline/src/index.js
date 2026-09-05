const { log } = require('./lib/logger');
const prisma = require('./lib/db');
const fetchRun = require('./fetchers/run');
const { embedJobs } = require('./embeddings/index');
const { runMatching } = require('./matching/index');
const { runNotify } = require('./notify/index');

async function main() {
  log('pipeline', 'Starting full pipeline');
  
  let status = 'success';
  let details = { stages: [] };
  let hasError = false;
  
  try {
    await fetchRun();
    details.stages.push('fetch:success');
  } catch (err) {
    status = 'error';
    hasError = true;
    details.stages.push('fetch:error');
    log('pipeline', 'Fetch stage failed', { error: err.message });
  }
  
  try {
    await embedJobs();
    details.stages.push('embed:success');
  } catch (err) {
    status = 'error';
    hasError = true;
    details.stages.push('embed:error');
    log('pipeline', 'Embed stage failed', { error: err.message });
  }
  
  try {
    await runMatching();
    details.stages.push('match:success');
  } catch (err) {
    status = 'error';
    hasError = true;
    details.stages.push('match:error');
    log('pipeline', 'Match stage failed', { error: err.message });
  }
  
  try {
    await runNotify();
    details.stages.push('notify:success');
  } catch (err) {
    status = 'error';
    hasError = true;
    details.stages.push('notify:error');
    log('pipeline', 'Notify stage failed', { error: err.message });
  }
  
  await prisma.pipelineRun.create({
    data: {
      stage: 'pipeline',
      status,
      details,
      finishedAt: new Date()
    }
  });
  
  log('pipeline', 'Full pipeline finished', { status, details });
  
  if (hasError) {
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = main;
