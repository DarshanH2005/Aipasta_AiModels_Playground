/**
 * AI Models Configuration
 * Contains all available AI models with their capabilities, pricing, and metadata
 */

export const AI_MODELS = [
  { 
    id: 'gpt-4o', 
    name: 'GPT-4o', 
    provider: 'OpenRouter', 
    description: 'Latest OpenAI multimodal model with vision and audio',
    pricing: { input: 0.0025, output: 0.01, image: 0.00765 },
    capabilities: { text: true, image: true, audio: true, video: false },
    maxTokens: 4096, contextLength: 128000
  },
  { 
    id: 'gpt-4-turbo', 
    name: 'GPT-4 Turbo', 
    provider: 'OpenRouter', 
    description: 'Fast and capable GPT-4 variant with 128k context',
    pricing: { input: 0.01, output: 0.03 },
    capabilities: { text: true, image: true, audio: false, video: false },
    maxTokens: 4096, contextLength: 128000
  },
  { 
    id: 'claude-3.5-sonnet', 
    name: 'Claude 3.5 Sonnet', 
    provider: 'OpenRouter', 
    description: 'Anthropic\'s most intelligent model with vision',
    pricing: { input: 0.003, output: 0.015, image: 0.0048 },
    capabilities: { text: true, image: true, audio: false, video: false },
    maxTokens: 8192, contextLength: 200000
  },
  { 
    id: 'claude-3-haiku', 
    name: 'Claude 3 Haiku', 
    provider: 'OpenRouter', 
    description: 'Fast and affordable Claude model',
    pricing: { input: 0.00025, output: 0.00125 },
    capabilities: { text: true, image: false, audio: false, video: false },
    maxTokens: 4096, contextLength: 200000
  },
  { 
    id: 'llama-3.1-405b', 
    name: 'Llama 3.1 405B', 
    provider: 'OpenRouter', 
    description: 'Meta\'s largest open-source model',
    pricing: { input: 0.003, output: 0.003 },
    capabilities: { text: true, image: false, audio: false, video: false },
    maxTokens: 4096, contextLength: 131072
  },
  { 
    id: 'llama-3.1-70b', 
    name: 'Llama 3.1 70B', 
    provider: 'OpenRouter', 
    description: 'High-performance open-source model',
    pricing: { input: 0.0004, output: 0.0004 },
    capabilities: { text: true, image: false, audio: false, video: false },
    maxTokens: 4096, contextLength: 131072
  },
  { 
    id: 'llama-3.2-90b-vision', 
    name: 'Llama 3.2 90B Vision', 
    provider: 'OpenRouter', 
    description: 'Open-source multimodal model with vision',
    pricing: { input: 0.0005, output: 0.0005, image: 0.001 },
    capabilities: { text: true, image: true, audio: false, video: false },
    maxTokens: 4096, contextLength: 128000
  },
  { 
    id: 'gemini-pro', 
    name: 'Gemini Pro', 
    provider: 'OpenRouter', 
    description: 'Google\'s multimodal AI model',
    pricing: { input: 0.000125, output: 0.000375, image: 0.0025 },
    capabilities: { text: true, image: true, audio: false, video: false },
    maxTokens: 2048, contextLength: 30720
  },
  { 
    id: 'mistral-large', 
    name: 'Mistral Large', 
    provider: 'OpenRouter', 
    description: 'Mistral\'s flagship model with strong performance',
    pricing: { input: 0.002, output: 0.006 },
    capabilities: { text: true, image: false, audio: false, video: false },
    maxTokens: 4096, contextLength: 128000
  },
  { 
    id: 'mixtral-8x7b', 
    name: 'Mixtral 8x7B', 
    provider: 'OpenRouter', 
    description: 'Mixture of experts model with great performance',
    pricing: { input: 0.00024, output: 0.00024 },
    capabilities: { text: true, image: false, audio: false, video: false },
    maxTokens: 4096, contextLength: 32768
  },
  { 
    id: 'codellama-70b', 
    name: 'CodeLlama 70B', 
    provider: 'OpenRouter', 
    description: 'Specialized coding model based on Llama',
    pricing: { input: 0.0007, output: 0.0007 },
    capabilities: { text: true, image: false, audio: false, video: false },
    maxTokens: 4096, contextLength: 4096
  },
  { 
    id: 'whisper-large-v3', 
    name: 'Whisper Large v3', 
    provider: 'OpenRouter', 
    description: 'OpenAI\'s speech-to-text model',
    pricing: { input: 0.006, output: 0.001, audio: 0.006 },
    capabilities: { text: true, image: false, audio: true, video: false },
    maxTokens: 4096, contextLength: 25000
  },
  // Free models
  { 
    id: 'llama-3.1-8b-free', 
    name: 'Llama 3.1 8B (Free)', 
    provider: 'OpenRouter', 
    description: 'Free tier Llama model',
    pricing: { input: 0, output: 0 },
    capabilities: { text: true, image: false, audio: false, video: false },
    maxTokens: 2048, contextLength: 131072
  },
  { 
    id: 'mixtral-8x7b-free', 
    name: 'Mixtral 8x7B (Free)', 
    provider: 'OpenRouter', 
    description: 'Free tier Mixtral model',
    pricing: { input: 0, output: 0 },
    capabilities: { text: true, image: false, audio: false, video: false },
    maxTokens: 2048, contextLength: 32768
  },
  { 
    id: 'gemma-7b-free', 
    name: 'Gemma 7B (Free)', 
    provider: 'OpenRouter', 
    description: 'Free Google Gemma model',
    pricing: { input: 0, output: 0 },
    capabilities: { text: true, image: false, audio: false, video: false },
    maxTokens: 2048, contextLength: 8192
  }
];

/**
 * AI-focused placeholders for the vanish input
 */
export const AI_CHAT_PLACEHOLDERS = [
  "Explain quantum computing in simple terms",
  "Write a Python function to find prime numbers",
  "Compare GPT-4 vs Claude for creative writing",
  "How do transformers work in machine learning?",
  "Generate a REST API design for a todo app",
  "What are the benefits of using TypeScript?",
  "Create a marketing strategy for a tech startup",
  "Explain the concept of blockchain technology",
  "Write a poem about artificial intelligence",
  "Debug this JavaScript code for me",
  "Summarize the latest AI research trends",
  "Help me plan a full-stack web application"
];

/**
 * Model categories for filtering
 */
export const MODEL_CATEGORIES = {
  TEXT_ONLY: 'text-only',
  MULTIMODAL: 'multimodal',
  FREE: 'free',
  PREMIUM: 'premium',
  CODING: 'coding',
  AUDIO: 'audio'
};

/**
 * Provider information
 */
export const PROVIDERS = {
  OPENROUTER: 'OpenRouter',
  HUGGINGFACE: 'Hugging Face',
  ANTHROPIC: 'Anthropic',
  OPENAI: 'OpenAI'
};

/**
 * Default model selection
 */
export const DEFAULT_MODELS = ['gpt-4o', 'claude-3.5-sonnet'];

/**
 * Model capability types
 */
export const CAPABILITIES = {
  TEXT: 'text',
  IMAGE: 'image',
  AUDIO: 'audio',
  VIDEO: 'video'
};

/**
 * Token pricing tiers
 */
export const TOKEN_TIERS = {
  FREE: 0,
  BASIC: 1,
  PREMIUM: 10
};