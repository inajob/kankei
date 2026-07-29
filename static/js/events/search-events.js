import { appState, currentUser, activeGlobalSearchIndex, activeConnectSearchIndex } from '../state.js';
import { setActiveGlobalSearchIndex, setActiveConnectSearchIndex } from '../state.js';
import { setFocusedNode, hideDropdown, highlightAutocompleteItem } from '../utils.js';
import { renderGlobalSearchDropdown, renderConnectSearchDropdown, submitConnectInput } from '../search.js';
import { getOrCreateNode } from '../supabase-api.js';
import { renderAll } from '../render.js';

let listenersSetup = false;

export function setupSearchListeners() {
    if (listenersSetup) return;
    listenersSetup = true;

    var globalInput = document.getElementById('globalSearchInput');
    var clearGlobalBtn = document.getElementById('clearGlobalSearch');

    if (globalInput) {
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
                if (e.isComposing) return;
                e.preventDefault();
                if (activeGlobalSearchIndex >= 0 && items[activeGlobalSearchIndex]) {
                    items[activeGlobalSearchIndex].click();
                } else {
                    if (!currentUser) return;
                    var val = globalInput.value.trim();
                    if (val) {
                        getOrCreateNode(val).then(function(node) {
                            if (node) {
                                setFocusedNode(node.id, true);
                                globalInput.value = '';
                                clearGlobalBtn.classList.add('hidden');
                                hideDropdown('globalSearchDropdown');
                                renderAll();
                            }
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
    }

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
            if (e.isComposing) return;
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
}
