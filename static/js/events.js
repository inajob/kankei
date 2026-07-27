import { appState, currentUser, currentUserRole, activeGlobalSearchIndex, activeConnectSearchIndex } from './state.js';
import { setActiveGlobalSearchIndex, setActiveConnectSearchIndex } from './state.js';
import { setFocusedNode, hideDropdown, highlightAutocompleteItem } from './utils.js';
import { renderGlobalSearchDropdown, renderConnectSearchDropdown, submitConnectInput } from './search.js';
import { deleteNode, removeEdge } from './supabase-api.js';
import { renderAll } from './render.js';
import { showToast } from './toast.js';
import { setupUsernameHandlers } from './auth.js';

let sb;
let listenersSetup = false;

export function setSupabaseClient(client) { sb = client; }

export function setupEventListeners() {
    if (listenersSetup) return;
    listenersSetup = true;

    var globalInput = document.getElementById('globalSearchInput');
    var clearGlobalBtn = document.getElementById('clearGlobalSearch');

    globalInput.addEventListener('input', function() {
        var val = globalInput.value.trim();
        clearGlobalBtn.classList.toggle('hidden', val.length === 0);
        renderGlobalSearchDropdown(val);
    });

    globalInput.addEventListener('keydown', function(e) {
        var dropdown = document.getElementById('globalSearchDropdown');
        var items = dropdown.querySelectorAll('.search-autocomplete-item');
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveGlobalSearchIndex(Math.min(activeGlobalSearchIndex + 1, items.length - 1));
            highlightAutocompleteItem(items, activeGlobalSearchIndex);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveGlobalSearchIndex(Math.max(activeGlobalSearchIndex - 1, -1));
            highlightAutocompleteItem(items, activeGlobalSearchIndex);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeGlobalSearchIndex >= 0 && items[activeGlobalSearchIndex]) {
                items[activeGlobalSearchIndex].click();
            } else {
                if (!currentUser) return;
                var val = globalInput.value.trim();
                if (val) {
                    import('./supabase-api.js').then(function(m) {
                        m.getOrCreateNode(val).then(function(node) {
                            if (node) {
                                setFocusedNode(node.id, true);
                                globalInput.value = '';
                                clearGlobalBtn.classList.add('hidden');
                                hideDropdown('globalSearchDropdown');
                                renderAll();
                            }
                        });
                    });
                }
            }
        } else if (e.key === 'Escape') {
            hideDropdown('globalSearchDropdown');
        }
    });

    clearGlobalBtn.onclick = function() {
        globalInput.value = '';
        clearGlobalBtn.classList.add('hidden');
        hideDropdown('globalSearchDropdown');
        globalInput.focus();
    };

    var connectInput = document.getElementById('connectInput');
    var connectBtn = document.getElementById('connectBtn');

    connectInput.addEventListener('input', function() {
        renderConnectSearchDropdown(connectInput.value.trim());
    });

    connectInput.addEventListener('keydown', function(e) {
        var dropdown = document.getElementById('connectDropdown');
        var items = dropdown.querySelectorAll('.connect-autocomplete-item');
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveConnectSearchIndex(Math.min(activeConnectSearchIndex + 1, items.length - 1));
            highlightAutocompleteItem(items, activeConnectSearchIndex);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveConnectSearchIndex(Math.max(activeConnectSearchIndex - 1, -1));
            highlightAutocompleteItem(items, activeConnectSearchIndex);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeConnectSearchIndex >= 0 && items[activeConnectSearchIndex]) {
                items[activeConnectSearchIndex].click();
            } else {
                submitConnectInput();
            }
        } else if (e.key === 'Escape') {
            hideDropdown('connectDropdown');
        }
    });

    connectBtn.onclick = function() { submitConnectInput(); };

    document.getElementById('homeBtn').onclick = function() {
        appState.focusedNodeId = null;
        history.pushState(null, '', window.location.pathname);
        renderAll();
    };

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

    var viewListBtn = document.getElementById('viewListBtn');
    var viewGraphBtn = document.getElementById('viewGraphBtn');
    var listViewContainer = document.getElementById('listViewContainer');
    var graphViewContainer = document.getElementById('graphViewContainer');

    viewListBtn.onclick = function() {
        appState.viewMode = 'list';
        viewListBtn.className = 'px-2.5 py-1.5 rounded-lg font-medium transition bg-white text-slate-800 shadow-sm';
        viewGraphBtn.className = 'px-2.5 py-1.5 rounded-lg font-medium transition text-slate-500 hover:text-slate-800';
        listViewContainer.classList.remove('hidden');
        graphViewContainer.classList.add('hidden');
    };

    viewGraphBtn.onclick = function() {
        appState.viewMode = 'graph';
        viewGraphBtn.className = 'px-2.5 py-1.5 rounded-lg font-medium transition bg-white text-slate-800 shadow-sm';
        viewListBtn.className = 'px-2.5 py-1.5 rounded-lg font-medium transition text-slate-500 hover:text-slate-800';
        listViewContainer.classList.add('hidden');
        graphViewContainer.classList.remove('hidden');
        window._initGraphCanvas && window._initGraphCanvas();
    };

    document.getElementById('toggleAllNodesBtn').onclick = function() {
        document.getElementById('allNodesDrawer').classList.remove('hidden');
        renderAll();
    };
    document.getElementById('closeDrawerBtn').onclick = function() {
        document.getElementById('allNodesDrawer').classList.add('hidden');
    };
    document.getElementById('allNodesDrawer').onclick = function(e) {
        if (e.target.id === 'allNodesDrawer') document.getElementById('allNodesDrawer').classList.add('hidden');
    };

    document.getElementById('drawerSearchInput').addEventListener('input', renderAll);

    var filterAllBtn = document.getElementById('filterAllBtn');
    var filterIsolatedBtn = document.getElementById('filterIsolatedBtn');

    filterAllBtn.onclick = function() {
        filterAllBtn.className = 'flex-1 py-1 bg-green-50 text-green-700 font-semibold rounded border border-green-200 text-center';
        filterIsolatedBtn.className = 'flex-1 py-1 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded border border-slate-200 text-center';
        renderAll();
    };

    filterIsolatedBtn.onclick = function() {
        filterIsolatedBtn.className = 'flex-1 py-1 bg-green-50 text-green-700 font-semibold rounded border border-green-200 text-center';
        filterAllBtn.className = 'flex-1 py-1 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded border border-slate-200 text-center';
        renderAll();
    };

    var dataModal = document.getElementById('dataModal');
    document.getElementById('toggleDataModalBtn').onclick = function() { dataModal.classList.remove('hidden'); };
    document.getElementById('closeDataModalBtn').onclick = function() { dataModal.classList.add('hidden'); };
    document.getElementById('dataModalDoneBtn').onclick = function() { dataModal.classList.add('hidden'); };

    document.getElementById('exportJsonBtn').onclick = async function() {
        try {
            var nodesRes = await sb.from('nodes').select('*');
            var edgesRes = await sb.from('edges').select('*');
            var data = { nodes: nodesRes.data || [], edges: edgesRes.data || [] };
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
                import('./supabase-api.js').then(function(m) {
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
            import('./supabase-api.js').then(function(m) {
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

    document.addEventListener('click', function(e) {
        if (!e.target.closest('#globalSearchInput') && !e.target.closest('#globalSearchDropdown')) {
            hideDropdown('globalSearchDropdown');
        }
        if (!e.target.closest('#connectInput') && !e.target.closest('#connectDropdown')) {
            hideDropdown('connectDropdown');
        }
        if (!e.target.closest('#userMenu')) {
            document.getElementById('userDropdown').classList.add('hidden');
        }
    });

    document.getElementById('userAvatarBtn').onclick = function() {
        document.getElementById('userDropdown').classList.toggle('hidden');
    };

    document.getElementById('logoutBtn').onclick = async function() {
        await sb.auth.signOut();
        import('./state.js').then(function(m) { m.resetAppState(); });
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('userMenu').classList.add('hidden');
        document.getElementById('headerLoginBtn').classList.remove('hidden');
        renderAll();
    };

    setupUsernameHandlers();

    document.getElementById('loginBtn').onclick = async function() {
        var base = new URL('.', window.location.href).pathname;
        var res = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + base } });
        if (res.error) showToast('ログインに失敗しました', 'error');
    };

    document.getElementById('guestBtn').onclick = function() {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('headerLoginBtn').classList.remove('hidden');
        window._enterGuestMode && window._enterGuestMode();
    };

    document.getElementById('headerLoginBtn').onclick = function() {
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('headerLoginBtn').classList.add('hidden');
    };
}
