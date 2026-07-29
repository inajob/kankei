import { appState } from '../state.js';
import { hideDropdown } from '../utils.js';
import { renderAll } from '../render.js';

let listenersSetup = false;

export function setupNavListeners() {
    if (listenersSetup) return;
    listenersSetup = true;

    function goHome() {
        appState.focusedNodeId = null;
        appState.history = [];
        history.pushState(null, '', window.location.pathname);
        renderAll();
    }
    document.getElementById('homeBtn').onclick = goHome;
    var desktopHomeBtn = document.getElementById('desktopHomeBtn');
    if (desktopHomeBtn) desktopHomeBtn.onclick = goHome;

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

    var toggleAllNodesBtn = document.getElementById('toggleAllNodesBtn');
    if (toggleAllNodesBtn) toggleAllNodesBtn.onclick = function() {
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
        if (!e.target.closest('#desktopUserMenu')) {
            var dd = document.getElementById('desktopUserDropdown');
            if (dd) dd.classList.add('hidden');
        }
    });

    document.getElementById('userAvatarBtn').onclick = function() {
        document.getElementById('userDropdown').classList.toggle('hidden');
    };
    var desktopUserAvatarBtn = document.getElementById('desktopUserAvatarBtn');
    if (desktopUserAvatarBtn) desktopUserAvatarBtn.onclick = function() {
        document.getElementById('desktopUserDropdown').classList.toggle('hidden');
    };
}
