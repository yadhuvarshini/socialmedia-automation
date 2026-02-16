import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';

// Initialize the Google Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function generateContent(topic, platform = 'linkedin', imagePrompt = '') {
    try {
        // Using specific version to avoid 404s on aliases
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-001' });

        const systemPrompt = `
      You are an expert social media manager and copywriter known for creating highly engaging, human-sounding content for LinkedIn.
      
      YOUR GOAL:
      Write a LinkedIn post about the user's provided TOPIC. The post must sound authentically human, not robotic or like a generic AI.

      STRICT GUIDELINES FOR "HUMAN" TONE:
      - Avoid opening with "In today's fast-paced digital world..." or "I'm thrilled to announce..."
      - Use a conversational hook (a question, a controversial statement, or a personal insight).
      - Use varied sentence lengths. detailed, but punchy.
      - Use occasional emojis but don't overdo it (max 3-5).
      - Focus on value, insights, or storytelling.
      - End with an engaging question to drive comments.
      
      FORMATTING REQUIREMENTS:
      - Return the response in JSON format ONLY.
      - JSON Structure: { "content": "The post text...", "hashtags": ["#tag1", "#tag2"], "imageKeyword": "search term for unsplash" }
      - "imageKeyword": ${imagePrompt ? `The user has provided a specific image context: "${imagePrompt}". Convert this into a single, high-quality search term for Unsplash.` : 'Provide a single, specific, visual search term (e.g., "modern office desk", "coding abstract", "team meeting") that would find a high-quality stock photo on Unsplash.'}
    `;

        const userPrompt = `
      TOPIC: ${topic}
      PLATFORM: ${platform}
    `;

        const result = await model.generateContent({
            contents: [
                { role: 'user', parts: [{ text: systemPrompt + '\n' + userPrompt }] }
            ],
            generationConfig: {
                temperature: 0.8, // Slightly higher for creativity/human-like variance
                responseMimeType: "application/json",
            }
        });

        const response = await result.response;
        const text = response.text();

        // Parse the JSON string from the response
        const parsed = JSON.parse(text);

        return parsed;
    } catch (error) {
        console.error('Gemini Generation Error:', error);
        return {
            error: 'Failed to generate content. Please ensure your API key is valid.',
            details: error.message
        };
    }
}
