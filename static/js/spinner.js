import { iconSpinner } from './icons.js';

export function spinnerHtml(text) {
  return iconSpinner('animate-spin mr-2') + '<span class="text-xs">' + text + '</span>';
}

export function spinnerInline(text) {
  return '<div class="flex items-center justify-center py-6 text-slate-400">' + spinnerHtml(text) + '</div>';
}
