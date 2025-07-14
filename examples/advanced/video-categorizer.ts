// Video Categorization Engine for Vibe Code Explorer
// Provides progressive categorization analysis for YouTube video data

export interface VideoData {
  videoId: string;
  title: string;
  author: string;
  authorVerified: boolean;
  lengthSeconds: number;
  viewCount: number;
  viewCountText: string;
  publishedText: string;
  published: number;
  genre?: string;
  keywords?: string[];
  likeCount?: number;
  premium?: boolean;
  paid?: boolean;
  isFamilyFriendly?: boolean;
  videoThumbnails?: Array<{
    quality: string;
    url: string;
    width: number;
    height: number;
  }>;
}

export interface CategoryData {
  id: string;
  category: string;
  count: number;
  analysisType: string;
  videos: VideoData[];
}

export class VideoCategorizer {
  private videos: VideoData[] = [];
  private categories: Map<string, CategoryData> = new Map();

  constructor(videos: VideoData[]) {
    this.videos = videos;
  }

  // Duration Analysis (existing implementation)
  categorizeByduration(): CategoryData[] {
    const categories = {
      short: { 
        id: 'short', 
        category: 'Short Videos', 
        count: 0, 
        analysisType: 'duration', 
        videos: [] as VideoData[] 
      },
      medium: { 
        id: 'medium', 
        category: 'Medium Videos', 
        count: 0, 
        analysisType: 'duration', 
        videos: [] as VideoData[] 
      },
      long: { 
        id: 'long', 
        category: 'Long Videos', 
        count: 0, 
        analysisType: 'duration', 
        videos: [] as VideoData[] 
      }
    };

    this.videos.forEach(video => {
      const duration = video.lengthSeconds;
      if (duration < 240) { // < 4 minutes
        categories.short.count++;
        categories.short.videos.push(video);
      } else if (duration <= 1200) { // 4-20 minutes
        categories.medium.count++;
        categories.medium.videos.push(video);
      } else { // > 20 minutes
        categories.long.count++;
        categories.long.videos.push(video);
      }
    });

    const result = Object.values(categories).filter(cat => cat.count > 0);
    
    // Store categories for later reference
    result.forEach(cat => {
      this.categories.set(cat.id, cat);
    });

    return result;
  }

  // View Count Tiers Analysis (Priority 1)
  categorizeByViewCount(): CategoryData[] {
    const categories = {
      low: { 
        id: 'low-views', 
        category: 'Low Views', 
        count: 0, 
        analysisType: 'viewCount', 
        videos: [] as VideoData[] 
      },
      medium: { 
        id: 'medium-views', 
        category: 'Medium Views', 
        count: 0, 
        analysisType: 'viewCount', 
        videos: [] as VideoData[] 
      },
      high: { 
        id: 'high-views', 
        category: 'High Views', 
        count: 0, 
        analysisType: 'viewCount', 
        videos: [] as VideoData[] 
      }
    };

    this.videos.forEach(video => {
      const views = video.viewCount;
      if (views < 10000) { // < 10K views
        categories.low.count++;
        categories.low.videos.push(video);
      } else if (views <= 100000) { // 10K-100K views
        categories.medium.count++;
        categories.medium.videos.push(video);
      } else { // > 100K views
        categories.high.count++;
        categories.high.videos.push(video);
      }
    });

    const result = Object.values(categories).filter(cat => cat.count > 0);
    
    // Store categories for later reference
    result.forEach(cat => {
      this.categories.set(cat.id, cat);
    });

    return result;
  }

  // Genre Classifications (Priority 2)
  categorizeByGenre(): CategoryData[] {
    const genreMap = new Map<string, CategoryData>();

    this.videos.forEach(video => {
      const genre = video.genre || 'Unknown';
      
      if (!genreMap.has(genre)) {
        genreMap.set(genre, {
          id: `genre-${genre.toLowerCase().replace(/\s+/g, '-')}`,
          category: genre,
          count: 0,
          analysisType: 'genre',
          videos: []
        });
      }
      
      const category = genreMap.get(genre)!;
      category.count++;
      category.videos.push(video);
    });

    const result = Array.from(genreMap.values()).filter(cat => cat.count > 0);
    
    // Store categories for later reference
    result.forEach(cat => {
      this.categories.set(cat.id, cat);
    });

    return result;
  }

