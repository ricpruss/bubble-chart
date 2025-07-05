/**
 * Smart Tooltips Module
 * Intelligent tooltip generation and management
 */

import type { BubbleChartData } from '../types/data.js';
import type { DataFieldAnalysis } from './data-intelligence.js';
import type { TooltipField, TooltipConfig } from '../types/config.js';

export interface TooltipContent {
  title: string;
  fields: Array<{
    label: string;
    value: string;
    priority: number;
  }>;
  footer?: string;
}

/**
 * Smart tooltip system that automatically generates intelligent content
 */
export class SmartTooltips {
  private static defaultFormatters: Record<string, (value: any) => string> = {
    currency: (value: number) => {
      if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
      if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
      if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
      return `$${value.toLocaleString()}`;
    },
    percentage: (value: number) => `${value.toFixed(1)}%`,
    number: (value: number) => value.toLocaleString(),
    date: (value: any) => {
      const date = new Date(value);
      return isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
    },
    text: (value: any) => String(value)
  };

  /**
   * Generate tooltip configuration automatically based on data analysis
   */
  static generateAutoConfig(
    fieldAnalysis: DataFieldAnalysis[]
  ): TooltipConfig {
    const relevantFields = this.selectRelevantFields(fieldAnalysis);
    
    const fields: TooltipField[] = relevantFields.map(field => ({
      key: field.name,
      label: this.generateFieldLabel(field.name),
      formatter: this.selectFormatter(field),
      priority: this.calculatePriority(field)
    }));

    return {
      mode: 'auto',
      fields: fields.sort((a, b) => (a.priority || 5) - (b.priority || 5)),
      maxFields: 6,
      showDataTypes: false,
      includeStatistics: false
    };
  }

  /**
   * Generate tooltip content for a data item
   */
  static generateContent<T extends BubbleChartData>(
    data: T,
    config: TooltipConfig
  ): TooltipContent {
    switch (config.mode) {
      case 'auto':
        return this.generateAutoContent(data, config);
      case 'custom':
        return this.generateCustomContent(data, config);
      case 'minimal':
        return this.generateMinimalContent(data, config);
      case 'detailed':
        return this.generateDetailedContent(data, config);
      default:
        return this.generateAutoContent(data, config);
    }
  }

  /**
   * Create a tooltip function for use with D3 or other libraries
   */
  static createTooltipFunction<T extends BubbleChartData>(
    config: TooltipConfig
  ): (data: T) => string {
    return (data: T) => {
      const content = this.generateContent(data, config);
      return this.formatAsHTML(content);
    };
  }

  /**
   * Select the most relevant fields for tooltip display
   */
  private static selectRelevantFields(fieldAnalysis: DataFieldAnalysis[]): DataFieldAnalysis[] {
    // Prioritize fields that are likely to be interesting
    const prioritized = fieldAnalysis
      .filter(field => {
        // Skip fields with too many missing values
        if (field.nullCount / (field.uniqueValues + field.nullCount) > 0.5) return false;
        
        // Skip fields that are probably IDs (too unique)
        if (field.type === 'text' && field.uniqueValues > fieldAnalysis.length * 0.9) return false;
        
        return true;
      })
      .sort((a, b) => {
        // Sort by importance score
        const scoreA = this.calculateFieldImportance(a);
        const scoreB = this.calculateFieldImportance(b);
        return scoreB - scoreA;
      });

    // Return top 8 fields maximum
    return prioritized.slice(0, 8);
  }

  /**
   * Calculate field importance for tooltip inclusion
   */
  private static calculateFieldImportance(field: DataFieldAnalysis): number {
    let score = 0;

    // Prefer certain field names
    const importantKeywords = ['name', 'title', 'value', 'size', 'revenue', 'profit', 'category', 'type', 'sector'];
    if (importantKeywords.some(keyword => field.name.toLowerCase().includes(keyword))) {
      score += 10;
    }

    // Prefer numeric fields with good range
    if (field.type === 'numeric' && field.min !== undefined && field.max !== undefined) {
      const range = field.max - field.min;
      if (range > 0) score += 8;
    }

    // Prefer categorical fields with reasonable categories
    if (field.type === 'categorical' && field.uniqueValues >= 2 && field.uniqueValues <= 20) {
      score += 6;
    }

    // Penalize fields with many missing values
    const missingRatio = field.nullCount / (field.uniqueValues + field.nullCount);
    score -= missingRatio * 5;

    return score;
  }

  /**
   * Calculate display priority for a field
   */
  private static calculatePriority(field: DataFieldAnalysis): number {
    const nameKeywords = {
      1: ['name', 'title', 'label', 'company'],
      2: ['value', 'size', 'revenue', 'amount', 'total'],
      3: ['category', 'type', 'sector', 'group'],
      4: ['date', 'time', 'created', 'updated'],
      5: [] // everything else
    };

    for (const [priority, keywords] of Object.entries(nameKeywords)) {
      if (keywords.some(keyword => field.name.toLowerCase().includes(keyword))) {
        return parseInt(priority);
      }
    }

    return 5;
  }

