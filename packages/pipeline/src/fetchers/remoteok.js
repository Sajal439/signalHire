const fetch = require('node-fetch');
const prisma = require('../lib/db');

async function fetchRemoteOK() {
  const url = 'https://remoteok.com/api';
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'JobFitEnginePipeline/1.0 (contact@example.com)'
    }
  });
  
  if (!response.ok) {
    throw new Error(`RemoteOK fetch failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const jobs = data.filter(job => job.id);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const job of jobs) {
    const externalId = String(job.id);
    const title = job.position;
    const company = job.company;
    const description = (job.description || '').replace(/<[^>]*>/g, '');
    const jobUrl = job.url;
    const location = job.location || null;
    const remote = true;
    const postedAt = job.date ? new Date(job.date * 1000) : null;

    const existing = await prisma.job.findUnique({
      where: {
        source_externalId: { source: 'remoteok', externalId }
      }
    });

    if (existing) {
      if (existing.title !== title || existing.company !== company || existing.description !== description || existing.url !== jobUrl) {
        await prisma.job.update({
          where: { source_externalId: { source: 'remoteok', externalId } },
          data: { title, company, description, url: jobUrl, location, remote, postedAt }
        });
        updated++;
      } else {
        skipped++;
      }
    } else {
      await prisma.job.create({
        data: {
          source: 'remoteok',
          externalId,
          title,
          company,
          description,
          url: jobUrl,
          location,
          remote,
          postedAt
        }
      });
      inserted++;
    }
  }

  return { inserted, updated, skipped };
}

module.exports = { fetchRemoteOK };
