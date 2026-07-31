import { appState, currentUser, currentUserRole, animationFrameId } from './state.js';
import { setAnimationFrameId } from './state.js';
import { getConnectedNodes, isNodeIsolated, escapeHtml, setFocusedNode } from './utils.js';
import { getUserName } from './auth.js';
import { showToast } from './toast.js';
import { loadEdgesForNodeIds, loadIsolatedNodeIds, clearEdgeCache } from './supabase-api.js';
import { spinnerInline, spinnerHtml } from './spinner.js';
import { iconNodes, iconCompass, iconChevronRight, iconLinkSlash, iconLink, iconXmark } from './icons.js';
import { computeLocalDensity, computeInclusionRelationships } from './local-density.js';

var renderRunning = false;
var renderPending = false;

async function renderAllImpl() {
    if (Object.keys(appState.nodes).length === 0) return;

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
    var desktopBreadcrumb = document.getElementById('desktopBreadcrumbNav');
    if (desktopBreadcrumb) desktopBreadcrumb.classList.toggle('hidden', showOverview);

    // Show inline loading indicator in the content area during async data fetching
    if (!showOverview) {
        var connectedList = document.getElementById('connectedList');
        if (connectedList) {
            connectedList.innerHTML = spinnerInline('接続データを読み込み中...');
        }
        var hop2Section = document.getElementById('hop2Section');
        if (hop2Section) hop2Section.classList.remove('hidden');
        var hop2List = document.getElementById('hop2List');
        if (hop2List) {
            hop2List.innerHTML = '<div class="flex items-center justify-center py-4 text-slate-400 w-full">' + spinnerHtml('読み込み中...') + '</div>';
        }
        if (appState.viewMode === 'graph') {
            var graphLoading = document.getElementById('graphLoading');
            if (graphLoading) graphLoading.classList.remove('hidden');
            var graphViewContainer = document.getElementById('graphViewContainer');
            if (graphViewContainer) graphViewContainer.classList.remove('hidden');
            var listViewContainer = document.getElementById('listViewContainer');
            if (listViewContainer) listViewContainer.classList.add('hidden');
        } else {
            var listViewContainer = document.getElementById('listViewContainer');
            if (listViewContainer) listViewContainer.classList.remove('hidden');
            var graphViewContainer = document.getElementById('graphViewContainer');
            if (graphViewContainer) graphViewContainer.classList.add('hidden');
        }
    }

    try {
        var isolatedIds = await loadIsolatedNodeIds();
        if (showOverview) {
            renderOverview(isolatedIds);
        } else {
            clearEdgeCache();
            await loadEdgesForNodeIds([appState.focusedNodeId], 'hop0');
            var hop1Ids = appState.edges.map(function(e) { return e.node1 === appState.focusedNodeId ? e.node2 : e.node1; });
            await loadEdgesForNodeIds(hop1Ids.concat([appState.focusedNodeId]), 'hop1');
            renderFocusedConcept();
            renderBreadcrumbs();
            renderConnectedList();
            var knownIds = new Set([appState.focusedNodeId].concat(hop1Ids));
            var hop2Ids = appState.edges.filter(function(e) {
                return (hop1Ids.includes(e.node1) && !knownIds.has(e.node2)) ||
                       (hop1Ids.includes(e.node2) && !knownIds.has(e.node1));
            }).map(function(e) {
                return hop1Ids.includes(e.node1) ? e.node2 : e.node1;
            });
            hop2Ids = [...new Set(hop2Ids)];
            var allVisibleIds = [appState.focusedNodeId].concat(hop1Ids).concat(hop2Ids);
            await loadEdgesForNodeIds(hop2Ids, 'hop2', allVisibleIds);
            renderConnectedList2Hop(hop1Ids, hop2Ids);
            var listViewContainer = document.getElementById('listViewContainer');
            var graphViewContainer = document.getElementById('graphViewContainer');
            var graphLoading = document.getElementById('graphLoading');
            if (appState.viewMode === 'graph') {
                if (listViewContainer) listViewContainer.classList.add('hidden');
                if (graphViewContainer) graphViewContainer.classList.remove('hidden');
                if (graphLoading) graphLoading.classList.add('hidden');
                window._initGraphCanvas && window._initGraphCanvas();
            } else {
                if (listViewContainer) listViewContainer.classList.remove('hidden');
                if (graphViewContainer) graphViewContainer.classList.add('hidden');
            }
        }
        renderDrawerAllNodes(isolatedIds);
        renderGuestMode();
    } catch (e) {
        console.error('renderAll error:', e);
    } finally {
        var gl = document.getElementById('graphLoading');
        if (gl) gl.classList.add('hidden');
    }
}

