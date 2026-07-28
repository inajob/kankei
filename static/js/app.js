import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { appState, currentUser, setCurrentUser, currentUserRole, resetAppState } from './state.js';
import { checkSession, onLoggedIn } from './auth.js';
import { subscribeRealtime, setSupabaseClient as setRealtimeClient } from './realtime.js';
import { loadAllData, removeEdge, setSupabaseClient as setApiClient } from './supabase-api.js';
import { renderAll } from './render.js';
import { setFocusedNode, closeDrawer, findNodeByName } from './utils.js';
import { initGraphCanvas, setSupabaseClient as setGraphClient } from './graph.js';
import { setupEventListeners, setSupabaseClient as setEventsClient } from './events.js';
import { setSupabaseClient as setAuthClient } from './auth.js';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

setRealtimeClient(sb);
setApiClient(sb);
setGraphClient(sb);
setAuthClient(sb);
setEventsClient(sb);

window._renderAll = renderAll;
window._getCurrentUserId = function() { return currentUser ? currentUser.id : null; };
window._initGraphCanvas = initGraphCanvas;
window._closeDrawer = closeDrawer;
window._removeEdge = removeEdge;
window._enterGuestMode = enterGuestMode;

async function loadDataAndRender() {
    await loadAllData();
    var hashName = decodeURIComponent(window.location.hash.substring(1));
    if (hashName) {
        var node = findNodeByName(hashName);
        if (node) {
            setFocusedNode(node.id, false);
        }
    }
    setupEventListeners();
    renderAll();
}

window.addEventListener('hashchange', function() {
    var hashName = decodeURIComponent(window.location.hash.substring(1));
    if (hashName) {
        var node = findNodeByName(hashName);
        if (node && appState.focusedNodeId !== node.id) {
            setFocusedNode(node.id, false);
            renderAll();
        }
    } else {
        appState.focusedNodeId = null;
        renderAll();
    }
});

function enterGuestMode() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('headerLoginBtn').classList.remove('hidden');
    var dhl = document.getElementById('desktopHeaderLoginBtn');
    if (dhl) dhl.classList.remove('hidden');
    loadDataAndRender().then(function() {
        subscribeRealtime();
    });
}

async function init() {
    var hasSession = await checkSession();
    if (hasSession) {
        await onLoggedIn(loadDataAndRender, subscribeRealtime);
    } else {
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('headerLoginBtn').classList.remove('hidden');
        var dhl = document.getElementById('desktopHeaderLoginBtn');
        if (dhl) dhl.classList.remove('hidden');
        setupEventListeners();
    }

    sb.auth.onAuthStateChange(async function(event, session) {
        if (event === 'SIGNED_IN' && session) {
            setCurrentUser(session.user);
            document.getElementById('headerLoginBtn').classList.add('hidden');
            var dhl = document.getElementById('desktopHeaderLoginBtn');
            if (dhl) dhl.classList.add('hidden');
            await onLoggedIn(loadDataAndRender, subscribeRealtime);
        } else if (event === 'SIGNED_OUT') {
            resetAppState();
            document.getElementById('loginScreen').classList.remove('hidden');
            document.getElementById('userMenu').classList.add('hidden');
            document.getElementById('headerLoginBtn').classList.remove('hidden');
            var du = document.getElementById('desktopUserMenu');
            if (du) du.classList.add('hidden');
            var dhl2 = document.getElementById('desktopHeaderLoginBtn');
            if (dhl2) dhl2.classList.remove('hidden');
            renderAll();
        }
    });
}

init();
