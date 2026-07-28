import { appState, currentUser, currentUserRole, animationFrameId } from './state.js';
import { setAnimationFrameId } from './state.js';
import { isNodeIsolated, escapeHtml, setFocusedNode } from './utils.js';
import { getUserName } from './auth.js';
import { showToast } from './toast.js';
import { loadEdgesForNodeIds, loadIsolatedNodeIds } from './supabase-api.js';

export async function renderAll() {
    var overviewSection = document.getElementById('overviewSection');
    var focusSection = document.getElementById('focusSection');
    var breadcrumbNav = document.getElementById('breadcrumbNav');
    var showOverview = !appState.focusedNodeId || !appState.nodes[appState.focusedNodeId];

    if (showOverview && animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        setAnimationFrameId(null);
    }

    if (overviewSection) overviewSection.classList.toggle('hidden', !showOverview);
    if (focusSection) focusSection.classList.toggle('hidden', showOverview);
    if (breadcrumbNav) breadcrumbNav.classList.toggle('hidden', showOverview);

    var isolatedIds = await loadIsolatedNodeIds();
    if (showOverview) {
        renderOverview(isolatedIds);
    } else {
        await loadEdgesForNodeIds([appState.focusedNodeId]);
        var hop1Ids = appState.edges.map(function(e) { return e.node1 === appState.focusedNodeId ? e.node2 : e.node1; });
        await loadEdgesForNodeIds(hop1Ids.concat([appState.focusedNodeId]));
        renderFocusedConcept();
        renderBreadcrumbs();
        renderConnectedList();
        var listViewContainer = document.getElementById('listViewContainer');
        var graphViewContainer = document.getElementById('graphViewContainer');
        if (appState.viewMode === 'graph') {
            if (listViewContainer) listViewContainer.classList.add('hidden');
            if (graphViewContainer) graphViewContainer.classList.remove('hidden');
            window._initGraphCanvas && window._initGraphCanvas();
        } else {
            if (listViewContainer) listViewContainer.classList.remove('hidden');
            if (graphViewContainer) graphViewContainer.classList.add('hidden');
        }
    }
    renderDrawerAllNodes(isolatedIds);
    renderGuestMode();
}

function renderOverview(isolatedIds) {
    var allNodes = Object.values(appState.nodes);

    var listEl = document.getElementById('overviewNodeList');
    listEl.innerHTML = '';
    allNodes.sort(function(a, b) { return (b.created_at || '').localeCompare(a.created_at || ''); });

    if (allNodes.length === 0) {
        listEl.innerHTML = '<div class="col-span-full text-center text-slate-400 text-xs py-8"><i class="fa-solid fa-circle-nodes text-slate-300 text-3xl mb-2 block"></i>まだ概念がありません</div>';
        return;
    }

    allNodes.forEach(function(node) {
        var isolated = isolatedIds.has(node.id);
        var card = document.createElement('div');
        card.className = 'px-4 py-3 bg-slate-50 hover:bg-green-50 border border-slate-200 hover:border-green-300 rounded-xl cursor-pointer transition text-base font-semibold text-slate-700 hover:text-green-700 truncate';
        card.title = node.name;
        card.textContent = node.name;
        if (isolated) {
            card.innerHTML = escapeHtml(node.name) + ' <span class="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-px rounded-full font-normal ml-1">孤立</span>';
        }
        card.onclick = function() {
            appState.history = [];
            setFocusedNode(node.id, true);
            renderAll();
        };
        listEl.appendChild(card);
    });
}

function renderGuestMode() {
    var isGuest = !currentUser;
    var isAdmin = currentUserRole === 'admin';
    var connectSection = document.getElementById('connectSection');
    var deleteBtn = document.getElementById('deleteFocusedConceptBtn');
    var toggleDataModalBtn = document.getElementById('toggleDataModalBtn');
    var globalSearchInput = document.getElementById('globalSearchInput');
    var resetDataBtn = document.getElementById('resetDataBtn');
    var importSection = document.getElementById('importJsonInput') && document.getElementById('importJsonInput').closest('.relative');
    if (connectSection) connectSection.classList.toggle('hidden', isGuest);
    if (deleteBtn && isGuest) deleteBtn.classList.add('hidden');
    if (toggleDataModalBtn) toggleDataModalBtn.classList.toggle('hidden', isGuest);
    if (resetDataBtn) resetDataBtn.classList.toggle('hidden', !isAdmin);
    if (importSection) importSection.classList.toggle('hidden', !isAdmin);
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
        btn.className = 'hover:text-green-600 transition flex items-center gap-1 font-medium whitespace-nowrap';
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
        currentSpan.className = 'font-bold text-slate-800 whitespace-nowrap bg-green-100/60 px-2 py-0.5 rounded-md';
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
        chip.className = 'group inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-green-50 text-slate-700 hover:text-green-700 rounded-lg text-sm font-medium cursor-pointer transition';
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
                window._removeEdge && window._removeEdge(appState.focusedNodeId, node.id).then(function(result) {
                    if (result && result.error) { showToast(result.error, 'error'); return; }
                    renderAll();
                });
            };
        }
        listEl.appendChild(chip);
    });
}

function renderDrawerAllNodes(isolatedIds) {
    var drawerListEl = document.getElementById('allNodesList');
    var countBadgeEl = document.getElementById('totalConceptsBadge');
    var searchVal = document.getElementById('drawerSearchInput').value.toLowerCase().trim();
    var isIsolatedOnly = document.getElementById('filterIsolatedBtn') && document.getElementById('filterIsolatedBtn').classList.contains('bg-green-50');
    drawerListEl.innerHTML = '';
    var allNodes = Object.values(appState.nodes);
    countBadgeEl.innerText = allNodes.length;
    if (isIsolatedOnly && isolatedIds) allNodes = allNodes.filter(function(n) { return isolatedIds.has(n.id); });
    if (searchVal) allNodes = allNodes.filter(function(n) { return n.name.toLowerCase().includes(searchVal); });
    allNodes.sort(function(a, b) { return a.name.localeCompare(b.name, 'ja'); });
    if (allNodes.length === 0) {
        drawerListEl.innerHTML = '<li class="py-3 text-center text-[11px] text-slate-400">該当する概念はありません</li>';
        return;
    }
    allNodes.forEach(function(node) {
        var isolated = isolatedIds && isolatedIds.has(node.id);
        var isCurrent = node.id === appState.focusedNodeId;
        var li = document.createElement('li');
        li.className = 'px-2 py-[3px] flex items-center justify-between cursor-pointer transition border-b border-slate-50 last:border-b-0 ' + (isCurrent ? 'bg-green-50 text-green-700 font-bold' : 'hover:bg-slate-50 text-slate-700');
        li.onclick = function() { appState.history = []; setFocusedNode(node.id, true); renderAll(); window._closeDrawer && window._closeDrawer(); };
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
