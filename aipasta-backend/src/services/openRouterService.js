// Use Node.js built-in fetch (available in Node 18+)
// const fetch = require('node-fetch');

class OpenRouterService {
  constructor(apiKey) {
    console.log('🔧 OpenRouterService constructor called with API key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'MISSING');
    
    if (!apiKey) {
      console.error('❌ OpenRouter API Key is missing! Please check your .env file.');
      throw new Error('OpenRouter API key is required');
    }
    
    this.apiKey = apiKey;
    this.baseURL = 'https://openrouter.ai/api/v1';
    this.headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'User-Agent': 'AI-Pasta/1.0.0'
    };
    
    console.log('✅ OpenRouter Service initialized with API key:', apiKey.substring(0, 10) + '...');
    console.log('🔐 Authorization header:', this.headers.Authorization.substring(0, 20) + '...');
  }

  async getModels() {
    try {
      const response = await fetch(`${this.baseURL}/models`, {
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return this.formatModels(data.data || []);
    } catch (error) {
      console.error('OpenRouter getModels error:', error);
      throw error;
    }
  }

  formatModels(rawModels) {
    return rawModels
      .filter(model => model.id && model.pricing)
      .map(model => ({
        modelId: model.id,
        name: model.name || model.id.split('/').pop(),
        provider: 'OpenRouter',
        description: model.description || `${model.id} via OpenRouter`,
        category: this.categorizeModel(model),
        capabilities: {
          text: true,
          image: model.multimodal || false,
          audio: false,
          video: false,
          code: model.id.toLowerCase().includes('code'),
          function_calling: model.function_calling || false
        },
        pricing: {
          input: parseFloat(model.pricing.prompt) || 0,
          output: parseFloat(model.pricing.completion) || 0,
          image: parseFloat(model.pricing.image) || 0,
          audio: 0
        },
        limits: {
          maxTokens: model.context_length || 4096,
          contextLength: model.context_length || 4096,
          rateLimit: model.per_request_limits
        },
        metadata: {
          architecture: model.architecture?.modality,
          parameterCount: model.architecture?.parameters,
          tags: model.architecture?.tokenizer ? [model.architecture.tokenizer] : [],
          popularity: {
            usage: 0 // OpenRouter doesn't provide usage stats
          },
          performance: {
            speed: this.getSpeedRating(model),
            quality: this.getQualityRating(model),
            efficiency: this.getEfficiencyRating(model)
          }
        },
        status: 'active',
        isAvailable: true
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  categorizeModel(model) {
    const name = model.id.toLowerCase();
    if (model.multimodal) return 'multimodal';
    if (name.includes('code') || name.includes('copilot')) return 'code';
    if (name.includes('image') || name.includes('vision')) return 'image';
    return 'text-only';
  }

  getSpeedRating(model) {
    // Simple heuristic based on model size/type
    const name = model.id.toLowerCase();
    if (name.includes('turbo') || name.includes('fast')) return 'fast';
    if (name.includes('large') || name.includes('175b')) return 'slow';
    return 'medium';
  }

  getQualityRating(model) {
    const name = model.id.toLowerCase();
    if (name.includes('gpt-4') || name.includes('claude-3')) return 'high';
    if (name.includes('gpt-3.5') || name.includes('claude-2')) return 'medium';
    return 'medium';
  }

  getEfficiencyRating(model) {
    const inputPrice = parseFloat(model.pricing?.prompt) || 0;
    if (inputPrice === 0) return 'high';
    if (inputPrice < 0.001) return 'high';
    if (inputPrice < 0.01) return 'medium';
    return 'low';
  }

  async createChatCompletion(modelId, messages, options = {}) {
    try {
      console.log('🔐 OpenRouter headers being sent:', {
        ...this.headers,
        'Authorization': this.headers.Authorization ? `Bearer ${this.headers.Authorization.substring(7, 17)}...` : 'MISSING'
      });

      const requestBody = {
        model: modelId,
        messages: messages,
        stream: options.stream || false,
        max_tokens: options.max_tokens || 1000,
        temperature: options.temperature || 0.7,
        top_p: options.top_p || 1,
        frequency_penalty: options.frequency_penalty || 0,
        presence_penalty: options.presence_penalty || 0,
        ...options
      };

      console.log('📡 OpenRouter request details:', {
        url: `${this.baseURL}/chat/completions`,
        method: 'POST',
        model: modelId,
        messageCount: messages.length,
        bodySize: JSON.stringify(requestBody).length
      });

      console.log('🔍 Full request body preview:', JSON.stringify(requestBody, null, 2));
      console.log('🔍 Authorization header check:', this.headers.Authorization ? 'Present' : 'Missing');
      console.log('🔍 Full Authorization header:', this.headers.Authorization);
      
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ OpenRouter API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: errorText
        });
        
        let errorMessage;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error?.message || errorText;
        } catch {
          errorMessage = errorText;
        }
        throw new Error(`OpenRouter chat error: ${errorMessage}`);
      }

      const data = await response.json();
      console.log('✅ OpenRouter API successful response:', {
        choices: data.choices?.length || 0,
        usage: data.usage || 'none',
        model: data.model || 'unknown'
      });

      return data;
    } catch (error) {
      console.error('OpenRouter chat completion error:', error);
      throw error;
    }
  }

  async getModelInfo(modelId) {
    try {
      const models = await this.getModels();
      return models.find(model => model.modelId === modelId) || null;
    } catch (error) {
      console.error('OpenRouter getModelInfo error:', error);
      return null;
    }
  }
}

module.exports = OpenRouterService;