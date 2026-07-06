import { apiRequest } from './client'

const BASE_URL = '/projects'

// 1. Fetch all published projects
export async function getProjects() {
  try {
    const response = await apiRequest(BASE_URL, {
      method: 'GET',
    })
    return response
  } catch (error) {
    console.error('Error fetching projects:', error)
    throw error
  }
}

// 2. Fetch pending projects (admin only)
export async function getPendingProjects(token) {
  try {
    const response = await apiRequest(`${BASE_URL}/pending`, {
      method: 'GET',
      authToken: token,
    })
    return response
  } catch (error) {
    console.error('Error fetching pending projects:', error)
    throw error
  }
}

// 3. Submit a new project submission (JSON payload)
export async function submitProject(projectData, token) {
  try {
    const response = await apiRequest(BASE_URL, {
      method: 'POST',
      body: JSON.stringify(projectData),
      authToken: token,
    })
    return response
  } catch (error) {
    console.error('Error submitting project:', error)
    throw error
  }
}

// 4. Review (Approve/Reject) a project (admin only)
export async function reviewProject(projectId, reviewData, token) {
  try {
    const response = await apiRequest(`${BASE_URL}/${projectId}/review`, {
      method: 'PATCH',
      body: JSON.stringify(reviewData),
      authToken: token,
    })
    return response
  } catch (error) {
    console.error('Error reviewing project:', error)
    throw error
  }
}

// 5. Add a comment or reply to a project
export async function addProjectComment(projectId, commentData, token) {
  try {
    const response = await apiRequest(`${BASE_URL}/${projectId}/comment`, {
      method: 'PATCH',
      body: JSON.stringify(commentData),
      authToken: token,
    })
    return response
  } catch (error) {
    console.error('Error adding project comment:', error)
    throw error
  }
}

// 6. Add a learning resource to a project
export async function addProjectResource(projectId, resourceData, token) {
  try {
    const response = await apiRequest(`${BASE_URL}/${projectId}/resource`, {
      method: 'PATCH',
      body: JSON.stringify(resourceData),
      authToken: token,
    })
    return response
  } catch (error) {
    console.error('Error adding project resource:', error)
    throw error
  }
}
