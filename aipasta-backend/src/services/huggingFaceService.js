const fetch = require('node-fetch');

class HuggingFaceService {
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
      // Get different types of models in parallel
      const [textModels, multimodalModels, codeModels] = await Promise.allSettled([
        this.getModelsByTask('text-generation', 30),
        this.getModelsByTask('image-to-text', 10),
        this.getModelsByTask('text-generation', 15, 'code')
      ]);

      let allModels = [];

      if (textModels.status === 'fulfilled') {
        allModels.push(...textModels.value);
      }
      
      if (multimodalModels.status === 'fulfilled') {
        allModels.push(...multimodalModels.value);
      }
      
      if (codeModels.status === 'fulfilled') {
        allModels.push(...codeModels.value);
      }

      // Remove duplicates and format
      const uniqueModels = this.removeDuplicates(allModels, 'id');
      return this.formatModels(uniqueModels);
    } catch (error) {
      console.error('HuggingFace getModels error:', error);
      throw error;
    }
  }

  async getModelsByTask(task, limit = 50, filter = null) {
    try {
      let url = `${this.baseURL}/models?pipeline_tag=${task}&sort=downloads&direction=-1&limit=${limit}`;
      
      if (filter) {
        url += `&search=${encodeURIComponent(filter)}`;
      }

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });

      if (!response.ok) {
        throw new Error(`HuggingFace API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`HuggingFace getModelsByTask (${task}) error:`, error);
      return [];
    }
  }

  removeDuplicates(array, key) {
    const seen = new Set();
    return array.filter(item => {
      const keyValue = item[key];
      if (seen.has(keyValue)) {
        return false;
      }
      seen.add(keyValue);
      return true;
    });
  }

  formatModels(rawModels) {
    return rawModels
      .filter(model => 
        model.id && 
        !model.disabled && 
        !model.private &&
        this.isValidModel(model)
      )
      .map(model => ({
        modelId: model.id,
        name: this.getModelName(model.id),
        provider: 'Hugging Face',
        description: this.truncateDescription(model.description || `${model.id} via Hugging Face`),
        category: this.categorizeModel(model),
        capabilities: {
          text: model.pipeline_tag === 'text-generation',
          image: model.pipeline_tag === 'image-to-text' || model.pipeline_tag === 'text-to-image',
          audio: model.pipeline_tag === 'audio-to-audio' || model.pipeline_tag === 'automatic-speech-recognition',
          video: false,
          code: this.isCodeModel(model),
          function_calling: false
        },
        pricing: {
          input: 0, // HF Inference API is free
          output: 0,
          image: 0,
          audio: 0
        },
        limits: {
          maxTokens: this.getMaxTokens(model),
          contextLength: this.getContextLength(model),
          rateLimit: {
            requests: 30,
            period: '1m'
          }
        },
        metadata: {
          architecture: this.getArchitecture(model),
          parameterCount: this.getParameterCount(model),
          languages: this.getLanguages(model),
          tags: (model.tags || []).slice(0, 5),
          popularity: {
            downloads: model.downloads || 0,
            likes: model.likes || 0,
            usage: model.downloads || 0
          },
          performance: {
            speed: this.getSpeedRating(model),
            quality: this.getQualityRating(model),
            efficiency: 'high' // Free models are always efficient
          }
        },
        status: this.getModelStatus(model),
        isAvailable: !model.disabled && !model.private
      }))
      .sort((a, b) => (b.metadata.popularity.downloads || 0) - (a.metadata.popularity.downloads || 0));
  }

  isValidModel(model) {
    // Filter out datasets, spaces, and other non-model entries
    const validTasks = [
      'text-generation',
      'text2text-generation', 
      'image-to-text',
      'text-to-image',
      'conversational',
      'question-answering'
    ];
    return validTasks.includes(model.pipeline_tag);
  }

  getModelName(modelId) {
    // Extract a clean model name from the full ID
    const parts = modelId.split('/');
    const name = parts[parts.length - 1];
    return name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  truncateDescription(description, maxLength = 200) {
    if (!description || description.length <= maxLength) return description;
    return description.substring(0, maxLength).trim() + '...';
  }

  categorizeModel(model) {
    const name = model.id.toLowerCase();
    const tags = (model.tags || []).map(t => t.toLowerCase());
    
    if (model.pipeline_tag === 'image-to-text' || model.pipeline_tag === 'text-to-image') {
      return 'multimodal';
    }
    
    if (this.isCodeModel(model)) {
      return 'code';
    }
    
    if (tags.includes('conversational') || tags.includes('chat')) {
      return 'text-only';
    }
    
    return 'text-only';
  }

  isCodeModel(model) {
    const name = model.id.toLowerCase();
    const tags = (model.tags || []).map(t => t.toLowerCase());
    
    return name.includes('code') || 
           name.includes('codegen') || 
           name.includes('starcoder') ||
           name.includes('incoder') ||
           tags.includes('code') ||
           tags.includes('coding');
  }

  getMaxTokens(model) {
    // Conservative defaults based on model type
    const name = model.id.toLowerCase();
    if (name.includes('longformer') || name.includes('long')) return 8192;
    if (name.includes('large') || name.includes('xl')) return 2048;
    return 1024;
  }

  getContextLength(model) {
    return this.getMaxTokens(model);
  }

  getArchitecture(model) {
    const name = model.id.toLowerCase();
    if (name.includes('llama')) return 'LLaMA';
    if (name.includes('mistral')) return 'Mistral';
    if (name.includes('phi')) return 'Phi';
    if (name.includes('gemma')) return 'Gemma';
    if (name.includes('t5')) return 'T5';
    if (name.includes('bart')) return 'BART';
    if (name.includes('gpt')) return 'GPT';
    return 'Transformer';
  }

  getParameterCount(model) {
    const name = model.id.toLowerCase();
    if (name.includes('7b')) return '7B';
    if (name.includes('13b')) return '13B';
    if (name.includes('70b')) return '70B';
    if (name.includes('3b')) return '3B';
    if (name.includes('1.5b')) return '1.5B';
    if (name.includes('large')) return 'Large';
    if (name.includes('base')) return 'Base';
    if (name.includes('small')) return 'Small';
    return 'Unknown';
  }

  getLanguages(model) {
    const tags = (model.tags || []).map(t => t.toLowerCase());
    const languages = [];
    
    if (tags.includes('multilingual')) return ['multilingual'];
    if (tags.includes('en')) languages.push('English');
    if (tags.includes('zh')) languages.push('Chinese');
    if (tags.includes('es')) languages.push('Spanish');
    if (tags.includes('fr')) languages.push('French');
    
    return languages.length > 0 ? languages : ['English'];
  }

  getSpeedRating(model) {
    const name = model.id.toLowerCase();
    const downloads = model.downloads || 0;
    
    if (name.includes('fast') || name.includes('distil')) return 'fast';
    if (name.includes('large') || name.includes('70b')) return 'slow';
    if (downloads > 100000) return 'medium'; // Popular models are optimized
    return 'medium';
  }

  getQualityRating(model) {
    const downloads = model.downloads || 0;
    const likes = model.likes || 0;
    const name = model.id.toLowerCase();
    
    if (downloads > 1000000 || likes > 100) return 'high';
    if (downloads > 100000 || likes > 20) return 'medium';
    if (name.includes('base') || name.includes('small')) return 'medium';
    return 'medium';
  }

  getModelStatus(model) {
    // Simple heuristic for model status
    const lastModified = model.lastModified ? new Date(model.lastModified) : new Date(0);
    const daysSinceModified = (Date.now() - lastModified.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceModified > 365) return 'deprecated';
    if (model.tags && model.tags.includes('beta')) return 'beta';
    return 'active';
  }

  async createTextGeneration(modelId, input, options = {}) {
    try {
      const response = await fetch(`${this.inferenceURL}/models/${modelId}`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          inputs: input,
          parameters: {
            max_new_tokens: options.max_tokens || 500,
            temperature: options.temperature || 0.7,
            top_p: options.top_p || 0.9,
            top_k: options.top_k || 50,
            repetition_penalty: options.repetition_penalty || 1.1,
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
        const errorText = await response.text();
        throw new Error(`HuggingFace inference error: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('HuggingFace text generation error:', error);
      throw error;
    }
  }

  async getModelInfo(modelId) {
    try {
      const response = await fetch(`${this.baseURL}/models/${modelId}`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });

      if (!response.ok) {
        return null;
      }

      const model = await response.json();
      const formatted = this.formatModels([model]);
      return formatted[0] || null;
    } catch (error) {
      console.error('HuggingFace getModelInfo error:', error);
      return null;
    }
  }
}

module.exports = HuggingFaceService;