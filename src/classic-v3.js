// ==UserScript==
// @name         Toledo Mobile
// @namespace    https://toledo.kuleuven.be/portal
// @version      3.1.0
// @description  Phone-friendly KU Leuven Toledo: portal, Blackboard Ultra (courses, activity, grades, PDFs, weblectures) and KU Loket (exam schedule, timetable). Same structure and features, laid out for an iPhone.
// @match        https://toledo.kuleuven.be/portal/*
// @match        https://ultra.edu.kuleuven.cloud/ultra/*
// @match        https://webwsp.aps.kuleuven.be/sap/bc/ui2/flp*
// @run-at       document-start
// @inject-into  content
// @grant        none
// ==/UserScript==

/*
  Only on screens up to 767px wide (desktop is untouched). It only changes how pages look and adds navigation;
  it reads nothing and sends nothing anywhere.
  - Portal (toledo.kuleuven.be/portal): cards, compact course list, menu sheet, bottom tab bar.
  - Course pages (ultra.edu.kuleuven.cloud): pill tabs, clean cards, long descriptions folded ("Meer"), same tab bar.
  - Exam schedule (KU Loket IER): calendar-style date tiles with a countdown; timetable as a day-by-day list; other KU Loket lists get the card look.
  - Files: 'Open PDF' (or video/slides) buttons that open the file in Safari's own viewer; weblectures get 'Open apart' for a full-screen player.
  - Activity stream, grades and Blackboard's own headers restyled for a phone.
  - "Klassieke weergave" (portal menu) switches the portal back; a small button switches it on again.
*/
(() => {
  'use strict';
  if (window.top !== window && !window.__TM_TEST__) return; // top frame only
  if (window.__TM_LOADED__) return;
  window.__TM_LOADED__ = true;

  const SITE = { 'toledo.kuleuven.be': 'portal', 'ultra.edu.kuleuven.cloud': 'ultra', 'webwsp.aps.kuleuven.be': 'loket' }[location.hostname];
  if (!SITE) return;

  const PORTAL = 'https://toledo.kuleuven.be/portal/';
  const OFF_KEY = 'toledo-mobile-off';
  const root = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const isOff = () => { try { return localStorage.getItem(OFF_KEY) === '1'; } catch (_) { return false; } };

  /* ================================================================== CSS */
  const SHARED_CSS = String.raw`html.tm-on {
  --tm-bg: #f2f2f7; --tm-card: #fff; --tm-text: #1c1c1e; --tm-sub: #6e6e73; --tm-sep: rgba(60,60,67,.16);
  --tm-blue: #1d6f99; --tm-head: #124c6b; --tm-red: #ff3b30; --tm-tab-h: 58px;
  --tm-font: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", system-ui, sans-serif;
  -webkit-text-size-adjust: 100%;
}
/* ---------- bottom tab bar ---------- */
html.tm-on #tm-tabbar {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 1031; display: flex;
  height: calc(var(--tm-tab-h) + env(safe-area-inset-bottom)); padding: 0 4px env(safe-area-inset-bottom);
  background: rgba(249,249,251,.92); -webkit-backdrop-filter: saturate(180%) blur(20px); backdrop-filter: saturate(180%) blur(20px);
  border-top: .5px solid rgba(0,0,0,.18);
}
html.tm-on #tm-tabbar a {
  position: relative; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
  color: #8e8e93; text-decoration: none; font: 500 10.5px/1 var(--tm-font); -webkit-tap-highlight-color: transparent;
}
html.tm-on #tm-tabbar a.tm-active { color: var(--tm-blue); }
html.tm-on #tm-tabbar svg { width: 25px; height: 25px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
html.tm-on #tm-tabbar a.tm-active svg { stroke-width: 2.2; }
html.tm-on #tm-tabbar .tm-badge {
  position: absolute; top: 5px; left: calc(50% + 6px); min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px;
  background: var(--tm-red); color: #fff; font: 600 11px/18px var(--tm-font); text-align: center; box-sizing: border-box;
}
html.tm-on #tm-tabbar .tm-badge:empty { display: none; }

html.tm-on:not(.tm-tabs) #tm-tabbar { display: none !important; }
html.tm-on #tm-tabbar a.tm-ext-active { color: var(--tm-blue); }
`;

  const PORTAL_CSS = String.raw`

html.tm-on body {
  background: var(--tm-bg) !important; color: var(--tm-text) !important;
  font-family: var(--tm-font) !important;
  padding-bottom: calc(var(--tm-tab-h) + env(safe-area-inset-bottom) + 12px) !important;
}
html.tm-on :is(h1,h2,h3,h4,h5,h6,p,a,li,label,input,button,select,textarea,small,strong,.btn,.panel,.badge,.lu-title,.lu-id,.tol-title):not([class*="glyphicon"]):not([class*="fa-"]):not(.lu-type-icon) {
  font-family: var(--tm-font) !important;
}

/* ---------- header ---------- */
html.tm-on nav.navbar-primary {
  background: var(--tm-head) !important; background-image: none !important; border: 0 !important;
  box-shadow: 0 .5px 0 rgba(0,0,0,.15) !important;
}
html.tm-on nav.navbar-primary button.navbar-toggle { display: none !important; }
html.tm-on #tol-primary-navigation > li:has(> a[href="#/home"]),
html.tm-on #tol-primary-navigation > li:has(> a[href="#/messages"]),
html.tm-on #tol-primary-navigation > li:has(> a[href="#/updates"]) { display: none !important; }
html.tm-on #tm-title {
  display: inline-block; color: #fff; font: 700 22px/1 var(--tm-font); letter-spacing: -.3px;
  padding: 14px 0 0 2px; margin: 0;
}
html.tm-on #tm-title b { font-weight: 700; color: #9fd3ec; }
html.tm-on #portal-search { padding: 0 2px 10px; }
html.tm-on #portal-search input.form-control {
  height: 38px !important; border-radius: 10px 0 0 10px !important; border: 0 !important; box-shadow: none !important;
  background: rgba(255,255,255,.96) !important; font-size: 16px !important; padding-left: 12px !important;
}
html.tm-on #portal-search .input-group-btn .btn {
  height: 38px !important; border-radius: 0 10px 10px 0 !important; border: 0 !important;
  background: #2b8fc1 !important; color: #fff !important; font-weight: 600 !important; padding: 0 14px !important;
}
html.tm-on #tol-primary-navigation .badge { background: var(--tm-red) !important; font-weight: 600 !important; }
html.tm-on #tol-primary-navigation > li > a > .glyphicon-envelope { font-size: 20px; color: #fff; vertical-align: middle; }
html.tm-on #tol-primary-navigation > li > a:has(> .glyphicon-envelope) > .badge {
  position: relative !important; display: inline-block !important; top: -9px; left: auto !important; right: auto !important;
  height: 17px !important; min-width: 17px; margin: 0 0 0 -7px !important; padding: 0 5px !important;
  font-size: 10.5px !important; line-height: 17px !important; border-radius: 9px !important; vertical-align: middle;
}

/* ---------- page + cards ---------- */
html.tm-on .main-content, html.tm-on .main-content > .container-fluid { background: transparent !important; }
html.tm-on .main-content .no-side-padding { padding-left: 0 !important; padding-right: 0 !important; }
html.tm-on .main-content .panel {
  background: var(--tm-card) !important; border: 0 !important; border-radius: 14px !important;
  box-shadow: none !important; margin: 0 12px 18px !important; overflow: hidden;
  scroll-margin-top: calc(var(--tm-hh, 110px) + 10px);
}
html.tm-on .main-content .panel > .panel-heading,
html.tm-on .main-content .panel > .panel-heading.tol-panel-title {
  background: transparent !important; border: 0 !important; color: var(--tm-text) !important;
  font: 700 20px/1.2 var(--tm-font) !important; letter-spacing: -.2px; padding: 16px 16px 8px !important;
}
html.tm-on .main-content .panel-heading .panel-title { font: inherit !important; color: inherit !important; }
html.tm-on .main-content .panel-body { padding: 0 !important; background: transparent !important; }

/* ---------- Informatie ---------- */
html.tm-on .tol-information .tol-info-links { margin: 0 !important; padding: 0 0 6px !important; list-style: none; }
html.tm-on .tol-information .tol-info-links a {
  display: block; padding: 10px 16px; font-size: 16px; color: var(--tm-blue) !important;
}

/* ---------- Uurrooster ---------- */
html.tm-on .tol-upcoming .panel-heading .time-table-link { color: var(--tm-blue) !important; }
html.tm-on .tol-upcoming-list { margin: 0 !important; padding: 0 0 4px !important; }
html.tm-on .tol-upcoming-list .list-group-item {
  display: flex !important; align-items: center; gap: 14px; float: none !important;
  margin: 0 0 0 16px !important; padding: 10px 16px 10px 10px !important; background: transparent !important;
  border-top: 0 !important; border-right: 0 !important; border-bottom: .5px solid var(--tm-sep) !important;
  border-left-width: 4px !important; border-radius: 0 !important; min-height: 0 !important;
}
html.tm-on .tol-upcoming-list .list-group-item:last-child { border-bottom: 0 !important; }
html.tm-on .tol-upcoming .panel-body > div:first-child:not(:empty),
html.tm-on .tol-enrollments .centered-text {
  padding: 0 16px 8px !important; font-size: 13px !important; color: var(--tm-sub) !important; text-align: left !important;
}
html.tm-on .tol-upcoming .panel-body > div:last-child:not(:first-child) { padding: 8px 16px 14px !important; }
html.tm-on .tol-upcoming .panel-body > div:last-child:not(:first-child) a { color: var(--tm-blue) !important; font-size: 15px !important; }
html.tm-on .tol-upcoming-timespan {
  float: none !important; flex: none; width: 76px !important; margin: 0 !important; padding: 0 !important;
  border: 0 !important; text-align: left !important;
}
html.tm-on .tol-upcoming-timespan-from::before { display: none !important; }
html.tm-on .tol-upcoming-timespan-timeblock { display: block; font-size: 15px !important; line-height: 1.25 !important; }
html.tm-on .tol-upcoming-timespan-from { font-weight: 600 !important; font-size: 15px !important; color: var(--tm-text) !important; }
html.tm-on .tol-upcoming-timespan-till { font-weight: 400 !important; font-size: 13px !important; color: var(--tm-sub) !important; }
html.tm-on .tol-upcoming-timespan-till::before, html.tm-on .tol-upcoming-timespan-from::after { display: none !important; }
html.tm-on .tol-upcoming-timespan-date { font-size: 11.5px !important; color: var(--tm-sub) !important; margin-top: 2px; white-space: nowrap; }
html.tm-on .tol-upcoming-description { float: none !important; flex: 1; min-width: 0; margin: 0 !important; padding: 0 !important; border: 0 !important; }
html.tm-on .tol-upcoming-title strong { font-size: 16px !important; font-weight: 600 !important; color: var(--tm-text) !important; }
html.tm-on .tol-upcoming-location { display: inline-block; margin-top: 3px; font-size: 13.5px !important; color: var(--tm-sub) !important; }
html.tm-on .tol-upcoming .panel-body > a, html.tm-on .tol-upcoming > a, html.tm-on .tol-upcoming .panel-footer {
  display: block; padding: 10px 16px 14px !important; color: var(--tm-blue) !important; font-size: 15px; background: transparent !important; border: 0 !important;
}

/* ---------- Updates en communicatie (home widget) ---------- */
html.tm-on .tol-events-list .tol-event {
  position: relative !important; width: auto !important; margin: 0 !important; padding: 0 0 0 58px !important;
  border: 0 !important; background: transparent !important;
}
html.tm-on .tol-events-list .tol-event::before, html.tm-on .tol-events-list .tol-event::after { left: 12px !important; top: 11px !important; }
html.tm-on .tol-events-list .tol-event > a {
  display: block; padding: 11px 14px 11px 0 !important; text-decoration: none !important; background: transparent !important;
  border-bottom: .5px solid var(--tm-sep);
}
html.tm-on .tol-events-list .tol-event:last-child > a { border-bottom: 0; }
html.tm-on .tol-events-list .tol-title {
  font-size: 15.5px !important; font-weight: 600 !important; color: var(--tm-text) !important; margin: 0 0 2px !important;
  padding-right: 74px !important; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
html.tm-on .tol-events-list .tol-date { font-size: 12.5px !important; color: var(--tm-sub) !important; right: 14px !important; top: 13px !important; }
html.tm-on .tol-events-list .tol-is-new { display: none !important; }
html.tm-on .tol-events-list .tol-source { display: block; margin-top: 3px; font-size: 13px !important; color: var(--tm-blue) !important; }
html.tm-on .tol-events-list .tol-event.tol-unread-item .tol-title::before {
  content: ""; display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #2b8fc1; margin: 0 6px 2px 0; vertical-align: middle;
}
html.tm-on .tol-events-list .tol-what-happened {
  display: -webkit-box !important; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  font-size: 14px !important; color: var(--tm-sub) !important; line-height: 1.35 !important;
}
html.tm-on .tol-events-widget .panel-footer, html.tm-on .tol-events-widget .panel-body > a {
  display: block; background: transparent !important; border: 0 !important; padding: 10px 16px 14px !important; color: var(--tm-blue) !important;
}

/* ---------- Cursussen (enrollments): tiles become list rows ---------- */
html.tm-on .tol-enrollments > .panel-heading { display: flex !important; flex-wrap: wrap; align-items: center; gap: 10px; padding: 16px 16px 10px !important; }
html.tm-on .tol-enrollments > .panel-heading::before { content: "Cursussen"; font: 700 20px/1.2 var(--tm-font); color: var(--tm-text); flex: 1 1 100%; }
html.tm-on .tol-enrollments .toledo-filter-bar { display: flex !important; flex-wrap: wrap; align-items: center; gap: 8px; margin: 0 !important; flex: 1 1 100%; min-width: 0; }
html.tm-on .tol-enrollments .toledo-filter-bar > * { float: none !important; margin: 0 !important; }
html.tm-on .tol-enrollments .toledo-filter-bar-input { order: 1; flex: 1 1 100%; position: static !important; width: auto !important; }
html.tm-on .tol-enrollments .toledo-filter-bar-input .input-group-addon {
  display: flex !important; align-items: center; width: auto !important; height: 36px !important; padding: 0 12px !important;
  border: 0 !important; border-radius: 0 9px 9px 0 !important; background: #e9e9ee !important; color: var(--tm-sub) !important;
}
html.tm-on .tol-enrollments .toledo-filter-bar-input .input-group { display: flex !important; width: 100% !important; }
html.tm-on .tol-enrollments .toledo-filter-bar-input input.form-control {
  flex: 1; height: 36px !important; border-radius: 9px 0 0 9px !important; border: 0 !important; background: #e9e9ee !important;
  box-shadow: none !important; font-size: 16px !important;
}
html.tm-on .tol-enrollments .toledo-filter-bar-input .input-group-btn .btn { height: 36px !important; border-radius: 0 9px 9px 0 !important; }
html.tm-on .tol-enrollments .toledo-filter-bar-select { order: 2; flex: 1 1 auto; }
html.tm-on .tol-enrollments .toledo-filter-options { order: 3; flex: none; display: flex !important; gap: 6px; }
html.tm-on .tol-enrollments .toledo-filter-options .btn { height: 32px; min-width: 36px; }
html.tm-on .tol-enrollments .toledo-filter-display-style { display: none !important; }
html.tm-on .tol-enrollments .toledo-filter-bar .btn {
  border-radius: 8px !important; border: 0 !important; background: #e9e9ee !important; color: var(--tm-text) !important;
  font-size: 13px !important; box-shadow: none !important;
}
html.tm-on .tol-enrollments .toledo-filter-bar-select { min-width: 0; }
html.tm-on .tol-enrollments .toledo-filter-bar-select > .btn { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
html.tm-on .tol-enrollments .dropdown-menu { font-size: 15px; border-radius: 12px !important; border: 0 !important; box-shadow: 0 8px 30px rgba(0,0,0,.18) !important; }
html.tm-on .tol-enrollments .dropdown-menu > li > a { padding: 9px 16px !important; }
html.tm-on .tol-enrollments .panel-body > .row, html.tm-on .tol-enrollments .row { margin: 0 !important; }
html.tm-on .tol-enrollment-container {
  width: 100% !important; float: none !important; padding: 0 !important; margin: 0 !important;
}
html.tm-on .enrollment-tile-item {
  display: flex !important; align-items: center; gap: 8px; position: relative !important;
  height: auto !important; min-height: 60px !important; margin: 0 !important; padding: 0 8px 0 0 !important;
  border-radius: 0 !important; box-shadow: none !important; background: var(--tm-card) !important; background-image: none !important;
  border-top: 0 !important; border-right: 0 !important; border-bottom: .5px solid var(--tm-sep) !important; border-left-width: 4px !important;
  transform: none !important;
}
html.tm-on .tol-enrollment-container:last-child .enrollment-tile-item { border-bottom: 0 !important; }
html.tm-on .enrollment-tile-item .image-container { display: none !important; }
html.tm-on .enrollment-tile-item .enrollment-clickable-area {
  flex: 1; min-width: 0; display: block !important; position: static !important; height: auto !important;
  padding: 10px 4px 10px 12px !important; text-decoration: none !important; background: transparent !important;
}
html.tm-on .enrollment-tile-item .learning-unit-info {
  position: static !important; height: auto !important; min-height: 0 !important; padding: 0 !important; margin: 0 !important;
  background: transparent !important; background-image: none !important; border: 0 !important;
}
html.tm-on .enrollment-tile-item .learning-unit-info > .lu-type-icon { display: none !important; }
html.tm-on .enrollment-tile-item .lu-title {
  font-size: 16px !important; font-weight: 600 !important; line-height: 1.3 !important; color: var(--tm-text) !important;
  margin: 0 !important; padding: 0 !important; height: auto !important; max-height: none !important;
  display: -webkit-box !important; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; white-space: normal !important;
}
html.tm-on .enrollment-tile-item .lu-id {
  font-size: 12.5px !important; color: var(--tm-sub) !important; margin: 2px 0 0 !important; padding: 0 !important;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
html.tm-on .enrollment-tile-item .lu-id .fa-solid { font-size: 10px; margin-right: 3px; }
html.tm-on .enrollment-tile-item .functionality-info {
  position: static !important; display: flex !important; align-items: center; gap: 2px; flex: none;
  height: auto !important; padding: 0 !important; margin: 0 !important; background: transparent !important; border: 0 !important;
}
html.tm-on .enrollment-tile-item .functionality-info .actions-block { display: flex !important; align-items: center; gap: 2px; float: none !important; position: static !important; }
html.tm-on .enrollment-tile-item .functionality-info a {
  position: relative; display: inline-flex !important; align-items: center; justify-content: center;
  width: 30px; height: 40px; padding: 0 !important; margin: 0 !important; float: none !important; color: #8e8e93 !important;
}
html.tm-on .enrollment-tile-item .favorite-indicator { position: static !important; order: 0; }
html.tm-on .enrollment-tile-item .favorite-indicator .fa-star { color: #ffcc00; }
html.tm-on .enrollment-tile-item .favorite-indicator .fa-regular.fa-star { color: #c7c7cc; }
html.tm-on .enrollment-tile-item .toledo-events-badge { position: absolute !important; top: 3px !important; right: -1px !important; left: auto !important; }
html.tm-on .enrollment-tile-item .toledo-events-badge .badge { background: var(--tm-red) !important; font-size: 10.5px !important; padding: 2px 5px !important; min-width: 17px; }
html.tm-on .enrollment-tile-item.enrollment-unavailable .enrollment-clickable-area { opacity: .5; }

/* ---------- Updates / Communicatie pages (timeline) ---------- */
html.tm-on .two-column-timeline > .panel-heading { padding: 12px !important; background: transparent !important; }
html.tm-on .two-column-timeline .tol-filter-bar { display: flex !important; flex-wrap: wrap; gap: 8px; margin: 0 !important; }
html.tm-on .two-column-timeline .tol-filter-bar > * { float: none !important; margin: 0 !important; }
html.tm-on .two-column-timeline .tol-filter-bar-input { order: 1; flex: 1 1 0; min-width: 0; position: static !important; width: auto !important; }
html.tm-on .two-column-timeline .tol-filter-bar > .dropdown:not(.tol-filter-bar-select) { order: 2; flex: none; }
html.tm-on .two-column-timeline .tol-filter-bar-select { order: 3; flex: 1 1 100%; }
html.tm-on .two-column-timeline .tol-filter-bar-input .input-group { display: flex !important; width: 100% !important; }
html.tm-on .two-column-timeline .tol-filter-bar-input input.form-control { flex: 1; border-radius: 9px 0 0 9px !important; }
html.tm-on .two-column-timeline .tol-filter-bar-input .input-group-addon,
html.tm-on .two-column-timeline .tol-filter-bar-input .input-group-btn .btn {
  display: flex !important; align-items: center; width: auto !important; height: 36px !important; padding: 0 12px !important;
  border: 0 !important; border-radius: 0 9px 9px 0 !important; background: #e9e9ee !important; color: var(--tm-sub) !important;
}
html.tm-on .two-column-timeline .tol-filter-bar input.form-control, html.tm-on .two-column-timeline .tol-filter-bar .btn {
  border-radius: 9px !important; border: 0 !important; background: #e9e9ee !important; box-shadow: none !important; font-size: 15px !important; height: 36px;
}
html.tm-on .tol-timeline { padding: 0 !important; margin: 0 !important; }
html.tm-on .tol-timeline::before, html.tm-on .tol-timeline-body::before, html.tm-on .tol-timeline-entry::before { display: none !important; }
html.tm-on .tol-timeline-heading { padding: 14px 16px 6px !important; margin: 0 !important; background: transparent !important; border: 0 !important; }
html.tm-on .tol-timeline-heading h4 {
  display: flex; align-items: center; gap: 8px; margin: 0 !important; padding: 0 !important; background: transparent !important; border: 0 !important;
  font: 600 13px/1.2 var(--tm-font) !important; text-transform: uppercase; letter-spacing: .3px; color: var(--tm-sub) !important;
}
html.tm-on .tol-timeline-body { margin: 0 !important; padding: 0 !important; }
html.tm-on .tol-timeline-entry {
  display: flex !important; align-items: flex-start; gap: 0; float: none !important; width: auto !important;
  margin: 0 0 0 16px !important; padding: 11px 12px 11px 0 !important; border-bottom: .5px solid var(--tm-sep) !important; background: transparent !important;
}
html.tm-on .tol-timeline-entry:last-child { border-bottom: 0 !important; }
html.tm-on .tol-timeline-stat { display: none !important; }
html.tm-on .tol-timeline-label {
  position: relative; float: none !important; width: auto !important; flex: 1; min-width: 0; margin: 0 !important; padding: 0 !important;
  background: transparent !important; border: 0 !important; box-shadow: none !important;
}
html.tm-on .tol-timeline-label::before, html.tm-on .tol-timeline-label::after { display: none !important; }
html.tm-on .tol-timeline-label > a { display: block; text-decoration: none !important; padding-right: 28px; }
html.tm-on .tol-timeline-label-content { padding: 0 !important; margin: 0 !important; background: transparent !important; border: 0 !important; }
html.tm-on .tol-timeline-what-happened { font-size: 13.5px !important; color: var(--tm-sub) !important; padding: 0 !important; margin: 0 0 2px !important; }
html.tm-on .tol-timeline-title {
  font: 600 16px/1.3 var(--tm-font) !important; color: var(--tm-text) !important; margin: 0 !important; padding: 0 !important; border: 0 !important;
}
html.tm-on .tol-timeline-label-footer {
  padding: 0 !important; margin: 4px 0 0 !important; background: transparent !important; border: 0 !important;
  font-size: 13px !important; color: var(--tm-blue) !important; font-style: normal !important;
}
html.tm-on .tol-timeline-dissmiss-buttons { position: absolute !important; top: -2px; right: 0; }
html.tm-on .tol-timeline-dissmiss-buttons .btn-link { color: #c7c7cc !important; padding: 4px 6px !important; }
html.tm-on .tol-timeline-entry.unread .tol-timeline-title::before {
  content: ""; display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #2b8fc1; margin: 0 6px 2px 0; vertical-align: middle;
}

/* ---------- menu (Toledo's own secondary navigation) as a full sheet ---------- */
html.tm-on nav.navbar-secondary.in, html.tm-on nav.navbar-secondary.collapsing {
  position: fixed !important; top: var(--tm-hh, 110px) !important; left: 0; right: 0;
  bottom: calc(var(--tm-tab-h) + env(safe-area-inset-bottom)) !important; height: auto !important; max-height: none !important;
  overflow-y: auto !important; -webkit-overflow-scrolling: touch; z-index: 1029 !important;
  background: var(--tm-bg) !important; border: 0 !important; margin: 0 !important; padding: 12px 0 24px !important;
}
html.tm-on nav.navbar-secondary .container-fluid, html.tm-on nav.navbar-secondary .row, html.tm-on nav.navbar-secondary .col-xs-12 { padding: 0 !important; margin: 0 !important; }
html.tm-on #tol-secundairy-navigation {
  float: none !important; margin: 0 12px !important; padding: 0 !important; background: var(--tm-card); border-radius: 14px; overflow: hidden;
}
html.tm-on #tol-secundairy-navigation > li { float: none !important; display: block !important; border-bottom: .5px solid var(--tm-sep); }
html.tm-on #tol-secundairy-navigation > li:last-child { border-bottom: 0; }
html.tm-on #tol-secundairy-navigation > li > a {
  display: flex !important; align-items: center; justify-content: space-between; padding: 14px 16px !important;
  font-size: 17px !important; color: var(--tm-text) !important; background: transparent !important;
}
html.tm-on #tol-secundairy-navigation > li > a .caret { border: 0 !important; width: 9px; height: 9px; margin: 0 4px 0 0;
  border-right: 2px solid #c7c7cc !important; border-bottom: 2px solid #c7c7cc !important; transform: rotate(45deg); transition: transform .2s; }
html.tm-on #tol-secundairy-navigation > li.open > a .caret { transform: rotate(225deg); }
html.tm-on #tol-secundairy-navigation .dropdown-menu {
  position: static !important; float: none !important; display: none; width: auto !important; margin: 0 !important; padding: 0 0 6px !important;
  background: transparent !important; border: 0 !important; box-shadow: none !important;
}
html.tm-on #tol-secundairy-navigation > li.open > .dropdown-menu { display: block !important; }
html.tm-on #tol-secundairy-navigation .dropdown-menu > li > a {
  padding: 10px 16px 10px 30px !important; font-size: 16px !important; color: var(--tm-blue) !important; white-space: normal !important; background: transparent !important;
}
html.tm-on #tol-secundairy-navigation .dropdown-menu > li.dropdown-header { padding: 8px 16px 2px 30px !important; font-size: 12px; text-transform: uppercase; color: var(--tm-sub); }
html.tm-on #tm-classic {
  display: block; margin: 18px auto 0; padding: 10px 16px; border: 0; background: transparent;
  color: var(--tm-sub); font: 14px var(--tm-font); text-decoration: underline;
}

`;

  const ULTRA_CSS = String.raw`
/* ---------- type + page ---------- */
html.tm-on body, html.tm-on :is(button, input, textarea, select, h1, h2, h3, h4, h5, .MuiTypography-root, .MuiButtonBase-root, .MuiInputBase-root) {
  font-family: var(--tm-font) !important;
}
html.tm-on body { -webkit-font-smoothing: antialiased; }
html.tm-on .course-content-container, html.tm-on main.course-main-content,
html.tm-on section.course-outline-content, html.tm-on .course-outline, html.tm-on .course-outline-grid, html.tm-on .outline-column {
  background: var(--tm-bg) !important;
}
html.tm-on.tm-tabs section.course-outline-content, html.tm-on.tm-tabs section.route-view-container.course-tool-content,
html.tm-on.tm-tabs .course-tool-content > section { padding-bottom: calc(var(--tm-tab-h) + env(safe-area-inset-bottom) + 28px) !important; }

/* ---------- course tabs: dark strip with arrow -> scrollable pills ---------- */
html.tm-on bb-course-navigation [role=toolbar] {
  background: #fff !important; color: var(--tm-text) !important; min-height: 0 !important;
  border-bottom: .5px solid var(--tm-sep) !important; box-shadow: none !important;
}
html.tm-on bb-course-navigation .js-course-navigation > button,
html.tm-on bb-course-navigation [role=toolbar] > div > button.MuiIconButton-root { display: none !important; }
html.tm-on bb-course-navigation .js-course-navigation > div {
  overflow-x: auto !important; overflow-y: hidden !important; scrollbar-width: none; -webkit-overflow-scrolling: touch; mask-image: none !important;
}
html.tm-on bb-course-navigation .js-course-navigation > div::-webkit-scrollbar { display: none; }
html.tm-on bb-course-navigation ul.bb-ui-navigation-list-horizontal {
  display: flex !important; flex-wrap: nowrap !important; gap: 8px; margin: 0 !important; padding: 9px 12px !important; width: max-content;
}
html.tm-on bb-course-navigation ul.bb-ui-navigation-list-horizontal > li { flex: none; margin: 0 !important; padding: 0 !important; }
html.tm-on bb-course-navigation nav a {
  display: inline-flex !important; align-items: center; gap: 6px; height: 34px; min-height: 0 !important; padding: 0 14px !important;
  border: 0 !important; border-radius: 17px !important; box-shadow: none !important;
  background: #ececf1 !important; color: var(--tm-text) !important; font: 600 14.5px/1 var(--tm-font) !important;
}
html.tm-on bb-course-navigation nav a * { color: inherit !important; font: inherit !important; }
html.tm-on bb-course-navigation nav a.active { background: var(--tm-head) !important; color: #fff !important; }
html.tm-on bb-course-navigation nav a::before, html.tm-on bb-course-navigation nav a::after { display: none !important; }

/* ---------- Course Staff / Details & Actions ---------- */
html.tm-on section.course-outline-content .MuiAccordion-root {
  border: 0 !important; border-radius: 14px !important; box-shadow: none !important; overflow: hidden; background: var(--tm-card) !important;
}
html.tm-on section.course-outline-content .MuiAccordion-root::before { display: none !important; }
html.tm-on section.course-outline-content .outline-action-block { border: 0 !important; border-radius: 14px !important; overflow: hidden; box-shadow: none !important; }
html.tm-on section.course-outline-content .MuiAccordionSummary-root { min-height: 52px !important; }
html.tm-on section.course-outline-content .MuiAccordionSummary-content :is(h2, h3, .MuiTypography-root) { font: 700 18px/1.2 var(--tm-font) !important; }
html.tm-on li.js-instructor-list-item { padding-top: 6px !important; padding-bottom: 6px !important; }

/* ---------- content list ---------- */
html.tm-on react-course-content-header :is(h2, h3) { font: 700 22px/1.2 var(--tm-font) !important; letter-spacing: -.2px; }
html.tm-on react-course-content-outline .content-list-item > div {
  border: 0 !important; border-radius: 14px !important; box-shadow: none !important; overflow: hidden;
}
html.tm-on react-course-content-outline .itemContainer { border-radius: 14px !important; }
html.tm-on react-course-content-outline .content-list-item .content-list-item .itemContainer { border-radius: 0 !important; }
html.tm-on react-course-content-outline h3, html.tm-on react-course-content-outline h3 button {
  font: 600 16px/1.3 var(--tm-font) !important; color: var(--tm-text) !important; text-decoration: none !important;
}
html.tm-on react-course-content-outline .js-description, html.tm-on react-course-content-outline .js-description * {
  font-size: 14.5px !important; line-height: 1.42 !important; color: var(--tm-sub) !important;
}
html.tm-on react-course-content-outline .js-description a { color: var(--tm-blue) !important; }
html.tm-on .js-description.tm-clamp:not(.tm-open) {
  display: -webkit-box !important; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden !important; max-height: 4.4em;
}
html.tm-on .tm-more {
  display: block; align-self: flex-start; text-align: left; margin: 2px 0 0; padding: 4px 0; border: 0; background: none; cursor: pointer;
  color: var(--tm-blue); font: 600 14px var(--tm-font);
}
html.tm-on .js-completion-chart [role=progressbar] { border-radius: 3px; overflow: hidden; }

/* ---------- list pages (Announcements, ...): rows that wrap instead of one cut-off line ---------- */
html.tm-on .tabular-list-container, html.tm-on .tabular-list { background: var(--tm-bg) !important; }
html.tm-on tr.announcement-item-row { background: var(--tm-card) !important; }
html.tm-on tr.announcement-item-row > td { border: 0 !important; border-bottom: .5px solid var(--tm-sep) !important; background: transparent !important; padding-top: 12px !important; padding-bottom: 12px !important; }
html.tm-on tr.announcement-item-row > td.announcement-header-column { width: 100% !important; max-width: none !important; }
html.tm-on tr.announcement-item-row :is(.announcement-header, .click-message-detail, .announcement-title-detail) { flex: 1 1 auto !important; min-width: 0 !important; max-width: none !important; }
html.tm-on tr.announcement-item-row a.list-item-title { max-width: none !important; width: auto !important; }
html.tm-on a.list-item-title {
  display: -webkit-box !important; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden !important;
  white-space: normal !important; text-overflow: clip !important; font: 600 16px/1.3 var(--tm-font) !important; color: var(--tm-text) !important;
}
html.tm-on p.list-item-body {
  display: -webkit-box !important; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden !important;
  white-space: normal !important; text-overflow: clip !important; margin-top: 3px !important; text-align: left !important;
  font: 400 14.5px/1.4 var(--tm-font) !important; color: var(--tm-sub) !important;
}
html.tm-on span.list-item-date-sent { font: 500 12.5px var(--tm-font) !important; color: var(--tm-sub) !important; }
html.tm-on tr.announcement-item-row:not(.is-read) a.list-item-title::before {
  content: ""; display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #2b8fc1; margin: 0 6px 2px 0; vertical-align: middle;
}

/* ---------- Blackboard's own page header (Activiteit, Cijfers, Berichten, ...) ---------- */
html.tm-on .base-header { background: var(--tm-head) !important; color: #fff !important; }
html.tm-on .base-header h1.page-title { font: 700 17px/1.2 var(--tm-font) !important; color: #fff !important; }
html.tm-on .base-header :is(button, a) { color: #fff !important; }

/* ---------- Activity stream: full-width cards, "Negeren" below instead of beside ---------- */
html.tm-on .base-recent-activity, html.tm-on #activity-stream { background: var(--tm-bg) !important; }
html.tm-on ul.activity-feed { padding: 0 !important; margin: 0 !important; border: 0 !important; }
html.tm-on li.stream-item-container { margin: 0 0 10px !important; padding: 0 !important; list-style: none !important; }
html.tm-on li.stream-item-container .stream-item {
  flex-wrap: wrap !important; margin: 0 12px !important; padding: 12px 14px !important;
  background: var(--tm-card) !important; border: 0 !important; border-radius: 14px !important; box-shadow: none !important;
}
html.tm-on .stream-item .stream-item-contents { flex: 1 1 100% !important; min-width: 0 !important; max-width: none !important; width: auto !important; }
html.tm-on .stream-item :is(.element-card, .element-details) { flex: 1 1 auto !important; min-width: 0 !important; max-width: none !important; width: auto !important; }
html.tm-on .stream-item .card-actions {
  flex: 1 1 100% !important; display: flex !important; justify-content: flex-end; width: auto !important; margin: 0 !important; padding: 6px 0 0 !important;
}
html.tm-on .stream-item .card-actions button { border-radius: 8px !important; font: 600 13px var(--tm-font) !important; }
html.tm-on .stream-item :is(.name, .js-title-link) { font: 600 15.5px/1.3 var(--tm-font) !important; color: var(--tm-text) !important; }

/* ---------- Grades overview: compact cards ---------- */
html.tm-on .base-grades-course-tile { border: 0 !important; border-radius: 14px !important; box-shadow: none !important; overflow: hidden; }
html.tm-on .base-grades-course-tile h3.subheader { font: 600 17px/1.3 var(--tm-font) !important; }
html.tm-on :is(.base-grades-empty-element, .base-grades-empty-state) { background: none !important; background-image: none !important; margin: 0 !important; padding: 0 0 8px !important; text-align: left !important; }
html.tm-on .base-grades-empty-state p.main { margin: 0 !important; font: 400 13px/1.35 var(--tm-font) !important; color: var(--tm-sub) !important; }

/* ---------- files: open PDFs / videos / slides in Safari's own viewer ---------- */
html.tm-on .tm-open-file {
  display: flex; align-items: center; justify-content: center; gap: 8px; margin: 8px 0 14px; padding: 12px 16px;
  border-radius: 12px; background: var(--tm-head); color: #fff !important; font: 600 15.5px var(--tm-font); text-decoration: none !important;
}
html.tm-on .tm-file-pill {
  display: inline-flex; align-items: center; gap: 5px; margin: 6px 0 2px; padding: 5px 11px; border-radius: 14px;
  background: #e3eef5; color: var(--tm-blue) !important; font: 600 13px var(--tm-font); text-decoration: none !important;
}
html.tm-on h3 > .tm-file-pill { display: flex; width: fit-content; margin: 8px 0 2px; }
html.tm-on :has(> .tm-file-pill) { flex-wrap: wrap !important; }
html.tm-on :has(> .tm-file-pill) > :not(.tm-file-pill) { flex: 1 1 100% !important; max-width: 100% !important; }
html.tm-on :is(.tm-open-file, .tm-file-pill, .tm-float) svg { width: 17px; height: 17px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; flex: none; }
html.tm-on #tm-filebar {
  position: fixed; left: 12px; right: 12px; bottom: calc(12px + env(safe-area-inset-bottom)); z-index: 1301; display: flex; gap: 8px;
}
html.tm-on #tm-filebar .tm-open-file { flex: 1; margin: 0; box-shadow: 0 6px 20px rgba(0,0,0,.25); }
html.tm-on .tm-float {
  position: fixed; top: 62px; right: 12px; z-index: 1301; display: inline-flex; align-items: center; gap: 6px; padding: 8px 13px;
  border-radius: 18px; background: rgba(18,76,107,.95); color: #fff !important; font: 600 13.5px var(--tm-font); text-decoration: none !important;
  box-shadow: 0 4px 14px rgba(0,0,0,.3);
}
html.tm-on .bb-editor-file-viewer :is(.js-file-viewer-attachment-meta, .js-file-viewer-attachment-meta *) { word-break: normal !important; overflow-wrap: anywhere !important; }

/* ---------- lift Blackboard's own help button above the tab bar ---------- */
html.tm-on.tm-tabs .pagehelp-directive { top: auto !important; bottom: calc(var(--tm-tab-h) + env(safe-area-inset-bottom) + 6px) !important; }
`;

  const LOKET_CSS = String.raw`
/* ---------- all KU Loket lists: card look (not tables) ---------- */
html.tm-on .sapFDynamicPageContentWrapper, html.tm-on .sapFDynamicPage, html.tm-on .sapMPageEnableScrolling,
html.tm-on .sapMList.sapMListBGSolid:not(.sapMListTbl) { background: var(--tm-bg) !important; }
html.tm-on .sapMList:not(.sapMListTbl) > .sapMListUl { padding: 6px 0 96px !important; background: transparent !important; }
html.tm-on .sapMList:not(.sapMListTbl) li.sapMLIB:not(.sapMGHLI) {
  background: var(--tm-card) !important; border: 0 !important; border-radius: 14px !important; box-shadow: none !important;
  margin: 0 12px 10px !important; overflow: hidden;
}
html.tm-on .sapMList:not(.sapMListTbl) li.sapMGHLI {
  background: transparent !important; border: 0 !important; margin: 10px 14px 4px !important; padding: 0 !important; height: auto !important;
}
html.tm-on .sapMList:not(.sapMListTbl) li.sapMGHLI .sapMGHLITitle, html.tm-on .sapMList:not(.sapMListTbl) li.sapMGHLI * {
  font: 600 12.5px/1.3 var(--tm-font) !important; text-transform: uppercase; letter-spacing: .4px; color: var(--tm-sub) !important;
}
html.tm-on .sapMList:not(.sapMListTbl) .sapMListInfoTBar, html.tm-on .sapMList:not(.sapMListTbl) > .sapMIBar.sapMTB {
  background: transparent !important; border: 0 !important; margin: 4px 6px 0 !important; height: auto !important; min-height: 0 !important;
}
html.tm-on .sapMList:not(.sapMListTbl) > .sapMIBar.sapMTB .sapMText, html.tm-on .sapMList:not(.sapMListTbl) > .sapMIBar.sapMTB .sapMLabel {
  font: 400 13px/1.35 var(--tm-font) !important; color: var(--tm-sub) !important; white-space: normal !important;
}
html.tm-on .sapFDynamicPageFooter .sapMIBar, html.tm-on footer.sapFDynamicPageFooter > .sapMIBar {
  border-radius: 16px !important; box-shadow: 0 6px 24px rgba(0,0,0,.14) !important; border: 0 !important;
}
html.tm-on .sapFDynamicPageFooter .sapMBtn .sapMBtnInner { border-radius: 10px !important; }
html.tm-on .sapFDynamicPageFooter .sapMBtn bdi { font-weight: 600 !important; }

/* ---------- exam schedule (IER): date tile + countdown ---------- */
html.tm-on.tm-ier .sapFDynamicPageTitleMainHeading .sapMTitle, html.tm-on.tm-ier .sapFDynamicPageTitleMainHeading .sapMTitle * {
  font-size: 22px !important; font-weight: 700 !important; letter-spacing: -.2px;
}
html.tm-on.tm-ier li.tm-exam { padding: 0 !important; min-height: 0 !important; height: auto !important; }
html.tm-on.tm-ier li.tm-exam .sapMLIBContent {
  display: grid !important; grid-template-columns: 56px minmax(0, 1fr); column-gap: 14px; align-items: center; padding: 12px 14px !important;
  min-height: 0 !important; height: auto !important;
}
html.tm-on.tm-ier li.tm-exam :is(.sapMObjLTitle, .sapMObjLTitle *, .sapMObjectAttributeDiv .sapMText) { word-break: normal !important; overflow-wrap: break-word !important; hyphens: auto; }
html.tm-on.tm-ier li.tm-exam .sapMLIBContent > * { grid-column: 2; min-width: 0; }
html.tm-on.tm-ier li.tm-exam .sapMLIBContent > .tm-datetile { grid-column: 1; grid-row: 1 / span 4; }
html.tm-on.tm-ier li.tm-exam .sapMObjLTopRow { display: flex !important; flex-direction: column-reverse; gap: 4px; padding: 0 !important; margin: 0 !important; }
html.tm-on.tm-ier li.tm-exam .sapMObjLTopRow > div { float: none !important; width: auto !important; max-width: none !important; padding: 0 !important; margin: 0 !important; }
html.tm-on.tm-ier li.tm-exam .sapMObjLNumberDiv, html.tm-on.tm-ier li.tm-exam .sapMObjectNumber { text-align: left !important; }
html.tm-on.tm-ier li.tm-exam .sapMObjectNumberText { display: none !important; }
html.tm-on.tm-ier li.tm-exam .sapMObjectNumberUnit {
  display: inline !important; padding: 0 !important; font: 600 14.5px var(--tm-font) !important; color: var(--tm-blue) !important;
}
html.tm-on.tm-ier li.tm-exam .sapMObjLTitle, html.tm-on.tm-ier li.tm-exam .sapMObjLTitle * {
  font: 600 16.5px/1.3 var(--tm-font) !important; color: var(--tm-text) !important; padding: 0 !important;
}
html.tm-on.tm-ier li.tm-exam .sapMTextLineClamp { -webkit-line-clamp: 3 !important; }
html.tm-on.tm-ier li.tm-exam .sapMObjLBottomRow { padding: 3px 0 0 !important; margin: 0 !important; }
html.tm-on.tm-ier li.tm-exam .sapMObjLAttrRow { padding: 0 !important; }
html.tm-on.tm-ier li.tm-exam .sapMObjectAttributeDiv, html.tm-on.tm-ier li.tm-exam .sapMObjectAttributeDiv .sapMText {
  font: 400 13.5px/1.35 var(--tm-font) !important; color: var(--tm-sub) !important; white-space: normal !important; overflow: visible !important; max-width: none !important;
}
html.tm-on .tm-datetile {
  display: flex; flex-direction: column; align-items: center; justify-content: center; height: 64px;
  border-radius: 12px; background: #eaf3f8; line-height: 1;
}
html.tm-on .tm-datetile .m { font: 700 11px var(--tm-font); text-transform: uppercase; letter-spacing: .5px; color: var(--tm-red); }
html.tm-on .tm-datetile .d { font: 700 25px var(--tm-font); color: var(--tm-text); margin: 3px 0 2px; }
html.tm-on .tm-datetile .w { font: 500 11px var(--tm-font); color: var(--tm-sub); }
html.tm-on .tm-count {
  display: inline-block; margin-left: 8px; padding: 0 8px; border-radius: 10px; vertical-align: 1px;
  background: #eef0f3; color: var(--tm-sub); font: 600 12px/20px var(--tm-font);
}
html.tm-on .tm-count.soon { background: #fff1e6; color: #b54d00; }
html.tm-on .tm-count.past { background: #f2f2f2; color: #9a9a9a; }

/* ---------- timetable (Uurrooster): list view ---------- */
html.tm-on #tm-agenda {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 40; overflow-y: auto; -webkit-overflow-scrolling: touch;
  background: var(--tm-bg); font-family: var(--tm-font); padding-bottom: calc(24px + env(safe-area-inset-bottom));
}
html.tm-on .tm-ag-head {
  position: sticky; top: 0; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 12px 14px 10px 16px; background: rgba(242,242,247,.94); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px);
}
html.tm-on .tm-ag-h { font: 700 22px/1.2 var(--tm-font); color: var(--tm-text); letter-spacing: -.2px; }
html.tm-on .tm-seg { display: inline-flex; padding: 2px; border-radius: 9px; background: #e3e3e8; }
html.tm-on .tm-seg button { border: 0; background: transparent; padding: 6px 14px; border-radius: 7px; font: 600 13.5px var(--tm-font); color: var(--tm-text); }
html.tm-on .tm-seg button.on { background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.12); }
html.tm-on .tm-ag-day { margin: 16px 16px 6px; font: 600 13px/1.2 var(--tm-font); text-transform: uppercase; letter-spacing: .4px; color: var(--tm-sub); }
html.tm-on .tm-ag-card { margin: 0 12px; background: var(--tm-card); border-radius: 14px; overflow: hidden; }
html.tm-on .tm-ag-row { display: flex; gap: 12px; padding: 11px 14px 11px 12px; border-left: 4px solid var(--c); border-bottom: .5px solid var(--tm-sep); }
html.tm-on .tm-ag-row:last-child { border-bottom: 0; }
html.tm-on .tm-ag-time { flex: none; width: 48px; display: flex; flex-direction: column; gap: 2px; }
html.tm-on .tm-ag-time b { font: 600 15px var(--tm-font); color: var(--tm-text); }
html.tm-on .tm-ag-time span { font: 400 13px var(--tm-font); color: var(--tm-sub); }
html.tm-on .tm-ag-main { flex: 1; min-width: 0; }
html.tm-on .tm-ag-title { font: 600 16px/1.3 var(--tm-font); color: var(--tm-text); }
html.tm-on .tm-ag-meta { margin-top: 2px; font: 400 13.5px/1.35 var(--tm-font); color: var(--tm-sub); }
html.tm-on .tm-ag-meta a { color: var(--tm-blue); text-decoration: none; }
html.tm-on .tm-ag-note { margin: 18px 16px; font: 400 14.5px/1.4 var(--tm-font); color: var(--tm-sub); }
html.tm-on .tm-ag-more { display: block; margin: 16px auto 0; padding: 10px 18px; border: 0; border-radius: 10px; background: #e3e3e8; color: var(--tm-blue); font: 600 14.5px var(--tm-font); }
html.tm-on #tm-ag-pill {
  position: fixed; left: 12px; bottom: calc(14px + env(safe-area-inset-bottom)); z-index: 40; padding: 9px 14px; border: 0; border-radius: 20px;
  background: var(--tm-head); color: #fff; font: 600 13px var(--tm-font); box-shadow: 0 4px 14px rgba(0,0,0,.25);
}
`;

  const GLOBAL_CSS = String.raw`
@media (min-width: 768px) { #tm-tabbar, #tm-title, #tm-classic, #tm-on-pill, .tm-more, .tm-datetile, .tm-count, .tm-open-file, .tm-file-pill, #tm-filebar, .tm-float, #tm-agenda, #tm-ag-pill { display: none !important; } }
#tm-on-pill {
  position: fixed; right: 12px; bottom: calc(14px + env(safe-area-inset-bottom)); z-index: 2147483000;
  padding: 9px 14px; border: 0; border-radius: 20px; background: #124c6b; color: #fff; box-shadow: 0 4px 14px rgba(0,0,0,.25);
  font: 600 13px -apple-system, system-ui, sans-serif;
}
`;

  function addStyle() {
    if (document.getElementById('tm-style')) return;
    const css = { portal: PORTAL_CSS, ultra: ULTRA_CSS, loket: LOKET_CSS }[SITE];
    const s = document.createElement('style');
    s.id = 'tm-style';
    s.textContent = `@media (max-width: 767px) {\n${SHARED_CSS}\n${css}\n}\n${GLOBAL_CSS}`;
    (document.head || document.documentElement).appendChild(s);
  }

  /* ================================================================== shared: tab bar */
  const ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    courses: '<path d="M5 4.5h11.5a1.5 1.5 0 0 1 1.5 1.5v14H6.5A1.5 1.5 0 0 1 5 18.5z"/><path d="M5 18.5A1.5 1.5 0 0 1 6.5 17H18"/><path d="M9 8.5h5"/>',
    updates: '<path d="M6 16.5v-5.5a6 6 0 1 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    messages: '<path d="M21 3 3 10.5l7.2 2.6L12.8 21z"/><path d="m21 3-10.8 10.1"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  };
  // Same five destinations everywhere; on the portal they are in-page, elsewhere they lead back to the portal.
  const TABS = [
    { id: 'home', label: 'Home', hash: '#/home', url: PORTAL + '#/home' },
    { id: 'courses', label: 'Vakken', hash: '#/home', url: PORTAL + '?tm=courses#/home' },
    { id: 'updates', label: 'Updates', hash: '#/updates', url: PORTAL + '#/updates' },
    { id: 'messages', label: 'Communicatie', hash: '#/messages', url: PORTAL + '#/messages' },
    { id: 'menu', label: 'Menu', hash: '', url: PORTAL + '?tm=menu#/home' },
  ];

  function ensureTabbar(onClick) {
    if (!document.body || $('#tm-tabbar')) return;
    const nav = document.createElement('nav');
    nav.id = 'tm-tabbar';
    nav.setAttribute('aria-label', 'Toledo');
    nav.innerHTML = TABS.map((t) => `<a href="${SITE === 'portal' ? (t.hash || '#') : t.url}" data-tab="${t.id}"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[t.id]}</svg><span>${t.label}</span>${SITE === 'portal' && (t.id === 'updates' || t.id === 'messages') ? '<i class="tm-badge"></i>' : ''}</a>`).join('');
    if (onClick) nav.addEventListener('click', onClick);
    document.body.appendChild(nav);
  }
  const setActiveTab = (id) => $$('#tm-tabbar a[data-tab]').forEach((a) => a.classList.toggle('tm-active', a.dataset.tab === id));

  const waitFor = (sel, ms = 8000) => new Promise((res) => {
    const t0 = Date.now();
    (function tick() { const el = $(sel); if (el || Date.now() - t0 > ms) res(el); else setTimeout(tick, 120); })();
  });

  function fixViewport() {
    const m = $('meta[name=viewport]');
    if (m && !/viewport-fit/.test(m.content)) m.content += ', viewport-fit=cover';
  }

  /* ================================================================== portal */
  const portal = (() => {
    const menuOpen = () => { const m = $('nav.navbar-secondary'); return !!m && (m.classList.contains('in') || m.classList.contains('collapsing')); };
    const toggleMenu = (want) => {
      const btn = $('nav.navbar-primary button.navbar-toggle');
      if (btn && (want === undefined || want !== menuOpen())) btn.click();
    };

    function ensureTitle() {
      const left = $('nav.navbar-primary .pull-left');
      if (left && !$('#tm-title', left)) {
        const t = document.createElement('span');
        t.id = 'tm-title';
        t.textContent = 'Toledo';
        left.appendChild(t);
      }
    }

    function ensureClassicButton() {
      const ul = $('#tol-secundairy-navigation');
      if (!ul || $('#tm-classic')) return;
      const b = document.createElement('button');
      b.id = 'tm-classic';
      b.type = 'button';
      b.textContent = 'Klassieke weergave';
      b.addEventListener('click', () => { try { localStorage.setItem(OFF_KEY, '1'); } catch (_) {} location.reload(); });
      ul.insertAdjacentElement('afterend', b);
    }

    async function onTab(e) {
      const a = e.target.closest('a[data-tab]');
      if (!a) return;
      e.preventDefault();
      const id = a.dataset.tab;
      if (id === 'menu') { window.scrollTo(0, 0); toggleMenu(); sync(); return; }
      toggleMenu(false);
      const tab = TABS.find((t) => t.id === id);
      const onHome = /^#\/home/.test(location.hash) || location.hash === '' || location.hash === '#/';
      if (id === 'courses') {
        if (!onHome) location.hash = '#/home';
        const el = await waitFor('.tol-enrollments');
        if (el) el.scrollIntoView({ behavior: onHome ? 'smooth' : 'auto', block: 'start' });
      } else if (location.hash === tab.hash) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        location.hash = tab.hash;
        window.scrollTo(0, 0);
      }
      setTimeout(sync, 50);
    }

    function badgeFor(hash) {
      const b = $(`#tol-primary-navigation a[href="${hash}"] .badge`);
      const n = b ? (b.textContent || '').trim() : '';
      return /^\d+$/.test(n) && n !== '0' ? (Number(n) > 99 ? '99+' : n) : '';
    }

    function sync() {
      const bar = $('#tm-tabbar');
      if (!bar) return;
      const nav = $('nav.navbar-primary');
      if (nav) root.style.setProperty('--tm-hh', Math.round(nav.getBoundingClientRect().height) + 'px');
      const h = location.hash || '#/home';
      let active = '';
      if (menuOpen()) active = 'menu';
      else if (h.startsWith('#/updates')) active = 'updates';
      else if (h.startsWith('#/messages')) active = 'messages';
      else if (h.startsWith('#/home')) {
        const enr = $('.tol-enrollments');
        active = enr && enr.getBoundingClientRect().top < window.innerHeight * 0.45 ? 'courses' : 'home';
      }
      setActiveTab(active);
      const set = (id, v) => { const i = bar.querySelector(`a[data-tab="${id}"] .tm-badge`); if (i && i.textContent !== v) i.textContent = v; };
      set('updates', badgeFor('#/updates'));
      set('messages', badgeFor('#/messages'));
    }

    // Arriving from a course page via the tab bar: ?tm=courses or ?tm=menu
    async function handleDeepLink() {
      const p = new URLSearchParams(location.search);
      const want = p.get('tm');
      if (!want) return;
      p.delete('tm');
      const q = p.toString();
      history.replaceState(history.state, '', location.pathname + (q ? '?' + q : '') + location.hash);
      if (want === 'courses') {
        const el = await waitFor('.enrollment-tile-item', 12000);
        if (el) $('.tol-enrollments').scrollIntoView({ block: 'start' });
      } else if (want === 'menu') {
        const btn = await waitFor('nav.navbar-primary button.navbar-toggle', 12000);
        if (btn) { await waitFor('#tol-secundairy-navigation', 4000); toggleMenu(true); }
      }
      sync();
    }

    function ensure() {
      ensureTitle();
      ensureTabbar(onTab);
      ensureClassicButton();
      sync();
    }

    return {
      start() {
        root.classList.add('tm-tabs');
        ensure();
        handleDeepLink();
        window.addEventListener('hashchange', schedule);
        window.addEventListener('scroll', schedule, { passive: true });
        window.addEventListener('resize', schedule);
      },
      ensure,
    };
  })();

  /* ================================================================== Ultra (course pages) */
  const ultra = (() => {
    // Show the tab bar on list-type pages only; hide it while an item, assignment or test is open,
    // so it can never cover Blackboard's own buttons (Submit, Save, ...).
    const BASE = /^\/ultra\/(course|stream|calendar|messages|grades|institution-page|profile|organizations|tools)\/?$/;
    const COURSE = /^\/ultra\/(courses|organizations)\/[^/]+\/[^/]+\/?$/;
    const overlayOpen = () => $$('.MuiDialog-root, .bb-offcanvas-panel.active, [role=dialog]').some((d) => d.offsetParent !== null && d.getBoundingClientRect().height > 100);

    function syncTabs() {
      const show = (BASE.test(location.pathname) || COURSE.test(location.pathname)) && !overlayOpen();
      root.classList.toggle('tm-tabs', show);
      setActiveTab(/^\/ultra\/(courses|course)\b/.test(location.pathname) ? 'courses' : '');
    }

    function foldDescriptions() {
      $$('react-course-content-outline .js-description:not([data-tm])').forEach((d) => {
        const lh = parseFloat(getComputedStyle(d).lineHeight) || 20;
        if (!d.textContent.trim()) return;
        d.setAttribute('data-tm', '1');
        if (d.scrollHeight <= lh * 4.2) return;
        d.classList.add('tm-clamp');
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'tm-more';
        b.textContent = 'Meer';
        b.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const open = d.classList.toggle('tm-open');
          b.textContent = open ? 'Minder' : 'Meer';
        });
        d.insertAdjacentElement('afterend', b);
      });
    }

    /* ---------- files: one tap to Safari's own PDF / video viewer ---------- */
    const OPEN_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></svg>';
    function fileLabel(name, mime) {
      const s = `${name || ''} ${mime || ''}`.toLowerCase();
      if (/pdf/.test(s)) return 'Open PDF';
      if (/video|\.(mp4|mov|m4v)\b/.test(s)) return 'Speel video af';
      if (/audio|\.(mp3|m4a|wav)\b/.test(s)) return 'Speel audio af';
      if (/image|\.(png|jpe?g|gif|heic|webp)\b/.test(s)) return 'Bekijk afbeelding';
      if (/ppt|powerpoint|presentation|keynote/.test(s)) return 'Open presentatie';
      if (/\.docx?\b|msword|wordprocessing/.test(s)) return 'Open document';
      if (/xls|excel|spreadsheet/.test(s)) return 'Open rekenblad';
      return 'Open bestand';
    }
    function openLink(href, label, cls) {
      const a = document.createElement('a');
      a.className = cls;
      a.href = href;
      a.target = '_blank';
      a.rel = 'noopener';
      a.innerHTML = OPEN_ICON;
      const s = document.createElement('span');
      s.textContent = label;
      a.appendChild(s);
      a.addEventListener('click', (e) => e.stopPropagation()); // don't also open Blackboard's own viewer
      return a;
    }
    const attCache = new Map();
    function attachments(cid, ctid) {
      const k = cid + '/' + ctid;
      if (!attCache.has(k)) {
        attCache.set(k, fetch(`${location.origin}/learn/api/public/v1/courses/${encodeURIComponent(cid)}/contents/${encodeURIComponent(ctid)}/attachments`,
          { credentials: 'same-origin', headers: { Accept: 'application/json' } })
          .then((r) => (r.ok ? r.json() : { results: [] })).then((j) => (j && j.results) || []).catch(() => []));
      }
      return attCache.get(k);
    }
    const downloadUrl = (cid, ctid, aid) => `${location.origin}/learn/api/public/v1/courses/${encodeURIComponent(cid)}/contents/${encodeURIComponent(ctid)}/attachments/${encodeURIComponent(aid)}/download`;
    const ID = /^_\d+_\d+$/;

    // 1) PDFs / files embedded in a document page.
    // Blackboard builds these blocks in more than one way, so the link is looked for in several places:
    // the block's own href, a link inside it, the file info (data-bbfile), and as a last resort the
    // document's attachment list via Blackboard's own API (matched on file name).
    const DOC_ROUTE = /^\/ultra\/(?:courses|organizations)\/([^/]+)\/(?:outline\/)?(?:edit\/)?document\/([^/?#]+)/;
    function sameOriginFile(raw) {
      if (!raw) return '';
      let s = String(raw).trim().replace(/^@X@[^@]*@X@/i, '/');
      if (/^xid-\d+_\d+$/.test(s)) s = '/bbcswebdav/' + s;
      try {
        const u = new URL(s, location.origin);
        if (u.origin === location.origin && u.pathname.startsWith('/bbcswebdav/')) return u.href;
      } catch (_) {}
      return '';
    }
    function fileInfo(host) {
      let info = {};
      try { info = JSON.parse(host.getAttribute('data-bbfile') || '{}') || {}; } catch (_) {}
      const cands = [host.getAttribute('href'), ...$$('a[href]', host).map((a) => a.getAttribute('href'))];
      Object.values(info).forEach((v) => { if (typeof v === 'string' && /bbcswebdav|^xid-\d+_\d+$/.test(v)) cands.push(v); });
      const xid = JSON.stringify(info).match(/xid-\d+_\d+/);
      if (xid) cands.push(xid[0]);
      let href = '';
      for (const c of cands) { href = sameOriginFile(c); if (href) break; }
      const meta = $('.js-file-viewer-attachment-meta', host);
      const name = info.fileName || info.displayName || info.linkName || (meta ? meta.textContent.trim() : '') || host.textContent.trim().slice(0, 120);
      return { href, name, mime: info.mimeType || '' };
    }
    const norm = (s) => String(s || '').toLowerCase().replace(/\.[a-z0-9]{2,5}$/, '').replace(/[^a-z0-9]+/g, ' ').trim();

    function findAttachment(route, name) {
      if (!route || !ID.test(route[1]) || !ID.test(route[2])) return Promise.resolve(null);
      return attachments(route[1], route[2]).then((atts) => {
        const want = norm(name);
        const a = atts.find((x) => norm(x.fileName) === want)
          || atts.find((x) => want && (norm(x.fileName).startsWith(want) || want.startsWith(norm(x.fileName))))
          || (atts.length === 1 ? atts[0] : null);
        return a ? { href: downloadUrl(route[1], route[2], a.id), label: fileLabel(a.fileName, a.mimeType) } : null;
      });
    }

    function embeddedFiles() {
      const set = new Set();
      $$('[data-bbfile]').forEach((el) => set.add(el));
      $$('.bb-editor-file-viewer').forEach((v) => set.add(v.closest('[data-bbfile]') || v));
      const hosts = [...set].filter((h) => ![...set].some((o) => o !== h && o.contains(h)));
      const route = DOC_ROUTE.exec(location.pathname);
      hosts.forEach((host) => {
        const next = host.nextElementSibling;
        let btn = next && next.classList.contains('tm-open-file') ? next : null;
        const f = fileInfo(host);
        if (!btn) {
          btn = openLink(f.href || '#', fileLabel(f.name, f.mime), 'tm-open-file');
          btn.dataset.tmName = f.name;
          btn.addEventListener('click', (e) => {
            if (btn.getAttribute('href') !== '#') return;
            // link not known yet: look it up now; open the tab right away so Safari doesn't block it
            e.preventDefault();
            const again = fileInfo(host);
            if (again.href) { btn.setAttribute('href', again.href); window.open(again.href, '_blank'); return; }
            const w = window.open('', '_blank');
            findAttachment(route, btn.dataset.tmName).then((hit) => {
              if (hit) { btn.setAttribute('href', hit.href); if (w) w.location.href = hit.href; else location.href = hit.href; }
              else { if (w) w.close(); btn.querySelector('span').textContent = 'Tik op ⌄ hierboven om te openen'; }
            });
          });
          host.insertAdjacentElement('afterend', btn);
        }
        if (f.href) {
          if (btn.getAttribute('href') !== f.href) btn.setAttribute('href', f.href);
          if (btn.textContent === 'Open bestand' && !btn.dataset.tmLabel) {
            // name without extension (e.g. "Session 1 Slidedeck"): ask Blackboard what kind of file it is
            btn.dataset.tmLabel = '1';
            findAttachment(route, btn.dataset.tmName).then((hit) => { if (hit) btn.querySelector('span').textContent = hit.label; });
          }
        } else if (btn.getAttribute('href') === '#' && !btn.dataset.tmLookup) {
          btn.dataset.tmLookup = '1';
          findAttachment(route, btn.dataset.tmName).then((hit) => {
            if (hit && btn.getAttribute('href') === '#') { btn.setAttribute('href', hit.href); btn.querySelector('span').textContent = hit.label; }
          });
        }
      });
    }

    // 2) a file item opened in Blackboard's viewer: floating "Open PDF" bar
    const FILE_ROUTE = /^\/ultra\/(?:courses|organizations)\/([^/]+)\/(?:outline\/)?file\/([^/?#]+)/;
    let fileKey = '';
    function fileBar() {
      const m = FILE_ROUTE.exec(location.pathname);
      const key = m && ID.test(m[1]) && ID.test(m[2]) ? m[1] + '/' + m[2] : '';
      if (key === fileKey) return;
      fileKey = key;
      $('#tm-filebar')?.remove();
      if (!key) return;
      attachments(m[1], m[2]).then((atts) => {
        if (fileKey !== key || !atts.length || $('#tm-filebar')) return;
        const bar = document.createElement('div');
        bar.id = 'tm-filebar';
        atts.slice(0, 2).forEach((a) => bar.appendChild(openLink(downloadUrl(m[1], m[2], a.id), fileLabel(a.fileName, a.mimeType), 'tm-open-file')));
        document.body.appendChild(bar);
      });
    }

    // 3) course content list: a small "Open PDF" pill under every file, so you skip the viewer entirely
    function outlinePills() {
      $$('react-course-content-outline a[href*="/file/_"]:not([data-tm-pill])').forEach((a) => {
        const m = /\/(?:courses|organizations)\/([^/]+)\/(?:outline\/)?file\/([^/?#]+)/.exec(a.getAttribute('href') || '');
        if (!m || !ID.test(m[1]) || !ID.test(m[2])) return;
        a.setAttribute('data-tm-pill', '1');
        attachments(m[1], m[2]).then((atts) => {
          if (!atts.length || !a.isConnected) return;
          const h3 = a.closest('h3');
          if ((h3 || a.parentElement).querySelector(':scope > .tm-file-pill')) return;
          const pill = openLink(downloadUrl(m[1], m[2], atts[0].id), fileLabel(atts[0].fileName, atts[0].mimeType), 'tm-file-pill');
          if (h3) h3.appendChild(pill); // under the title, so the title keeps its full width
          else a.insertAdjacentElement('afterend', pill);
        });
      });
    }

    // 4) weblectures (Kaltura via LTI): "Open apart" gives the player the whole screen
    function lectureButton() {
      const on = /\/lti\/launchFrame/.test(location.pathname);
      const fr = on && $('iframe[name="lti-launch-iframe"]');
      let b = $('#tm-lecture');
      let src = '';
      try { if (fr && fr.src) { const u = new URL(fr.src); if (u.origin === location.origin) src = u.href; } } catch (_) {}
      if (!src) { b?.remove(); return; }
      if (!b) { b = openLink(src, 'Open apart', 'tm-float'); b.id = 'tm-lecture'; document.body.appendChild(b); }
      else if (b.href !== src) b.href = src;
    }

    // Keep the active course pill visible in the scrollable strip
    let lastPill = null;
    function revealActivePill() {
      const a = $('bb-course-navigation nav a.active');
      if (!a || a === lastPill) return;
      lastPill = a;
      const strip = a.closest('.js-course-navigation > div');
      if (strip) strip.scrollTo({ left: Math.max(0, a.offsetLeft - 12), behavior: 'smooth' });
    }

    function ensure() {
      ensureTabbar();
      syncTabs();
      foldDescriptions();
      revealActivePill();
      embeddedFiles();
      fileBar();
      outlinePills();
      lectureButton();
    }
    return {
      start() {
        ensure();
        window.addEventListener('popstate', schedule);
        // Ultra navigates with pushState: watch for URL changes
        let last = location.href;
        setInterval(() => { if (location.href !== last) { last = location.href; schedule(); } }, 400);
      },
      ensure,
    };
  })();

  /* ================================================================== KU Loket (exam schedule) */
  const loket = (() => {
    const MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
    const DATE = /\b([a-z]{2})\.?\s+(\d{1,2})\.(\d{1,2})\.(\d{4})\b/i;

    function countdown(date) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const days = Math.round((date - today) / 864e5);
      if (days < 0) return { t: 'voorbij', c: 'past' };
      if (days === 0) return { t: 'vandaag', c: 'soon' };
      if (days === 1) return { t: 'morgen', c: 'soon' };
      return { t: `over ${days} dagen`, c: days <= 14 ? 'soon' : '' };
    }

    function decorate() {
      root.classList.toggle('tm-ier', /^#zr_0363/i.test(location.hash));
      if (!root.classList.contains('tm-ier')) return;
      $$('li.sapMLIB').forEach((li) => {
        const txt = $('.sapMObjectNumberText', li);
        const content = $('.sapMLIBContent', li);
        if (!txt || !content) return;
        const m = DATE.exec(txt.textContent || '');
        if (!m) return;
        const key = m[0];
        if (li.dataset.tmDate === key && $('.tm-datetile', content)) return;
        li.dataset.tmDate = key;
        li.classList.add('tm-exam');
        const date = new Date(Number(m[4]), Number(m[3]) - 1, Number(m[2]));
        $$('.tm-datetile', content).forEach((n) => n.remove());
        const tile = document.createElement('div');
        tile.className = 'tm-datetile';
        tile.setAttribute('aria-hidden', 'true');
        tile.innerHTML = `<span class="m">${MONTHS[date.getMonth()]}</span><span class="d">${date.getDate()}</span><span class="w">${m[1].toLowerCase()}</span>`;
        content.prepend(tile);
        const unit = $('.sapMObjectNumberUnit', li);
        if (unit) {
          $$('.tm-count', li).forEach((n) => n.remove());
          const cd = countdown(date);
          const pill = document.createElement('span');
          pill.className = 'tm-count' + (cd.c ? ' ' + cd.c : '');
          pill.textContent = cd.t;
          unit.insertAdjacentElement('afterend', pill);
        }
      });
    }
    /* ---------- Uurrooster (zr_0367): a day-by-day list instead of the cramped 7-column week grid ---------- */
    const DAYS = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
    const COLORS = ['#2b8fc1', '#34a853', '#e8710a', '#a142f4', '#d93025', '#12a4af', '#c5221f', '#5f6368'];
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const pad = (n) => String(n).padStart(2, '0');
    const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const res = (v) => (Array.isArray(v) ? v : (v && Array.isArray(v.results) ? v.results : []));
    const colorOf = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return COLORS[Math.abs(h) % COLORS.length]; };
    const WEEK_KEY = 'tm-ag-week';
    let agDays = 14, agLoadedFor = '', agBusy = false;

    function sapDay(v) {
      const m = /\/Date\((-?\d+)/.exec(String(v || ''));
      if (!m) return null;
      const u = new Date(Number(m[1]));
      return new Date(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate());
    }
    function hm(v) {
      const m = /PT(\d+)H(\d+)M/.exec(String(v || ''));
      return m ? `${pad(m[1])}:${m[2]}` : '';
    }
    function dayLabel(d) {
      const t = new Date(); t.setHours(0, 0, 0, 0);
      const diff = Math.round((d - t) / 864e5);
      const base = `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
      return diff === 0 ? `Vandaag · ${base}` : diff === 1 ? `Morgen · ${base}` : base;
    }

    async function loadAgenda(body) {
      const from = new Date(); from.setHours(0, 0, 0, 0);
      const to = new Date(from.getTime() + (agDays - 1) * 864e5);
      const key = ymd(from) + '/' + agDays;
      if (agBusy || agLoadedFor === key) return;
      agBusy = true;
      body.innerHTML = '<p class="tm-ag-note">Laden…</p>';
      try {
        const filter = `(date ge datetime'${ymd(from)}T00:00:00' and date le datetime'${ymd(to)}T00:00:00')`;
        const url = `/sap/opu/odata/sap/ZC_EP_SCHEDULE_SRV/Events?sap-client=200&$format=json&$skip=0&$top=1000&$filter=${encodeURIComponent(filter)}&$expand=EventTeacherSet,EventLocationSet`;
        const r = await fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
        const j = await r.json();
        const rows = res(j && j.d).map((e) => {
          const day = sapDay(e.date);
          if (!day) return null;
          const loc = res(e.EventLocationSet)[0] || {};
          const place = [[loc.mnemonic, loc.roomNumber].filter(Boolean).join(' '), loc.roomName].filter(Boolean).join(' · ');
          const link = String(loc.url_location || '').replace(/^http:\/\//i, 'https://');
          return {
            day, start: hm(e.start_time), end: hm(e.end_time),
            title: e.ola_description || e.workFormDesc || '—', form: e.workFormDesc || '',
            place, link: /^https:\/\/[^\s"'<>]+$/.test(link) ? link : '',
            teachers: res(e.EventTeacherSet).map((x) => x.name || x.fullName || '').filter(Boolean).join(', '),
          };
        }).filter(Boolean).sort((a, b) => (a.day - b.day) || a.start.localeCompare(b.start));
        const groups = new Map();
        rows.forEach((x) => { const k = ymd(x.day); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(x); });
        let html = '';
        if (!groups.size) html += `<p class="tm-ag-note">Geen lessen in de komende ${agDays} dagen.</p>`;
        for (const items of groups.values()) {
          html += `<h4 class="tm-ag-day">${esc(dayLabel(items[0].day))}</h4><div class="tm-ag-card">`;
          html += items.map((x) => `<div class="tm-ag-row" style="--c:${colorOf(x.title)}"><div class="tm-ag-time"><b>${esc(x.start)}</b><span>${esc(x.end)}</span></div><div class="tm-ag-main"><div class="tm-ag-title">${esc(x.title)}</div>${x.form ? `<div class="tm-ag-meta">${esc(x.form)}</div>` : ''}${x.place ? `<div class="tm-ag-meta">${x.link ? `<a href="${esc(x.link)}" target="_blank" rel="noopener">${esc(x.place)}</a>` : esc(x.place)}</div>` : ''}${x.teachers ? `<div class="tm-ag-meta">${esc(x.teachers)}</div>` : ''}</div></div>`).join('');
          html += '</div>';
        }
        html += `<button type="button" class="tm-ag-more">Toon ${agDays + 14} dagen</button>`;
        body.innerHTML = html;
        agLoadedFor = key;
      } catch (e) {
        body.innerHTML = '<p class="tm-ag-note">Het uurrooster kon niet geladen worden. Kies "Week" voor de gewone weergave, of probeer opnieuw.</p>';
        agLoadedFor = '';
      } finally {
        agBusy = false;
      }
    }

    function agenda() {
      const on = /^#zr_0367/i.test(location.hash) && window.innerWidth <= 767;
      let box = $('#tm-agenda');
      let week = false;
      try { week = sessionStorage.getItem(WEEK_KEY) === '1'; } catch (_) {}
      root.classList.toggle('tm-uur', on);
      if (!on) { if (box) box.remove(); $('#tm-ag-pill')?.remove(); return; }
      if (week) {
        if (box) box.remove();
        if (!$('#tm-ag-pill')) {
          const p = document.createElement('button');
          p.id = 'tm-ag-pill'; p.type = 'button'; p.textContent = 'Lijstweergave';
          p.addEventListener('click', () => { try { sessionStorage.removeItem(WEEK_KEY); } catch (_) {} agLoadedFor = ''; schedule(); });
          document.body.appendChild(p);
        }
        return;
      }
      $('#tm-ag-pill')?.remove();
      const page = $('.sapMSinglePlanningCalendar, .sapMSinglePC, .sapMPlanCal');
      const pageBox = page && (page.closest('.sapMPage, .sapFDynamicPage') || page);
      const top = pageBox ? Math.max(0, Math.round(pageBox.getBoundingClientRect().top)) : 0;
      if (!top) return; // the app is not rendered yet
      if (!box) {
        box = document.createElement('div');
        box.id = 'tm-agenda';
        box.innerHTML = '<div class="tm-ag-head"><span class="tm-ag-h">Uurrooster</span><div class="tm-seg"><button type="button" class="on">Lijst</button><button type="button" data-week>Week</button></div></div><div class="tm-ag-body"></div>';
        box.querySelector('[data-week]').addEventListener('click', () => { try { sessionStorage.setItem(WEEK_KEY, '1'); } catch (_) {} schedule(); });
        box.addEventListener('click', (e) => {
          if (e.target.closest('.tm-ag-more')) { agDays += 14; loadAgenda(box.querySelector('.tm-ag-body')); }
        });
        document.body.appendChild(box);
        agLoadedFor = '';
      }
      box.style.top = top + 'px';
      loadAgenda(box.querySelector('.tm-ag-body'));
    }

    return {
      start() { decorate(); agenda(); window.addEventListener('hashchange', schedule); window.addEventListener('resize', schedule); },
      ensure() { decorate(); agenda(); },
    };
  })();

  /* ================================================================== boot */
  const MOD = { portal, ultra, loket }[SITE];
  let queued = false;
  function ensureAll() { queued = false; if (document.body) MOD.ensure(); }
  function schedule() { if (!queued) { queued = true; requestAnimationFrame(ensureAll); } }

  function showOnPill() {
    if (!document.body || $('#tm-on-pill') || window.innerWidth > 767) return;
    const b = document.createElement('button');
    b.id = 'tm-on-pill';
    b.type = 'button';
    b.textContent = 'Telefoonweergave';
    b.addEventListener('click', () => { try { localStorage.removeItem(OFF_KEY); } catch (_) {} location.reload(); });
    document.body.appendChild(b);
  }

  addStyle();
  if (SITE === 'portal' && isOff()) {
    const tryPill = () => (document.body ? showOnPill() : setTimeout(tryPill, 200));
    tryPill();
    return;
  }
  root.classList.add('tm-on');

  const start = () => {
    fixViewport();
    MOD.start();
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  };
  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
