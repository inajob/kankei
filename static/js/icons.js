// Inline SVG icons replacing Font Awesome
// viewBox 0 0 24 24, fill="none", stroke="currentColor", stroke-linecap="round", stroke-linejoin="round", stroke-width="2"

function ic(paths, extra) {
  return '<svg ' + (extra || '') + 'width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle">' + paths + '</svg>';
}

function fpa(paths, extra) {
  return '<svg ' + (extra || '') + 'width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:middle">' + paths + '</svg>';
}

export function iconNodes(cls) {
  return ic('<circle cx="12" cy="12" r="2.5"/><circle cx="5" cy="5" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><line x1="9.2" y1="9.2" x2="7.2" y2="7.2"/><line x1="14.8" y1="9.2" x2="16.8" y2="7.2"/><line x1="9.2" y1="14.8" x2="7.2" y2="16.8"/><line x1="14.8" y1="14.8" x2="16.8" y2="16.8"/>', cls ? 'class="' + cls + '" ' : '');
}

export function iconEye(cls) {
  return ic('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>', cls ? 'class="' + cls + '" ' : '');
}

export function iconSignIn(cls) {
  return ic('<path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/>', cls ? 'class="' + cls + '" ' : '');
}

export function iconSignOut(cls) {
  return ic('<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>', cls ? 'class="' + cls + '" ' : '');
}

export function iconPen(cls) {
  return ic('<path d="M17 3a2.85 2.85 0 114 4L7.5 20.5 2 22l1.5-5.5z"/>', cls ? 'class="' + cls + '" ' : '');
}

export function iconGear(cls) {
  return ic('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>', cls ? 'class="' + cls + '" ' : '');
}

export function iconSearch(cls) {
  return ic('<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>', cls ? 'class="' + cls + '" ' : '');
}

export function iconXmark(cls) {
  return ic('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>', cls ? 'class="' + cls + '" ' : '');
}

export function iconSpinner(cls) {
  return ic('<path d="M21 12a9 9 0 11-6.219-8.56"/>', cls ? 'class="' + cls + '" ' : '');
}

export function iconTrash(cls) {
  return ic('<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>', cls ? 'class="' + cls + '" ' : '');
}

export function iconLink(cls) {
  return ic('<path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>', cls ? 'class="' + cls + '" ' : '');
}

export function iconPlus(cls) {
  return ic('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>', cls ? 'class="' + cls + '" ' : '');
}

export function iconList(cls) {
  return ic('<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>', cls ? 'class="' + cls + '" ' : '');
}

export function iconDiagramProject(cls) {
  return ic('<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="9" y="15" width="6" height="6" rx="1"/><line x1="9" y1="6" x2="15" y2="6"/><line x1="12" y1="9" x2="12" y2="15"/>', cls ? 'class="' + cls + '" ' : '');
}

export function iconDatabase(cls) {
  return ic('<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>', cls ? 'class="' + cls + '" ' : '');
}

export function iconSliders(cls) {
  return ic('<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>', cls ? 'class="' + cls + '" ' : '');
}

export function iconDownload(cls) {
  return ic('<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>', cls ? 'class="' + cls + '" ' : '');
}

export function iconUserPen(cls) {
  return ic('<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/><path d="M17 11l4-4-2-2-4 4"/>', cls ? 'class="' + cls + '" ' : '');
}

export function iconCompass(cls) {
  return ic('<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>', cls ? 'class="' + cls + '" ' : '');
}

export function iconChevronRight(cls) {
  return ic('<polyline points="9 18 15 12 9 6"/>', cls ? 'class="' + cls + '" ' : '');
}

export function iconLinkSlash(cls) {
  return ic('<path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/><line x1="1" y1="1" x2="23" y2="23"/>', cls ? 'class="' + cls + '" ' : '');
}

export function iconChart(cls) {
  return ic('<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>', cls ? 'class="' + cls + '" ' : '');
}

export function iconCircleInfo(cls) {
  return ic('<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>', cls ? 'class="' + cls + '" ' : '');
}

export function iconCircleCheck(cls) {
  return ic('<circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/>', cls ? 'class="' + cls + '" ' : '');
}

export function iconTriangleExclamation(cls) {
  return fpa('<path d="M12 2L1 21h22L12 2zm0 4l7.53 13H4.47L12 6zm-1 5v4h2v-4h-2zm0 6v2h2v-2h-2z"/>', cls ? 'class="' + cls + '" ' : '');
}

export function iconCircleXmark(cls) {
  return ic('<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>', cls ? 'class="' + cls + '" ' : '');
}

export function iconWikipedia(cls) {
  return ic('<text x="12" y="16" text-anchor="middle" font-weight="bold" font-size="14" stroke="none" fill="currentColor">W</text>', cls ? 'class="' + cls + '" ' : '');
}

export function iconHome(cls) {
  return ic('<path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>', cls ? 'class="' + cls + '" ' : '');
}
