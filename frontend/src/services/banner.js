import api from './api';
export const bannerService = {
  getAllBanners: () => api.get('/banners/active'),
};
export default bannerService;