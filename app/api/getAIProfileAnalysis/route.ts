import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: Request) {
  const data = await request.json();
  const { tags, videos, livestreams } = data;

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `You are an expert content analyst who specializes in analyzing streaming profiles and content strategy. Your task is to:
- Analyze the streamer's current content based on their videos, livestreams, and tags
- Identify their core content themes and audience demographics
- Suggest content optimization strategies
- Provide insights on growth opportunities
- Highlight strengths and areas for improvement
- Recommend ways to increase engagement and viewership

Here is the streamer's profile data:

TAGS:
${JSON.stringify(tags, null, 2)}

VIDEOS:
${JSON.stringify(videos, null, 2)}

LIVESTREAMS:
${JSON.stringify(livestreams, null, 2)}

Please provide a comprehensive analysis of the streamer's profile including:
1. Content theme analysis
2. Audience profile assessment
3. Growth recommendations
4. Engagement strategy suggestions
5. Content optimization tips`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();

  return NextResponse.json({
    status: "success",
    result: response,
  });
}
