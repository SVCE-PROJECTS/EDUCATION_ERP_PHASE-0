import api from './api';

export const analyticsService = {
  async getOverview() {
    const response = await api.get('/analytics/overview');
    return response.data;
  },
};