  // Channel Verification (Priority 3)
  categorizeByVerification(): CategoryData[] {
    const categories = {
      verified: { 
        id: 'verified-channels', 
        category: 'Verified Channels', 
        count: 0, 
        analysisType: 'verification', 
        videos: [] as VideoData[] 
      },
      unverified: { 
        id: 'unverified-channels', 
        category: 'Unverified Channels', 
        count: 0, 
        analysisType: 'verification', 
        videos: [] as VideoData[] 
      }
    };

    this.videos.forEach(video => {
      if (video.authorVerified) {
        categories.verified.count++;
        categories.verified.videos.push(video);
      } else {
        categories.unverified.count++;
        categories.unverified.videos.push(video);
      }
    });

    const result = Object.values(categories).filter(cat => cat.count > 0);
    
    // Store categories for later reference
    result.forEach(cat => {
      this.categories.set(cat.id, cat);
    });

    return result;
  }

  // Content Quality Indicators (Future Priority)
  categorizeByQuality(): CategoryData[] {
    const categories = {
      premium: { 
        id: 'premium-content', 
        category: 'Premium Content', 
        count: 0, 
        analysisType: 'quality', 
        videos: [] as VideoData[] 
      },
      familyFriendly: { 
        id: 'family-friendly', 
        category: 'Family Friendly', 
        count: 0, 
        analysisType: 'quality', 
        videos: [] as VideoData[] 
      },
      standard: { 
        id: 'standard-content', 
        category: 'Standard Content', 
        count: 0, 
        analysisType: 'quality', 
        videos: [] as VideoData[] 
      }
    };

    this.videos.forEach(video => {
      if (video.premium) {
        categories.premium.count++;
        categories.premium.videos.push(video);
      } else if (video.isFamilyFriendly) {
        categories.familyFriendly.count++;
        categories.familyFriendly.videos.push(video);
      } else {
        categories.standard.count++;
        categories.standard.videos.push(video);
      }
    });

    const result = Object.values(categories).filter(cat => cat.count > 0);
    
    // Store categories for later reference
    result.forEach(cat => {
      this.categories.set(cat.id, cat);
    });

    return result;
  }

  // Progressive Analysis Engine
  performProgressiveAnalysis(): CategoryData[] {
    const allCategories: CategoryData[] = [];

    // Phase 1: Duration Analysis (already exists)
    allCategories.push(...this.categorizeByduration());

    // Phase 2: View Count Analysis (Priority 1)
    allCategories.push(...this.categorizeByViewCount());

    // Phase 3: Genre Analysis (Priority 2)
    allCategories.push(...this.categorizeByGenre());

    // Phase 4: Verification Analysis (Priority 3)  
    allCategories.push(...this.categorizeByVerification());

    // Phase 5: Quality Analysis (Future)
    allCategories.push(...this.categorizeByQuality());

    return allCategories;
  }

  // Get category by ID
  getCategory(id: string): CategoryData | undefined {
    return this.categories.get(id);
  }

  // Get all categories
  getAllCategories(): CategoryData[] {
    return Array.from(this.categories.values());
  }

  // Get videos for multiple category filters (intersection)
  getFilteredVideos(categoryIds: string[]): VideoData[] {
    if (categoryIds.length === 0) {
      return this.videos;
    }

    let filteredVideos: VideoData[] = [];

    categoryIds.forEach((categoryId, index) => {
      const category = this.categories.get(categoryId);
      if (category) {
        if (index === 0) {
          // First filter - start with this category's videos
          filteredVideos = [...category.videos];
        } else {
          // Subsequent filters - find intersection
          filteredVideos = filteredVideos.filter(video => 
            category.videos.includes(video)
          );
        }
      }
    });

    return filteredVideos;
  }

  // Debug: Get categorization statistics
  getStatistics(): Record<string, any> {
    const stats = {
      totalVideos: this.videos.length,
      totalCategories: this.categories.size,
      categoriesByType: {} as Record<string, number>
    };

    this.categories.forEach(category => {
      const type = category.analysisType;
      stats.categoriesByType[type] = (stats.categoriesByType[type] || 0) + 1;
    });

    return stats;
  }
}

// Export utility functions for standalone use
export function parseViewCount(viewCountText: string): number {
  if (!viewCountText) return 0;
  
  const text = viewCountText.toLowerCase();
  const number = parseFloat(text);
  
  if (text.includes('k')) {
    return Math.floor(number * 1000);
  } else if (text.includes('m')) {
    return Math.floor(number * 1000000);
  } else if (text.includes('b')) {
    return Math.floor(number * 1000000000);
  }
  
  return Math.floor(number);
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}:${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}