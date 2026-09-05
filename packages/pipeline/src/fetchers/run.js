const prisma = require('../lib/db');
const { log } = require('../lib/logger');
const { fetchRemoteOK } = require('./remoteok');
const { fetchHN } = require('./hn');

async function main() {
  log('fetch', 'Starting fetchers');
  const details = { remoteok: null, hn: null, error: null };
  let status = 'success';
  
  try {
    details.remoteok = await fetchRemoteOK();
    log('fetch', 'RemoteOK fetch complete', details.remoteok);
  } catch (err) {
    status = 'error';
    details.remoteok = { error: err.message };
    log('fetch', 'RemoteOK fetch failed', { error: err.message });
  }

  try {
    details.hn = await fetchHN();
    log('fetch', 'HN fetch complete', details.hn);
  } catch (err) {
    status = 'error';
    details.hn = { error: err.message };
    log('fetch', 'HN fetch failed', { error: err.message });
  }

  await prisma.pipelineRun.create({
    data: {
      stage: 'fetch',
      status,
      details,
      finishedAt: new Date()
    }
  });
  
  log('fetch', 'Fetchers finished', { status });
}

if (require.main === module) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = main;
