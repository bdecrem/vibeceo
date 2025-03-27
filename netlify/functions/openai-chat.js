// Netlify Function for direct OpenAI integration
const { OpenAI } = require('openai');

exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  try {
    // Parse the incoming request body
    const body = JSON.parse(event.body);
    const { messages } = body;
    
    if (!Array.isArray(messages) || messages.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Messages array is required" })
      };
    }
    
    // Initialize OpenAI with API key from environment variable
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // Hardcode to gpt-3.5-turbo to avoid any model issues
    const MODEL = "gpt-3.5-turbo";
    
    console.log("Netlify function using model:", MODEL);
    
    // Make the API call to OpenAI
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages,
      max_tokens: 1000,
      temperature: 0.7
    });
    
    const message = completion.choices[0]?.message;
    
    if (!message) {
      throw new Error("No message in completion");
    }
    
    // Return the successful response
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: {
          role: message.role,
          content: message.content || ""
        },
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0
        }
      })
    };
  } catch (error) {
    console.error("Netlify function error:", {
      name: error.name,
      message: error.message,
      stack: error.stack ? error.stack.split('\n').slice(0, 3).join('\n') : 'No stack trace'
    });
    
    // Return error response
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to generate chat completion",
        details: error.message || "Unknown error"
      })
    };
  }
}; 