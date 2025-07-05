// Dataset Converter - Transforms open datasets to bubble chart formats

// 1. Convert S&P 500 companies to flat structure (replaces data.js)
function convertSP500ToFlat(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',');
    const data = [];
    
    for (let i = 1; i < lines.length && i <= 25; i++) { // Take first 25 companies
        const values = lines[i].split(',');
        const company = {
            label: values[1] || `Company ${i}`, // Security name
            size: Math.floor(Math.random() * 5000000000) + 100000000, // Random market cap
            count: Math.floor(Math.random() * 100) + 10, // Random employee count (thousands)
            type: "Companies",
            year: 2020 + (i % 5) // Years 2020-2024
        };
        data.push(company);
    }
    
    return `var data = ${JSON.stringify(data, null, 2)};`;
}

// 2. Convert GDP data to time series format (replaces poder-ejecutivo.json)
function convertGDPToTimeSeries(csvText) {
    const lines = csvText.trim().split('\n');
    const data = [];
    const countries = ['United States', 'China', 'Germany', 'Japan', 'United Kingdom'];
    
    // Parse and filter for specific countries and recent years
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const country = values[0];
        const year = parseInt(values[2]);
        const gdp = parseFloat(values[3]);
        
        if (countries.includes(country) && year >= 2015 && year <= 2022 && !isNaN(gdp)) {
            data.push({
                name: country,
                year: year,
                value: Math.floor(gdp / 1000000000), // Convert to billions
                month: Math.floor(Math.random() * 12) + 1 // Add random month
            });
        }
    }
    
    return JSON.stringify(data, null, 2);
}

// 3. Create categorical data (replaces motion.js)
function generateCategoricalData() {
    const sectors = [
        'Technology', 'Healthcare', 'Financials', 'Consumer Discretionary',
        'Industrials', 'Energy', 'Utilities', 'Real Estate'
    ];
    
    const data = sectors.map(sector => ({
        name: sector,
        values: Array.from({length: 12}, (_, i) => ({
            year: 2023,
            month: i + 1,
            complaints: Math.floor(Math.random() * 500) + 50,
            investigations: Math.floor(Math.random() * 100) + 10
        }))
    }));
    
    return `var motionData = ${JSON.stringify(data, null, 2)};`;
}

// 4. Use the downloaded flare.json as-is for hierarchical data

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';

// Get current file's directory (ES modules don't have __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the new CSV file
const csvData = fs.readFileSync(path.join(__dirname, '../data/fortune1000_2024.csv'), 'utf-8');

// Parse CSV
const records = parse(csvData, {
  columns: true,
  skip_empty_lines: true
});

// Helper function to safely parse numbers
const parseNumber = (str) => {
  if (!str || str === '' || str === 'no' || str === 'yes') return 0;
  return parseFloat(str) || 0;
};

// Process data for visualization
const processedData = records.map(record => ({
  id: `company-${record.Rank}`,
  name: record.Company,
  rank: parseInt(record.Rank),
  sector: record.Sector,
  industry: record.Industry,
  // Use profits as primary size (millions)
  profits: parseNumber(record.Profits_M),
  // Revenue as secondary size option
  revenue: parseNumber(record.Revenues_M),
  // Market cap as another size option
  marketCap: parseNumber(record.MarketCap_March28_M),
  // Number of employees
  employees: parseNumber(record.Number_of_employees),
  // CEO information
  ceo: record.CEO,
  // Location
  city: record.HeadquartersCity,
  state: record.HeadquartersState,
  // Flags for interesting features
  profitable: record.Profitable === 'yes',
  femaleCEO: record.FemaleCEO === 'yes',
  founderIsCEO: record.Founder_is_CEO === 'yes',
  // Use profits as default size, fall back to revenue if no profit data
  size: parseNumber(record.Profits_M) || parseNumber(record.Revenues_M) * 0.05 || 100
})).filter(company => company.name && company.sector); // Filter out any bad records

// Group by sector for hierarchical visualization
const sectorGroups = {};
processedData.forEach(company => {
  if (!sectorGroups[company.sector]) {
    sectorGroups[company.sector] = {
      name: company.sector,
      children: [],
      totalProfits: 0,
      totalRevenue: 0,
      totalEmployees: 0,
      companyCount: 0
    };
  }
  
  const group = sectorGroups[company.sector];
  group.children.push({
    name: company.name,
    size: company.size,
    profits: company.profits,
    revenue: company.revenue,
    employees: company.employees,
    rank: company.rank,
    ceo: company.ceo,
    city: company.city,
    state: company.state,
    profitable: company.profitable,
    femaleCEO: company.femaleCEO,
    founderIsCEO: company.founderIsCEO
  });
  
  group.totalProfits += company.profits;
  group.totalRevenue += company.revenue;
  group.totalEmployees += company.employees;
  group.companyCount += 1;
});

// Convert to array and calculate sector sizes based on total profits
const hierarchicalData = {
  name: "Fortune 1000 Companies 2024",
  children: Object.values(sectorGroups).map(sector => ({
    ...sector,
    size: sector.totalProfits || sector.totalRevenue * 0.05 || 1000
  })).sort((a, b) => b.size - a.size) // Sort by size descending
};

// Create summary statistics
const stats = {
  totalCompanies: processedData.length,
  totalProfits: processedData.reduce((sum, c) => sum + c.profits, 0),
  totalRevenue: processedData.reduce((sum, c) => sum + c.revenue, 0),
  totalEmployees: processedData.reduce((sum, c) => sum + c.employees, 0),
  sectorsCount: Object.keys(sectorGroups).length,
  femaleCEOCount: processedData.filter(c => c.femaleCEO).length,
  founderCEOCount: processedData.filter(c => c.founderIsCEO).length,
  profitableCount: processedData.filter(c => c.profitable).length
};

// Save the processed data
fs.writeFileSync(
  path.join(__dirname, 'companies.js'),
  `// Fortune 1000 Companies 2024 Data\n` +
  `// Generated from fortune1000_2024.csv\n\n` +
  `export const companiesFlat = ${JSON.stringify(processedData, null, 2)};\n\n` +
  `export const companiesHierarchical = ${JSON.stringify(hierarchicalData, null, 2)};\n\n` +
  `export const dataStats = ${JSON.stringify(stats, null, 2)};\n\n` +
  `// Size options for different visualizations\n` +
  `export const sizeOptions = {\n` +
  `  profits: { label: 'Profits (Millions)', accessor: d => d.profits || 1 },\n` +
  `  revenue: { label: 'Revenue (Millions)', accessor: d => d.revenue || 1 },\n` +
  `  marketCap: { label: 'Market Cap (Millions)', accessor: d => d.marketCap || 1 },\n` +
  `  employees: { label: 'Number of Employees', accessor: d => d.employees || 1 },\n` +
  `  rank: { label: 'Fortune Rank (Inverse)', accessor: d => 1001 - d.rank }\n` +
  `};\n`
);

console.log('Fortune 1000 2024 data conversion complete!');
console.log(`Processed ${stats.totalCompanies} companies across ${stats.sectorsCount} sectors`);
console.log(`Total profits: $${(stats.totalProfits / 1000).toFixed(1)}B`);
console.log(`Female CEOs: ${stats.femaleCEOCount} (${(stats.femaleCEOCount / stats.totalCompanies * 100).toFixed(1)}%)`);
console.log(`Founder CEOs: ${stats.founderCEOCount} (${(stats.founderCEOCount / stats.totalCompanies * 100).toFixed(1)}%)`);

export {
    convertSP500ToFlat,
    convertGDPToTimeSeries,
    generateCategoricalData
}; 