/**
 * SimpleTerms Privacy Policy Analyzer
 * Google Cloud Function with Gemini AI Integration
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Your Chrome Extension ID (replace with actual extension ID)
const ALLOWED_EXTENSION_ID = 'doiijdjjldampcdmgkefblfkofkhaeln';

// Simple rate limiting - track last request time
let lastRequestTime = 0;

/**
 * HTTP Cloud Function for analyzing privacy policies
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.analyzePrivacyPolicy = async (req, res) => {
  try {
    // Configure CORS headers for security
    const origin = req.get('Origin');
    const allowedOrigins = [
      `chrome-extension://${ALLOWED_EXTENSION_ID}`
    ].filter(Boolean);

    // Check if request is from allowed extension
    if (origin && allowedOrigins.includes(origin)) {
      res.set('Access-Control-Allow-Origin', origin);
    }
    
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Max-Age', '3600');

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({
        error: 'Method not allowed',
        message: 'Only POST requests are supported'
      });
    }

    // Check request size to prevent DoS attacks
    const contentLength = req.get('content-length');
    if (contentLength && parseInt(contentLength) > 500000) { // 500KB limit
      return res.status(413).json({
        error: 'Request too large',
        message: 'Request size exceeds maximum allowed limit'
      });
    }

    // Validate request body
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Request body must be valid JSON'
      });
    }

    const { policyText } = req.body;

    // Validate policyText parameter
    if (!policyText || typeof policyText !== 'string' || policyText.trim().length === 0) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'policyText is required and must be a non-empty string'
      });
    }

    // Check text length to prevent abuse
    if (policyText.length > 100000) { // 100KB limit
      return res.status(400).json({
        error: 'Text too long',
        message: 'Privacy policy text exceeds maximum length limit'
      });
    }

    // Optimize text length for faster processing
    const maxTextLength = 30000; // 30KB should capture essential policy info
    const optimizedText = policyText.length > maxTextLength 
      ? policyText.substring(0, maxTextLength) + '\n\n[Policy truncated for faster processing]'
      : policyText;

    console.log(`Processing privacy policy analysis (${optimizedText.length} characters) from origin: ${origin}`);

    // Rate limiting removed - Gemini 2.5 Flash has 1,000 RPM (sufficient for extension usage)

    // Analyze privacy policy with Gemini AI
    const analysis = await analyzeWithGemini(optimizedText);

    // Return successful response
    res.status(200).json({
      success: true,
      data: analysis,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in analyzePrivacyPolicy:', error);
    
    // Return appropriate error response
    if (error.code === 'GEMINI_API_ERROR') {
      res.status(503).json({
        error: 'AI service unavailable',
        message: 'The AI analysis service is temporarily unavailable. Please try again later.'
      });
    } else if (error.code === 'RATE_LIMIT_ERROR') {
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again in a few minutes.'
      });
    } else {
      res.status(500).json({
        error: 'Internal server error',
        message: 'An unexpected error occurred while processing your request.'
      });
    }
  }
};

/**
 * Simple rate limiting to stay under 15 requests/minute
 * @returns {Promise} Resolves after appropriate delay
 */
async function rateLimitDelay() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  const minInterval = 4000; // 4 seconds = 15 requests/minute max
  
  if (timeSinceLastRequest < minInterval) {
    const delay = minInterval - timeSinceLastRequest;
    console.log(`Rate limiting: waiting ${delay}ms before API call`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  lastRequestTime = Date.now();
}

/**
 * Analyze privacy policy text using Google Gemini AI
 * @param {string} policyText - The privacy policy text to analyze
 * @returns {Object} Analysis result with summary and score
 */
async function analyzeWithGemini(policyText) {
  try {
    // Get the Gemini model with speed optimizations
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        maxOutputTokens: 500,    // Limit output for faster generation
        temperature: 0.1,        // Lower temperature = faster, more focused responses
        topP: 0.8,              // Reduced randomness for speed
        topK: 10                // Fewer candidate tokens for speed
      }
    });

    // Construct the analysis prompt
    const prompt = `Analyze this privacy policy. Return JSON with:
1. "summary": 7 bullet points (max 15 words each) on data collection, usage, sharing, rights, retention, security, concerns  
2. "score": risk 1-10 (1=minimal, 10=invasive)

${policyText}`;

    console.log('Sending request to Gemini AI...');

    // Generate content using Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('Received response from Gemini AI');

    // Parse the JSON response
    let analysisResult;
    try {
      // Clean the response text (remove markdown code blocks if present)
      const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysisResult = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse Gemini response as JSON:', parseError);
      console.error('Raw response:', text);
      
      // Fallback: try to extract information manually
      analysisResult = extractAnalysisFromText(text);
    }

    // Validate the analysis result
    if (!analysisResult || typeof analysisResult !== 'object') {
      throw new Error('Invalid analysis result format');
    }

    // Ensure required fields exist
    if (!analysisResult.summary || typeof analysisResult.summary !== 'string') {
      analysisResult.summary = '• Unable to generate summary due to analysis error';
    }

    if (!analysisResult.score || typeof analysisResult.score !== 'number') {
      analysisResult.score = 5; // Default neutral score
    }

    // Validate score range
    if (analysisResult.score < 1 || analysisResult.score > 10) {
      analysisResult.score = Math.min(10, Math.max(1, analysisResult.score));
    }

    return analysisResult;

  } catch (error) {
    console.error('Error calling Gemini AI:', error);
    
    // Classify error types
    if (error.message && error.message.includes('quota')) {
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.code = 'RATE_LIMIT_ERROR';
      throw rateLimitError;
    } else {
      const geminiError = new Error('Gemini API error: ' + error.message);
      geminiError.code = 'GEMINI_API_ERROR';
      throw geminiError;
    }
  }
}

/**
 * Fallback function to extract analysis from text when JSON parsing fails
 * @param {string} text - The response text from Gemini
 * @returns {Object} Extracted analysis result
 */
function extractAnalysisFromText(text) {
  console.log('Attempting to extract analysis from non-JSON response');
  
  try {
    // Try to find bullet points for summary
    const bulletPoints = text.match(/[•\-\*]\s*[^\n]+/g) || [];
    const summary = bulletPoints.slice(0, 7).join('\n');
    
    // Try to find a score number
    const scoreMatch = text.match(/(?:score|rating).*?(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 5;
    
    return {
      summary: summary || '• Analysis completed but summary format was unclear',
      score: Math.min(10, Math.max(1, score))
    };
  } catch (extractError) {
    console.error('Failed to extract analysis from text:', extractError);
    return {
      summary: '• Unable to analyze privacy policy due to processing error',
      score: 5
    };
  }
}
