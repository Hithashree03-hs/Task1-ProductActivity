import axios from 'axios';

const API_BASE_URL = 'http://10.0.2.2:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;