import { appState } from './state.js';
import { getConnectedNodes } from './utils.js';
import { setFocusedNode } from './utils.js';
import { setAnimationFrameId } from './state.js';
import { animationFrameId } from './state.js';
import { computeLocalDensity, computeInclusionRelationships } from './local-density.js';

function openLocalGroupModal(memberIds) {
    var modal = document.getElementById('localGroupModal');
    var listEl = document.getElementById('localGroupModalList');
    if (!modal || !listEl) return;
    listEl.innerHTML = '';
    memberIds.forEach(function(id) {
        var node = appState.nodes[id];
        if (!node) return;
        var btn = document.createElement('button');
        btn.className = 'px-3 py-2 bg-slate-50 hover:bg-green-50 border border-slate-200 hover:border-green-300 rounded-xl text-sm font-medium text-slate-700 hover:text-green-700 text-left transition truncate';
        btn.textContent = node.name;
        btn.onclick = function() {
            modal.classList.add('hidden');
            setFocusedNode(id, true);
            window._renderAll && window._renderAll();
        };
        listEl.appendChild(btn);
    });
    modal.classList.remove('hidden');
}

function wireLocalGroupModal() {
    var modal = document.getElementById('localGroupModal');
    if (!modal) return;
    var closeBtn = document.getElementById('closeLocalGroupModalBtn');
    var doneBtn = document.getElementById('localGroupModalDoneBtn');
    if (closeBtn) closeBtn.onclick = function() { modal.classList.add('hidden'); };
    if (doneBtn) doneBtn.onclick = function() { modal.classList.add('hidden'); };
    modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.classList.add('hidden');
    });
}
wireLocalGroupModal();

