import { sb } from './shared-supabase.js';
import { currentUser, currentUserRole, userCache } from './state.js';
import { setCurrentUser, setCurrentUserRole, setUserCacheEntry } from './state.js';

export async function getUserName(userId) {
    if (!userId) return '不明';
    if (userCache[userId]) return userCache[userId];
    var name = '不明';
    try {
        var res = await sb.from('profiles').select('username, display_name').eq('id', userId).single();
        if (res.data) {
            name = res.data.username || res.data.display_name || '不明';
        }
    } catch (e) {
        console.error('[getUserName] error fetching profile for', userId, e);
    }
    setUserCacheEntry(userId, name);
    return name;
}

export async function checkSession() {
    var res = await sb.auth.getSession();
    if (res.data.session) {
        setCurrentUser(res.data.session.user);
        return true;
    }
    return false;
}

export async function onLoggedIn(loadDataAndRender, subscribeRealtimeFn) {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('userMenu').classList.remove('hidden');
    var desktopMenu = document.getElementById('desktopUserMenu');
    if (desktopMenu) {
        desktopMenu.classList.remove('hidden');
        var desktopLogin = document.getElementById('desktopHeaderLoginBtn');
        if (desktopLogin) desktopLogin.classList.add('hidden');
    }
    var user = currentUser;
    if (user) {
        var avatar = user.user_metadata && user.user_metadata.avatar_url;
        var name = (user.user_metadata && user.user_metadata.full_name) || user.email;
        document.getElementById('userAvatar').src = avatar || '';
        document.getElementById('userAvatar').alt = name;
        document.getElementById('userName').textContent = name;
        document.getElementById('userEmail').textContent = user.email || '';
        var desktopAvatar = document.getElementById('desktopUserAvatar');
        if (desktopAvatar) { desktopAvatar.src = avatar || ''; desktopAvatar.alt = name; }
        var desktopName = document.getElementById('desktopUserName');
        if (desktopName) desktopName.textContent = name;
        var desktopEmail = document.getElementById('desktopUserEmail');
        if (desktopEmail) desktopEmail.textContent = user.email || '';
        try {
            var profileRes = await sb.from('profiles').select('role, username').eq('id', user.id).single();
            if (!profileRes.data) {
                await sb.from('profiles').insert({ id: user.id, display_name: name, avatar_url: avatar || null });
                profileRes = await sb.from('profiles').select('role, username').eq('id', user.id).single();
            }
            setCurrentUserRole((profileRes.data && profileRes.data.role) || 'user');
            if (profileRes.data && profileRes.data.username) {
                var usernameDisplay = profileRes.data.username + ' (' + name + ')';
                document.getElementById('userName').textContent = usernameDisplay;
                if (desktopName) desktopName.textContent = usernameDisplay;
            }
        } catch (e) {
            console.error('[onLoggedIn] error fetching profile', e);
            setCurrentUserRole('user');
        }
        var roleBadge = document.getElementById('userRoleBadge');
        var desktopRoleBadge = document.getElementById('desktopUserRoleBadge');
        if (currentUserRole === 'admin') {
            var badgeHtml = '<span class="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">ADMIN</span>';
            roleBadge.innerHTML = badgeHtml;
            if (desktopRoleBadge) desktopRoleBadge.innerHTML = badgeHtml;
        } else {
            roleBadge.innerHTML = '';
            if (desktopRoleBadge) desktopRoleBadge.innerHTML = '';
        }
    }
    await loadDataAndRender();
    subscribeRealtimeFn();
}

export function setupUsernameHandlers() {
    async function openUsernameModal() {
        document.getElementById('userDropdown').classList.add('hidden');
        document.getElementById('desktopUserDropdown').classList.add('hidden');
        document.getElementById('usernameModal').classList.remove('hidden');
        document.getElementById('usernameError').classList.add('hidden');
        document.getElementById('usernameHint').classList.remove('hidden');
        var input = document.getElementById('usernameInput');
        input.value = '';
        input.focus();
        if (currentUser) {
            try {
                var res = await sb.from('profiles').select('username').eq('id', currentUser.id).single();
                if (res.data && res.data.username) {
                    input.value = res.data.username;
                }
            } catch (e) {
                console.error('[openUsernameModal] error fetching current username', e);
            }
        }
    }
    document.getElementById('editUsernameBtn').onclick = openUsernameModal;
    var desktopEditBtn = document.getElementById('desktopEditUsernameBtn');
    if (desktopEditBtn) desktopEditBtn.onclick = openUsernameModal;

    document.getElementById('closeUsernameModalBtn').onclick = function() {
        document.getElementById('usernameModal').classList.add('hidden');
    };
    document.getElementById('cancelUsernameBtn').onclick = function() {
        document.getElementById('usernameModal').classList.add('hidden');
    };

    document.getElementById('saveUsernameBtn').onclick = async function() {
        var input = document.getElementById('usernameInput');
        var errorEl = document.getElementById('usernameError');
        var username = input.value.trim().toLowerCase();
        if (!username || username.length < 3) {
            errorEl.textContent = 'ユーザー名は3文字以上で入力してください';
            errorEl.classList.remove('hidden');
            return;
        }
        if (!/^[a-z0-9_-]+$/.test(username)) {
            errorEl.textContent = '英数字、アンダースコア、ハイフンのみ使用できます';
            errorEl.classList.remove('hidden');
            return;
        }
        var existing = await sb.from('profiles').select('id').eq('username', username).neq('id', currentUser.id).maybeSingle();
        if (existing.data) {
            errorEl.textContent = 'このユーザー名は既に使用されています';
            errorEl.classList.remove('hidden');
            return;
        }
        var res = await sb.from('profiles').upsert({ id: currentUser.id, username: username }, { onConflict: 'id' });
        if (res.error) {
            errorEl.textContent = '保存に失敗しました: ' + res.error.message;
            errorEl.classList.remove('hidden');
            return;
        }
        errorEl.classList.add('hidden');
        document.getElementById('usernameModal').classList.add('hidden');
        import('./toast.js').then(function(m) { m.showToast('ユーザー名を保存しました', 'success'); });
    };
}
