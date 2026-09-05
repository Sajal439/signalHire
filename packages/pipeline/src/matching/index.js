const prisma = require('../lib/db');
const { log } = require('../lib/logger');
const { genAI, withRetry } = require('../lib/gemini');
const { cosineSimilarity } = require('./cosine');

const MIN_SIMILARITY = parseFloat(process.env.MIN_SIMILARITY || '0.30');

async function runMatching() {
  log('match', 'Starting matching process');
  const chatModel = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: 'You are an expert recruiter. Given a resume profile and a job description, score how well the candidate fits the role from 0-100 and provide a one-sentence reason. Respond with valid JSON only: {"score": number, "reason": "string"}',
    generationConfig: {
      responseMimeType: 'application/json'
    }
  });
  
  let status = 'success';
  let details = { scored: 0, llmCalls: 0, errors: [] };
  
  try {
    const users = await prisma.user.findMany({
      where: {
        resumeProfile: {
          profileReady: true
        }
      },
      include: {
        resumeProfile: true
      }
    });
    
    for (const user of users) {
      if (!user.resumeProfile || !user.resumeProfile.embedding || user.resumeProfile.embedding.length === 0) continue;
      
      try {
        const resumeEmbedding = user.resumeProfile.embedding;
        
        const jobs = await prisma.job.findMany({
          where: {
            embeddedAt: { not: null },
            NOT: {
              matches: {
                some: { userId: user.id }
              }
            }
          }
        });
        
        for (const job of jobs) {
          if (!job.embedding || job.embedding.length === 0) continue;
          
          const fitScore = cosineSimilarity(resumeEmbedding, job.embedding);
          let llmScore = null;
          let llmReason = null;
          
          if (fitScore >= MIN_SIMILARITY) {
            const promptStr = `Resume:\n${user.resumeProfile.combinedText || ''}\n\nJob:\nTitle: ${job.title}\nCompany: ${job.company}\nDescription: ${job.description.slice(0, 3000)}`;
            
            let rawContent = '';
            try {
              const response = await withRetry(async () => {
                return chatModel.generateContent(promptStr);
              });
              rawContent = response.response.text();
              const resJson = JSON.parse(rawContent);
              llmScore = typeof resJson.score === 'number' ? resJson.score : null;
              llmReason = resJson.reason || null;
            } catch (e) {
              log('match', 'Failed to parse LLM response', { userId: user.id, jobId: job.id, content: rawContent, err: e.message });
            }
            details.llmCalls++;
            
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          await prisma.jobMatch.create({
            data: {
              userId: user.id,
              jobId: job.id,
              fitScore,
              llmScore,
              llmReason,
              scoredAt: new Date()
            }
          });
          details.scored++;
        }
      } catch (userErr) {
        log('match', `Error processing user ${user.id}`, { error: userErr.message });
        details.errors.push(`User ${user.id}: ${userErr.message}`);
      }
    }
    
    log('match', 'Matching process complete', details);
  } catch (err) {
    status = 'error';
    details.errors.push(err.message);
    log('match', 'Matching process failed', { error: err.message });
  }
  
  await prisma.pipelineRun.create({
    data: {
      stage: 'match',
      status,
      details,
      finishedAt: new Date()
    }
  });
}

if (require.main === module) {
  runMatching().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { runMatching };
