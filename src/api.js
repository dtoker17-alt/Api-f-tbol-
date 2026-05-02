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
  if (data && Array.isArray(data.results)) return data.results;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}

async function getTodayMatches() {
  const today = new Date().toISOString().split('T')[0];
  const res = await client.get('/events/', {
    params: { date: today },
  });
  return toResults(res.data);
}

async function getTeamLastMatches(teamId, limit = 10) {
  const res = await client.get('/events/', {
    params: { team: teamId, limit, status: 'finished' },
  });
  return toResults(res.data).slice(0, limit);
}

// Odds are embedded in the event object — no separate call needed
async function getOdds(fixtureId) {
  const res = await client.get(`/events/${fixtureId}/`);
  return res.data || {};
}

module.exports = { getTodayMatches, getTeamLastMatches, getOdds };
