import { appState } from './state.js';
import { showToast } from './toast.js';
import { loadAllData } from './supabase-api.js';

let sb;

export function setSupabaseClient(client) { sb = client; }

export function subscribeRealtime() {
    console.log('[kankei] subscribeRealtime called');

    sb.channel('db-changes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'nodes' }, function(payload) {
            console.log('[kankei] realtime INSERT nodes', payload);
            var n = payload.new;
            if (!appState.nodes[n.id]) {
                appState.nodes[n.id] = n;
                var currentUserId = window._getCurrentUserId && window._getCurrentUserId();
                if (n.created_by !== currentUserId) {
                    showToast('新しい概念: ' + n.name, 'info');
                }
                window._renderAll && window._renderAll();
            }
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'nodes' }, function(payload) {
            console.log('[kankei] realtime DELETE nodes', payload);
            var old = payload.old;
            if (old && old.id && appState.nodes[old.id]) {
                var name = appState.nodes[old.id].name;
                delete appState.nodes[old.id];
                appState.edges = appState.edges.filter(function(e) { return e.node1 !== old.id && e.node2 !== old.id; });
                var currentUserId = window._getCurrentUserId && window._getCurrentUserId();
                if (old.created_by !== currentUserId) {
                    showToast('削除: ' + name, 'warn');
                }
                window._renderAll && window._renderAll();
            }
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'edges' }, function(payload) {
            console.log('[kankei] realtime INSERT edges', payload);
            var e = payload.new;
            var alreadyExists = appState.edges.some(function(ex) { return ex.id === e.id; });
            if (!alreadyExists) {
                appState.edges.push(e);
                var currentUserId = window._getCurrentUserId && window._getCurrentUserId();
                if (e.created_by !== currentUserId) {
                    var n1 = appState.nodes[e.node1];
                    var n2 = appState.nodes[e.node2];
                    if (n1 && n2) {
                        showToast('接続: ' + n1.name + ' ↔ ' + n2.name, 'info');
                    }
                }
                window._renderAll && window._renderAll();
            }
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'edges' }, function(payload) {
            console.log('[kankei] realtime DELETE edges', payload);
            var old = payload.old;
            if (old && old.id) {
                appState.edges = appState.edges.filter(function(e) { return e.id !== old.id; });
                window._renderAll && window._renderAll();
            }
        })
        .subscribe(function(status) {
            console.log('[kankei] realtime subscribe status:', status);
            if (status === 'SUBSCRIBED') {
                console.log('[kankei] realtime connected successfully');
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                console.error('[kankei] realtime channel error/reconnect:', status);
                loadAllData().then(function() { window._renderAll && window._renderAll(); });
            }
        });
}
