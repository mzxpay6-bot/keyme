const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

// ========== CARREGAR COOKIES ==========
const COOKIES = process.env.ROBLOX_COOKIES ? 
  process.env.ROBLOX_COOKIES.split('\n')
    .map(c => c.trim())
    .filter(c => c.length > 50 && c.includes('_wsec')) : [];

// ========== FUNÇÕES REAIS DO ROBLOX ==========
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

async function favoriteGameReal(cookie, gameId) {
  try {
    console.log(`⭐ Tentando favoritar ${gameId}...`);
    const csrf = await getCsrfToken(cookie);
    
    if (!csrf) {
      return { success: false, error: 'Falha CSRF - Cookie inválido' };
    }

    const response = await axios.post(
      `https://games.roblox.com/v1/games/${gameId}/favorites`,
      { isFavorited: true },
      {
        headers: {
          'Cookie': `.ROBLOSECURITY=${cookie}`,
          'X-CSRF-TOKEN': csrf,
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0'
        },
        timeout: 10000,
        validateStatus: null
      }
    );

    const success = response.status === 200 || response.status === 201;
    console.log(`📊 Status: ${response.status} - ${success ? '✅' : '❌'}`);
    
    return {
      success,
      status: response.status,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// ========== ROTAS DA API ==========
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Roblox Favorite Bot - PRONTO!</title>
      <style>
        body { font-family: Arial; margin: 40px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
        h1 { color: #333; }
        .status { padding: 15px; border-radius: 10px; margin: 20px 0; }
        .online { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .offline { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .game-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .game { background: #e9ecef; padding: 15px; border-radius: 8px; cursor: pointer; }
        .game:hover { background: #dee2e6; }
        button { background: #0070f3; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 16px; margin: 10px 5px; }
        button:hover { background: #0056cc; }
        input, select { padding: 10px; border: 1px solid #ddd; border-radius: 5px; margin: 5px; width: 200px; }
        .result { background: #f8f9fa; padding: 15px; border-radius: 10px; margin-top: 20px; max-height: 400px; overflow-y: auto; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🎮 Roblox Favorite Bot - PRONTO!</h1>
        
        <div class="status ${COOKIES.length > 0 ? 'online' : 'offline'}">
          <h3>Status: ${COOKIES.length > 0 ? '✅ ONLINE' : '❌ OFFLINE'}</h3>
          <p>Contas carregadas: <strong>${COOKIES.length}</strong></p>
          ${COOKIES.length === 0 ? '<p>⚠️ Configure ROBLOX_COOKIES na Vercel</p>' : ''}
        </div>
        
        <h3>⚡ Favoritar Jogo:</h3>
        <input type="text" id="gameId" placeholder="Game ID (ex: 1537690962)" value="1537690962">
        <input type="number" id="limit" placeholder="Nº de contas" value="${Math.min(3, COOKIES.length)}" min="1" max="${COOKIES.length}">
        <button onclick="favoriteGame()">⭐ FAVORITAR AGORA</button>
        
        <h3>🎯 Jogos Populares:</h3>
        <div class="game-list">
          <div class="game" onclick="setGame('1537690962', 'Arsenal')">Arsenal (1537690962)</div>
          <div class="game" onclick="setGame('2537434482', 'Adopt Me')">Adopt Me (2537434482)</div>
          <div class="game" onclick="setGame('4924922222', 'Brookhaven')">Brookhaven (4924922222)</div>
          <div class="game" onclick="setGame('142823291', 'Murder Mystery 2')">Murder Mystery 2 (142823291)</div>
          <div class="game" onclick="setGame('2753915549', 'Blox Fruits')">Blox Fruits (2753915549)</div>
          <div class="game" onclick="setGame('286090429', 'Pet Simulator X')">Pet Simulator X (286090429)</div>
        </div>
        
        <div class="result" id="result">
          <!-- Resultados aparecem aqui -->
        </div>
      </div>
      
      <script>
        function setGame(id, name) {
          document.getElementById('gameId').value = id;
          document.getElementById('result').innerHTML = `<p>🎮 Selecionado: <strong>${name}</strong> (${id})</p>`;
        }
        
        async function favoriteGame() {
          const gameId = document.getElementById('gameId').value;
          const limit = document.getElementById('limit').value;
          const resultDiv = document.getElementById('result');
          
          if (!gameId) {
            resultDiv.innerHTML = '<p style="color:red">❌ Digite um Game ID!</p>';
            return;
          }
          
          resultDiv.innerHTML = `
            <p>⏳ Favoritando jogo ${gameId}...</p>
            <p>Usando ${limit || 'todas'} contas</p>
            <div id="progress"></div>
          `;
          
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
            
            // Exibir resultados bonitos
            let html = '<h3>📊 Resultados:</h3>';
            
            if (data.success) {
              html += `
                <p><strong>🎮 Jogo:</strong> ${data.gameId}</p>
                <p><strong>👥 Contas:</strong> ${data.successful}/${data.total} sucesso</p>
                <p><strong>📈 Taxa:</strong> ${data.successRate}</p>
                <p><strong>⏱️ Tempo:</strong> ${data.timeTaken}s</p>
                
                <h4>📋 Detalhes por conta:</h4>
              `;
              
              data.results.forEach(result => {
                html += `
                  <div style="margin: 5px 0; padding: 10px; background: ${result.success ? '#d4edda' : '#f8d7da'}; border-radius: 5px;">
                    <strong>Conta ${result.account}:</strong> 
                    ${result.success ? '✅ Sucesso' : '❌ Falha'} 
                    ${result.error ? `- ${result.error}` : ''}
                  </div>
                `;
              });
              
            } else {
              html += `<p style="color:red">❌ ${data.error}</p>`;
            }
            
            resultDiv.innerHTML = html;
            
          } catch (error) {
            resultDiv.innerHTML = `<p style="color:red">💥 Erro: ${error.message}</p>`;
          }
        }
      </script>
    </body>
    </html>
  `);
});

// ========== ENDPOINT PRINCIPAL ==========
app.post('/fav', async (req, res) => {
  try {
    const { gameId, limit } = req.body;
    const startTime = Date.now();
    
    // Validações
    if (!gameId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Game ID é obrigatório' 
      });
    }
    
    if (COOKIES.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Nenhuma conta configurada. Configure ROBLOX_COOKIES na Vercel!' 
      });
    }
    
    // Definir contas a usar
    const accounts = limit ? 
      COOKIES.slice(0, Math.min(limit, COOKIES.length)) : 
      COOKIES;
    
    console.log(`🎯 Iniciando favoritar: ${gameId} com ${accounts.length} contas`);
    
    const results = [];
    let successCount = 0;
    
    // Processar CADA conta
    for (let i = 0; i < accounts.length; i++) {
      console.log(`[${i+1}/${accounts.length}] Processando conta...`);
      
      const result = await favoriteGameReal(accounts[i], gameId);
      
      results.push({
        account: i + 1,
        success: result.success,
        status: result.status,
        error: result.error || null
      });
      
      if (result.success) {
        successCount++;
        console.log(`   ✅ Sucesso!`);
      } else {
        console.log(`   ❌ Falha: ${result.error}`);
      }
      
      // Delay de 2.5 segundos entre contas (evita ban)
      if (i < accounts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2500));
      }
    }
    
    const timeTaken = ((Date.now() - startTime) / 1000).toFixed(1);
    
    res.json({
      success: true,
      gameId: gameId,
      total: accounts.length,
      successful: successCount,
      failed: accounts.length - successCount,
      successRate: `${((successCount / accounts.length) * 100).toFixed(1)}%`,
      timeTaken: timeTaken,
      results: results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro interno: ' + error.message
    });
  }
});

// ========== OUTRAS ROTAS ==========
app.get('/test', (req, res) => {
  res.json({
    status: 'online',
    cookies: COOKIES.length,
    message: COOKIES.length > 0 ? 
      '✅ API PRONTA PARA USAR!' : 
      '❌ Configure cookies na Vercel'
  });
});

app.get('/accounts', (req, res) => {
  res.json({
    total: COOKIES.length,
    accounts: COOKIES.map((c, i) => ({
      id: i + 1,
      valid: c.length > 50,
      preview: c.substring(0, 20) + '...'
    }))
  });
});

module.exports = app;
