-- Add resource_category column to documents table to separate research papers from academic resources
ALTER TABLE documents 
ADD COLUMN resource_category TEXT DEFAULT 'research-paper';

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_documents_resource_category ON documents(resource_category);

-- Update existing documents to be research-paper (assumes existing docs are research)
UPDATE documents SET resource_category = 'research-paper' WHERE resource_category IS NULL;
