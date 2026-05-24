import axios from 'axios';
import { auth } from '../lib/firebase.js';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;

function withAssetUrl(item) {
  // Data URLs are already complete; old /uploads paths still get normalized.
  if (!item || !item.imageUrl || item.imageUrl.startsWith('http') || item.imageUrl.startsWith('data:')) {
    return item;
  }
  return { ...item, imageUrl: `${BASE_URL}${item.imageUrl}` };
}

async function getAuthHeader() {
  const user = auth.currentUser;
  if (!user) return {};
  // Firebase ID tokens authorize protected Express routes.
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

export async function syncUser() {
  const headers = await getAuthHeader();
  const res = await axios.post(`${BASE_URL}/api/users/sync`, {}, { headers });
  return res.data;
}

export async function requestAdminAccess(code) {
  const headers = await getAuthHeader();
  const res = await axios.post(`${BASE_URL}/api/users/admin/access`, { code }, { headers });
  return res.data;
}

export async function getUserProfile(uid) {
  const res = await axios.get(`${BASE_URL}/api/users/${uid}`);
  return res.data;
}

export async function updateUserProfile(uid, updates) {
  const headers = await getAuthHeader();
  const res = await axios.patch(`${BASE_URL}/api/users/${uid}`, updates, { headers });
  return res.data;
}

export async function getNotifications(uid) {
  const headers = await getAuthHeader();
  const res = await axios.get(`${BASE_URL}/api/users/${uid}/notifications`, { headers });
  return res.data;
}

export async function markNotificationsRead(uid) {
  const headers = await getAuthHeader();
  const res = await axios.patch(`${BASE_URL}/api/users/${uid}/notifications/read`, {}, { headers });
  return res.data;
}

export async function submitComplaint(formData) {
  const headers = await getAuthHeader();
  const res = await axios.post(`${BASE_URL}/api/complaints`, formData, {
    headers: { ...headers, 'Content-Type': 'multipart/form-data' }
  });
  return withAssetUrl(res.data);
}

export async function analyzeIssueImage(file) {
  const headers = await getAuthHeader();
  const formData = new FormData();
  formData.append('image', file);
  const res = await axios.post(`${BASE_URL}/api/complaints/analyze`, formData, {
    headers: { ...headers, 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
}

export async function getComplaints(filters = {}) {
  const res = await axios.get(`${BASE_URL}/api/complaints`, { params: filters });
  return res.data.map(withAssetUrl);
}

export async function getDuplicateComplaints(filters = {}) {
  const res = await axios.get(`${BASE_URL}/api/complaints/duplicates`, { params: filters });
  return res.data;
}

export async function getComplaintById(id) {
  const res = await axios.get(`${BASE_URL}/api/complaints/${id}`);
  return withAssetUrl(res.data);
}

export async function updateComplaintStatus(id, status) {
  const headers = await getAuthHeader();
  const res = await axios.patch(`${BASE_URL}/api/complaints/${id}/status`, { status }, { headers });
  return withAssetUrl(res.data);
}

export async function updateComplaintAssignment(id, assignment) {
  const headers = await getAuthHeader();
  const res = await axios.patch(`${BASE_URL}/api/complaints/${id}/assignment`, assignment, { headers });
  return withAssetUrl(res.data);
}

export async function updateResolutionProof(id, formData) {
  const headers = await getAuthHeader();
  const res = await axios.patch(`${BASE_URL}/api/complaints/${id}/resolution`, formData, {
    headers: { ...headers, 'Content-Type': 'multipart/form-data' }
  });
  return withAssetUrl(res.data);
}

export async function voteOnComplaint(id) {
  const headers = await getAuthHeader();
  const res = await axios.post(`${BASE_URL}/api/complaints/${id}/vote`, {}, { headers });
  return withAssetUrl(res.data);
}

export async function getComments(issueId) {
  const res = await axios.get(`${BASE_URL}/api/complaints/${issueId}/comments`);
  return res.data;
}

export async function addComment(issueId, text, userName) {
  const headers = await getAuthHeader();
  const res = await axios.post(`${BASE_URL}/api/complaints/${issueId}/comments`, { text, userName }, { headers });
  return res.data;
}

export async function getHeatmapData() {
  const res = await axios.get(`${BASE_URL}/api/analytics/heatmap`);
  return res.data;
}

export async function getAnalyticsSummary() {
  const res = await axios.get(`${BASE_URL}/api/analytics/summary`);
  return res.data;
}

export async function getWardAnalytics() {
  const res = await axios.get(`${BASE_URL}/api/analytics/wards`);
  return res.data;
}
