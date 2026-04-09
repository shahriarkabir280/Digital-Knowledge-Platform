export const searchModuleReady = true

export async function runSearch(query) {
	await new Promise((resolve) => setTimeout(resolve, 350))

	if (!query.trim()) {
		return []
	}

	return [
		{ id: 'hit-1', title: `Result for ${query}`, source: 'Repository' },
		{ id: 'hit-2', title: `${query} - catalog entry`, source: 'Library' },
	]
}
