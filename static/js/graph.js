import { appState } from './state.js';
import { getConnectedNodes } from './utils.js';
import { setFocusedNode } from './utils.js';
import { setAnimationFrameId, setDraggedNode } from './state.js';
import { animationFrameId, draggedNode } from './state.js';

let sb;

export function setSupabaseClient(client) { sb = client; }

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
    if (!appState.focusedNodeId) return;
    var centerNode = appState.nodes[appState.focusedNodeId];
    var connected = getConnectedNodes(appState.focusedNodeId);
    var nodes = [{ id: centerNode.id, name: centerNode.name, x: width / 2, y: height / 2, vx: 0, vy: 0, isCenter: true, radius: 28 }];
    var angleStep = (2 * Math.PI) / (connected.length || 1);
    var radiusDist = Math.min(width, height) * 0.32;
    connected.forEach(function(node, i) {
        var angle = i * angleStep;
        nodes.push({ id: node.id, name: node.name, x: width / 2 + Math.cos(angle) * radiusDist, y: height / 2 + Math.sin(angle) * radiusDist, vx: 0, vy: 0, isCenter: false, radius: 20 });
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
            if (localDraggedNode.id !== appState.focusedNodeId) {
                setFocusedNode(localDraggedNode.id, true);
                window._renderAll && window._renderAll();
            }
        }
        localDraggedNode = null;
        isDragging = false;
    };

    if (animationFrameId) cancelAnimationFrame(animationFrameId);

    function animate() {
        ctx.clearRect(0, 0, width, height);
        var center = nodes[0];
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
        ctx.strokeStyle = '#475569'; ctx.lineWidth = 2;
        nodes.forEach(function(node, i) {
            if (i === 0) return;
            ctx.beginPath(); ctx.moveTo(center.x, center.y); ctx.lineTo(node.x, node.y); ctx.stroke();
        });
        nodes.forEach(function(node) {
            ctx.beginPath(); ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
            ctx.fillStyle = node.isCenter ? '#4f46e5' : '#1e293b'; ctx.fill();
            ctx.strokeStyle = node.isCenter ? '#c7d2fe' : '#475569'; ctx.lineWidth = node.isCenter ? 3 : 2; ctx.stroke();
            ctx.fillStyle = '#ffffff';
            ctx.font = node.isCenter ? 'bold 12px sans-serif' : '11px sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            var label = node.name; if (label.length > 6) label = label.substring(0, 5) + '..';
            ctx.fillText(label, node.x, node.y);
        });
        localAnimId = requestAnimationFrame(animate);
    }
    animate();
    setAnimationFrameId(localAnimId);
}
