/**
 * Supabase Storage Service
 * Handles file uploads to Supabase Storage buckets
 * Replaces local file system storage
 * 
 * SRS Reference: FR-DKP-003, NFR-DKP-005
 */

const { createClient } = require("@supabase/supabase-js");

let supabaseClient;

/**
 * Initialize Supabase client
 * Should be called once during app startup
 */
function initSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables");
  }

  supabaseClient = createClient(supabaseUrl, supabaseKey);
  console.log("✅ Supabase Storage client initialized");
  return supabaseClient;
}

/**
 * Get Supabase client instance
 */
function getSupabaseClient() {
  if (!supabaseClient) {
    initSupabase();
  }
  return supabaseClient;
}

/**
 * Upload file to Supabase Storage
 * @param {Buffer} fileBuffer - File content as buffer
 * @param {string} bucketName - Bucket name (e.g., 'documents', 'media')
 * @param {string} filePath - Path inside bucket (e.g., 'doc-123/filename.pdf')
 * @param {object} options - Upload options
 * @returns {Promise<{path: string, url: string}>}
 */
async function uploadFile(fileBuffer, bucketName, filePath, options = {}) {
  try {
    const client = getSupabaseClient();
    const { contentType = "application/octet-stream" } = options;

    const { data, error } = await client.storage
      .from(bucketName)
      .upload(filePath, fileBuffer, {
        contentType,
        upsert: options.upsert || false,
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Generate public URL for the uploaded file
    const { data: urlData } = client.storage.from(bucketName).getPublicUrl(filePath);

    return {
      path: data.path,
      url: urlData.publicUrl,
      bucket: bucketName,
    };
  } catch (error) {
    throw new Error(`Failed to upload file to Supabase Storage: ${error.message}`);
  }
}

/**
 * Delete file from Supabase Storage
 * @param {string} bucketName - Bucket name
 * @param {string} filePath - Path inside bucket
 * @returns {Promise<void>}
 */
async function deleteFile(bucketName, filePath) {
  try {
    const client = getSupabaseClient();

    const { error } = await client.storage.from(bucketName).remove([filePath]);

    if (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }

    console.log(`✓ Deleted file: ${bucketName}/${filePath}`);
  } catch (error) {
    throw new Error(`Failed to delete file from Supabase Storage: ${error.message}`);
  }
}

/**
 * Get public URL for a file
 * @param {string} bucketName - Bucket name
 * @param {string} filePath - Path inside bucket
 * @returns {string} Public URL
 */
function getPublicUrl(bucketName, filePath) {
  const client = getSupabaseClient();
  const { data } = client.storage.from(bucketName).getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Download file from Supabase Storage
 * @param {string} bucketName - Bucket name
 * @param {string} filePath - Path inside bucket
 * @returns {Promise<Buffer>}
 */
async function downloadFile(bucketName, filePath) {
  try {
    const client = getSupabaseClient();

    const { data, error } = await client.storage
      .from(bucketName)
      .download(filePath);

    if (error) {
      throw new Error(`Download failed: ${error.message}`);
    }

    return data;
  } catch (error) {
    throw new Error(`Failed to download file from Supabase Storage: ${error.message}`);
  }
}

module.exports = {
  initSupabase,
  getSupabaseClient,
  uploadFile,
  deleteFile,
  getPublicUrl,
  downloadFile,
};
