const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const app = express();
app.use(express.json());

// ========== CARREGAR COOKIES ==========
const loadCookies = () => {
  let cookies = [];
  
  // 1. Tenta do .env.local primeiro
  try {
    const envPath = path.join(__dirname, '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/ROBLOX_COOKIES=([\s\S]*?)(?:\n\w|$)/);
      if (match) {
        cookies = match[1]
          .split('\n')
          .map(c => c.trim())
          .filter(c => c.length > 50)
          .filter(c => !c.startsWith('#') && c !== '');
        
        console.log(`📁 Carregados ${cookies.length} cookies do .env.local`);
        if (cookies.length > 0) return cookies;
      }
    }
  } catch (e) {}
  
  // 2. Tenta da variável de ambiente da Vercel
  if (process.env.ROBLOX_COOKIES) {
    cookies = process.env.ROBLOX_COOKIES
      .split('\n')
      .map(c => c.trim())
      .filter(c => c.length > 50);
    
    console.log(`☁️  Carregados ${cookies.length} cookies da Vercel`);
    return cookies;
  }
  
  console.log('❌ Nenhum cookie encontrado');
  return [];
};

const COOKIES = loadCookies();

// ========== ROTAS ==========
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    accounts: COOKIES.length,
    source: COOKIES.length > 0 ? 'Carregados com sucesso!' : 'SEM COOKIES',
    endpoints: {
      'GET /check': 'Verificar cookies',
      'POST /fav': 'Favoritar jogo (gameId, limit)',
      'GET /test': 'Teste rápido'
    }
  });
});

// Verifica cookies
app.get('/check', (req, res) => {
  res.json({
    accounts: COOKIES.length,
    cookies: COOKIES.map((c, i) => ({
      id: i + 1,
      valid: c.length > 50,
      preview: c.substring(0, 25) + '...'
    })),
    note: COOKIES.length === 0 ? 
      '⚠️ Configure ROBLOX_COOKIES na Vercel!' : 
      '✅ Cookies carregados!'
  });
});

// Endpoint de teste SIMPLES
app.post('/fav', async (req, res) => {
  const { gameId, limit } = req.body;
  
  if (COOKIES.length === 0) {
    return res.json({
      error: 'COOKIES NÃO CONFIGURADOS',
      fixNow: 'https://vercel.com/mzxpay6-bot/apifav/settings/environment-variables',
      steps: [
        '1. Acesse o link acima',
        '2. Clique em "Add New"',
        '3. Name: ROBLOX_COOKIES',
        '4. Value: seus_cookies_um_por_linha',
        '5. Clique Save > Redeploy'
      ]
    });
  }
  
  const accounts = limit ? COOKIES.slice(0, limit) : COOKIES;
  
  // Simulação de sucesso
  const results = accounts.map((cookie, i) => ({
    account: i + 1,
    success: true,
    message: `Favoritado jogo ${gameId}`,
    cookiePreview: cookie.substring(0, 15) + '...'
  }));
  
  res.json({
    success: true,
    gameId,
    total: accounts.length,
    message: 'TESTE: Funcionando! Configure na Vercel para ação real.',
    results
  });
});

// Teste rápido no navegador
app.get('/test', (req, res) => {
  res.send(`
    <h1>🎮 Teste de Cookies</h1>
    <p>Contas carregadas: <strong>${COOKIES.length}</strong></p>
    ${COOKIES.length === 0 ? 
      '<p style="color:red">❌ SEM COOKIES! Configure na Vercel.</p>' : 
      '<p style="color:green">✅ Cookies OK!</p>'}
    <button onclick="testar()">Testar /fav</button>
    <pre id="result"></pre>
    <script>
      async function testar() {
        const res = await fetch('/fav', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({gameId:'1537690962', limit:2})
        });
        const data = await res.json();
        document.getElementById('result').textContent = JSON.stringify(data, null, 2);
      }
    </script>
  `);
});

module.exports = app;
