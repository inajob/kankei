import { appState } from './state.js';

export function generateId() {
    return 'id_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

export function normalizeName(name) { return name.trim(); }

export function findNodeByName(name) {
    var normalized = normalizeName(name).toLowerCase();
    return Object.values(appState.nodes).find(function(n) { return n.name.toLowerCase() === normalized; });
}

export function getConnectedNodes(nodeId) {
    if (!nodeId) return [];
    var connectedIds = new Set();
    appState.edges.forEach(function(e) {
        if (e.node1 === nodeId) connectedIds.add(e.node2);
        if (e.node2 === nodeId) connectedIds.add(e.node1);
    });
    return Array.from(connectedIds)
        .map(function(id) { return appState.nodes[id]; })
        .filter(Boolean)
        .sort(function(a, b) { return a.name.localeCompare(b.name, 'ja'); });
}

export function isNodeIsolated(nodeId) {
    var matching = appState.edges.filter(function(e) { return e.node1 === nodeId || e.node2 === nodeId; });
    return matching.length === 0;
}

export function setFocusedNode(nodeId, pushHistory) {
    if (!appState.nodes[nodeId]) return;
    if (pushHistory && appState.focusedNodeId && appState.focusedNodeId !== nodeId) {
        if (appState.history[appState.history.length - 1] !== appState.focusedNodeId) {
            appState.history.push(appState.focusedNodeId);
        }
    }
    appState.focusedNodeId = nodeId;
    var newName = encodeURIComponent(appState.nodes[nodeId].name);
    var newHash = '#' + newName;
    if (window.location.hash !== newHash) {
        history.pushState(null, '', newHash);
    }
}

export function highlightMatch(text, query) {
    var idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return escapeHtml(text);
    return escapeHtml(text.substring(0, idx)) + '<span class="text-green-600 font-bold underline">' + escapeHtml(text.substring(idx, idx + query.length)) + '</span>' + escapeHtml(text.substring(idx + query.length));
}

export function escapeHtml(str) {
    return str.replace(/[&<>"']/g, function(m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
}

export function hideDropdown(id) {
    var el = document.getElementById(id);
    if (el) el.classList.add('hidden');
}

export function openDrawer() {
    document.getElementById('allNodesDrawer').classList.remove('hidden');
}

export function closeDrawer() {
    document.getElementById('allNodesDrawer').classList.add('hidden');
}

export function highlightAutocompleteItem(items, activeIndex) {
    items.forEach(function(item, idx) {
        item.classList.toggle('bg-green-100', idx === activeIndex);
    });
}
