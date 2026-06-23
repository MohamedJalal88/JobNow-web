const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const summaryPath = path.join(__dirname, 'load_test_summary.json');
if (!fs.existsSync(summaryPath)) {
  console.error("Error: load_test_summary.json not found. Run the load test first.");
  process.exit(1);
}

const summaryData = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
const metrics = summaryData.metrics;

// Helper to safely extract trend metrics
function getTrendMetric(metricName) {
  const m = metrics[metricName];
  if (m && m.values) {
    return {
      count: m.values.count || 0,
      avg: m.values.avg || 0,
      min: m.values.min || 0,
      max: m.values.max || 0
    };
  }
  return { count: 0, avg: 0, min: 0, max: 0 };
}

// ----------------------------------------------------------------
// 1. EXTRACT DATA FOR TAB 1: EXECUTIVE SUMMARY
// ----------------------------------------------------------------
const totalReqs = metrics.http_reqs ? metrics.http_reqs.values.count : 0;
const rps = metrics.http_reqs ? metrics.http_reqs.values.rate : 0;
const avgTime = metrics.http_req_duration ? metrics.http_req_duration.values.avg : 0;
const minTime = metrics.http_req_duration ? metrics.http_req_duration.values.min : 0;
const maxTime = metrics.http_req_duration ? metrics.http_req_duration.values.max : 0;
const medTime = metrics.http_req_duration ? metrics.http_req_duration.values.med : 0;
const p90Time = metrics.http_req_duration ? metrics.http_req_duration.values['p(90)'] : 0;
const p95Time = metrics.http_req_duration ? metrics.http_req_duration.values['p(95)'] : 0;
const failRate = metrics.http_req_failed ? (metrics.http_req_failed.values.rate * 100) : 0;
const checkPassRate = metrics.checks ? (metrics.checks.values.rate * 100) : 100.00;
const dataRecv = metrics.data_received ? (metrics.data_received.values.count / 1024 / 1024) : 0; // MB
const dataSent = metrics.data_sent ? (metrics.data_sent.values.count / 1024 / 1024) : 0; // MB
const avgConnecting = metrics.http_req_connecting ? metrics.http_req_connecting.values.avg : 0;
const avgTls = metrics.http_req_tls_handshaking ? metrics.http_req_tls_handshaking.values.avg : 0;
const avgWaiting = metrics.http_req_waiting ? metrics.http_req_waiting.values.avg : 0;
const totalIterations = metrics.iterations ? metrics.iterations.values.count : 0;
const iterationsPerSec = metrics.iterations ? metrics.iterations.values.rate : 0;
const peakVus = metrics.vus ? metrics.vus.values.max : 100;

// Create workbook
const workbook = new ExcelJS.Workbook();
workbook.creator = "JobNow Load Testing";
workbook.created = new Date();

// ================================================================
// TAB 1: EXECUTIVE SUMMARY (Green Theme)
// ================================================================
const sheet1 = workbook.addWorksheet("Executive Summary", { views: [{ showGridLines: true }] });
sheet1.columns = [
  { width: 3 }, // A
  { width: 30 }, // B
  { width: 15 }, // C
  { width: 12 }, // D
  { width: 18 }, // E
  { width: 15 }, // F
  { width: 3 }  // G
];

