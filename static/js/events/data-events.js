import { sb } from '../shared-supabase.js';
import { appState, currentUser, currentUserRole } from '../state.js';
import { setFocusedNode } from '../utils.js';
import { deleteNode } from '../supabase-api.js';
import { renderAll } from '../render.js';
import { showToast } from '../toast.js';

let listenersSetup = false;

export function setupDataListeners() {
    if (listenersSetup) return;
    listenersSetup = true;

    document.getElementById('deleteFocusedConceptBtn').onclick = function() {
        if (!appState.focusedNodeId) return;
        var node = appState.nodes[appState.focusedNodeId];
        if (confirm('概念「' + node.name + '」を削除してもよろしいですか？\n（この概念に紐づく接続も全て解除されます）')) {
            deleteNode(node.id).then(function(result) {
                if (result && result.error) {
                    showToast(result.error, 'error');
                    return;
                }
                if (appState.focusedNodeId === node.id) {
                    var remainingIds = Object.keys(appState.nodes);
                    if (remainingIds.length > 0) {
                        setFocusedNode(remainingIds[remainingIds.length - 1], false);
                    } else {
                        appState.focusedNodeId = null;
                    }
                }
                renderAll();
                showToast('削除しました', 'success');
            });
        }
    };

    var dataModal = document.getElementById('dataModal');
    document.getElementById('toggleDataModalBtn').onclick = function() { dataModal.classList.remove('hidden'); };
    document.getElementById('closeDataModalBtn').onclick = function() { dataModal.classList.add('hidden'); };
    document.getElementById('dataModalDoneBtn').onclick = function() { dataModal.classList.add('hidden'); };

    document.getElementById('exportJsonBtn').onclick = async function() {
        try {
            var m = await import('../supabase-api.js');
            var nodes = await m.fetchAllNodes();
            var edges = await m.fetchAllEdges();
            var data = { nodes: nodes, edges: edges };
            var dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
            var a = document.createElement('a');
            a.setAttribute('href', dataStr);
            a.setAttribute('download', 'concept_network_' + new Date().toISOString().slice(0, 10) + '.json');
            document.body.appendChild(a);
            a.click();
            a.remove();
            showToast('エクスポート完了', 'success');
        } catch (err) {
            showToast('エクスポート失敗: ' + err.message, 'error');
        }
    };

    document.getElementById('importJsonInput').addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = async function(event) {
            try {
                var data = JSON.parse(event.target.result);
                var nodesArr = data.nodes || [];
                var edgesArr = data.edges || [];
                if (Array.isArray(nodesArr)) {
                    var nodeInserts = nodesArr.map(function(n) {
                        return { id: n.id, name: n.name, created_at: n.created_at || new Date().toISOString(), created_by: n.created_by || null };
                    });
                    await sb.from('nodes').upsert(nodeInserts);
                }
                if (Array.isArray(edgesArr)) {
                    var edgeInserts = edgesArr.map(function(e) {
                        return { id: e.id, node1: e.node1, node2: e.node2, created_by: e.created_by || null };
                    });
                    await sb.from('edges').upsert(edgeInserts);
                }
                import('../supabase-api.js').then(function(m) {
                    m.loadAllData().then(function() {
                        appState.focusedNodeId = Object.keys(appState.nodes)[0] || null;
                        appState.history = [];
                        renderAll();
                        dataModal.classList.add('hidden');
                        showToast('データを復元しました', 'success');
                    });
                });
            } catch (err) {
                showToast('JSON解析に失敗しました', 'error');
            }
        };
        reader.readAsText(file);
    });

    document.getElementById('resetDataBtn').onclick = async function() {
        if (currentUserRole !== 'admin') {
            showToast('管理者のみデータを初期化できます', 'error');
            return;
        }
        if (confirm('すべての概念と接続データを初期化しますか？この操作は取り消せません。')) {
            await sb.from('edges').delete().neq('id', '');
            await sb.from('nodes').delete().neq('id', '');
            import('../supabase-api.js').then(function(m) {
                m.loadAllData().then(function() {
                    var firstId = Object.keys(appState.nodes)[0];
                    if (firstId) setFocusedNode(firstId, false);
                    renderAll();
                    dataModal.classList.add('hidden');
                    showToast('データを初期化しました', 'success');
                });
            });
        }
    };
}
