/**
 * Cliente para testar a API
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

class RobloxAPIClient {
  constructor(baseURL = API_BASE) {
    this.client = axios.create({ baseURL });
  }

  async getStatus() {
    const response = await this.client.get('/status');
    return response.data;
  }

  async getGameInfo(gameId) {
    const response = await this.client.get(`/game/${gameId}`);
    return response.data;
  }

  async convertPlaceId(placeId) {
    const response = await this.client.get(`/convert/${placeId}`);
    return response.data;
  }

  async favoriteGame(gameId, maxAccounts = null) {
    const data = { gameId };
    if (maxAccounts) data.maxAccounts = maxAccounts;
    
    const response = await this.client.post('/favorite', data);
    return response.data;
  }

  async testAll(gameId) {
    console.log('🧪 Testando API...\n');
    
    // 1. Status
    console.log('1. Status da API:');
    const status = await this.getStatus();
    console.log(status);
    console.log();
    
    // 2. Info do jogo
    console.log(`2. Informações do jogo ${gameId}:`);
    const gameInfo = await this.getGameInfo(gameId);
    console.log(gameInfo);
    console.log();
    
    // 3. Teste de favoritar (apenas 2 contas)
    console.log('3. Testando favoritar (2 contas):');
    const result = await this.favoriteGame(gameId, 2);
    console.log(result);
  }
}

// Uso
if (require.main === module) {
  const client = new RobloxAPIClient();
  
  // Teste com Arsenal (Universe ID: 1537690962)
  client.testAll('1537690962').catch(console.error);
}

module.exports = RobloxAPIClient;   