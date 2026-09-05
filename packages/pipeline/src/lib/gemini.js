const { GoogleGenerativeAI } = require('@google/generative-ai');
const pRetry = require('p-retry');

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || '');

const withRetry = async (fn, retries = 3) => {
  return pRetry(fn, { retries, minTimeout: 1000, factor: 2 });
};

module.exports = { genAI, withRetry };
