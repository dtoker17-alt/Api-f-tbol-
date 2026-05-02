require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'https://api.bizzoiro.com/v1';
const API_KEY = process.env.BIZZOIRO_API_KEY;

const client = axios.create({
  baseURL: BASE_URL,
  headers: { Authorization: `Bearer ${API_KEY}` },
  timeout: 10000,
});

async function getTodayMatches() {
  const today = new Date().toISOString().split('T')[0];
  const res = await client.get('/fixtures', {
    params: { date: today, status: 'NS' },
  });
  return res.data.data || res.data.fixtures || res.data || [];
}

async function getTeamLastMatches(teamId, limit = 10) {
  const res = await client.get(`/teams/${teamId}/fixtures`, {
    params: { last: limit, status: 'FT' },
  });
  return res.data.data || res.data.fixtures || res.data || [];
}

async function getOdds(fixtureId) {
  const res = await client.get('/odds', {
    params: { fixture: fixtureId, bookmaker: 1 },
  });
  return res.data.data || res.data.odds || res.data || [];
}

module.exports = { getTodayMatches, getTeamLastMatches, getOdds };
