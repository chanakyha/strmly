import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: Request) {
  const data = await request.json();
  const { chatMessage } = data;

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `You are an AI assistant for a crypto-friendly streaming platform. Your task is to analyze a chat message that contains a donation and extract the following information:
- The donation amount in Ethereum (ETH)
- The message for the streamer

Here is the chat message: "${chatMessage}"

Please extract ONLY the Ethereum donation amount and the message. Return NOTHING but a JSON object in this exact format:
{
  "amount": number,
  "message": "string"
}

If you cannot detect a donation amount, set amount to 0.
Make sure the output is a valid JSON object that can be parsed directly.`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();
  let cleanedResponse = responseText;
  // Remove ```json at the beginning and ``` at the end if they exist
  cleanedResponse = cleanedResponse
    .replace(/^```json\s*/g, "")
    .replace(/\s*```$/g, "");

  try {
    // Clean the response text by removing markdown code block formatting if present

    const parsedResponse = JSON.parse(
      cleanedResponse
        .trim()
        .replace(/^```json\s*/g, "")
        .replace(/\s*```$/g, "")
    );

    console.log(parsedResponse);

    // Check if donation amount was found
    if (parsedResponse.amount === 0) {
      return NextResponse.json({
        status: "failed",
        message: "No donation amount detected in chat message",
      });
    }

    return NextResponse.json({
      status: "success",
      result: parsedResponse,
    });
  } catch (error) {
    console.error("Error parsing Gemini response:", error);
    return NextResponse.json({
      status: "failed",
      message: "Failed to parse donation information",
    });
  }
}
