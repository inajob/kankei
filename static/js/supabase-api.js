import { appState } from './state.js';
import { generateId, findNodeByName } from './utils.js';
import { currentUser } from './state.js';

let sb;

export function setSupabaseClient(client) { sb = client; }

export async function loadAllData() {
    var nodesRes = await sb.from('nodes').select('*');
    appState.nodes = {};
    if (nodesRes.data) {
        nodesRes.data.forEach(function(n) { appState.nodes[n.id] = n; });
    }
    var allEdges = [];
    var from = 0;
    var batchSize = 1000;
    while (true) {
        var batch = await sb.from('edges').select('*').range(from, from + batchSize - 1);
        if (batch.error || !batch.data || batch.data.length === 0) break;
        allEdges = allEdges.concat(batch.data);
        if (batch.data.length < batchSize) break;
        from += batchSize;
    }
    console.log('[kankei] loadAllData edges:', allEdges.length);
    appState.edges = allEdges;
}

export async function getOrCreateNode(name) {
    var cleanName = name.trim();
    if (!cleanName) return null;
    var existing = findNodeByName(cleanName);
    if (existing) return existing;
    var res = await sb.from('nodes').insert({
        id: generateId(),
        name: cleanName,
        created_by: currentUser ? currentUser.id : null
    }).select().single();
    if (res.data) {
        appState.nodes[res.data.id] = res.data;
        return res.data;
    }
    return null;
}

export async function createEdgeInternal(nodeId1, nodeId2) {
    if (!nodeId1 || !nodeId2 || nodeId1 === nodeId2) return null;
    var exists = appState.edges.some(function(e) {
        return (e.node1 === nodeId1 && e.node2 === nodeId2) || (e.node1 === nodeId2 && e.node2 === nodeId1);
    });
    if (exists) return null;
    var res = await sb.from('edges').insert({
        id: generateId(),
        node1: nodeId1,
        node2: nodeId2,
        created_by: currentUser ? currentUser.id : null
    }).select().single();
    if (res.error) {
        if (res.error.code === '23505') {
            console.log('[kankei] edge already exists, reloading. node1:', nodeId1, 'node2:', nodeId2);
            await loadAllData();
            console.log('[kankei] after reload, edges count:', appState.edges.length);
            return { ok: true };
        }
        return { error: '接続の作成に失敗しました: ' + res.error.message };
    }
    if (res.data) {
        appState.edges.push(res.data);
        return res.data;
    }
    return null;
}

export async function removeEdge(nodeId1, nodeId2) {
    var res = await sb.from('edges').delete().or('and(node1.eq.' + nodeId1 + ',node2.eq.' + nodeId2 + '),and(node1.eq.' + nodeId2 + ',node2.eq.' + nodeId1 + ')');
    if (res.error) return { error: '接続の削除に失敗しました: ' + res.error.message };
    appState.edges = appState.edges.filter(function(e) {
        return !((e.node1 === nodeId1 && e.node2 === nodeId2) || (e.node1 === nodeId2 && e.node2 === nodeId1));
    });
    return { ok: true };
}

export async function deleteNode(nodeId) {
    if (!appState.nodes[nodeId]) return false;
    var edgesRes = await sb.from('edges').delete().or('node1.eq.' + nodeId + ',node2.eq.' + nodeId);
    if (edgesRes.error) return { error: '接続の削除に失敗しました: ' + edgesRes.error.message };
    var nodeRes = await sb.from('nodes').delete().eq('id', nodeId);
    if (nodeRes.error) return { error: '概念の削除に失敗しました。作成者でない場合は削除権限がありません。' };
    delete appState.nodes[nodeId];
    appState.edges = appState.edges.filter(function(e) { return e.node1 !== nodeId && e.node2 !== nodeId; });
    appState.history = appState.history.filter(function(id) { return id !== nodeId; });
    return { ok: true };
}
