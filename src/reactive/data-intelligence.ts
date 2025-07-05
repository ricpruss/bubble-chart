/**
 * Data Intelligence Module
 * Analyzes datasets and provides intelligent configuration suggestions
 */

import type { BubbleChartData } from '../types/data.js';

export interface DataFieldAnalysis {
  name: string;
  type: 'numeric' | 'categorical' | 'text' | 'boolean' | 'date' | 'unknown';
  uniqueValues: number;
  nullCount: number;
  sampleValues: any[];
  min?: number;
  max?: number;
  mean?: number;
}

export interface DataQualityIssue {
  type: 'missing_values' | 'duplicates' | 'outliers' | 'empty_strings' | 'inconsistent_types';
  field: string;
  count: number;
  severity: 'low' | 'medium' | 'high';
  message: string;
}

export interface DataIntelligenceInsights {
  fields: {
    numeric: string[];
    categorical: string[];
    text: string[];
    boolean: string[];
    date: string[];
  };
  suggested: {
    size: string | null;
    label: string | null;
    color: string | null;
  };
  quality: {
    issues: DataQualityIssue[];
    score: number; // 0-100
    missingValues: number;
    duplicates: number;
    outliers: number;
  };
  fieldAnalysis: DataFieldAnalysis[];
}

export class DataIntelligence {
  /**
   * Analyze a dataset and provide intelligent insights
   */
  static inspectData<T extends BubbleChartData>(data: T[]): DataIntelligenceInsights {
    if (!data || data.length === 0) {
      return this.createEmptyInsights();
    }

    const fieldAnalysis = this.analyzeFields(data);
    const quality = this.analyzeQuality(data, fieldAnalysis);
    const suggested = this.suggestConfiguration(fieldAnalysis);

    // Categorize fields by type
    const fields = {
      numeric: fieldAnalysis.filter(f => f.type === 'numeric').map(f => f.name),
      categorical: fieldAnalysis.filter(f => f.type === 'categorical').map(f => f.name),
      text: fieldAnalysis.filter(f => f.type === 'text').map(f => f.name),
      boolean: fieldAnalysis.filter(f => f.type === 'boolean').map(f => f.name),
      date: fieldAnalysis.filter(f => f.type === 'date').map(f => f.name)
    };

    return {
      fields,
      suggested,
      quality,
      fieldAnalysis
    };
  }

  /**
   * Analyze individual fields in the dataset
   */
  private static analyzeFields<T extends BubbleChartData>(data: T[]): DataFieldAnalysis[] {
    const sample = data[0];
    if (!sample) return [];
    const fieldNames = Object.keys(sample);
    
    return fieldNames.map(fieldName => {
      const values = data.map(d => (d as any)[fieldName]).filter(v => v != null);
      const uniqueValues = new Set(values);
      const nullCount = data.length - values.length;
      
      const analysis: DataFieldAnalysis = {
        name: fieldName,
        type: this.detectFieldType(values, fieldName),
        uniqueValues: uniqueValues.size,
        nullCount,
        sampleValues: Array.from(uniqueValues).slice(0, 5)
      };

      // Add numeric statistics if it's a numeric field
      if (analysis.type === 'numeric') {
        const numericValues = values.filter(v => typeof v === 'number' && !isNaN(v));
        if (numericValues.length > 0) {
          analysis.min = Math.min(...numericValues);
          analysis.max = Math.max(...numericValues);
          analysis.mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
        }
      }

      return analysis;
    });
  }

  /**
   * Detect the type of a field based on its values and field name
   */
  private static detectFieldType(values: any[], fieldName?: string): DataFieldAnalysis['type'] {
    if (values.length === 0) return 'unknown';

    const sample = values.slice(0, Math.min(100, values.length));
    
    // Check for numbers
    const numericCount = sample.filter(v => typeof v === 'number' && !isNaN(v)).length;
    const numericRatio = numericCount / sample.length;
    
    if (numericRatio > 0.8) return 'numeric';

    // Check for booleans
    const booleanCount = sample.filter(v => typeof v === 'boolean').length;
    const booleanRatio = booleanCount / sample.length;
    
    if (booleanRatio > 0.8) return 'boolean';

    // Check for dates
    const dateCount = sample.filter(v => {
      return v instanceof Date || (typeof v === 'string' && !isNaN(Date.parse(v)));
    }).length;
    const dateRatio = dateCount / sample.length;
    
    if (dateRatio > 0.8) return 'date';

    // Check for categorical vs text
    const uniqueValues = new Set(sample);
    const uniqueRatio = uniqueValues.size / sample.length;
    
    // Check if field name suggests categorical nature
    const categoricalKeywords = ['category', 'type', 'sector', 'group', 'class', 'region', 'status', 'kind', 'genre'];
    const fieldNameSuggestsCategorical = fieldName && 
      categoricalKeywords.some(keyword => fieldName.toLowerCase().includes(keyword));
    
    // Enhanced categorical detection:
    // - Low cardinality (≤ 20 unique values) AND reasonable ratio (≤ 70%)
    // - OR very low ratio (≤ 30%) regardless of cardinality
    // - OR field name suggests categorical nature (≤ 50 unique values for safety)
    if ((uniqueValues.size <= 20 && uniqueRatio <= 0.7) || 
        uniqueRatio <= 0.3 ||
        (fieldNameSuggestsCategorical && uniqueValues.size <= 50)) {
      return 'categorical';
    }
    
    return 'text';
  }

