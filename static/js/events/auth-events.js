import { sb } from '../shared-supabase.js';
import { showToast } from '../toast.js';
import { renderAll } from '../render.js';
import { setupUsernameHandlers } from '../auth.js';

let listenersSetup = false;

export function setupAuthListeners() {
    if (listenersSetup) return;
    listenersSetup = true;

    document.getElementById('logoutBtn').onclick = async function() {
        await sb.auth.signOut();
        import('../state.js').then(function(m) { m.resetAppState(); });
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('userMenu').classList.add('hidden');
        document.getElementById('headerLoginBtn').classList.remove('hidden');
        renderAll();
    };
    var desktopLogoutBtn = document.getElementById('desktopLogoutBtn');
    if (desktopLogoutBtn) desktopLogoutBtn.onclick = async function() {
        await sb.auth.signOut();
        import('../state.js').then(function(m) { m.resetAppState(); });
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('userMenu').classList.add('hidden');
        document.getElementById('desktopUserMenu').classList.add('hidden');
        document.getElementById('desktopHeaderLoginBtn').classList.remove('hidden');
        document.getElementById('headerLoginBtn').classList.remove('hidden');
        renderAll();
    };

    document.getElementById('loginBtn').onclick = async function() {
        var base = new URL('.', window.location.href).pathname;
        var res = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + base } });
        if (res.error) showToast('ログインに失敗しました', 'error');
    };

    document.getElementById('guestBtn').onclick = function() {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('headerLoginBtn').classList.remove('hidden');
        var dhl = document.getElementById('desktopHeaderLoginBtn');
        if (dhl) dhl.classList.remove('hidden');
        window._enterGuestMode && window._enterGuestMode();
    };

    function showLoginScreen() {
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('headerLoginBtn').classList.add('hidden');
        var dhl = document.getElementById('desktopHeaderLoginBtn');
        if (dhl) dhl.classList.add('hidden');
    }
    document.getElementById('headerLoginBtn').onclick = showLoginScreen;
    var desktopHeaderLoginBtn = document.getElementById('desktopHeaderLoginBtn');
    if (desktopHeaderLoginBtn) desktopHeaderLoginBtn.onclick = showLoginScreen;

    setupUsernameHandlers();
}
