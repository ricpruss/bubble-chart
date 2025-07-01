#!/usr/bin/env node

// Download Fortune 1000 CSV and convert to JSON for local demos
import fs from 'fs';
import https from 'https';
import { csvParse } from 'd3-dsv';

const outDir = new URL('../examples/data/', import.meta.url).pathname;
const outFile = `${outDir}fortune1000.json`;

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const urls = [
  'https://raw.githubusercontent.com/curiousily/company-datasets/master/fortune-1000/fortune-1000-2021.csv',
  'https://raw.githubusercontent.com/laxmena/fortune1000/main/fortune1000_dataset.csv',
  'https://raw.githubusercontent.com/datasets/s-and-p-500-companies/master/data/constituents.csv'
];

function tryDownload(urlIndex=0){
  if(urlIndex>=urls.length){
    console.error('All URLs failed');
    process.exit(1);
  }
  const url=urls[urlIndex];
  console.log(`Downloading CSV from ${url}`);
  https.get(url, res => {
    if(res.statusCode!==200){
      console.error(`HTTP ${res.statusCode} on ${url}`);
      tryDownload(urlIndex+1);
      return;
    }
    let raw='';
    res.setEncoding('utf8');
    res.on('data',c=>raw+=c);
    res.on('end',()=>processCSV(raw));
  }).on('error',err=>{
    console.error('Request error',err);
    tryDownload(urlIndex+1);
  });
}

function processCSV(raw){
  const rows=csvParse(raw);
  const data=rows.map((d,i)=>({
    id:`f${i}`,
    name:d.company||d.Company||d.Name,
    value:Number((d.revenues||d.Revenues||d.MarketCap||'').toString().replace(/[$,]/g,''))||1,
    category:d.sector||d.Sector||d.Sector
  }));
  fs.writeFileSync(outFile,JSON.stringify(data,null,2));
  console.log(`Saved ${data.length} records to ${outFile}`);
}

tryDownload(); 