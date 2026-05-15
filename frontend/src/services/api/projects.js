import { apiRequest } from './client'

const BASE_URL = '/projects'

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

export async function getProjectById(projectId) {
  try {
    const response = await apiRequest(`${BASE_URL}/${projectId}`, {
      method: 'GET',
    })
    return response
  } catch (error) {
    console.error('Error fetching project:', error)
    throw error
  }
}

export async function submitProject(projectData, token) {
  try {
    const formData = new FormData()

    formData.append('title', projectData.title)
    formData.append('description', projectData.description)
    formData.append('category', projectData.category)
    formData.append('submittedBy', projectData.submittedBy)

    if (projectData.tags && Array.isArray(projectData.tags)) {
      projectData.tags.forEach((tag) => {
        formData.append('tags[]', tag)
      })
    }

    if (projectData.multimedia && Array.isArray(projectData.multimedia)) {
      projectData.multimedia.forEach((file) => {
        formData.append('multimedia', file)
      })
    }

    const response = await apiRequest(BASE_URL, {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type for FormData - browser will set it with boundary
      },
      authToken: token,
    })
    return response
  } catch (error) {
    console.error('Error submitting project:', error)
    throw error
  }
}

export async function submitReview(reviewData, token) {
  try {
    const response = await apiRequest(`${BASE_URL}/${reviewData.projectId}/reviews`, {
      method: 'POST',
      body: JSON.stringify({
        rating: reviewData.rating,
        text: reviewData.text,
        reviewedBy: reviewData.reviewedBy,
      }),
      authToken: token,
    })
    return response
  } catch (error) {
    console.error('Error submitting review:', error)
    throw error
  }
}

export async function getProjectReviews(projectId) {
  try {
    const response = await apiRequest(`${BASE_URL}/${projectId}/reviews`, {
      method: 'GET',
    })
    return response
  } catch (error) {
    console.error('Error fetching project reviews:', error)
    throw error
  }
}

export async function getAchievements(token) {
  try {
    const response = await apiRequest('/achievements', {
      method: 'GET',
      authToken: token,
    })
    return response
  } catch (error) {
    console.error('Error fetching achievements:', error)
    throw error
  }
}

export async function updateProject(projectId, projectData, token) {
  try {
    const response = await apiRequest(`${BASE_URL}/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(projectData),
      authToken: token,
    })
    return response
  } catch (error) {
    console.error('Error updating project:', error)
    throw error
  }
}

export async function deleteProject(projectId, token) {
  try {
    const response = await apiRequest(`${BASE_URL}/${projectId}`, {
      method: 'DELETE',
      authToken: token,
    })
    return response
  } catch (error) {
    console.error('Error deleting project:', error)
    throw error
  }
}
