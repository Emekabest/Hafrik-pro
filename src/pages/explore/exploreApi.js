import apiClient from '../../api/apiClient';

const BASE = '/explore';

export const fetchCities = (params = {}) =>
  apiClient.get(`${BASE}/cities.php`, { params });

export const fetchCityHome = (slug, limit = 10) =>
  apiClient.get(`${BASE}/city_home.php`, { params: { city: slug, limit } });

export const fetchPlaces = (city, type, params = {}) =>
  apiClient.get(`${BASE}/places.php`, { params: { city, type, ...params } });

export const fetchServices = (city, type, params = {}) =>
  apiClient.get(`${BASE}/services.php`, { params: { city, type, verified: 1, ...params } });
