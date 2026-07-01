const db = require('../../db');

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeKeywords(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function parseResourceId(resourceId) {
  if (resourceId === null || resourceId === undefined) {
    return null;
  }

  if (typeof resourceId === 'number') {
    return Number.isInteger(resourceId) && resourceId > 0 ? resourceId : null;
  }

  if (typeof resourceId === 'string') {
    const trimmed = resourceId.trim();
    if (!trimmed) {
      return null;
    }

    const match = trimmed.match(/(\d+)/);
    if (!match) {
      return null;
    }

    const parsed = Number(match[1]);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  return null;
}

async function createResourceRecord({
  resourceType,
  uploaderId,
  title,
  description,
  filePath,
  format,
  state = 'pending',
  accessTier = 'REGISTERED',
  metadata = {},
}) {
  const normalizedTitle = normalizeString(title) || 'Untitled Resource';
  const normalizedDescription = normalizeString(description);
  const normalizedAuthor = normalizeString(metadata.author);
  const normalizedDepartment = normalizeString(metadata.department);
  const normalizedCourse = normalizeString(metadata.course);
  // Ensure year is a number, fallback to current year
  const normalizedYear = metadata.publishedYear || metadata.year;
  const yearValue = normalizedYear ? Number(normalizedYear) : new Date().getFullYear();
  const keywords = normalizeKeywords(metadata.keywords);
  const rawType = normalizeString(metadata.resourceCategory) || normalizeString(metadata.type) || resourceType;
  console.log('[resourceStorage.createResourceRecord] metadata:', metadata);
  console.log('[resourceStorage.createResourceRecord] rawType:', rawType, 'resourceType:', resourceType);
  console.log('[resourceStorage.createResourceRecord] department:', normalizedDepartment, 'course:', normalizedCourse, 'year:', yearValue);

  if (resourceType === 'research') {
    const [resourceId] = await db('research_resources').insert({
      uploader_id: uploaderId,
      title: normalizedTitle,
      resource_type: rawType,
      format,
      file_path: filePath,
      version: 1,
      state,
      access_tier: accessTier,
      author: normalizedAuthor,
      abstract: normalizedDescription,
      keywords: JSON.stringify(keywords),
      language: normalizeString(metadata.language) || 'English',
      published_year: yearValue,
      department: normalizedDepartment || null,
      course: normalizedCourse || null,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    }).returning('id');

    return {
      id: resourceId,
      table: 'research_resources',
      resourceType: 'research',
      title: normalizedTitle,
      type: rawType,
      state,
      accessTier,
    };
  }

  const [resourceId] = await db('academic_resources').insert({
    uploader_id: uploaderId,
    title: normalizedTitle,
    resource_type: rawType,
    format,
    file_path: filePath,
    version: 1,
    state,
    access_tier: accessTier,
    author: normalizedAuthor,
    abstract: normalizedDescription,
    keywords: JSON.stringify(keywords),
    language: normalizeString(metadata.language) || 'English',
    published_year: yearValue,
    department: normalizedDepartment || null,
    course: normalizedCourse || null,
    created_at: db.fn.now(),
    updated_at: db.fn.now(),
  }).returning('id');

  return {
    id: resourceId,
    table: 'academic_resources',
    resourceType: 'academic',
    title: normalizedTitle,
    type: rawType,
    state,
    accessTier,
  };
}

async function updateResourceState(resourceType, resourceId, state) {
  const table = resourceType === 'research' ? 'research_resources' : 'academic_resources';
  return db(table).where({ id: resourceId }).update({ state, updated_at: db.fn.now() }).returning('*');
}

async function getResourceById(resourceType, resourceId) {
  const table = resourceType === 'research' ? 'research_resources' : 'academic_resources';
  return db(table).where({ id: resourceId }).first();
}

async function deleteResource(resourceType, resourceId) {
  const table = resourceType === 'research' ? 'research_resources' : 'academic_resources';
  return db(table).where({ id: resourceId }).delete();
}

async function findResourceById(resourceId) {
  const id = parseResourceId(resourceId);

  if (!id) {
    return null;
  }

  const researchDocument = await db('research_resources').where({ id }).first();
  if (researchDocument) {
    return {
      table: 'research_resources',
      resourceType: 'research',
      document: researchDocument,
    };
  }

  const academicDocument = await db('academic_resources').where({ id }).first();
  if (academicDocument) {
    return {
      table: 'academic_resources',
      resourceType: 'academic',
      document: academicDocument,
    };
  }

  return null;
}

module.exports = {
  createResourceRecord,
  updateResourceState,
  getResourceById,
  deleteResource,
  findResourceById,
  parseResourceId,
};
