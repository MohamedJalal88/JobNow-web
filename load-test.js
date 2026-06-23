import http from 'k6/http';
import { sleep, check } from 'k6';
import { Trend } from 'k6/metrics';

export const options = {
  stages: [
    { duration: '10s', target: 50 },  // Ramp-up to 50 VUs
    { duration: '40s', target: 100 }, // Steady state at 100 VUs
    { duration: '10s', target: 0 },   // Ramp-down to 0 VUs
  ],
  thresholds: {
    http_req_failed: ['rate<0.1'], // less than 10% error rate
    http_req_duration: ['p(95)<2000'], // p(95) response time < 2000ms
  },
};

const BASE_URL = 'https://sfzfrutggvzdtelvrftw.supabase.co/rest/v1';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmemZydXRnZ3Z6ZHRlbHZyZnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNjYzNjcsImV4cCI6MjA5NDg0MjM2N30.TGijxjDEExkEgnevb5RDw17BrWE2oicyy2gki636iR4';

const HEADERS = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
};

// Define custom trends for each REST API endpoint
const trends = {
  'GET /profiles': new Trend('endpoint_GET_profiles'),
  'GET /profiles?role=eq.worker': new Trend('endpoint_GET_profiles_worker'),
  'GET /profiles?role=eq.contractor': new Trend('endpoint_GET_profiles_contractor'),
  'GET /jobs': new Trend('endpoint_GET_jobs'),
  'GET /jobs?status=eq.open': new Trend('endpoint_GET_jobs_open'),
  'GET /jobs?select=*,profiles(*)': new Trend('endpoint_GET_jobs_profiles'),
  'GET /applications': new Trend('endpoint_GET_applications'),
  'GET /applications?status=eq.applied': new Trend('endpoint_GET_applications_applied'),
  'GET /messages': new Trend('endpoint_GET_messages'),
  'GET /messages?select=sender_id,receiver_id': new Trend('endpoint_GET_messages_sender_receiver'),
};

const endpoints = [
  { name: 'GET /profiles', path: '/profiles' },
  { name: 'GET /profiles?role=eq.worker', path: '/profiles?role=eq.worker' },
  { name: 'GET /profiles?role=eq.contractor', path: '/profiles?role=eq.contractor' },
  { name: 'GET /jobs', path: '/jobs' },
  { name: 'GET /jobs?status=eq.open', path: '/jobs?status=eq.open' },
  { name: 'GET /jobs?select=*,profiles(*)', path: '/jobs?select=*,profiles(*)' },
  { name: 'GET /applications', path: '/applications' },
  { name: 'GET /applications?status=eq.applied', path: '/applications?status=eq.applied' },
  { name: 'GET /messages', path: '/messages' },
  { name: 'GET /messages?select=sender_id,receiver_id', path: '/messages?select=sender_id,receiver_id' },
];

export default function () {
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const url = `${BASE_URL}${endpoint.path}`;

  const res = http.get(url, { headers: HEADERS });

  trends[endpoint.name].add(res.timings.duration);

  check(res, {
    'status is 200': (r) => r.status === 200 || r.status === 206 || r.status === 201,
  });

  sleep(0.5);
}

export function handleSummary(data) {
  return {
    'stdout': 'k6 Load Test Finished. Exporting metrics to load_test_summary.json...\n',
    'load_test_summary.json': JSON.stringify(data, null, 2),
  };
}
