import { appState, currentUser, currentUserRole } from './state.js';
import { isNodeIsolated, escapeHtml, setFocusedNode } from './utils.js';
import { getUserName } from './auth.js';

export function renderAll() {
    renderFocusedConcept();
    renderBreadcrumbs();
    renderConnectedList();
    renderDrawerAllNodes();
    renderGuestMode();
    if (appState.viewMode === 'graph') {
        window._initGraphCanvas && window._initGraphCanvas();
    }
}

function renderGuestMode() {
    var isGuest = !currentUser;
    var connectSection = document.getElementById('connectSection');
    var deleteBtn = document.getElementById('deleteFocusedConceptBtn');
    var toggleDataModalBtn = document.getElementById('toggleDataModalBtn');
    var globalSearchInput = document.getElementById('globalSearchInput');
    if (connectSection) connectSection.classList.toggle('hidden', isGuest);
    if (deleteBtn && isGuest) deleteBtn.classList.add('hidden');
    if (toggleDataModalBtn) toggleDataModalBtn.classList.toggle('hidden', isGuest);
    if (globalSearchInput) {
        globalSearchInput.placeholder = isGuest ? '概念を検索...' : '概念を検索 または 新規作成...';
    }
}

function renderFocusedConcept() {
    var titleEl = document.getElementById('focusedConceptTitle');
    var isolatedBadge = document.getElementById('isolatedBadge');
    var creatorEl = document.getElementById('focusedConceptCreator');
    var deleteBtn = document.getElementById('deleteFocusedConceptBtn');
    if (!appState.focusedNodeId || !appState.nodes[appState.focusedNodeId]) {
        titleEl.innerText = '概念がありません';
        isolatedBadge.classList.add('hidden');
        creatorEl.textContent = '';
        deleteBtn.classList.add('hidden');
        return;
    }
    var currentNode = appState.nodes[appState.focusedNodeId];
    titleEl.innerText = currentNode.name;
    isolatedBadge.classList.toggle('hidden', !isNodeIsolated(currentNode.id));
    if (currentNode.created_by) {
        getUserName(currentNode.created_by).then(function(name) {
            creatorEl.textContent = '作成: ' + name;
        });
    } else {
        creatorEl.textContent = '';
    }
    var canDelete = currentUser && (currentUser.id === currentNode.created_by || currentUserRole === 'admin');
    deleteBtn.classList.toggle('hidden', !canDelete);
}

function renderBreadcrumbs() {
    var navEl = document.getElementById('breadcrumbNav');
    navEl.innerHTML = '';
    if (appState.history.length === 0) {
        navEl.innerHTML = '<span class="text-slate-400 italic"><i class="fa-solid fa-compass mr-1"></i> 思考の軌跡がここに表示されます</span>';
        return;
    }
    appState.history.slice(-5).forEach(function(nodeId) {
        var node = appState.nodes[nodeId];
        if (!node) return;
        var btn = document.createElement('button');
        btn.className = 'hover:text-indigo-600 transition flex items-center gap-1 font-medium whitespace-nowrap';
        btn.innerText = node.name;
        btn.onclick = function() {
            var histIndex = appState.history.indexOf(nodeId);
            if (histIndex !== -1) appState.history = appState.history.slice(0, histIndex);
            setFocusedNode(nodeId, false);
            renderAll();
        };
        navEl.appendChild(btn);
        var arrow = document.createElement('span');
        arrow.className = 'text-slate-300';
        arrow.innerHTML = '<i class="fa-solid fa-chevron-right text-[10px]"></i>';
        navEl.appendChild(arrow);
    });
    if (appState.focusedNodeId && appState.nodes[appState.focusedNodeId]) {
        var currentSpan = document.createElement('span');
        currentSpan.className = 'font-bold text-slate-800 whitespace-nowrap bg-slate-200/60 px-2 py-0.5 rounded-md';
        currentSpan.innerText = appState.nodes[appState.focusedNodeId].name;
        navEl.appendChild(currentSpan);
    }
}

function renderConnectedList() {
    var listEl = document.getElementById('connectedList');
    var countEl = document.getElementById('connectedCount');
    listEl.innerHTML = '';
    if (!appState.focusedNodeId) return;
    var connected = getConnectedNodesForRender(appState.focusedNodeId);
    countEl.innerText = connected.length;
    if (connected.length === 0) {
        listEl.innerHTML = '<div class="w-full py-6 text-center text-slate-400 text-xs"><i class="fa-solid fa-link-slash text-slate-300 text-xl mb-1 block"></i>繋がっている概念はありません</div>';
        return;
    }
    connected.forEach(function(node) {
        var chip = document.createElement('div');
        chip.className = 'group inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-lg text-xs font-medium cursor-pointer transition';
        chip.onclick = function(e) {
            if (e.target.closest('.remove-edge-btn')) return;
            setFocusedNode(node.id, true);
            renderAll();
        };
        var removeBtnHtml = currentUser ? '<button class="remove-edge-btn text-slate-300 hover:text-red-500 text-[10px] ml-0.5 shrink-0" title="接続を解除"><i class="fa-solid fa-xmark"></i></button>' : '';
        chip.innerHTML = '<span class="truncate max-w-[120px]">' + escapeHtml(node.name) + '</span>' + removeBtnHtml;
        var removeBtn = chip.querySelector('.remove-edge-btn');
        if (removeBtn) {
            removeBtn.onclick = function(e) {
                e.stopPropagation();
                window._removeEdge && window._removeEdge(appState.focusedNodeId, node.id).then(function() { renderAll(); });
            };
        }
        listEl.appendChild(chip);
    });
}

function renderDrawerAllNodes() {
    var drawerListEl = document.getElementById('allNodesList');
    var countBadgeEl = document.getElementById('totalConceptsBadge');
    var searchVal = document.getElementById('drawerSearchInput').value.toLowerCase().trim();
    var isIsolatedOnly = document.getElementById('filterIsolatedBtn').classList.contains('bg-indigo-50');
    drawerListEl.innerHTML = '';
    var allNodes = Object.values(appState.nodes);
    countBadgeEl.innerText = allNodes.length;
    if (isIsolatedOnly) allNodes = allNodes.filter(function(n) { return isNodeIsolated(n.id); });
    if (searchVal) allNodes = allNodes.filter(function(n) { return n.name.toLowerCase().includes(searchVal); });
    allNodes.sort(function(a, b) { return a.name.localeCompare(b.name, 'ja'); });
    if (allNodes.length === 0) {
        drawerListEl.innerHTML = '<li class="py-3 text-center text-[11px] text-slate-400">該当する概念はありません</li>';
        return;
    }
    allNodes.forEach(function(node) {
        var isolated = isNodeIsolated(node.id);
        var isCurrent = node.id === appState.focusedNodeId;
        var li = document.createElement('li');
        li.className = 'px-2 py-[3px] flex items-center justify-between cursor-pointer transition border-b border-slate-50 last:border-b-0 ' + (isCurrent ? 'bg-indigo-50 text-indigo-700 font-bold' : 'hover:bg-slate-50 text-slate-700');
        li.onclick = function() { setFocusedNode(node.id, true); renderAll(); window._closeDrawer && window._closeDrawer(); };
        li.innerHTML = '<span class="truncate text-xs leading-tight">' + escapeHtml(node.name) + '</span>' + (isolated ? '<span class="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-px rounded-full font-normal shrink-0 ml-1">孤立</span>' : '');
        drawerListEl.appendChild(li);
    });
}

function getConnectedNodesForRender(nodeId) {
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
