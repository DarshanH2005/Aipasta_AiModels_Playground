// Enhanced AI model with web search capabilities
class NewsEnabledAI {
  constructor(baseModel) {
    this.baseModel = baseModel;
    this.newsAPIEndpoint = '/api/news';
  }

  async processQuery(query) {
    // Check if query is asking for current/recent information
    const currentInfoKeywords = [
      'latest', 'today', 'recent', 'current', 'now', 'this week',
      'breaking', 'new', '2024', '2025', 'update'
    ];

    const needsCurrentInfo = currentInfoKeywords.some(keyword => 
      query.toLowerCase().includes(keyword)
    );

    if (needsCurrentInfo) {
      try {
        // Fetch real-time information
        const newsData = await this.fetchLatestNews(query);
        
        // Enhance query with real-time context
        const enhancedQuery = `
          Based on the following recent news and information:
          ${JSON.stringify(newsData, null, 2)}
          
          Please answer this question: ${query}
          
          Note: Use the provided real-time information to give an accurate, up-to-date response.
        `;

        return {
          hasRealTimeData: true,
          enhancedQuery,
          sources: newsData.articles?.map(a => a.url) || [],
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        console.error('Failed to fetch real-time data:', error);
        return {
          hasRealTimeData: false,
          originalQuery: query,
          note: 'Could not fetch real-time data, providing response based on training data'
        };
      }
    }

    return {
      hasRealTimeData: false,
      originalQuery: query
    };
  }

  async fetchLatestNews(query) {
    try {
      const response = await fetch(`${this.newsAPIEndpoint}?query=${encodeURIComponent(query)}`);
      return await response.json();
    } catch (error) {
      console.error('News fetch error:', error);
      throw error;
    }
  }
}

export default NewsEnabledAI;