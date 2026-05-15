export const DEFAULT_FILTERS = {
  category: '',
  course: '',
  department: '',
  type: '',
  year: '',
  tags: '',
}

export function applyLibraryFilters(items, filters) {
  const categoryQuery = String(filters.category || '').trim().toLowerCase()
  const queryTagList = String(filters.tags || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)

  return items.filter((item) => {
    const normalizedTags = item.tags.map((entry) => String(entry).toLowerCase())
    const categoryMatch =
      !categoryQuery || normalizedTags.some((entry) => entry.includes(categoryQuery))
    const courseMatch = !filters.course || item.course === filters.course
    const departmentMatch = !filters.department || item.department === filters.department
    const typeMatch = !filters.type || item.type === filters.type
    const yearMatch = !filters.year || String(item.year) === String(filters.year)
    const tagsMatch =
      queryTagList.length === 0 ||
      queryTagList.every((tag) =>
        normalizedTags.some((entry) => entry.includes(tag)),
      )

    return categoryMatch && courseMatch && departmentMatch && typeMatch && yearMatch && tagsMatch
  })
}

export function searchResources(items, query) {
  if (!query.trim()) {
    return items
  }

  const lowered = query.toLowerCase()
  return items.filter((item) => {
    return [item.title, item.author, item.department, item.course, item.tags.join(' ')].some((value) =>
      String(value).toLowerCase().includes(lowered),
    )
  })
}

export function collectFilterOptions(items) {
  const uniq = (values) => Array.from(new Set(values)).sort((a, b) => String(a).localeCompare(String(b)))

  return {
    courses: uniq(items.map((item) => item.course)),
    departments: uniq(items.map((item) => item.department)),
    fileTypes: uniq(items.map((item) => item.type)),
    years: uniq(items.map((item) => item.year)).reverse(),
  }
}
