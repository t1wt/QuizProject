const API_URL = '/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Ошибка запроса');
  }

  return data;
}

export function registerUser(payload) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function loginUser(payload) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getCurrentUser(token) {
  return request('/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function getOrganizerQuizzes(token) {
  return request('/quizzes', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function getQuiz(token, quizId) {
  return request(`/quizzes/${quizId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function createQuiz(token, payload) {
  return request('/quizzes', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export function updateQuiz(token, quizId, payload) {
  return request(`/quizzes/${quizId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export function updateQuizStatus(token, quizId, status) {
  return request(`/quizzes/${quizId}/status`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });
}

export function createSession(token, quizId) {
  return request('/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ quizId }),
  });
}

export function getSession(roomCode) {
  return request(`/sessions/${roomCode}`);
}

export function joinSession(roomCode, name) {
  return request(`/sessions/${roomCode}/join`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export function joinSessionAsUser(token, roomCode, name) {
  return request(`/sessions/${roomCode}/join`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name }),
  });
}

export function startSession(token, roomCode) {
  return request(`/sessions/${roomCode}/start`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function nextQuestion(token, roomCode) {
  return request(`/sessions/${roomCode}/next`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function submitAnswer(roomCode, participantId, answerIds) {
  return request(`/sessions/${roomCode}/answers`, {
    method: 'POST',
    body: JSON.stringify({ participantId, answerIds }),
  });
}

export function getResults(token) {
  return request('/results', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function getResult(token, roomCode) {
  return request(`/results/${roomCode}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
