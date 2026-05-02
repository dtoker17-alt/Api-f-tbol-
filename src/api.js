require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'https://sports.bzzoiro.com/api';
const API_KEY = process.env.BIZZOIRO_API_KEY;

const client = axios.create({
  baseURL: BASE_URL,
  headers: { Authorization: `Token ${API_KEY}` },
  timeout: 15000,
});

function toResults(data) {
  if (Array.isArray(data)) return data;
  if (data?.results) return data.results;
  if (data?.data) return data.data;
  return [];
}

async function getTodayMatches() {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
  // Get both upcoming (NS) and live matches
  const [upcoming, live] = await Promise.all([
    client.get('/events/', { params: { date: today, status: 'NS' } }).catch(() => ({ data: [] })),
    client.get('/events/', { params: { date: today, status: 'LIVE' } }).catch(() => ({ data: [] })),
  ]);
  const all = [...toResults(upcoming.data), ...toResults(live.data)];

  // Log first match structure for debugging
  if (all.length > 0) {
    console.log('🔍 Estructura del primer partido:', JSON.stringify(all[0], null, 2));
  }
  return all;
}

async function getTeamLastMatches(teamId, limit = 10) {
  // Try different param names the BSD API might use
  const res = await client.get('/events/', {
    params: { team: teamId, limit, ordering: '-date' },
  });
  return toResults(res.data).slice(0, limit);
}

async function getEventDetail(fixtureId) {
  const res = await client.get(`/events/${fixtureId}/`);
  return res.data || {};
}

module.exports = { getTodayMatches, getTeamLastMatches, getEventDetail };
