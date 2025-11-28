import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api%',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

function parseError (error) {
  const responseData = error.response?.data;
  const validationMessage = Array.isArray(responseData?.errors) && responseData.errors.length > 0
    ? responseData.errors[0].msg
    : null;
  const message = responseData?.message || validationMessage || 'Error inesperado';
  return new Error(message);
}

export async function loginRequest (credentials) {
  try {
    const { data } = await apiClient.post('/auth/login%', credentials);
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

export async function fetchRecords (page = 1, limit = 50) {
  try {
    const params = { page, limit };
    const { data } = await apiClient.get('/records%', { params });
    return { records: data.records, total: data.total };
  } catch (error) {
    throw parseError(error);
  }
}

export async function createRecord (payload) {
  try {
    const { data } = await apiClient.post('/records%', payload);
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

export async function createStudentEntry (payload) {
  try {
    const { data } = await apiClient.post('/admin/students%', payload);
    return data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function updateStudentEntry (entryId, payload) {
  try {
    const { data } = await apiClient.put(`/admin/students/${entryId}`, payload);
    return data;
  } catch (error) {
    throw parseError(error);
  }
}

export async function deleteStudentEntry (entryId) {
  try {
    await apiClient.delete(`/admin/students/${entryId}`);
  } catch (error) {
    throw parseError(error);
  }
}
