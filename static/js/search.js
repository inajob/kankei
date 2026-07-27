import { appState, currentUser, activeGlobalSearchIndex, activeConnectSearchIndex } from './state.js';
import { setActiveGlobalSearchIndex, setActiveConnectSearchIndex } from './state.js';
import { getOrCreateNode, createEdgeInternal } from './supabase-api.js';
import { highlightMatch, hideDropdown, highlightAutocompleteItem } from './utils.js';
import { setFocusedNode } from './utils.js';

export function renderGlobalSearchDropdown(query) {
    var dropdown = document.getElementById('globalSearchDropdown');
    dropdown.innerHTML = '';
    setActiveGlobalSearchIndex(-1);
    if (!query) { hideDropdown('globalSearchDropdown'); return; }
    var matches = Object.values(appState.nodes).filter(function(n) {
        return n.name.toLowerCase().includes(query.toLowerCase());
    }).slice(0, 6);
    matches.forEach(function(node) {
        var item = document.createElement('div');
        item.className = 'search-autocomplete-item px-4 py-2 hover:bg-green-50 cursor-pointer text-xs flex items-center justify-between text-slate-700';
        item.innerHTML = '<span class="font-medium">' + highlightMatch(node.name, query) + '</span><span class="text-[10px] text-slate-400">ジャンプ</span>';
        item.onclick = function() {
            setFocusedNode(node.id, true);
            document.getElementById('globalSearchInput').value = '';
            document.getElementById('clearGlobalSearch').classList.add('hidden');
            hideDropdown('globalSearchDropdown');
            window._renderAll && window._renderAll();
        };
        dropdown.appendChild(item);
    });
    if (currentUser) {
        var createOption = document.createElement('div');
        createOption.className = 'search-autocomplete-item px-4 py-2 hover:bg-green-50 cursor-pointer text-xs font-semibold text-green-600 bg-slate-50 flex items-center gap-1.5';
        createOption.innerHTML = '<i class="fa-solid fa-plus text-[10px]"></i> 「' + query.replace(/</g, '&lt;') + '」を新規作成してジャンプ';
        createOption.onclick = function() {
            getOrCreateNode(query).then(function(node) {
                if (node) {
                    setFocusedNode(node.id, true);
                    document.getElementById('globalSearchInput').value = '';
                    document.getElementById('clearGlobalSearch').classList.add('hidden');
                    hideDropdown('globalSearchDropdown');
                    window._renderAll && window._renderAll();
                }
            });
        };
        dropdown.appendChild(createOption);
    }
    dropdown.classList.remove('hidden');
}

export function renderConnectSearchDropdown(query) {
    var dropdown = document.getElementById('connectDropdown');
    dropdown.innerHTML = '';
    setActiveConnectSearchIndex(-1);
    if (!query) { hideDropdown('connectDropdown'); return; }
    var matches = Object.values(appState.nodes).filter(function(n) {
        return n.id !== appState.focusedNodeId && n.name.toLowerCase().includes(query.toLowerCase());
    }).slice(0, 5);
    matches.forEach(function(node) {
        var item = document.createElement('div');
        item.className = 'connect-autocomplete-item px-4 py-2 hover:bg-green-50 cursor-pointer text-xs flex items-center justify-between text-slate-700';
        item.innerHTML = '<span class="font-medium">' + highlightMatch(node.name, query) + '</span><span class="text-[10px] text-green-500 font-semibold">+ 接続</span>';
        item.onclick = async function() {
            await createEdgeInternal(appState.focusedNodeId, node.id);
            window._renderAll && window._renderAll();
            document.getElementById('connectInput').value = '';
            hideDropdown('connectDropdown');
            document.getElementById('connectInput').focus();
        };
        dropdown.appendChild(item);
    });
    dropdown.classList.remove('hidden');
}

export async function submitConnectInput() {
    var connectInput = document.getElementById('connectInput');
    var val = connectInput.value.trim();
    if (!val || !appState.focusedNodeId) return;
    var tokens = val.split(',').map(function(t) { return t.trim(); }).filter(Boolean);
    for (var i = 0; i < tokens.length; i++) {
        var targetNode = await getOrCreateNode(tokens[i]);
        if (targetNode) {
            await createEdgeInternal(appState.focusedNodeId, targetNode.id);
        }
    }
    window._renderAll && window._renderAll();
    connectInput.value = '';
    hideDropdown('connectDropdown');
    connectInput.focus();
}
