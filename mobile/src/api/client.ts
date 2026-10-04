import axios from 'axios';

const API_BASE_URL = 'https://task1-productactivity.onrender.com/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;