const fetch = require('node-fetch');
const prisma = require('../lib/db');

async function fetchHN() {
  const searchRes = await fetch('https://hn.algolia.com/api/v1/search?query=Ask+HN+Who+is+Hiring&tags=ask_hn&hitsPerPage=1');
  const searchData = await searchRes.json();
  if (!searchData.hits || searchData.hits.length === 0) {
    throw new Error('Could not find HN Who is Hiring thread');
  }
  
  const threadId = searchData.hits[0].objectID;
  
  const threadRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${threadId}.json`);
  const threadData = await threadRes.json();
  
  const commentIds = threadData.kids || [];
  
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  
  const batchSize = 20;
  for (let i = 0; i < commentIds.length; i += batchSize) {
    const batchIds = commentIds.slice(i, i + batchSize);
    
    const commentsRes = await Promise.all(batchIds.map(async (id) => {
      const res = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
      return res.json();
    }));
    
    for (const comment of commentsRes) {
      if (!comment || comment.deleted || comment.dead || !comment.text || comment.text.length < 80) {
        continue;
      }
      
      const rawText = comment.text;
      
      let companyMatch = rawText.match(/^([^|(\-]+)/);
      let company = companyMatch ? companyMatch[1].replace(/<[^>]*>/g, '').trim() : 'Unknown';
      
      const parts = rawText.split('|');
      let title = 'Software Engineer';
      if (parts.length > 1) {
        title = parts[1].replace(/<[^>]*>/g, '').trim();
      }
      
      const remote = rawText.toLowerCase().includes('remote');
      
      let urlMatch = rawText.match(/href="([^"]+)"/);
      let jobUrl = urlMatch ? urlMatch[1] : `https://news.ycombinator.com/item?id=${comment.id}`;
      
      const description = rawText.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/g, ' ');
      const externalId = String(comment.id);
      
      const existing = await prisma.job.findUnique({
        where: { source_externalId: { source: 'hn_whoishiring', externalId } }
      });
      
      if (existing) {
        if (existing.title !== title || existing.company !== company || existing.description !== description || existing.url !== jobUrl) {
          await prisma.job.update({
            where: { source_externalId: { source: 'hn_whoishiring', externalId } },
            data: { title, company, description, url: jobUrl, remote }
          });
          updated++;
        } else {
          skipped++;
        }
      } else {
        await prisma.job.create({
          data: {
            source: 'hn_whoishiring',
            externalId,
            title,
            company,
            description,
            url: jobUrl,
            remote,
            postedAt: comment.time ? new Date(comment.time * 1000) : null
          }
        });
        inserted++;
      }
    }
  }
  
  return { inserted, updated, skipped };
}

module.exports = { fetchHN };
