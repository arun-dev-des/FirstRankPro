// Thin wrapper around Framer plugin storage with safe fallbacks
// Docs: https://www.framer.com/developers/storing-data

type FramerGlobal = {
	setPluginData: (key: string, value: string | null) => Promise<void>
	getPluginData: (key: string) => Promise<string | null>
	getPluginDataKeys?: () => Promise<string[]>
	getNode?: (nodeId: string) => Promise<{
		setPluginData: (key: string, value: string | null) => Promise<void>
		getPluginData: (key: string) => Promise<string | null>
		getPluginDataKeys?: () => Promise<string[]>
	} | null>
}

function getFramer(): FramerGlobal | null {
	// @ts-ignore - framer is injected in plugin iframe
	const framerGlobal = (typeof window !== 'undefined' ? (window as any).framer : null) as FramerGlobal | null
	return framerGlobal || null
}

// Project-level storage
export async function setProjectData(key: string, value: string): Promise<void> {
	const framer = getFramer()
	if (framer) {
		await framer.setPluginData(key, value)
		return
	}
	// Dev/local fallback
	try {
		localStorage.setItem(key, value)
	} catch {}
}

export async function getProjectData(key: string): Promise<string | null> {
	const framer = getFramer()
	if (framer) {
		return await framer.getPluginData(key)
	}
	try {
		return localStorage.getItem(key)
	} catch {
		return null
	}
}

// Node-level storage (requires a valid nodeId from host)
export async function setNodeData(nodeId: string, key: string, value: string): Promise<void> {
	const framer = getFramer()
	if (!framer || !framer.getNode) {
		throw new Error('Framer node API not available in this environment')
	}
	const node = await framer.getNode(nodeId)
	if (!node) throw new Error('Node not found')
	await node.setPluginData(key, value)
}

export async function getNodeData(nodeId: string, key: string): Promise<string | null> {
	const framer = getFramer()
	if (!framer || !framer.getNode) {
		throw new Error('Framer node API not available in this environment')
	}
	const node = await framer.getNode(nodeId)
	if (!node) return null
	return await node.getPluginData(key)
}