  /**
   * Analyze data quality and identify issues
   */
  private static analyzeQuality<T extends BubbleChartData>(
    data: T[], 
    fieldAnalysis: DataFieldAnalysis[]
  ): DataIntelligenceInsights['quality'] {
    const issues: DataQualityIssue[] = [];
    let totalMissing = 0;
    let totalOutliers = 0;

    // Check for missing values
    fieldAnalysis.forEach(field => {
      totalMissing += field.nullCount;
      
      if (field.nullCount > 0) {
        const severity = field.nullCount / data.length > 0.1 ? 'high' : 
                        field.nullCount / data.length > 0.05 ? 'medium' : 'low';
        
        issues.push({
          type: 'missing_values',
          field: field.name,
          count: field.nullCount,
          severity,
          message: `${field.nullCount} missing values in ${field.name} (${Math.round(field.nullCount / data.length * 100)}%)`
        });
      }

      // Check for outliers in numeric fields
      if (field.type === 'numeric' && field.min !== undefined && field.max !== undefined && field.mean !== undefined) {
        const values = data.map(d => (d as any)[field.name]).filter(v => typeof v === 'number' && !isNaN(v));
        const outliers = this.detectOutliers(values);
        totalOutliers += outliers.length;
        
        if (outliers.length > 0) {
          issues.push({
            type: 'outliers',
            field: field.name,
            count: outliers.length,
            severity: outliers.length > values.length * 0.05 ? 'medium' : 'low',
            message: `${outliers.length} potential outliers detected in ${field.name}`
          });
        }
      }
    });

    // Check for duplicates (simplified - based on all fields)
    const duplicates = this.countDuplicates(data);

    if (duplicates > 0) {
      issues.push({
        type: 'duplicates',
        field: 'all',
        count: duplicates,
        severity: duplicates > data.length * 0.1 ? 'high' : 'medium',
        message: `${duplicates} duplicate records found`
      });
    }

    // Calculate quality score (0-100)
    const missingRatio = totalMissing / (data.length * fieldAnalysis.length);
    const duplicateRatio = duplicates / data.length;
    const outlierRatio = totalOutliers / data.length;
    
    const score = Math.max(0, Math.round(100 - (missingRatio * 50 + duplicateRatio * 30 + outlierRatio * 20)));

    return {
      issues,
      score,
      missingValues: totalMissing,
      duplicates,
      outliers: totalOutliers
    };
  }

  /**
   * Suggest intelligent configuration based on field analysis
   */
  private static suggestConfiguration(fieldAnalysis: DataFieldAnalysis[]): DataIntelligenceInsights['suggested'] {
    let suggestedSize: string | null = null;
    let suggestedLabel: string | null = null;
    let suggestedColor: string | null = null;

    // Find best size field (numeric with good range)
    const numericFields = fieldAnalysis.filter(f => f.type === 'numeric' && f.min !== undefined && f.max !== undefined);
    if (numericFields.length > 0) {
             // Prefer fields with names suggesting size/value
       const sizeKeywords = ['revenue', 'value', 'size', 'amount', 'total', 'count', 'volume', 'marketcap', 'sales'];
       suggestedSize = numericFields.find(f => 
         sizeKeywords.some(keyword => f.name.toLowerCase().includes(keyword))
       )?.name || numericFields[0]?.name || null;
    }

    // Find best label field (text with reasonable uniqueness)
    const textFields = fieldAnalysis.filter(f => f.type === 'text' || f.type === 'categorical');
    if (textFields.length > 0) {
      // Prefer fields with names suggesting labels
      const labelKeywords = ['name', 'title', 'label', 'company', 'id'];
             suggestedLabel = textFields.find(f => 
         labelKeywords.some(keyword => f.name.toLowerCase().includes(keyword))
       )?.name || textFields.find(f => f.uniqueValues > textFields.length * 0.8)?.name || textFields[0]?.name || null;
    }

    // Find best color field (categorical with reasonable number of categories)
    const categoricalFields = fieldAnalysis.filter(f => 
      f.type === 'categorical' && f.uniqueValues >= 2 && f.uniqueValues <= 20
    );
    if (categoricalFields.length > 0) {
      // Prefer fields with names suggesting categories
      const colorKeywords = ['category', 'type', 'sector', 'group', 'class', 'region', 'status'];
             suggestedColor = categoricalFields.find(f => 
         colorKeywords.some(keyword => f.name.toLowerCase().includes(keyword))
       )?.name || categoricalFields[0]?.name || null;
    }

    return {
      size: suggestedSize,
      label: suggestedLabel,
      color: suggestedColor
    };
  }

  /**
   * Detect outliers using IQR method
   */
  private static detectOutliers(values: number[]): number[] {
    if (values.length < 4) return [];
    
    const sorted = [...values].sort((a, b) => a - b);
    const q1Index = Math.floor(sorted.length * 0.25);
    const q3Index = Math.floor(sorted.length * 0.75);
    
    const q1 = sorted[q1Index];
    const q3 = sorted[q3Index];
    if (q1 === undefined || q3 === undefined) return [];
    const iqr = q3 - q1;
    
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    return values.filter(v => v < lowerBound || v > upperBound);
  }

  /**
   * Count duplicate records
   */
  private static countDuplicates<T>(data: T[]): number {
    const seen = new Set<string>();
    let duplicates = 0;
    
    data.forEach(item => {
      const key = JSON.stringify(item);
      if (seen.has(key)) {
        duplicates++;
      } else {
        seen.add(key);
      }
    });
    
    return duplicates;
  }

  /**
   * Create empty insights for invalid data
   */
  private static createEmptyInsights(): DataIntelligenceInsights {
    return {
      fields: {
        numeric: [],
        categorical: [],
        text: [],
        boolean: [],
        date: []
      },
      suggested: {
        size: null,
        label: null,
        color: null
      },
      quality: {
        issues: [],
        score: 0,
        missingValues: 0,
        duplicates: 0,
        outliers: 0
      },
      fieldAnalysis: []
    };
  }
} 