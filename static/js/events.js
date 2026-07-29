import { setupNavListeners } from './events/nav-events.js';
import { setupAuthListeners } from './events/auth-events.js';
import { setupDataListeners } from './events/data-events.js';
import { setupSearchListeners } from './events/search-events.js';

let listenersSetup = false;

export function setupEventListeners() {
    if (listenersSetup) return;
    listenersSetup = true;
    setupNavListeners();
    setupAuthListeners();
    setupDataListeners();
    setupSearchListeners();
}
