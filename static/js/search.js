import { appState, currentUser, activeGlobalSearchIndex, activeConnectSearchIndex } from './state.js';
import { setActiveGlobalSearchIndex, setActiveConnectSearchIndex } from './state.js';
import { getOrCreateNode, createEdgeInternal } from './supabase-api.js';
import { highlightMatch, hideDropdown, highlightAutocompleteItem } from './utils.js';
import { setFocusedNode } from './utils.js';
import { fetchWikiSuggestions } from './wiki.js';
import { showToast } from './toast.js';

function renderWikiSection(container, query, type) {
    var existing = container.querySelector('.wiki-section');
    if (existing) existing.remove();

    var section = document.createElement('div');
    section.className = 'wiki-section';
    section.innerHTML = '<div class="wiki-header"><i class="fa-brands fa-wikipedia-w"></i> Wikipedia</div><div class="wiki-loading">検索中...</div>';
    container.appendChild(section);
    container.classList.remove('hidden');

    fetchWikiSuggestions(query, function(results) {
        section.innerHTML = '<div class="wiki-header"><i class="fa-brands fa-wikipedia-w"></i> Wikipedia</div>';
        if (!results || results.length === 0) {
            section.remove();
            return;
        }
        results.forEach(function(item) {
            var el = document.createElement('div');
            el.className = 'wiki-item px-4 py-2 hover:bg-blue-50 cursor-pointer text-xs flex items-center justify-between text-slate-700';
            el.innerHTML = '<div class="min-w-0"><span class="font-medium">' + escapeHtml(item.title) + '</span>' + (item.description ? '<span class="text-[10px] text-slate-400 ml-2">' + escapeHtml(item.description) + '</span>' : '') + '</div><span class="text-[10px] text-blue-500 font-semibold shrink-0 ml-2">+ 新規作成</span>';
            el.onclick = function() {
                getOrCreateNode(item.title).then(function(node) {
                    if (!node) return;
                    if (type === 'global') {
                        appState.history = [];
                        setFocusedNode(node.id, true);
                        document.getElementById('globalSearchInput').value = '';
                        document.getElementById('clearGlobalSearch').classList.add('hidden');
                        hideDropdown('globalSearchDropdown');
                        window._renderAll && window._renderAll();
                    } else {
                        createEdgeInternal(appState.focusedNodeId, node.id).then(function(result) {
                            if (result && result.error) { showToast(result.error, 'error'); }
                            window._renderAll && window._renderAll();
                        });
                        document.getElementById('connectInput').value = '';
                        hideDropdown('connectDropdown');
                        document.getElementById('connectInput').focus();
                    }
                });
            };
            section.appendChild(el);
        });
    });
}

function escapeHtml(str) {
    return str.replace(/[&<>"']/g, function(m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
}

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
            appState.history = [];
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
                    appState.history = [];
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
    renderWikiSection(dropdown, query, 'global');
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
            var result = await createEdgeInternal(appState.focusedNodeId, node.id);
            if (result && result.error) { showToast(result.error, 'error'); }
            window._renderAll && window._renderAll();
            document.getElementById('connectInput').value = '';
            hideDropdown('connectDropdown');
            document.getElementById('connectInput').focus();
        };
        dropdown.appendChild(item);
    });
    renderWikiSection(dropdown, query, 'connect');
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
            var result = await createEdgeInternal(appState.focusedNodeId, targetNode.id);
            if (result && result.error) { showToast(result.error, 'error'); }
        }
    }
    window._renderAll && window._renderAll();
    connectInput.value = '';
    hideDropdown('connectDropdown');
    connectInput.focus();
}
