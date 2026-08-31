import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// Retrieve active and fallback API keys from environment
const getApiKeys = () => {
  return [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].filter(Boolean) as string[];
};

export async function POST(req: Request) {
  try {
    const { jobDescription, resumes, voiceQuery, language } = await req.json();

    if (!jobDescription) {
      return NextResponse.json(
        { error: 'Job description is required.' },
        { status: 400 }
      );
    }

    if (!resumes || !Array.isArray(resumes) || resumes.length === 0) {
      return NextResponse.json(
        { error: 'At least one resume is required for ranking.' },
        { status: 400 }
      );
    }

    const keys = getApiKeys();
    if (keys.length === 0) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured. Please check your .env.local file.' },
        { status: 500 }
      );
    }

    // Schema definition for Gemini 2.5 Flash JSON Output
    const responseSchema = {
      type: 'OBJECT',
      properties: {
        summaryResponse: {
          type: 'STRING',
          description: 'A conversational audio summary summarizing the results in 2-3 sentences. Mention the top candidate by name and score.'
        },
        candidates: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              id: { type: 'STRING', description: 'The unique candidate ID matching the input' },
              name: { type: 'STRING', description: 'The candidate\'s full name, extracted from the resume' },
              rank: { type: 'INTEGER', description: 'Assigned rank order, starting at 1 for the best candidate' },
              atsScore: { type: 'INTEGER', description: 'ATS match score from 0 to 100' },
              yearsOfExperience: { type: 'INTEGER', description: 'Approximate total years of experience' },
              pros: {
                type: 'ARRAY',
                items: { type: 'STRING' },
                description: 'List of specific strengths and criteria matches'
              },
              cons: {
                type: 'ARRAY',
                items: { type: 'STRING' },
                description: 'List of specific gaps, weaknesses, or missing requirements'
              },
              topSkills: {
                type: 'ARRAY',
                items: { type: 'STRING' },
                description: 'Top 3-6 technologies or core skills'
              },
              summary: {
                type: 'STRING',
                description: 'A 1-2 sentence summary of their profile and suitability'
              }
            },
            required: ['id', 'name', 'rank', 'atsScore', 'yearsOfExperience', 'pros', 'cons', 'topSkills', 'summary']
          }
        }
      },
      required: ['summaryResponse', 'candidates']
    };

    // Optimize resume text to save token costs and prevent rate-limits
    const optimizedResumes = resumes.map((r: any) => {
      const cleanText = (r.rawText || '')
        .replace(/\s+/g, ' ') // Collapse multiple whitespaces, tabs, newlines
        .trim();
      return {
        ...r,
        // Limit text length to ~10,000 characters (approx 2,000 words) to save tokens
        rawText: cleanText.length > 10000 ? cleanText.substring(0, 10000) + '... [Resume text truncated to optimize tokens]' : cleanText
      };
    });

    const prompt = `
You are an expert HR ATS (Applicant Tracking System) Copilot. Analyze the following candidate resumes against the Job Description and the optional HR Voice Command.

Job Description:
${jobDescription}

HR Voice Command / Special criteria:
${voiceQuery ? voiceQuery : "None provided. Rank them purely by matching the Job Description."}

Resumes to analyze:
${optimizedResumes.map((r: any) => `
Candidate ID: ${r.id}
File Name: ${r.fileName}
Resume Content:
${r.rawText}
---
`).join('\n')}

Evaluate each resume thoroughly. For each candidate:
1. Extract their name from the text.
2. Estimate their total years of professional experience.
3. Determine their top skills.
4. Identify 3-4 key pros relative to the job description and voice command.
5. Identify 2-3 cons (gaps, lacking skills, or fewer years of experience).
6. Create a 1-2 sentence profile summary.
7. Assign an ATS score from 0 to 100. Be critical and honest; a higher score represents a better match.
8. Rank them from best match (Rank 1) to worst match.

Make sure the "summaryResponse" is a natural, conversational 2-3 sentence overview that can be spoken out loud via text-to-speech.

CRITICAL LANGUAGE INSTRUCTION:
${language === 'ur-PK'
  ? `The user's active language is Urdu. The 'summaryResponse' MUST be written entirely in clean, native Urdu script (using Urdu characters, e.g. "میں نے 3 امیدواروں کا جائزہ لیا ہے۔ آپ کا سب سے بہترین امیدوار...") so the browser's Urdu text-to-speech engine can read it in Urdu. Do NOT use English or Roman Urdu script (Latin characters) for 'summaryResponse'. Explain which candidate is best, their score, and main strength in natural Urdu.`
  : `The 'summaryResponse' must be written in English. For example: "I have analyzed the 3 CVs. Your top candidate is Sarah Jenkins with a 94% ATS score. She has over 6 years of React and AWS experience, fitting your requirements perfectly."`
}
`;

    let lastError: any = null;
    
    // Choose a random starting index to distribute requests evenly among keys (load balancing)
    const startIndex = Math.floor(Math.random() * keys.length);
    
    // Cycle through API keys starting at the random index, with full fallback capability
    for (let attempt = 0; attempt < keys.length; attempt++) {
      const keyIndex = (startIndex + attempt) % keys.length;
      const apiKey = keys[keyIndex];
      try {
        console.log(`Attempting API call using key index ${keyIndex + 1}/${keys.length} (Attempt ${attempt + 1})...`);
        
        const ai = new GoogleGenAI({ apiKey });
        
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: responseSchema,
            temperature: 0.2, // Low temperature for more deterministic analysis
          }
        });

        const textResponse = response.text;
        if (!textResponse) {
          throw new Error('Gemini API returned an empty response.');
        }

        // Parse and return the structured JSON data
        const parsedData = JSON.parse(textResponse);
        return NextResponse.json(parsedData);
      } catch (err: any) {
        console.error(`Error with API key index ${keyIndex + 1}:`, err.message || err);
        lastError = err;
        // Continue loop to try next key
      }
    }

    // If all keys fail, return the last error
    return NextResponse.json(
      { 
        error: 'All configured Gemini API keys failed to complete the request.',
        details: lastError?.message || String(lastError) 
      },
      { status: 500 }
    );

  } catch (error: any) {
    console.error('Unhandled error in rank-resumes API route:', error);
    return NextResponse.json(
      { error: 'An unexpected server error occurred.', details: error.message || String(error) },
      { status: 500 }
    );
  }
}