export function renderAll() {
    if (renderRunning) {
        renderPending = true;
        return;
    }
    renderRunning = true;
    renderPending = false;
    renderAllImpl().finally(function() {
        renderRunning = false;
        if (renderPending) renderAll();
    });
}

function renderOverview(isolatedIds) {
    var allNodes = Object.values(appState.nodes);
    if (!isolatedIds) isolatedIds = new Set();

    var countEl = document.getElementById('overviewNodeCount');
    if (countEl) countEl.textContent = allNodes.length;

    var listEl = document.getElementById('overviewNodeList');
    listEl.innerHTML = '';
    allNodes.sort(function(a, b) { return (b.created_at || '').localeCompare(a.created_at || ''); });

    if (allNodes.length === 0) {
        listEl.innerHTML = '<div class="col-span-full text-center text-slate-400 text-xs py-8">' + iconNodes('text-slate-300 text-3xl mb-2 block') + 'まだ概念がありません</div>';
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
    var desktopUserMenu = document.getElementById('desktopUserMenu');
    var desktopHeaderLoginBtn = document.getElementById('desktopHeaderLoginBtn');
    if (desktopUserMenu) desktopUserMenu.classList.toggle('hidden', isGuest);
    if (desktopHeaderLoginBtn) desktopHeaderLoginBtn.classList.toggle('hidden', !isGuest);
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
    var isolated = isNodeIsolated(currentNode.id);
    isolatedBadge.classList.toggle('hidden', !isolated);
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

function renderBreadcrumbContent(navEl) {
    if (!navEl) return;
    navEl.innerHTML = '';
    if (appState.history.length === 0) {
        navEl.innerHTML = '<span class="text-slate-400 italic">' + iconCompass('mr-1') + ' 思考の軌跡がここに表示されます</span>';
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
        arrow.innerHTML = iconChevronRight('text-[10px]');
        navEl.appendChild(arrow);
    });
    if (appState.focusedNodeId && appState.nodes[appState.focusedNodeId]) {
        var currentSpan = document.createElement('span');
        currentSpan.className = 'font-bold text-slate-800 whitespace-nowrap bg-green-100/60 px-2 py-0.5 rounded-md';
        currentSpan.innerText = appState.nodes[appState.focusedNodeId].name;
        navEl.appendChild(currentSpan);
    }
}

function renderBreadcrumbs() {
    renderBreadcrumbContent(document.getElementById('breadcrumbNav'));
    renderBreadcrumbContent(document.getElementById('desktopBreadcrumbNav'));
}

function renderConnectedList() {
    var listEl = document.getElementById('connectedList');
    var localCountEl = document.getElementById('localGroupCount');
    var localSection = document.getElementById('localGroupSection');
    var hubSection = document.getElementById('contextHubSection');
    var hubListEl = document.getElementById('contextHubList');
    var hubCountEl = document.getElementById('contextHubCount');
    var upperSection = document.getElementById('upperContextSection');
    var upperListEl = document.getElementById('upperContextList');
    var upperCountEl = document.getElementById('upperContextCount');
    listEl.innerHTML = '';
    hubListEl.innerHTML = '';
    if (upperListEl) upperListEl.innerHTML = '';
    if (upperSection) upperSection.classList.add('hidden');
    if (localSection) localSection.classList.add('hidden');
    if (hubSection) hubSection.classList.add('hidden');
    if (!appState.focusedNodeId) return;
    var result = computeLocalDensity(appState.focusedNodeId, appState.edges, appState.nodes, appState.densityThreshold);
    var localGroup = result.localGroup;
    var contextHubs = result.contextHubs;
    if (localGroup.length === 0 && contextHubs.length === 0) {
        listEl.innerHTML = '<div class="w-full py-6 text-center text-slate-400 text-xs">' + iconLinkSlash('text-slate-300 text-xl mb-1 block') + '繋がっている概念はありません</div>';
        return;
    }

    // Compute inclusion relationships among local group nodes
    var incResult = (localGroup.length >= 2) ? computeInclusionRelationships(localGroup, appState.edges, appState.nodes, appState.inclusionThreshold) : null;
    var children = incResult ? incResult.children : [];
    var parents = incResult ? incResult.parents : [];
    var neither = incResult ? incResult.neither : localGroup;

    if (parents.length > 0) {
        upperCountEl.innerText = parents.length;
        if (upperSection) upperSection.classList.remove('hidden');
        parents.forEach(function(node) { appendChip(upperListEl, node, 'parent'); });
    }
    var displayLocal = (children.length > 0) ? children : neither;
    if (displayLocal.length > 0) {
        localCountEl.innerText = displayLocal.length;
        if (localSection) localSection.classList.remove('hidden');
        displayLocal.forEach(function(node) { appendChip(listEl, node, 'local'); });
    }
    if (contextHubs.length > 0) {
        hubCountEl.innerText = contextHubs.length;
        if (hubSection) hubSection.classList.remove('hidden');
        contextHubs.forEach(function(node) { appendChip(hubListEl, node, 'hub'); });
    }
}

function appendChip(container, node, type) {
    var isGreen = type === 'local';
    var bgClass = isGreen ? 'bg-green-50/70 hover:bg-green-100 text-slate-700 hover:text-green-700 border-green-200/60' : 'bg-amber-50/70 hover:bg-amber-100 text-slate-600 hover:text-amber-700 border-amber-200/60';
    var iconColor = isGreen ? 'text-green-400' : 'text-amber-400';
    var chip = document.createElement('div');
    chip.className = 'group inline-flex items-center gap-1.5 px-3 py-1.5 ' + bgClass + ' rounded-lg text-sm font-medium cursor-pointer transition border';
    chip.onclick = function(e) {
        if (e.target.closest('.remove-edge-btn')) return;
        setFocusedNode(node.id, true);
        renderAll();
    };
    var removeBtnHtml = currentUser ? '<button class="remove-edge-btn text-slate-400 hover:text-red-500 text-[10px] ml-0.5 shrink-0" title="接続を解除">' + iconXmark() + '</button>' : '';
    chip.innerHTML = iconLink(iconColor) + '<span>' + escapeHtml(node.name) + '</span>' + removeBtnHtml;
    var removeBtn = chip.querySelector('.remove-edge-btn');
    if (removeBtn) {
        removeBtn.onclick = function(e) {
            e.stopPropagation();
            var nodeName = appState.nodes[node.id] ? appState.nodes[node.id].name : node.id;
            if (!confirm('「' + nodeName + '」との接続を解除しますか？')) return;
            window._removeEdge && window._removeEdge(appState.focusedNodeId, node.id).then(function(result) {
                if (result && result.error) { showToast(result.error, 'error'); return; }
                renderAll();
            });
        };
    }
    container.appendChild(chip);
}

function renderConnectedList2Hop(hop1Ids, hop2Ids) {
    var sectionEl = document.getElementById('hop2Section');
    var listEl = document.getElementById('hop2List');
    var countEl = document.getElementById('hop2Count');
    listEl.innerHTML = '';
    countEl.innerText = '0';
    if (sectionEl) sectionEl.classList.add('hidden');
    if (!appState.focusedNodeId || !hop1Ids || hop1Ids.length === 0 || !hop2Ids || hop2Ids.length === 0) {
        return;
    }
    var hop2Set = new Set(hop2Ids);
    var excludedIds = new Set([appState.focusedNodeId].concat(hop1Ids));
    var hop2Map = {};
    hop1Ids.forEach(function(pid) {
        var parentNode = appState.nodes[pid];
        if (!parentNode) return;
        getConnectedNodes(pid).forEach(function(n) {
            if (excludedIds.has(n.id) || !hop2Set.has(n.id)) return;
            if (!hop2Map[n.id]) hop2Map[n.id] = { id: n.id, name: n.name, parents: [] };
            if (!hop2Map[n.id].parents.some(function(p) { return p.id === pid; })) {
                hop2Map[n.id].parents.push({ id: pid, name: parentNode.name });
            }
        });
    });
    var hop2Entries = Object.values(hop2Map);
    countEl.innerText = hop2Entries.length;
    if (hop2Entries.length === 0) return;
    if (sectionEl) sectionEl.classList.remove('hidden');
    hop2Entries.forEach(function(entry) {
        var chip = document.createElement('div');
        chip.className = 'group inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50/60 hover:bg-amber-100 text-slate-600 hover:text-amber-700 rounded-lg text-xs cursor-pointer transition border border-amber-200/50';
        chip.onclick = function() {
            appState.history.push(appState.focusedNodeId);
            appState.history.push(entry.parents[0].id);
            setFocusedNode(entry.id, false);
            renderAll();
        };
        chip.innerHTML = '<span>' + escapeHtml(entry.name) + '</span><span class="text-[10px] text-slate-400"> (' + escapeHtml(entry.parents.map(function(p) { return p.name; }).join(', ')) + ')</span>';
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