export function initGraphCanvas() {
    var canvas = document.getElementById('networkCanvas');
    var ctx = canvas.getContext('2d');
    var container = canvas.parentElement;
    var dpr = window.devicePixelRatio || 1;
    canvas.width = container.clientWidth * dpr;
    canvas.height = container.clientHeight * dpr;
    ctx.scale(dpr, dpr);
    var width = container.clientWidth;
    var height = container.clientHeight;
    if (!width || !height) return;
    if (!appState.focusedNodeId) return;

    var centerNode = appState.nodes[appState.focusedNodeId];
    var connected = getConnectedNodes(appState.focusedNodeId);
    var radiusDist = Math.min(width, height) * 0.32;

    // Classify neighbors by density, sort so local group occupies first contiguous arc
    var groupResult = computeLocalDensity(appState.focusedNodeId, appState.edges, appState.nodes, appState.densityThreshold);
    var localGroupIds = new Set(groupResult.localGroup.map(function(n) { return n.id; }));
    var contextHubIds = new Set(groupResult.contextHubs.map(function(n) { return n.id; }));
    var incResult = groupResult.localGroup.length >= 2
        ? computeInclusionRelationships(groupResult.localGroup, appState.edges, appState.nodes, appState.inclusionThreshold)
        : null;
    var parentIds = new Set(incResult ? incResult.parents.map(function(n) { return n.id; }) : []);
    connected.sort(function(a, b) {
        var ai = localGroupIds.has(a.id) ? 0 : 1;
        var bi = localGroupIds.has(b.id) ? 0 : 1;
        return ai - bi;
    });

    var nodes = [{ id: centerNode.id, name: centerNode.name, x: width / 2, y: height / 2, vx: 0, vy: 0, isCenter: true, radius: 28, depth: 0 }];
    var nodeIds = new Set([centerNode.id]);
    var angleStep = (2 * Math.PI) / (connected.length || 1);
    connected.forEach(function(node, i) {
        var angle = i * angleStep;
        nodes.push({ id: node.id, name: node.name, x: width / 2 + Math.cos(angle) * radiusDist, y: height / 2 + Math.sin(angle) * radiusDist, vx: 0, vy: 0, isCenter: false, radius: 20, depth: 1 });
        nodeIds.add(node.id);
    });
    connected.forEach(function(node) {
        var secondHop = getConnectedNodes(node.id);
        var parentNode = nodes.find(function(n) { return n.id === node.id; });
        secondHop.filter(function(n) { return !nodeIds.has(n.id); }).forEach(function(n2) {
            var angle = Math.atan2(parentNode.y - height / 2, parentNode.x - width / 2) + (Math.random() - 0.5) * 0.8;
            var r2 = radiusDist * 1.5;
            nodes.push({ id: n2.id, name: n2.name, x: width / 2 + Math.cos(angle) * r2, y: height / 2 + Math.sin(angle) * r2, vx: 0, vy: 0, isCenter: false, radius: 14, depth: 2, parentId: node.id });
            nodeIds.add(n2.id);
        });
    });
    var localEdges = appState.edges.filter(function(e) {
        return nodeIds.has(e.node1) && nodeIds.has(e.node2);
    }).map(function(e) {
        return { from: e.node1, to: e.node2 };
    });

    // Collapse the homogeneous local group (同質グループ) into a single super-node
    var nodeToSuper = {};
    var superNodes = [];
    if (groupResult.localGroup.length >= 3) {
        var memberIds = groupResult.localGroup.map(function(n) { return n.id; });
        memberIds.forEach(function(id) { nodeToSuper[id] = 0; });
        var memberPositions = nodes.filter(function(n) { return nodeToSuper[n.id] !== undefined; });
        var avgX = memberPositions.length ? memberPositions.reduce(function(s, n) { return s + n.x; }, 0) / memberPositions.length : width / 2;
        var avgY = memberPositions.length ? memberPositions.reduce(function(s, n) { return s + n.y; }, 0) / memberPositions.length : height / 2;
        var memberNames = groupResult.localGroup.map(function(n) { return n.name; });
        var groupLabel = memberNames.slice(0, 3).join(', ') + (memberNames.length > 3 ? ' +' + (memberNames.length - 3) + '\u4ef6' : '');
        superNodes.push({
            id: '__localGroup',
            name: groupLabel,
            x: avgX, y: avgY,
            vx: 0, vy: 0,
            isCenter: false,
            isLocalGroupSuper: true,
            radius: Math.min(40, Math.max(22, 14 + memberIds.length * 3)),
            depth: 1,
            memberIds: memberIds
        });
    }
    // Remove original nodes that were collapsed into the local group super-node
    nodes = nodes.filter(function(n) { return nodeToSuper[n.id] === undefined; });
    // Add super-nodes
    nodes = nodes.concat(superNodes);
    // Rewire edges: replace member IDs with super-node ID
    localEdges = localEdges.map(function(e) {
        return {
            from: nodeToSuper[e.from] !== undefined ? '__localGroup' : e.from,
            to: nodeToSuper[e.to] !== undefined ? '__localGroup' : e.to
        };
    }).filter(function(e) {
        return e.from !== e.to;
    });

    var localDraggedNode = null;
    var localAnimId = null;
    var isDragging = false;

    canvas.onmousedown = function(e) {
        var rect = canvas.getBoundingClientRect();
        var mx = e.clientX - rect.left, my = e.clientY - rect.top;
        var hit = nodes.find(function(n) { var dx = n.x - mx, dy = n.y - my; return Math.sqrt(dx * dx + dy * dy) < n.radius; });
        if (hit) { localDraggedNode = hit; isDragging = true; }
    };
    canvas.onmousemove = function(e) {
        if (isDragging && localDraggedNode) {
            var rect = canvas.getBoundingClientRect();
            localDraggedNode.x = e.clientX - rect.left;
            localDraggedNode.y = e.clientY - rect.top;
        }
    };
    canvas.onmouseup = function(e) {
        if (localDraggedNode && isDragging) {
            if (localDraggedNode.isLocalGroupSuper) {
                openLocalGroupModal(localDraggedNode.memberIds);
            } else if (localDraggedNode.id !== appState.focusedNodeId) {
                if (localDraggedNode.depth === 2 && localDraggedNode.parentId && appState.nodes[localDraggedNode.parentId]) {
                    setFocusedNode(localDraggedNode.parentId, true);
                }
                setFocusedNode(localDraggedNode.id, true);
                window._renderAll && window._renderAll();
            }
        }
        localDraggedNode = null;
        isDragging = false;
    };

    if (animationFrameId) cancelAnimationFrame(animationFrameId);

    var frameCount = 0;
    function animate() {
        frameCount++;
        ctx.clearRect(0, 0, width, height);
        var center = nodes[0];
        var settled = frameCount > 60;
        if (!settled) {
            nodes.forEach(function(node, i) {
                if (i === 0) return;
                var dx = center.x - node.x, dy = center.y - node.y;
                var dist = Math.sqrt(dx * dx + dy * dy) || 1;
                var force = (dist - radiusDist) * 0.02;
                node.vx += (dx / dist) * force;
                node.vy += (dy / dist) * force;
                nodes.forEach(function(other, j) {
                    if (i === j) return;
                    var odx = node.x - other.x, ody = node.y - other.y;
                    var odist = Math.sqrt(odx * odx + ody * ody) || 1;
                    if (odist < 80) { node.vx += (odx / odist) * 0.8; node.vy += (ody / odist) * 0.8; }
                });
                node.vx *= 0.85; node.vy *= 0.85;
                if (node !== localDraggedNode) { node.x += node.vx; node.y += node.vy; }
            });
        }
        localEdges.forEach(function(edge) {
            var fromNode = nodes.find(function(n) { return n.id === edge.from; });
            var toNode = nodes.find(function(n) { return n.id === edge.to; });
            if (!fromNode || !toNode) return;
            if (fromNode.id === centerNode.id || toNode.id === centerNode.id || fromNode.isCenter || toNode.isCenter) {
                ctx.strokeStyle = '#475569'; ctx.lineWidth = 2;
            } else {
                ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5;
            }
            ctx.beginPath(); ctx.moveTo(fromNode.x, fromNode.y); ctx.lineTo(toNode.x, toNode.y); ctx.stroke();
        });
        nodes.forEach(function(node) {
            ctx.beginPath(); ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
            if (node.isCenter) {
                ctx.fillStyle = '#16a34a'; ctx.fill();
                ctx.strokeStyle = '#bbf7d0'; ctx.lineWidth = 3;
            } else if (parentIds.has(node.id)) {
                ctx.fillStyle = '#0284c7'; ctx.fill();
                ctx.strokeStyle = '#bae6fd'; ctx.lineWidth = 2;
            } else if (localGroupIds.has(node.id)) {
                ctx.fillStyle = '#16a34a'; ctx.fill();
                ctx.strokeStyle = '#bbf7d0'; ctx.lineWidth = 2;
            } else if (node.isLocalGroupSuper) {
                ctx.fillStyle = '#16a34a'; ctx.fill();
                ctx.strokeStyle = '#bbf7d0'; ctx.lineWidth = 3;
            } else if (contextHubIds.has(node.id)) {
                ctx.fillStyle = '#d97706'; ctx.fill();
                ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 2;
            } else if (node.depth === 2) {
                ctx.fillStyle = '#475569'; ctx.fill();
                ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.5;
            } else {
                ctx.fillStyle = '#1e293b'; ctx.fill();
                ctx.strokeStyle = '#475569'; ctx.lineWidth = 2;
            }
            ctx.stroke();
            ctx.fillStyle = '#ffffff';
            ctx.font = node.isCenter ? 'bold 12px sans-serif' : node.depth === 2 ? '10px sans-serif' : '11px sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(node.name, node.x, node.y);
        });
        if (!settled) {
            localAnimId = requestAnimationFrame(animate);
        }
    }
    animate();
    setAnimationFrameId(localAnimId);
}
