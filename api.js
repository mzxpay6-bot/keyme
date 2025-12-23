const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// Configuração
const COOKIES = process.env.COOKIES ? 
  process.env.COOKIES.split('|').filter(c => c.length > 50) : 
  [];

const DELAY = 2500;

class RobloxFavBot {
  constructor() {
    this.cookies = COOKIES;
  }

  async getCsrfToken(cookie) {
    try {
      const res = await axios.post(
        'https://auth.roblox.com/v2/logout',
        {},
        { 
          headers: { 'Cookie': `.ROBLOSECURITY=${cookie}` },
          validateStatus: null,
          timeout: 5000 
        }
      );
      return res.headers['x-csrf-token'];
    } catch {
      return null;
    }
  }

  async convertPlaceId(placeId) {
    try {
      const res = await axios.get(
        `https://apis.roblox.com/universes/v1/places/${placeId}/universe`,
        { timeout: 5000 }
      );
      return res.data?.universeId || null;
    } catch {
      return null;
    }
  }

  async validateGame(gameId) {
    try {
      const res = await axios.get(
        `https://games.roblox.com/v1/games?universeIds=${gameId}`,
        { timeout: 5000 }
      );
      return res.data?.data?.[0] || null;
    } catch {
      return null;
    }
  }

  async favoriteGame(cookie, gameId) {
    try {
      const csrf = await this.getCsrfToken(cookie);
      if (!csrf) return { success: false, error: 'CSRF failed' };

      const res = await axios.post(
        `https://games.roblox.com/v1/games/${gameId}/favorites`,
        { isFavorited: true },
        {
          headers: {
            'Cookie': `.ROBLOSECURITY=${cookie}`,
            'X-CSRF-TOKEN': csrf,
            'Content-Type': 'application/json'
          },
          timeout: 10000,
          validateStatus: null
        }
      );

      return {
        success: res.status === 200 || res.status === 201,
        status: res.status,
        data: res.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.status || error.code
      };
    }
  }
}

const bot = new RobloxFavBot();

// Rotas principais
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    accounts: bot.cookies.length,
    endpoints: {
      'GET /status': 'API status',
      'GET /game/:id': 'Game info',
      'POST /favorite': 'Favorite game',
      'GET /cookies': 'View loaded accounts'
    }
  });
});

app.get('/status', (req, res) => {
  res.json({
    status: 'online',
    accounts: bot.cookies.length,
    timestamp: new Date().toISOString()
  });
});

app.get('/game/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    let gameId = id;
    if (id.length > 10) {
      const universeId = await bot.convertPlaceId(id);
      if (!universeId) {
        return res.status(400).json({ error: 'Cannot convert Place ID' });
      }
      gameId = universeId;
    }

    const game = await bot.validateGame(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.json({
      id: gameId,
      name: game.name,
      creator: game.creator?.name
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal error' });
  }
});

app.post('/favorite', async (req, res) => {
  try {
    const { gameId, maxAccounts } = req.body;
    
    if (!gameId) {
      return res.status(400).json({ error: 'gameId required' });
    }

    if (bot.cookies.length === 0) {
      return res.status(400).json({ error: 'No accounts loaded' });
    }

    // Converter/validar ID
    let universeId = gameId;
    if (gameId.length > 10) {
      const converted = await bot.convertPlaceId(gameId);
      if (!converted) {
        return res.status(400).json({ error: 'Invalid Place ID' });
      }
      universeId = converted;
    }

    const game = await bot.validateGame(universeId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Processar contas
    const accounts = maxAccounts ? 
      bot.cookies.slice(0, Math.min(maxAccounts, bot.cookies.length)) : 
      bot.cookies;

    const results = [];
    let success = 0;

    for (let i = 0; i < accounts.length; i++) {
      const result = await bot.favoriteGame(accounts[i], universeId);
      results.push({
        account: i + 1,
        success: result.success,
        error: result.error || null
      });

      if (result.success) success++;

      // Delay entre contas
      if (i < accounts.length - 1) {
        await new Promise(r => setTimeout(r, DELAY));
      }
    }

    res.json({
      game: {
        id: universeId,
        name: game.name
      },
      total: accounts.length,
      success,
      fail: accounts.length - success,
      successRate: ((success / accounts.length) * 100).toFixed(1) + '%',
      results
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal error' });
  }
});

app.get('/cookies', (req, res) => {
  res.json({
    total: bot.cookies.length,
    accounts: bot.cookies.map((c, i) => ({
      id: i + 1,
      preview: c.substring(0, 20) + '...',
      length: c.length
    }))
  });
});

// Export para Vercel
module.exports = app;