  /**
   * Generate a human-readable field label
   */
  private static generateFieldLabel(fieldName: string): string {
    // Convert camelCase and snake_case to Title Case
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .trim();
  }

  /**
   * Select appropriate formatter for a field
   */
  private static selectFormatter(field: DataFieldAnalysis): (value: any) => string {
    const fallbackFormatter = (value: any) => String(value);

    // Check for currency-like fields
    const currencyKeywords = ['revenue', 'profit', 'income', 'price', 'cost', 'value', 'amount'];
    if (field.type === 'numeric' && currencyKeywords.some(keyword => 
      field.name.toLowerCase().includes(keyword)
    )) {
      return this.defaultFormatters.currency || fallbackFormatter;
    }

    // Check for percentage fields
    if (field.name.toLowerCase().includes('percent') || 
        field.name.toLowerCase().includes('rate') ||
        (field.type === 'numeric' && field.max !== undefined && field.max <= 100 && field.min !== undefined && field.min >= 0)) {
      return this.defaultFormatters.percentage || fallbackFormatter;
    }

    // Check for date fields
    if (field.type === 'date') {
      return this.defaultFormatters.date || fallbackFormatter;
    }

    // Default formatters by type
    switch (field.type) {
      case 'numeric':
        return this.defaultFormatters.number || fallbackFormatter;
      default:
        return this.defaultFormatters.text || fallbackFormatter;
    }
  }

  /**
   * Generate automatic tooltip content
   */
  private static generateAutoContent<T extends BubbleChartData>(
    data: T,
    config: TooltipConfig
  ): TooltipContent {
    const fields = config.fields || [];
    const maxFields = config.maxFields || 6;

    // Get title field (highest priority field)
    const titleField = fields.find(f => f.priority === 1) || fields[0];
    const title = titleField ? String((data as any)[titleField.key]) : 'Data Point';

    // Generate field content
    const fieldContent = fields
      .slice(0, maxFields)
      .filter(field => field.key in data)
      .map(field => ({
        label: field.label || field.key,
        value: field.formatter ? field.formatter((data as any)[field.key]) : String((data as any)[field.key]),
        priority: field.priority || 5
      }))
      .filter(item => item.value && item.value !== 'undefined' && item.value !== 'null');

    return {
      title,
      fields: fieldContent
    };
  }

  /**
   * Generate custom tooltip content using template
   */
  private static generateCustomContent<T extends BubbleChartData>(
    data: T,
    config: TooltipConfig
  ): TooltipContent {
    if (config.customTemplate) {
      const html = config.customTemplate(data);
      return {
        title: '',
        fields: [{ label: '', value: html, priority: 1 }]
      };
    }
    return this.generateAutoContent(data, config);
  }

  /**
   * Generate minimal tooltip content
   */
  private static generateMinimalContent<T extends BubbleChartData>(
    data: T,
    config: TooltipConfig
  ): TooltipContent {
    const fields = config.fields || [];
    const titleField = fields.find(f => f.priority === 1) || fields[0];
    const valueField = fields.find(f => f.priority === 2) || fields[1];

    const title = titleField ? String((data as any)[titleField.key]) : 'Data Point';
    const fieldContent = [];

    if (valueField && valueField.key in data) {
      fieldContent.push({
        label: valueField.label || valueField.key,
        value: valueField.formatter ? valueField.formatter((data as any)[valueField.key]) : String((data as any)[valueField.key]),
        priority: 1
      });
    }

    return { title, fields: fieldContent };
  }

  /**
   * Generate detailed tooltip content
   */
  private static generateDetailedContent<T extends BubbleChartData>(
    data: T,
    config: TooltipConfig
  ): TooltipContent {
    const result = this.generateAutoContent(data, { ...config, maxFields: 10 });
    
    if (config.includeStatistics) {
      result.footer = `${Object.keys(data).length} total fields`;
    }

    return result;
  }

  /**
   * Format tooltip content as HTML
   */
  private static formatAsHTML(content: TooltipContent): string {
    let html = `<div class="bubble-tooltip">`;
    
    if (content.title) {
      html += `<div class="tooltip-title">${content.title}</div>`;
    }

    if (content.fields.length > 0) {
      html += `<div class="tooltip-fields">`;
      content.fields.forEach(field => {
        if (field.label) {
          html += `<div class="tooltip-field">
            <span class="field-label">${field.label}:</span>
            <span class="field-value">${field.value}</span>
          </div>`;
        } else {
          html += `<div class="tooltip-content">${field.value}</div>`;
        }
      });
      html += `</div>`;
    }

    if (content.footer) {
      html += `<div class="tooltip-footer">${content.footer}</div>`;
    }

    html += `</div>`;
    return html;
  }
} 