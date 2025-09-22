import NewsAPI from '../../lib/news-api';

const newsAPI = new NewsAPI();

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query = 'AI news today' } = req.query;
    
    // Get latest AI news
    const news = await newsAPI.getAINews();
    
    // Format response
    const response = {
      success: true,
      query,
      timestamp: new Date().toISOString(),
      articles: news,
      sources: 'Free RSS feeds and NewsAPI',
      note: 'Real-time news aggregated from multiple free sources'
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('News API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch news',
      message: error.message
    });
  }
}