export const libraryModuleReady = true

export async function loadLibraryItems() {
	await new Promise((resolve) => setTimeout(resolve, 500))
	return [
		{ id: 'book-1', title: 'Information Architecture', status: 'Available' },
		{ id: 'book-2', title: 'Knowledge Systems Design', status: 'Issued' },
	]
}
