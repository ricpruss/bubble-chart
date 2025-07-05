# Data Sources for Bubble Chart Examples

This document describes the datasets used in the bubble chart visualization examples, their sources, and what visualization patterns they demonstrate.

## Available Datasets

### Company Data (`companies.js`)
**Source**: [S&P 500 Companies Dataset](https://github.com/datasets/s-and-p-500-companies)  
**Purpose**: Demonstrates flat data structure with categorical grouping  
**Contains**: 25 major S&P 500 companies with market cap, employee count, and business sectors  

```javascript
var data = [{
    "label": "Apple Inc.",
    "size": 2294236972,      // Market cap in millions
    "count": 154,            // Employee count (thousands) 
    "type": "Technology",    // Business sector
    "year": 2021            // Data year
}];
```

**Used in**: `event.html`, `size-toggle.html`, `timeline.html`, `orbit-tree-timeline.html`, `liquid.html`

### Technology Hierarchy (`tech-hierarchy.js`)
**Source**: D3.js Flare visualization example (software architecture)  
**Purpose**: Demonstrates hierarchical tree structure for nested bubble charts  
**Contains**: Software architecture components organized in a tree structure with size metrics  

```javascript
var data = {
    "name": "flare",
    "label": "flare",
    "year": 2018,
    "children": [
        {
            "name": "analytics",
            "label": "analytics", 
            "year": 2019,
            "children": [
                {"name": "AgglomerativeCluster", "label": "AgglomerativeCluster", "amount": 3938, "year": 2021}
            ]
        }
    ]
};
```

**Used in**: `bubble-tree.html`, `bubble-tree-timeline.html`

### Industry Sector Data (`sector-complaints.js`)
**Source**: Synthetically generated based on real industry categories  
**Purpose**: Demonstrates categorical data with multiple metrics over time  
**Contains**: 8 industry sectors with monthly complaint and investigation data  

```javascript
var data = [{
    "name": "Technology",
    "values": [{
        "year": 2023,
        "month": 1,
        "complaints": 117,
        "investigations": 24
    }]
}];
```

**Used in**: `motion-bubble.html`

### Economic Time Series (`economic-timeseries.js`)
**Source**: [World Bank GDP Dataset](https://github.com/datasets/gdp)  
**Purpose**: Demonstrates time series data for temporal visualizations  
**Contains**: GDP data for 5 major economies from 2015-2022  

```javascript
var timeSeriesData = [{
    "name": "United States", 
    "year": 2022,
    "value": 26854,         // GDP in billions USD
    "month": 6
}];
```

**Used in**: `listview.html`

## Data Structure Patterns

### Flat Structure
Simple array of objects with categorical properties. Good for basic bubble charts with grouping and filtering.

### Hierarchical Structure  
Nested tree structure with parent-child relationships. Enables drill-down visualizations and tree-based layouts.

### Categorical Structure
Data grouped by categories with multiple metrics. Supports comparative analysis across different groups.

### Time Series Structure
Temporal data with timestamps. Enables timeline-based filtering and trend analysis.

## Technical Notes

### File Format
All datasets are JavaScript (`.js`) files rather than JSON to ensure compatibility with the `file://` protocol when opening HTML examples directly in browsers.

### Property Naming
- `label` or `name`: Display text for bubbles
- `size`, `amount`, or `value`: Numeric value for bubble sizing
- `year`: Temporal dimension for timeline filtering
- `count`: Secondary metric for multi-dimensional analysis

### Data Converter
The `converter.js` script contains utilities for transforming raw CSV/JSON data into bubble chart compatible formats. This enables easy updates from the original data sources.

## Example Usage

Each dataset is designed to showcase different aspects of the bubble chart library:

- **Company data**: Business analytics, market comparison, sector analysis
- **Tech hierarchy**: Software architecture, nested structures, code metrics  
- **Sector data**: Regulatory analytics, temporal trends, categorical comparison
- **Economic data**: Financial indicators, country comparison, time series analysis

These diverse datasets demonstrate the library's flexibility across different domains and data types. 