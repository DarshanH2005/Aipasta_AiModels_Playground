// DEPRECATED: This file is no longer used to avoid redundant API calls.
// All OpenRouter API calls should go through the backend API to ensure 
// proper session management, cost tracking, and centralized API handling.
// See: aipasta-backend/src/services/openRouterService.js

// OpenRouter API client for direct frontend integration
// This bypasses the backend and fetches models directly from OpenRouter

const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1';

// Local safe parse helper for responses
async function safeParseResponseClient(response) {
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

class OpenRouterClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseHeaders = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'AI Pasta'
    };
  }

  async fetchModels() {
    try {
      console.log('🔄 Fetching models directly from OpenRouter API...');
      
      const response = await fetch(`${OPENROUTER_API_BASE}/models`, {
        method: 'GET',
        headers: this.baseHeaders
      });

      if (!response.ok) {
        const parsedErr = await safeParseResponseClient(response);
        const errText = parsedErr.__nonJson ? parsedErr.text : JSON.stringify(parsedErr);
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText} - ${errText}`);
      }

      const data = await safeParseResponseClient(response);
      
      // Transform OpenRouter response to match our expected format
      const transformedModels = data.data?.map(model => ({
        id: model.id,
        name: model.name || model.id,
        provider: this.extractProvider(model.id),
        description: model.description || 'No description available',
        contextLength: model.context_length || 4096,
        pricing: {
          input: model.pricing?.prompt || 0,
          output: model.pricing?.completion || 0,
          currency: 'USD',
          unit: 'token'
        },
        capabilities: {
          // Modal expects text, image, audio format
          text: true,
          image: model.id.includes('vision') || model.name?.toLowerCase().includes('vision') || 
                 model.id.includes('gpt-4-turbo') || model.id.includes('gpt-4o') ||
                 model.id.includes('claude-3') || model.name?.toLowerCase().includes('multimodal'),
          audio: false, // Most models don't support audio yet
          // Keep legacy format for compatibility
          textGeneration: true,
          conversation: true,
          codeGeneration: model.id.includes('code') || model.name?.toLowerCase().includes('code'),
          reasoning: model.id.includes('gpt-4') || model.id.includes('claude'),
          multimodal: model.id.includes('vision') || model.name?.toLowerCase().includes('vision')
        },
        isAvailable: true,
        metadata: {
          popularity: {
            usage: this.estimatePopularity(model.id),
            rating: 4.5,
            reviews: 100
          },
          performance: {
            speed: this.estimateSpeed(model.id),
            accuracy: 0.85,
            reliability: 0.95
          }
        }
      })) || [];

      console.log(`✅ Loaded ${transformedModels.length} models from OpenRouter`);
      return transformedModels;
      
    } catch (error) {
      console.error('❌ Error fetching models from OpenRouter:', error);
      throw error;
    }
  }

  extractProvider(modelId) {
    if (modelId.includes('openai')) return 'OpenAI';
    if (modelId.includes('anthropic')) return 'Anthropic';
    if (modelId.includes('google')) return 'Google';
    if (modelId.includes('meta')) return 'Meta';
    if (modelId.includes('mistral')) return 'Mistral';
    if (modelId.includes('cohere')) return 'Cohere';
    
    // Extract from format like "provider/model-name"
    const parts = modelId.split('/');
    if (parts.length > 1) {
      return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    }
    
    return 'Unknown';
  }

  estimatePopularity(modelId) {
    // Assign popularity scores based on common model patterns
    if (modelId.includes('gpt-4')) return 95;
    if (modelId.includes('gpt-3.5')) return 85;
    if (modelId.includes('claude-3')) return 80;
    if (modelId.includes('gemini')) return 75;
    if (modelId.includes('llama')) return 70;
    return 60;
  }

  estimateSpeed(modelId) {
    // Estimate speed based on model type
    if (modelId.includes('3.5') || modelId.includes('haiku')) return 'very fast';
    if (modelId.includes('turbo') || modelId.includes('sonnet')) return 'fast';
    if (modelId.includes('gpt-4') || modelId.includes('opus')) return 'medium';
    return 'fast';
  }

  async sendChatMessage(modelId, messages, options = {}) {
    try {
      const response = await fetch(`${OPENROUTER_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: this.baseHeaders,
        body: JSON.stringify({
          model: modelId,
          messages: messages,
          max_tokens: options.maxTokens || 1000,
          temperature: options.temperature || 0.7,
          top_p: options.topP || 1,
          frequency_penalty: options.frequencyPenalty || 0,
          presence_penalty: options.presencePenalty || 0,
          stream: options.stream || false
        })
      });

      if (!response.ok) {
        const errorData = await safeParseResponseClient(response);
        throw new Error((errorData && !errorData.__nonJson && errorData.error?.message) ? errorData.error.message : `API error: ${response.status}`);
      }

      return await safeParseResponseClient(response);
    } catch (error) {
      console.error('❌ Error sending chat message:', error);
      throw error;
    }
  }
}

// Create singleton instance
let openRouterClient = null;

export const initOpenRouterClient = (apiKey) => {
  if (!apiKey) {
    throw new Error('OpenRouter API key is required');
  }
  openRouterClient = new OpenRouterClient(apiKey);
  return openRouterClient;
};

export const getOpenRouterClient = () => {
  if (!openRouterClient) {
    throw new Error('OpenRouter client not initialized. Call initOpenRouterClient() first.');
  }
  return openRouterClient;
};

export default OpenRouterClient;