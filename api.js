const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

// ============================================
// 1. FUNÇÕES PRINCIPAIS
// ============================================

// Carregar cookies
const getCookies = () => {
  if (process.env.ROBLOX_COOKIES) {
    return process.env.ROBLOX_COOKIES
      .split('\n')
      .map(c => c.trim())
      .filter(c => c.length > 50);
  }
  return [];
};

const COOKIES = getCookies();

// Obter CSRF Token
async function getCsrfToken(cookie) {
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

// Favoritar jogo REAL
async function favoriteGameReal(cookie, gameId) {
  try {
    const csrf = await getCsrfToken(cookie);
    if (!csrf) return { success: false, error: 'Falha CSRF' };

    const response = await axios.post(
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
      success: response.status === 200 || response.status === 201,
      status: response.status,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.status || 'Erro conexão'
    };
  }
}

// Converter Place ID para Universe ID
async function convertPlaceId(placeId) {
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

// ============================================
// 2. ROTAS DA API
// ============================================

// Página inicial
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Roblox Favorite Bot</title>
      <style>
        body { font-family: Arial; margin: 40px; }
        .endpoint { background: #f0f0f0; padding: 15px; margin: 10px 0; }
        button { padding: 10px 20px; background: #0070f3; color: white; border: none; cursor: pointer; }
      </style>
    </head>
    <body>
      <h1>🎮 Roblox Favorite Bot API</h1>
      <p>Contas carregadas: <strong>${COOKIES.length}</strong></p>
      
      <div class="endpoint">
        <h3>POST /fav - Favoritar jogo</h3>
        <input type="text" id="gameId" placeholder="Game ID (ex: 1537690962)" value="1537690962">
        <input type="number" id="limit" placeholder="Número de contas" value="1">
        <button onclick="favorite()">⭐ Favoritar</button>
        <div id="result"></div>
      </div>
      
      <script>
        async function favorite() {
          const gameId = document.getElementById('gameId').value;
          const limit = document.getElementById('limit').value;
          
          const resultDiv = document.getElementById('result');
          resultDiv.innerHTML = '⏳ Processando...';
          
          try {
            const response = await fetch('/fav', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                gameId: gameId, 
                limit: limit ? parseInt(limit) : undefined 
              })
            });
            
            const data = await response.json();
            resultDiv.innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
          } catch (error) {
            resultDiv.innerHTML = '❌ Erro: ' + error.message;
          }
        }
      </script>
    </body>
    </html>
  `);
});

// Status
app.get('/status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    accounts: COOKIES.length,
    cookiesLoaded: COOKIES.length > 0,
    node: process.version
  });
});

// Ver contas
app.get('/accounts', (req, res) => {
  res.json({
    total: COOKIES.length,
    accounts: COOKIES.map((c, i) => ({
      id: i + 1,
      preview: c.substring(0, 25) + '...',
      length: c.length,
      valid: c.length > 50
    }))
  });
});

// ============================================
// 3. ENDPOINT PRINCIPAL - FAVORITAR
// ============================================

// IMPORTANTE: Endpoint correto é POST /fav (não /favorite)
app.post('/fav', async (req, res) => {
  try {
    const { gameId, limit } = req.body;
    
    // Validação
    if (!gameId) {
      return res.status(400).json({
        error: 'gameId é obrigatório',
        example: { gameId: '1537690962', limit: 3 }
      });
    }
    
    if (COOKIES.length === 0) {
      return res.status(400).json({
        error: 'Nenhuma conta carregada',
        note: 'Adicione cookies na Vercel: Settings > Environment Variables > ROBLOX_COOKIES'
      });
    }

    // Converter Place ID se necessário
    let universeId = gameId;
    if (gameId.length > 10) {
      universeId = await convertPlaceId(gameId);
      if (!universeId) {
        return res.status(400).json({
          error: 'Place ID inválido',
          provided: gameId
        });
      }
    }

    // Definir número de contas
    const accounts = limit ? 
      COOKIES.slice(0, Math.min(limit, COOKIES.length)) : 
      COOKIES;
    
    const results = [];
    let successCount = 0;

    // Processar cada conta
    for (let i = 0; i < accounts.length; i++) {
      console.log(`[${i+1}/${accounts.length}] Processando conta ${i+1}...`);
      
      const result = await favoriteGameReal(accounts[i], universeId);
      
      results.push({
        account: i + 1,
        success: result.success,
        status: result.status,
        error: result.error || null,
        cookiePreview: accounts[i].substring(0, 15) + '...'
      });

      if (result.success) {
        console.log(`   ✅ Sucesso!`);
        successCount++;
      } else {
        console.log(`   ❌ Falha: ${result.error}`);
      }

      // Delay de 2.5s entre contas
      if (i < accounts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2500));
      }
    }

    // Resposta final
    res.json({
      success: true,
      game: {
        requestedId: gameId,
        universeId: universeId,
        isPlaceId: gameId.length > 10
      },
      accounts: {
        total: accounts.length,
        successful: successCount,
        failed: accounts.length - successCount,
        successRate: ((successCount / accounts.length) * 100).toFixed(1) + '%'
      },
      results: results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      error: 'Erro interno',
      message: error.message
    });
  }
});

// ============================================
// 4. ENDPOINT GET /favorite (apenas para info)
// ============================================

app.get('/favorite', (req, res) => {
  res.json({
    message: 'Use POST /fav para favoritar jogos',
    error: 'Cannot GET /favorite - Método incorreto',
    correctEndpoint: 'POST /fav',
    example: {
      method: 'POST',
      url: '/fav',
      body: {
        gameId: '1537690962',
        limit: 2
      }
    },
    accountsAvailable: COOKIES.length
  });
});

// Export para Vercel
module.exports = app;
