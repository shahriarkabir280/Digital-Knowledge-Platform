export const repositoryModuleReady = true

export async function loadRepositoryItems() {
	await new Promise((resolve) => setTimeout(resolve, 450))
	return [
		{ id: 'repo-1', title: 'Digital Archive Policy', type: 'PDF' },
		{ id: 'repo-2', title: 'Metadata Guidelines', type: 'DOCX' },
	]
}
