// API endpoint to fetch and combine models from OpenRouter and Hugging Face
import { OpenRouterAPI, HuggingFaceAPI, rateLimiter } from '../../lib/api-providers';
import { getCachedModels, cacheModels } from '../../lib/mongodb';

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
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
    // Try to get cached models from MongoDB first
    const cachedModels = await getCachedModels();
    
    if (cachedModels) {
      return res.status(200).json({
        success: true,
        cached: true,
        models: cachedModels.models,
        stats: cachedModels.stats,
        lastUpdated: cachedModels.lastUpdated
      });
    }

    // Initialize APIs
    const openRouterAPI = new OpenRouterAPI(process.env.OPENROUTER_API_KEY);
    const huggingFaceAPI = new HuggingFaceAPI(process.env.HUGGINGFACE_API_KEY);

    // Fetch models from both providers in parallel
    const [openRouterModels, huggingFaceModels] = await Promise.allSettled([
      openRouterAPI.getModels(),
      huggingFaceAPI.getModels()
    ]);

    // Process results
    let allModels = [];
    let errors = [];

    // Add OpenRouter models
    if (openRouterModels.status === 'fulfilled') {
      allModels.push(...openRouterModels.value);
    } else {
      console.error('OpenRouter fetch failed:', openRouterModels.reason);
      errors.push({ provider: 'OpenRouter', error: openRouterModels.reason.message });
    }

    // Add Hugging Face models
    if (huggingFaceModels.status === 'fulfilled') {
      allModels.push(...huggingFaceModels.value);
    } else {
      console.error('HuggingFace fetch failed:', huggingFaceModels.reason);
      errors.push({ provider: 'HuggingFace', error: huggingFaceModels.reason.message });
    }

    // Categorize models
    const categorizedModels = {
      all: allModels,
      multimodal: allModels.filter(model => model.capabilities.image || model.capabilities.video),
      textOnly: allModels.filter(model => model.capabilities.text && !model.capabilities.image && !model.capabilities.video),
      free: allModels.filter(model => 
        model.pricing.input === 0 && 
        model.pricing.output === 0 && 
        model.pricing.image === 0
      ),
      paid: allModels.filter(model => 
        model.pricing.input > 0 || 
        model.pricing.output > 0 || 
        model.pricing.image > 0
      ),
      byProvider: {
        openrouter: allModels.filter(model => model.provider === 'OpenRouter'),
        huggingface: allModels.filter(model => model.provider === 'Hugging Face')
      }
    };

    // Add model statistics
    const stats = {
      total: allModels.length,
      multimodal: categorizedModels.multimodal.length,
      textOnly: categorizedModels.textOnly.length,
      free: categorizedModels.free.length,
      paid: categorizedModels.paid.length,
      providers: {
        openrouter: categorizedModels.byProvider.openrouter.length,
        huggingface: categorizedModels.byProvider.huggingface.length
      }
    };

    const responseData = {
      models: categorizedModels,
      stats,
      lastUpdated: new Date().toISOString()
    };

    // Cache the results in MongoDB
    await cacheModels(responseData);

    // Return response
    res.status(200).json({
      success: true,
      cached: false,
      ...responseData,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Models API error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch models',
      details: error.message 
    });
  }
}