import axios from 'axios';

const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
const apiClient = axios.create({
  baseURL: apiBase,
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

export async function fetchProgramsCatalog () {
  try {
    const { data } = await apiClient.get('/records/programs');
    return data.programs;
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

export async function uploadBulkRecords (file) {
  const formData = new FormData();
  formData.append('file', file);
  try {
    const { data } = await apiClient.post('/records/bulk', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
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

export async function requestPasswordReset (username) {
  try {
    await apiClient.post('/auth/password-reset/request', { username });
  } catch (error) {
    throw parseError(error);
  }
}

export async function confirmPasswordReset (payload) {
  try {
    await apiClient.post('/auth/password-reset/confirm', payload);
  } catch (error) {
    throw parseError(error);
  }
}

export async function fetchAdminComisiones () {
  try {
    const { data } = await apiClient.get('/admin/comisiones');
    return data.records;
  } catch (error) {
    throw parseError(error);
  }
}

export async function createStudentEntry (payload) {
  try {
    const { data } = await apiClient.post('/admin/students', payload);
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

function extractFilename (disposition) {
  if (!disposition) return null;
  const match = /filename\*?=([^;]+)/i.exec(disposition);
  if (!match) return null;
  const value = match[1].trim().replace(/^UTF-8''/, '');
  return decodeURIComponent(value.replace(/"/g, ''));
}

export async function downloadRecordCsv (recordId) {
  try {
    const response = await apiClient.get(`/records/${recordId}/export`, { responseType: 'blob' });
    const filename = extractFilename(response.headers['content-disposition']) || `comision-${recordId}.csv`;
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    throw parseError(error);
  }
}
