// services/thankYouGenerator.js
const { Configuration, OpenAIApi } = require('openai');

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

async function generateThankYouNote(name = 'Client') {
  const prompt = `Write a warm, professional thank you note to ${name} for submitting their accident report via Car Crash Lawyer AI. Keep it under 120 words.`;

  const completion = await openai.createChatCompletion({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: 'You are a helpful assistant writing thank-you messages for a legal app.' },
      { role: 'user', content: prompt }
    ],
  });

  return completion.data.choices[0].message.content.trim();
}

module.exports = { generateThankYouNote };
