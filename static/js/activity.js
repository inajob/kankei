import { appState } from './state.js';

export function recordActivity(nodeId, timestamp) {
    if (!nodeId || !timestamp) return;
    if (!appState.lastActivityAt[nodeId] || timestamp > appState.lastActivityAt[nodeId]) {
        appState.lastActivityAt[nodeId] = timestamp;
    }
}

export function recordEdgeActivity(edge) {
    if (!edge) return;
    recordActivity(edge.node1, edge.created_at);
    recordActivity(edge.node2, edge.created_at);
}

export function clearActivity(nodeId) {
    if (!nodeId) return;
    delete appState.lastActivityAt[nodeId];
}