// Title block
sheet1.mergeCells("B2:F2");
const titleCell = sheet1.getCell("B2");
titleCell.value = "JobNow — K6 Baseline Load Test Report";
titleCell.font = { name: "Calibri", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2E7D32" } }; // Forest Green
titleCell.alignment = { horizontal: "center", vertical: "middle" };
sheet1.getRow(2).height = 35;

// Metadata table
const metaRows = [
  { label: "Report Generated", val: new Date().toLocaleString("en-IN") },
  { label: "Data Source", val: "Simulated Baseline" },
  { label: "Test Duration", val: "1 minute (10s ramp-up / 40s hold / 10s ramp-down)" },
  { label: "Virtual Users (Peak)", val: peakVus },
  { label: "Target API", val: "Supabase REST - sfzfrutggvzdtelvrftw.supabase.co" }
];

let metaLine = 4;
metaRows.forEach((r) => {
  sheet1.getCell(`B${metaLine}`).value = r.label;
  sheet1.getCell(`B${metaLine}`).font = { name: "Calibri", bold: true, size: 10, color: { argb: "FF374151" } };
  sheet1.getCell(`B${metaLine}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
  sheet1.getCell(`B${metaLine}`).border = {
    top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
  };

  sheet1.mergeCells(`C${metaLine}:F${metaLine}`);
  const valCell = sheet1.getCell(`C${metaLine}`);
  valCell.value = r.val;
  valCell.font = { name: "Calibri", size: 10 };
  valCell.border = {
    top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
  };
  sheet1.getRow(metaLine).height = 18;
  metaLine++;
});

// Table Header
const kpiStartLine = 10;
sheet1.mergeCells(`B${kpiStartLine}:F${kpiStartLine}`);
const kpiHeader = sheet1.getCell(`B${kpiStartLine}`);
kpiHeader.value = "Key Performance Indicators";
kpiHeader.font = { name: "Calibri", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
kpiHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1B5E20" } }; // Darker Green
kpiHeader.alignment = { horizontal: "center", vertical: "middle" };
sheet1.getRow(kpiStartLine).height = 24;

// Column Headers
const kpiColLine = 11;
const kpiHeaders = ["KPI", "Value", "Unit", "Threshold", "Result"];
kpiHeaders.forEach((h, i) => {
  const cell = sheet1.getCell(kpiColLine, i + 2); // B, C, D, E, F
  cell.value = h;
  cell.font = { name: "Calibri", bold: true, size: 10, color: { argb: "FFFFFFFF" } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2E7D32" } };
  cell.alignment = { horizontal: "center", vertical: "middle" };
  cell.border = {
    top: { style: 'thin', color: { argb: 'FF1B5E20' } },
    left: { style: 'thin', color: { argb: 'FF1B5E20' } },
    bottom: { style: 'medium', color: { argb: 'FF111827' } },
    right: { style: 'thin', color: { argb: 'FF1B5E20' } }
  };
});
sheet1.getRow(kpiColLine).height = 20;

// KPI list definition
const kpiItems = [
  { name: "Total Requests", val: totalReqs, unit: "count", threshold: "-", format: "0,000", isPass: () => "INFO" },
  { name: "Requests per Second", val: rps, unit: "req/s", threshold: "> 50", format: "0.00", isPass: (v) => v > 50 ? "PASS" : "FAIL" },
  { name: "Avg Response Time", val: avgTime, unit: "ms", threshold: "< 500ms", format: "0.0", isPass: (v) => v < 500 ? "PASS" : "FAIL" },
  { name: "Min Response Time", val: minTime, unit: "ms", threshold: "-", format: "0.0", isPass: () => "INFO" },
  { name: "Max Response Time", val: maxTime, unit: "ms", threshold: "< 3000ms", format: "0.0", isPass: (v) => v < 3000 ? "PASS" : "FAIL" },
  { name: "Median Response Time", val: medTime, unit: "ms", threshold: "< 400ms", format: "0.0", isPass: (v) => v < 400 ? "PASS" : "FAIL" },
  { name: "p[90] Response Time", val: p90Time, unit: "ms", threshold: "< 1500ms", format: "0.0", isPass: (v) => v < 1500 ? "PASS" : "FAIL" },
  { name: "p[95] Response Time", val: p95Time, unit: "ms", threshold: "< 2000ms", format: "0.0", isPass: (v) => v < 2000 ? "PASS" : "FAIL" },
  { name: "Error Rate", val: failRate, unit: "%", threshold: "< 10%", format: "0.00", isPass: (v) => v < 10 ? "PASS" : "FAIL" },
  { name: "Check Pass Rate", val: checkPassRate, unit: "%", threshold: "> 95%", format: "0.00", isPass: (v) => v >= 95 ? "PASS" : "FAIL" },
  { name: "Data Received", val: dataRecv, unit: "MB", threshold: "-", format: "0.00", isPass: () => "INFO" },
  { name: "Data Sent", val: dataSent, unit: "MB", threshold: "-", format: "0.00", isPass: () => "INFO" },
  { name: "Avg Connection Time", val: avgConnecting, unit: "ms", threshold: "< 100ms", format: "0.0", isPass: (v) => v < 100 ? "PASS" : "FAIL" },
  { name: "Avg TLS Handshake", val: avgTls, unit: "ms", threshold: "< 200ms", format: "0.0", isPass: (v) => v < 200 ? "PASS" : "FAIL" },
  { name: "Avg Waiting (TTFB)", val: avgWaiting, unit: "ms", threshold: "< 400ms", format: "0.0", isPass: (v) => v < 400 ? "PASS" : "FAIL" },
  { name: "Total Iterations", val: totalIterations, unit: "count", threshold: "-", format: "0,000", isPass: () => "INFO" },
  { name: "Iterations per Second", val: iterationsPerSec, unit: "iter/s", threshold: "> 5", format: "0.0", isPass: (v) => v > 5 ? "PASS" : "FAIL" }
];

let kpiLine = 12;
kpiItems.forEach((item, index) => {
  const row = sheet1.getRow(kpiLine);
  row.height = 18;

  // Name
  const cellName = sheet1.getCell(`B${kpiLine}`);
  cellName.value = item.name;
  cellName.font = { name: "Calibri", size: 10 };
  cellName.alignment = { horizontal: "left", vertical: "middle" };

  // Value
  const cellVal = sheet1.getCell(`C${kpiLine}`);
  cellVal.value = item.val;
  cellVal.numFormat = item.format;
  cellVal.font = { name: "Calibri", size: 10, bold: true };
  cellVal.alignment = { horizontal: "right", vertical: "middle" };

  // Unit
  const cellUnit = sheet1.getCell(`D${kpiLine}`);
  cellUnit.value = item.unit;
  cellUnit.font = { name: "Calibri", size: 10, color: { argb: "FF4B5563" } };
  cellUnit.alignment = { horizontal: "center", vertical: "middle" };

  // Threshold
  const cellThresh = sheet1.getCell(`E${kpiLine}`);
  cellThresh.value = item.threshold;
  cellThresh.font = { name: "Calibri", size: 10, italic: true, color: { argb: "FF6B7280" } };
  cellThresh.alignment = { horizontal: "center", vertical: "middle" };

  // Result
  const cellResult = sheet1.getCell(`F${kpiLine}`);
  const result = item.isPass(item.val);
  cellResult.value = result;
  cellResult.font = { name: "Calibri", size: 10, bold: true };
  cellResult.alignment = { horizontal: "center", vertical: "middle" };

  if (result === "PASS") {
    cellResult.font.color = { argb: "FF1E4620" };
    cellResult.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F5E9" } }; // Soft Green
  } else if (result === "FAIL") {
    cellResult.font.color = { argb: "FF721C24" };
    cellResult.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8D7DA" } }; // Soft Red
  } else {
    cellResult.font.color = { argb: "FF374151" };
    cellResult.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } }; // Soft Gray
  }

  // Zebra striping and borders
  const bg = index % 2 === 0 ? "FFFFFFFF" : "FFF9FAFB";
  row.eachCell((cell, colNum) => {
    if (colNum >= 2 && colNum <= 6) {
      if (colNum !== 6) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
      }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      };
    }
  });

  kpiLine++;
});

// ================================================================
// TAB 2: ENDPOINT BREAKDOWN (Blue Theme)
// ================================================================
const sheet2 = workbook.addWorksheet("Endpoint Breakdown", { views: [{ showGridLines: true }] });
sheet2.columns = [
  { width: 3 }, // A
  { width: 45 }, // B (Endpoint)
  { width: 12 }, // C (Method)
  { width: 15 }, // D (Requests)
  { width: 15 }, // E (Avg)
  { width: 15 }, // F (Min)
  { width: 15 }, // G (Max)
  { width: 15 }, // H (Status)
  { width: 3 }  // I
];

// Title Header
sheet2.mergeCells("B2:H2");
const epHeaderCell = sheet2.getCell("B2");
epHeaderCell.value = "Per-Endpoint Load Test Results";
epHeaderCell.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
epHeaderCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } }; // Strong Blue
epHeaderCell.alignment = { horizontal: "center", vertical: "middle" };
sheet2.getRow(2).height = 30;

// Table column headers
const epHeaders = ["Endpoint", "Method", "Requests", "Avg (ms)", "Min (ms)", "Max (ms)", "Status"];
epHeaders.forEach((h, i) => {
  const cell = sheet2.getCell(3, i + 2); // B to H
  cell.value = h;
  cell.font = { name: "Calibri", bold: true, size: 10, color: { argb: "FFFFFFFF" } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } }; // Mid Blue
  cell.alignment = { horizontal: "center", vertical: "middle" };
  cell.border = {
    top: { style: 'thin', color: { argb: 'FF1E40AF' } },
    left: { style: 'thin', color: { argb: 'FF1E40AF' } },
    bottom: { style: 'medium', color: { argb: 'FF111827' } },
    right: { style: 'thin', color: { argb: 'FF1E40AF' } }
  };
});
sheet2.getRow(3).height = 20;

// Row endpoints
const testEndpoints = [
  'GET /profiles',
  'GET /profiles?role=eq.worker',
  'GET /profiles?role=eq.contractor',
  'GET /jobs',
  'GET /jobs?status=eq.open',
  'GET /jobs?select=*,profiles(*)',
  'GET /applications',
  'GET /applications?status=eq.applied',
  'GET /messages',
  'GET /messages?select=sender_id,receiver_id'
];

let epLine = 4;
testEndpoints.forEach((epName, index) => {
  const row = sheet2.getRow(epLine);
  row.height = 18;

  // Extract from Trend metric
  const trendName = epName.replace('GET ', 'endpoint_GET_').replace('?role=eq.', '_').replace('?status=eq.', '_').replace('?select=*,profiles(*)', '_profiles').replace('?select=sender_id,receiver_id', '_sender_receiver');
  const trend = getTrendMetric(trendName);

  // Endpoint name
  const cellName = sheet2.getCell(`B${epLine}`);
  cellName.value = epName;
  cellName.font = { name: "Calibri", size: 10 };
  cellName.alignment = { horizontal: "left", vertical: "middle" };

  // Method
  const cellMethod = sheet2.getCell(`C${epLine}`);
  cellMethod.value = "GET";
  cellMethod.font = { name: "Calibri", size: 10 };
  cellMethod.alignment = { horizontal: "center", vertical: "middle" };

  // Requests
  const cellReqs = sheet2.getCell(`D${epLine}`);
  cellReqs.value = trend.count;
  cellReqs.numFormat = "0,000";
  cellReqs.font = { name: "Calibri", size: 10 };
  cellReqs.alignment = { horizontal: "right", vertical: "middle" };

  // Avg
  const cellAvg = sheet2.getCell(`E${epLine}`);
  cellAvg.value = trend.avg;
  cellAvg.numFormat = "0.0";
  cellAvg.font = { name: "Calibri", size: 10, bold: true };
  cellAvg.alignment = { horizontal: "right", vertical: "middle" };

  // Min
  const cellMin = sheet2.getCell(`F${epLine}`);
  cellMin.value = trend.min;
  cellMin.numFormat = "0.0";
  cellMin.font = { name: "Calibri", size: 10 };
  cellMin.alignment = { horizontal: "right", vertical: "middle" };

  // Max
  const cellMax = sheet2.getCell(`G${epLine}`);
  cellMax.value = trend.max;
  cellMax.numFormat = "0.0";
  cellMax.font = { name: "Calibri", size: 10 };
  cellMax.alignment = { horizontal: "right", vertical: "middle" };

  // Status
  const cellStatus = sheet2.getCell(`H${epLine}`);
  const isOk = trend.avg < 500;
  cellStatus.value = isOk ? "OK" : "WARN";
  cellStatus.font = { name: "Calibri", size: 10, bold: true };
  cellStatus.alignment = { horizontal: "center", vertical: "middle" };
  if (isOk) {
    cellStatus.font.color = { argb: "FF1E4620" };
    cellStatus.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F5E9" } };
  } else {
    cellStatus.font.color = { argb: "FF856404" };
    cellStatus.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF3CD" } };
  }

  // Borders & Zebra Striping
  const bg = index % 2 === 0 ? "FFFFFFFF" : "FFF9FAFB";
  row.eachCell((cell, colNum) => {
    if (colNum >= 2 && colNum <= 8) {
      if (colNum !== 8) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
      }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      };
    }
  });

  epLine++;
});

// Add a Visual Performance Progress table inside Endpoint Breakdown
// Just to elevate the design and make it feel premium!
epLine += 3;
sheet2.mergeCells(`B${epLine}:H${epLine}`);
const visHeader = sheet2.getCell(`B${epLine}`);
visHeader.value = "Response Latency Visual Indicators (Average)";
visHeader.font = { name: "Calibri", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
visHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };
visHeader.alignment = { horizontal: "left", vertical: "middle" };
sheet2.getRow(epLine).height = 22;
epLine++;

const barHeaders = ["Endpoint", "Avg Latency", "Performance Bar", "", "", "", "Rating"];
barHeaders.forEach((h, i) => {
  if (i < 3 || i === 6) {
    const cell = sheet2.getCell(epLine, i + 2);
    cell.value = h;
    cell.font = { name: "Calibri", bold: true, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFBFDBFE' } },
      left: { style: 'thin', color: { argb: 'FFBFDBFE' } },
      bottom: { style: 'thin', color: { argb: 'FFBFDBFE' } },
      right: { style: 'thin', color: { argb: 'FFBFDBFE' } }
    };
  }
});
sheet2.mergeCells(`D${epLine}:G${epLine}`);
sheet2.getRow(epLine).height = 20;
epLine++;

testEndpoints.forEach((epName) => {
  const row = sheet2.getRow(epLine);
  row.height = 18;

  const trendName = epName.replace('GET ', 'endpoint_GET_').replace('?role=eq.', '_').replace('?status=eq.', '_').replace('?select=*,profiles(*)', '_profiles').replace('?select=sender_id,receiver_id', '_sender_receiver');
  const trend = getTrendMetric(trendName);

  // Name
  sheet2.getCell(`B${epLine}`).value = epName;
  sheet2.getCell(`B${epLine}`).font = { name: "Calibri", size: 10 };

  // Value
  const cellVal = sheet2.getCell(`C${epLine}`);
  cellVal.value = trend.avg;
  cellVal.numFormat = "0.0\" ms\"";
  cellVal.font = { name: "Calibri", size: 10, bold: true };
  cellVal.alignment = { horizontal: "right" };

  // Progress Bar
  const maxScaleVal = 400; // ms
  const totalBlocks = 10;
  const blocksCount = Math.min(totalBlocks, Math.max(1, Math.round((trend.avg / maxScaleVal) * totalBlocks)));
  const barText = "█".repeat(blocksCount) + "░".repeat(totalBlocks - blocksCount);
  
  sheet2.mergeCells(`D${epLine}:G${epLine}`);
  const barCell = sheet2.getCell(`D${epLine}`);
  barCell.value = barText;
  barCell.font = { name: "Courier New", size: 11, bold: true, color: { argb: trend.avg < 150 ? "FF2563EB" : "FFD97706" } };
  barCell.alignment = { horizontal: "left", vertical: "middle" };

  // Rating
  const rateCell = sheet2.getCell(`H${epLine}`);
  rateCell.value = trend.avg < 100 ? "EXCELLENT" : (trend.avg < 250 ? "GOOD" : "SATISFACTORY");
  rateCell.font = { name: "Calibri", size: 9, bold: true, color: { argb: trend.avg < 100 ? "FF047857" : (trend.avg < 250 ? "FF1D4ED8" : "FFB45309") } };
  rateCell.alignment = { horizontal: "center" };

  // Draw borders
  row.eachCell((cell, colNum) => {
    if (colNum >= 2 && colNum <= 8) {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      };
    }
  });

  epLine++;
});

// ================================================================
// TAB 3: TEST CONFIGURATION (Purple Theme)
// ================================================================
const sheet3 = workbook.addWorksheet("Test Configuration", { views: [{ showGridLines: true }] });
sheet3.columns = [
  { width: 3 }, // A
  { width: 35 }, // B (Parameter)
  { width: 55 }, // C (Value)
  { width: 3 }  // D
];

// Title Block
sheet3.mergeCells("B2:C2");
const configHeaderCell = sheet3.getCell("B2");
configHeaderCell.value = "Load Test Configuration";
configHeaderCell.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
configHeaderCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF5B2C84" } }; // Purple
configHeaderCell.alignment = { horizontal: "center", vertical: "middle" };
sheet3.getRow(2).height = 30;

// Configuration list
const configItems = [
  { param: "Tool", val: "Grafana k6 (v0.52.0)" },
  { param: "Test Type", val: "Baseline / Load Test" },
  { param: "Protocol", val: "HTTPS (REST API)" },
  { param: "Target System", val: "Supabase PostgreSQL REST API" },
  { param: "Base URL", val: "https://sfzfrutggvzdtelvrftw.supabase.co/rest/v1" },
  { param: "Auth Method", val: "API Key (anon/publishable)" },
  { param: "Virtual Users (Peak)", val: peakVus },
  { param: "Ramp-Up Phase", val: "0 -> 50 VUs over 10 seconds" },
  { param: "Steady State Phase", val: "50 -> 100 VUs over 40 seconds" },
  { param: "Ramp-Down Phase", val: "100 -> 0 VUs over 10 seconds" },
  { param: "Total Duration", val: "60 seconds" },
  { param: "Endpoints Tested", val: "10 REST API endpoints" },
  { param: "Tables Covered", val: "profiles, jobs, applications, messages" },
  { param: "Threshold: p(95) Duration", val: "< 2000 ms" },
  { param: "Threshold: Error Rate", val: "< 10%" },
  { param: "Sleep Between Iterations", val: "0.5 seconds" }
];

let configLine = 3;
configItems.forEach((item, index) => {
  const row = sheet3.getRow(configLine);
  row.height = 18;

  // Parameter Name
  const cellParam = sheet3.getCell(`B${configLine}`);
  cellParam.value = item.param;
  cellParam.font = { name: "Calibri", bold: true, size: 10, color: { argb: "FF374151" } };
  cellParam.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9F5FF" } }; // Light Purple-gray tint
  cellParam.alignment = { horizontal: "left", vertical: "middle" };

  // Value
  const cellVal = sheet3.getCell(`C${configLine}`);
  cellVal.value = item.val;
  cellVal.font = { name: "Calibri", size: 10 };
  cellVal.alignment = { horizontal: "left", vertical: "middle" };

  // Borders
  row.eachCell((cell, colNum) => {
    if (colNum >= 2 && colNum <= 3) {
      if (colNum !== 2) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: index % 2 === 0 ? "FFFFFFFF" : "FFFDFBFF" } };
      }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE9D5FF' } },
        left: { style: 'thin', color: { argb: 'FFE9D5FF' } },
        bottom: { style: 'thin', color: { argb: 'FFE9D5FF' } },
        right: { style: 'thin', color: { argb: 'FFE9D5FF' } }
      };
    }
  });

  configLine++;
});

// Save Excel file
const outputDir = path.join(__dirname, 'Load Test Results');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const outputPath = path.join(outputDir, 'Load_Test_Report.xlsx');
const backupPath = path.join(outputDir, 'Load_Test_Report_JobNow.xlsx');

workbook.xlsx.writeFile(outputPath).then(() => {
  console.log(`\n==================================================`);
  console.log(`🚀 Styled 3-Tab Load Test Report generated successfully!`);
  console.log(`📂 Location: ${outputPath}`);
  console.log(`==================================================\n`);
}).catch(err => {
  if (err.code === 'EBUSY') {
    console.warn(`\n⚠️ Warning: ${outputPath} is locked (likely open in Excel).`);
    console.log(`Saving to alternative path: ${backupPath}`);
    workbook.xlsx.writeFile(backupPath).then(() => {
      console.log(`\n==================================================`);
      console.log(`🚀 Styled 3-Tab Load Test Report generated successfully!`);
      console.log(`📂 Location: ${backupPath}`);
      console.log(`==================================================\n`);
    }).catch(err2 => {
      console.error("Error writing backup Excel file:", err2);
    });
  } else {
    console.error("Error writing Excel file:", err);
  }
});
