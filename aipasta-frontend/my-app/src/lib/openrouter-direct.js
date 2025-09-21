// DEPRECATED: This file is no longer used to avoid redundant API calls.
// All OpenRouter API calls should go through the backend API to ensure 
// proper session management, cost tracking, and centralized API handling.
// See: aipasta-backend/src/services/openRouterService.js

// Direct OpenRouter API integration for frontend
const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1';

// Get API key from environment - this should be set in .env.local
const OPENROUTER_API_KEY = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;

// Local safe parse helper
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

export class OpenRouterDirect {
  constructor(apiKey = null) {
    // Prioritize passed key, then environment variable, then fallback
    this.apiKey = apiKey || OPENROUTER_API_KEY || 'sk-or-v1-your-key-here';
    
    if (!this.hasValidKey()) {
      console.warn('OpenRouter API key not configured. Please set NEXT_PUBLIC_OPENROUTER_API_KEY in .env.local');
    }
  }

  // Set API key dynamically (keeping for backward compatibility)
  setApiKey(apiKey) {
    this.apiKey = apiKey;
  }

  // Check if API key is set and potentially valid
  hasValidKey() {
    return this.apiKey && 
           this.apiKey !== 'sk-or-v1-your-key-here' && 
           this.apiKey.startsWith('sk-or-');
  }

