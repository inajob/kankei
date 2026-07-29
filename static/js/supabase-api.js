import { sb } from './shared-supabase.js';
import { appState } from './state.js';
import { generateId, findNodeByName } from './utils.js';
import { currentUser } from './state.js';

async function paginateFetch(table) {
    var pageSize = 1000;
    var from = 0;
    var allItems = [];
    while (true) {
        var res = await sb.from(table).select('*').order('id').range(from, from + pageSize - 1);
        if (res.error || !res.data || res.data.length === 0) break;
        allItems = allItems.concat(res.data);
        if (res.data.length < pageSize) break;
        from += pageSize;
    }
    return allItems;
}

export async function loadAllData() {
    var allNodes = await paginateFetch('nodes');
    appState.nodes = {};
    allNodes.forEach(function(n) { appState.nodes[n.id] = n; });
}

export async function fetchAllNodes() {
    return await paginateFetch('nodes');
}

export async function fetchAllEdges() {
    return await paginateFetch('edges');
}

export async function loadIsolatedNodeIds() {
    var res = await sb.rpc('get_isolated_node_ids');
    return new Set(res.data || []);
}

export async function loadEdgesForNodeIds(nodeIds, label) {
    if (!nodeIds || nodeIds.length === 0) { console.log('[' + label + '] empty nodeIds'); return; }
    console.log('[' + label + '] querying ' + nodeIds.length + ' nodeIds:', nodeIds.slice(0, 3) + (nodeIds.length > 3 ? '...' : ''));
    var existingIds = new Set(appState.edges.map(function(e) { return e.id; }));
    console.log('[' + label + '] existing edges before: ' + existingIds.size);
    for (var i = 0; i < nodeIds.length; i += 50) {
        var chunk = nodeIds.slice(i, i + 50);
        var ids = chunk.map(function(id) { return id; }).join(',');
        var res = await sb.from('edges').select('*').or('node1.in.(' + ids + '),node2.in.(' + ids + ')');
        if (res.error) {
            console.error('[' + label + '] Supabase error:', res.error);
        }
        if (res.data) {
            console.log('[' + label + '] fetched ' + res.data.length + ' edges from Supabase');
            res.data.forEach(function(e) {
                if (!existingIds.has(e.id)) {
                    appState.edges.push(e);
                    existingIds.add(e.id);
                }
            });
        } else {
            console.log('[' + label + '] no data returned');
        }
    }
    console.log('[' + label + '] appState.edges now: ' + appState.edges.length);
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
    var res = await sb.from('edges').insert({
        id: generateId(),
        node1: nodeId1,
        node2: nodeId2,
        created_by: currentUser ? currentUser.id : null
    }).select().single();
    if (res.error) {
        if (res.error.code === '23505') {
            return { ok: true, exists: true };
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
