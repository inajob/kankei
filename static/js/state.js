export let currentUser = null;
export let currentUserRole = 'user';
export let userCache = {};

export let appState = {
    nodes: {},
    edges: [],
    focusedNodeId: null,
    history: [],
    viewMode: 'list'
};

export let activeGlobalSearchIndex = -1;
export let activeConnectSearchIndex = -1;
export let animationFrameId = null;
export let graphNodes = [];
export let draggedNode = null;

export function setCurrentUser(user) { currentUser = user; }
export function setCurrentUserRole(role) { currentUserRole = role; }
export function setUserCacheEntry(id, name) { userCache[id] = name; }
export function setActiveGlobalSearchIndex(i) { activeGlobalSearchIndex = i; }
export function setActiveConnectSearchIndex(i) { activeConnectSearchIndex = i; }
export function setAnimationFrameId(id) { animationFrameId = id; }
export function setGraphNodes(n) { graphNodes = n; }
export function setDraggedNode(n) { draggedNode = n; }
export function setAppState(s) { appState = s; }

export function resetAppState() {
    appState = { nodes: {}, edges: [], focusedNodeId: null, history: [], viewMode: 'list' };
    currentUser = null;
    currentUserRole = 'user';
    activeGlobalSearchIndex = -1;
    activeConnectSearchIndex = -1;
}
