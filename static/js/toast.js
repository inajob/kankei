import { escapeHtml } from './utils.js';

export function showToast(message, type) {
    type = type || 'info';
    var container = document.getElementById('toastContainer');
    var toast = document.createElement('div');
    var colors = {
        info: 'bg-indigo-600',
        success: 'bg-emerald-600',
        warn: 'bg-amber-500',
        error: 'bg-red-600'
    };
    var icons = {
        info: 'fa-circle-info',
        success: 'fa-circle-check',
        warn: 'fa-triangle-exclamation',
        error: 'fa-circle-xmark'
    };
    toast.className = 'pointer-events-auto px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-lg text-xs text-slate-700 flex items-center gap-2 toast-enter max-w-xs';
    toast.innerHTML = '<i class="fa-solid ' + (icons[type] || icons.info) + ' ' + (colors[type] || colors.info) + '"></i><span class="truncate">' + escapeHtml(message) + '</span>';
    container.appendChild(toast);
    setTimeout(function() {
        toast.classList.remove('toast-enter');
        toast.classList.add('toast-exit');
        setTimeout(function() { toast.remove(); }, 300);
    }, 3000);
}