  // Get available models directly from OpenRouter
  async getModels() {
    console.log('OpenRouterDirect: Fetching models with API key:', this.apiKey?.substring(0, 10) + '...');
    
    try {
      const response = await fetch(`${OPENROUTER_API_BASE}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
          'X-Title': 'AI Pasta'
        }
      });

      console.log('OpenRouter API response status:', response.status);

      if (!response.ok) {
        const parsedErr = await safeParseResponseClient(response);
        const errorText = parsedErr.__nonJson ? parsedErr.text : JSON.stringify(parsedErr);
        console.error('OpenRouter API error response:', errorText);
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await safeParseResponseClient(response);
      console.log(`OpenRouter raw response: ${data.data?.length || 0} models received`);
      
      // Transform OpenRouter models to our format
      const transformedModels = data.data?.map(model => ({
        id: model.id,
        modelId: model.id,
        name: model.name || model.id,
        provider: 'OpenRouter',
        description: model.description || `${model.name || model.id} - Context: ${model.context_length || 'N/A'}`,
        category: this.categorizeModel(model),
        capabilities: {
          text: true,
          image: model.id.includes('vision') || model.id.includes('gpt-4') || model.id.includes('claude-3'),
          audio: model.id.includes('whisper') || model.id.includes('audio'),
          video: false,
          code: model.id.includes('code') || model.id.includes('deepseek') || model.id.includes('codestral'),
          function_calling: model.id.includes('gpt-4') || model.id.includes('claude') || model.id.includes('gemini')
        },
        pricing: {
          input: model.pricing?.prompt || 0,
          output: model.pricing?.completion || 0,
          image: model.pricing?.image || 0
        },
        maxTokens: model.top_provider?.max_completion_tokens || 4096,
        contextLength: model.context_length || 4096,
        context_length: model.context_length || 4096,
        metadata: {
          provider: 'OpenRouter',
          architecture: model.architecture || 'transformer',
          popularity: {
            usage: Math.random() * 1000 // Placeholder since OpenRouter doesn't provide this
          }
        }
      })) || [];

      console.log(`Transformed ${transformedModels.length} OpenRouter models`);
      
      // Debug: Log first few models to see their structure
      if (transformedModels.length > 0) {
        console.log('Sample transformed models:', transformedModels.slice(0, 3).map(m => ({
          id: m.id,
          modelId: m.modelId, 
          name: m.name,
          provider: m.provider
        })));
      }
      
      return transformedModels;
    } catch (error) {
      console.error('OpenRouter Direct API error:', error);
      throw error;
    }
  }

  // Send chat message directly to OpenRouter
  async sendMessage(message, modelId, options = {}) {
    console.log('OpenRouterDirect.sendMessage called with:', { 
      messageLength: message?.length || 0, 
      modelId, 
      hasApiKey: !!this.apiKey 
    });
    
    if (!this.hasValidKey()) {
      throw new Error('OpenRouter API key not configured or invalid');
    }

    try {
      const response = await fetch(`${OPENROUTER_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
          'X-Title': 'AI Pasta'
        },
        body: JSON.stringify({
          model: modelId,
          messages: Array.isArray(message) ? message : [
            {
              role: 'user',
              content: message
            }
          ],
          stream: options.stream || false,
          max_tokens: options.maxTokens || 4000,
          temperature: options.temperature || 0.7,
          top_p: options.topP || 1,
          ...options.additionalParams
        })
      });

      console.log('OpenRouter API request sent:', { 
        url: `${OPENROUTER_API_BASE}/chat/completions`,
        modelId, 
        responseStatus: response.status 
      });

        if (!response.ok) {
        const parsedErr = await safeParseResponseClient(response);
        let errorData = parsedErr.__nonJson ? { error: { message: parsedErr.text } } : parsedErr;

        // Handle rate limit errors specially
        if (response.status === 429) {
          const message = errorData?.error?.message || 'Rate limit exceeded';
          const isProviderRateLimit = message.includes('rate-limited upstream') || message.includes('temporarily rate-limited');
          
          if (isProviderRateLimit) {
            throw new Error(`Model temporarily unavailable: ${errorData?.error?.metadata?.provider_name || 'Provider'} has reached rate limits. Please try a different model or wait a few minutes.`);
          } else {
            throw new Error('Rate limit reached. Please wait a moment before sending another message.');
          }
        }

        // Handle other API errors
        const errorMessage = errorData?.error?.message || errorText;
        throw new Error(`API Error (${response.status}): ${errorMessage}`);
      }

      if (options.stream) {
        return response; // Return stream response for handling
      }

      const data = await safeParseResponseClient(response);
      if (data && data.__nonJson) {
        throw new Error(`Non-JSON response from OpenRouter: ${String(data.text).slice(0,200)}`);
      }
      console.log('OpenRouter API response data:', { 
        hasChoices: !!data.choices,
        choicesLength: data.choices?.length,
        hasContent: !!data.choices?.[0]?.message?.content,
        model: data.model
      });
      
      return {
        choices: [{
          message: {
            content: data.choices?.[0]?.message?.content || 'No response generated'
          }
        }],
        content: data.choices?.[0]?.message?.content || 'No response generated',
        model: data.model,
        usage: data.usage,
        finish_reason: data.choices?.[0]?.finish_reason
      };
    } catch (error) {
      console.error('OpenRouter Direct chat error:', error);
      throw error;
    }
  }

  // Stream chat response
  async *streamMessage(message, modelId, options = {}) {
    try {
      const response = await this.sendMessage(message, modelId, { ...options, stream: true });
      
      if (!response.body) {
        throw new Error('No response body for streaming');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            if (jsonStr === '[DONE]') return;
            
            try {
              const data = JSON.parse(jsonStr);
              const content = data.choices?.[0]?.delta?.content || '';
              if (content) {
                yield content;
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('OpenRouter streaming error:', error);
      throw error;
    }
  }

  // Categorize model based on its ID/name
  categorizeModel(model) {
    const id = model.id.toLowerCase();
    const name = (model.name || '').toLowerCase();
    
    if (id.includes('vision') || id.includes('gpt-4') && id.includes('vision') || id.includes('claude-3')) {
      return 'multimodal';
    }
    
    if (id.includes('code') || id.includes('deepseek') || id.includes('codestral') || id.includes('starcoder')) {
      return 'code';
    }
    
    if (id.includes('image') || id.includes('dalle') || id.includes('midjourney')) {
      return 'image';
    }
    
    return 'text-only';
  }

  // Check if API key is set and potentially valid
  hasValidKey() {
    return this.apiKey && 
           this.apiKey !== 'sk-or-v1-your-key-here' && 
           this.apiKey.startsWith('sk-or-');
  }
}

// Export singleton instance
export const openRouterDirect = new OpenRouterDirect();

// Export class for creating custom instances
export default OpenRouterDirect;