import { escapeHtml } from './utils.js';
import { iconCircleInfo, iconCircleCheck, iconTriangleExclamation, iconCircleXmark } from './icons.js';

export function showToast(message, type) {
    type = type || 'info';
    var container = document.getElementById('toastContainer');
    var toast = document.createElement('div');
    var colors = {
        info: 'text-green-600',
        success: 'text-emerald-600',
        warn: 'text-amber-500',
        error: 'text-red-600'
    };
    var iconMap = {
        info: iconCircleInfo,
        success: iconCircleCheck,
        warn: iconTriangleExclamation,
        error: iconCircleXmark
    };
    toast.className = 'pointer-events-auto px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg text-xs text-slate-700 dark:text-slate-200 flex items-center gap-2 toast-enter max-w-xs';
    var iconFn = iconMap[type] || iconCircleInfo;
    toast.innerHTML = iconFn(colors[type] || 'text-green-600') + '<span class="truncate">' + escapeHtml(message) + '</span>';
    container.appendChild(toast);
    setTimeout(function() {
        toast.classList.remove('toast-enter');
        toast.classList.add('toast-exit');
        setTimeout(function() { toast.remove(); }, 300);
    }, 3000);
}
