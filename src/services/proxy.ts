import axios from 'axios';

const CORS_PROXY = 'https://cors-anywhere.herokuapp.com/';
const API_URL = 'https://api.userapi.ai';

export const proxyApi = axios.create({
  baseURL: `${CORS_PROXY}${API_URL}`,
  headers: {
    'api-key': '905588e1-9a2d-4e7f-9f3d-01df73c0b770',
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest', // Required by cors-anywhere
  },
  timeout: 30000,
});
