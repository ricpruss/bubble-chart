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
            tipo: "Companies",
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

module.exports = {
    convertSP500ToFlat,
    convertGDPToTimeSeries,
    generateCategoricalData
}; 