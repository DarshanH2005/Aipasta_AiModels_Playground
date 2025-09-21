// API utilities for external providers
import fetch from 'node-fetch';

// Server-side safe parse helper to handle HTML or non-JSON provider responses
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

// OpenRouter API utilities
export class OpenRouterAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://openrouter.ai/api/v1';
    this.headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
      'X-Title': 'AI Pasta'
    };
  }

  async getModels() {
    try {
      const response = await fetch(`${this.baseURL}/models`, {
        headers: this.headers
      });
      
      if (!response.ok) {
        const parsedErr = await safeParseResponseServer(response);
        const errText = parsedErr.__nonJson ? parsedErr.text : JSON.stringify(parsedErr);
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText} - ${errText}`);
      }
      
      const data = await safeParseResponseServer(response);
      return this.formatModels(data.data || []);
    } catch (error) {
      console.error('OpenRouter API error:', error);
      throw error;
    }
  }

  formatModels(rawModels) {
    return rawModels
      .filter(model => model.id && model.pricing) // Only models with pricing
      .map(model => ({
        id: model.id,
        name: model.name || model.id.split('/').pop(),
        provider: 'OpenRouter',
        description: model.description || `${model.id} via OpenRouter`,
        pricing: {
          input: parseFloat(model.pricing.prompt) || 0,
          output: parseFloat(model.pricing.completion) || 0,
          image: parseFloat(model.pricing.image) || 0
        },
        capabilities: {
          text: true,
          image: model.multimodal || false,
          audio: false, // OpenRouter doesn't specify audio capability
          video: false
        },
        maxTokens: model.context_length || 4096,
        contextLength: model.context_length || 4096,
        metadata: {
          topProvider: model.top_provider?.name,
          architecture: model.architecture,
          modality: model.modality,
          per_request_limits: model.per_request_limits
        }
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async createChatCompletion(model, messages, options = {}) {
    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          model: model,
          messages: messages,
          stream: options.stream || false,
          max_tokens: options.max_tokens || 1000,
          temperature: options.temperature || 0.7,
          top_p: options.top_p || 1,
          ...options
        })
      });

      if (!response.ok) {
        const parsedErr = await safeParseResponseServer(response);
        const errMsg = parsedErr.__nonJson ? parsedErr.text : (parsedErr.error?.message || JSON.stringify(parsedErr));
        throw new Error(`OpenRouter chat error: ${errMsg || response.statusText}`);
      }

      return response;
    } catch (error) {
      console.error('OpenRouter chat error:', error);
      throw error;
    }
  }
}

// Hugging Face API utilities
export class HuggingFaceAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://huggingface.co/api';
    this.inferenceURL = 'https://api-inference.huggingface.co';
    this.headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  async getModels() {
    try {
      // Get text generation models
      const textModels = await this.getModelsByTask('text-generation');
      
      // Get multimodal models (text-to-image, image-to-text)
      const multimodalModels = await this.getModelsByTask('image-to-text');
      
      const allModels = [...textModels, ...multimodalModels];
      return this.formatModels(allModels);
    } catch (error) {
      console.error('Hugging Face API error:', error);
      throw error;
    }
  }

  async getModelsByTask(task, limit = 50) {
    const response = await fetch(
      `${this.baseURL}/models?pipeline_tag=${task}&sort=downloads&direction=-1&limit=${limit}`,
      { headers: this.headers }
    );
    
    if (!response.ok) {
      const parsedErr = await safeParseResponseServer(response);
      const errText = parsedErr.__nonJson ? parsedErr.text : JSON.stringify(parsedErr);
      throw new Error(`HuggingFace API error: ${response.status} ${response.statusText} - ${errText}`);
    }
    
    return safeParseResponseServer(response);
  }

  formatModels(rawModels) {
    return rawModels
      .filter(model => 
        model.id && 
        !model.disabled && 
        (model.pipeline_tag === 'text-generation' || 
         model.pipeline_tag === 'image-to-text' ||
         model.pipeline_tag === 'text-to-image')
      )
      .map(model => ({
        id: model.id,
        name: model.id.split('/').pop() || model.id,
        provider: 'Hugging Face',
        description: model.description || `${model.id} via Hugging Face`,
        pricing: {
          input: 0, // Hugging Face Inference API is free (with rate limits)
          output: 0,
          image: 0
        },
        capabilities: {
          text: model.pipeline_tag === 'text-generation',
          image: model.pipeline_tag === 'image-to-text' || model.pipeline_tag === 'text-to-image',
          audio: false,
          video: false
        },
        maxTokens: 2048, // Conservative default for HF models
        contextLength: 2048,
        metadata: {
          downloads: model.downloads || 0,
          likes: model.likes || 0,
          pipeline_tag: model.pipeline_tag,
          library: model.library,
          tags: model.tags?.slice(0, 5) || []
        }
      }))
      .sort((a, b) => (b.metadata.downloads || 0) - (a.metadata.downloads || 0)); // Sort by popularity
  }

  async createTextGeneration(model, inputs, options = {}) {
    try {
      const response = await fetch(`${this.inferenceURL}/models/${model}`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          inputs: inputs,
          parameters: {
            max_new_tokens: options.max_tokens || 500,
            temperature: options.temperature || 0.7,
            top_p: options.top_p || 0.9,
            do_sample: true,
            return_full_text: false,
            ...options.parameters
          },
          options: {
            wait_for_model: true,
            use_cache: false
          }
        })
      });

      if (!response.ok) {
        const parsedErr = await safeParseResponseServer(response);
        const errText = parsedErr.__nonJson ? parsedErr.text : JSON.stringify(parsedErr);
        throw new Error(`HuggingFace inference error: ${errText}`);
      }

      return safeParseResponseServer(response);
    } catch (error) {
      console.error('HuggingFace generation error:', error);
      throw error;
    }
  }
}

// Rate limiting utilities
export class RateLimiter {
  constructor() {
    this.requests = new Map();
    this.windowMs = 60000; // 1 minute
    this.maxRequests = 30; // 30 requests per minute per IP
  }

  isAllowed(identifier) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    if (!this.requests.has(identifier)) {
      this.requests.set(identifier, []);
    }
    
    const userRequests = this.requests.get(identifier);
    const validRequests = userRequests.filter(time => time > windowStart);
    
    this.requests.set(identifier, validRequests);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    return true;
  }

  getRemainingRequests(identifier) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    if (!this.requests.has(identifier)) {
      return this.maxRequests;
    }
    
    const validRequests = this.requests.get(identifier).filter(time => time > windowStart);
    return Math.max(0, this.maxRequests - validRequests.length);
  }
}

export const rateLimiter = new RateLimiter();