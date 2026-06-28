function sameDocumentOwner(document, user) {
  if (!document || !user) {
    return false;
  }

  return String(document.uploader_id) === String(user.id);
}

module.exports = {
  sameDocumentOwner,
};