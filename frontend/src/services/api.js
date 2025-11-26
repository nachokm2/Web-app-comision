import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

function parseError (error) {
  return new Error(error.response?.data?.message || 'Error inesperado');
}

export async function loginRequest (credentials) {
  try {
    const { data } = await apiClient.post('/auth/login', credentials);
    return data.user;
  } catch (error) {
    throw parseError(error);
  }
}

export async function logoutRequest () {
  try {
    await apiClient.post('/auth/logout');
  } catch (error) {
    throw parseError(error);
  }
}

export async function getCurrentUser () {
  try {
    const { data } = await apiClient.get('/auth/me');
    return data.user;
  } catch (error) {
    throw parseError(error);
  }
}

export async function fetchRecords () {
  try {
    const { data } = await apiClient.get('/records');
    return data.records;
  } catch (error) {
    throw parseError(error);
  }
}

export async function createRecord (payload) {
  try {
    const { data } = await apiClient.post('/records', payload);
    return data.record;
  } catch (error) {
    throw parseError(error);
  }
}

export async function updateRecord (recordId, payload) {
  try {
    const { data } = await apiClient.put(`/records/${recordId}`, payload);
    return data.record;
  } catch (error) {
    throw parseError(error);
  }
}

export async function deleteRecord (recordId) {
  try {
    await apiClient.delete(`/records/${recordId}`);
  } catch (error) {
    throw parseError(error);
  }
}

export async function fetchAdminSchemaSnapshot () {
  try {
    const { data } = await apiClient.get('/admin/schema');
    return data;
  } catch (error) {
    throw parseError(error);
  }
}
