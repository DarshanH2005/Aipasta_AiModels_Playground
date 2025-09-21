// API endpoint for streaming chat responses from multiple AI models
import { OpenRouterAPI, HuggingFaceAPI, rateLimiter } from '../../lib/api-providers';

// Local helper: safely parse a fetch Response (server-side) to avoid throwing on HTML/error pages
async function safeParseResponseServer(response) {
  try {
    const text = await response.text();
    const contentType = response.headers.get('content-type') || '';
    if (contentType.toLowerCase().includes('application/json')) {
      try { return JSON.parse(text); } catch (e) { return { __nonJson: true, text }; }
    }
    const trimmed = (text || '').trim();
    if (trimmed.startsWith('<!DOCTYPE') || trimmed.toLowerCase().startsWith('<html') || trimmed.startsWith('<div')) {
      return { __nonJson: true, html: true, text };
    }
    try { return JSON.parse(text); } catch (e) { return { __nonJson: true, text }; }
  } catch (err) {
    return { __nonJson: true, text: String(err) };
  }
}

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  if (!rateLimiter.isAllowed(clientIp)) {
    return res.status(429).json({ 
      error: 'Too many requests', 
      retryAfter: 60,
      remaining: rateLimiter.getRemainingRequests(clientIp)
    });
  }

  try {
    const { model, messages, stream = false, options = {} } = req.body;

    // Validate required fields
    if (!model || !messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ 
        error: 'Missing required fields: model and messages are required' 
      });
    }

    // Determine provider and route request
    if (model.includes('/') || model.startsWith('openrouter:')) {
      return await handleOpenRouterRequest(req, res, model, messages, stream, options);
    } else {
      return await handleHuggingFaceRequest(req, res, model, messages, stream, options);
    }

  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

async function handleOpenRouterRequest(req, res, model, messages, stream, options) {
  const api = new OpenRouterAPI(process.env.OPENROUTER_API_KEY);
  
  try {
    // Clean model ID (remove openrouter: prefix if present)
    const cleanModelId = model.replace('openrouter:', '');
    
    const response = await api.createChatCompletion(cleanModelId, messages, {
      ...options,
      stream
    });

    if (stream) {
      // Set headers for streaming response
      res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      // Create readable stream and pipe to response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            res.write('data: [DONE]\n\n');
            break;
          }
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              res.write(line + '\n\n');
            }
          }
        }
      } catch (streamError) {
        console.error('Streaming error:', streamError);
        res.write(`data: {"error": "${streamError.message}"}\n\n`);
      } finally {
        res.end();
      }
    } else {
      // Non-streaming response
      const data = await safeParseResponseServer(response);
      
      // Calculate token usage and cost
      const usage = data.usage || {};
      const modelPricing = await getModelPricing(cleanModelId);
      const cost = calculateCost(usage, modelPricing);
      
      res.status(200).json({
        ...data,
        cost,
        provider: 'OpenRouter',
        model: cleanModelId
      });
    }
    
  } catch (error) {
    console.error('OpenRouter request error:', error);
    res.status(500).json({ 
      error: 'OpenRouter API error',
      details: error.message 
    });
  }
}

async function handleHuggingFaceRequest(req, res, model, messages, stream, options) {
  const api = new HuggingFaceAPI(process.env.HUGGINGFACE_API_KEY);
  
  try {
    // Convert messages to single prompt for HuggingFace
    const prompt = messages
      .map(msg => `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`)
      .join('\n') + '\nAssistant:';
    
    if (stream) {
      // HuggingFace doesn't support streaming, so we'll simulate it
      res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      const result = await api.createTextGeneration(model, prompt, options);
      const text = Array.isArray(result) ? result[0]?.generated_text || '' : result.generated_text || '';
      
      // Simulate streaming by sending chunks
      const chunks = text.split(' ');
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i] + (i < chunks.length - 1 ? ' ' : '');
        const delta = {
          id: `hf-${Date.now()}`,
          object: 'chat.completion.chunk',
          created: Math.floor(Date.now() / 1000),
          model: model,
          choices: [{
            index: 0,
            delta: { content: chunk },
            finish_reason: i === chunks.length - 1 ? 'stop' : null
          }]
        };
        
        res.write(`data: ${JSON.stringify(delta)}\n\n`);
        
        // Add small delay to simulate streaming
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      res.write('data: [DONE]\n\n');
      res.end();
      
    } else {
      // Non-streaming response
      const result = await api.createTextGeneration(model, prompt, options);
      const text = Array.isArray(result) ? result[0]?.generated_text || '' : result.generated_text || '';
      
      // Clean up the response (remove the prompt part)
      const cleanText = text.replace(prompt, '').trim();
      
      const response = {
        id: `hf-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: model,
        provider: 'Hugging Face',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: cleanText
          },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: Math.ceil(prompt.length / 4),
          completion_tokens: Math.ceil(cleanText.length / 4),
          total_tokens: Math.ceil((prompt.length + cleanText.length) / 4)
        },
        cost: 0 // HuggingFace is free
      };
      
      res.status(200).json(response);
    }
    
  } catch (error) {
    console.error('HuggingFace request error:', error);
    res.status(500).json({ 
      error: 'HuggingFace API error',
      details: error.message 
    });
  }
}

// Helper function to get model pricing
async function getModelPricing(modelId) {
  // This would ideally come from the cached models data
  // For now, return default pricing structure
  return {
    input: 0.001,
    output: 0.002,
    image: 0.005
  };
}

// Helper function to calculate cost
function calculateCost(usage, pricing) {
  const inputTokens = usage.prompt_tokens || 0;
  const outputTokens = usage.completion_tokens || 0;
  
  const inputCost = (inputTokens * pricing.input) / 1000;
  const outputCost = (outputTokens * pricing.output) / 1000;
  
  return {
    inputTokens,
    outputTokens,
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost
  };
}