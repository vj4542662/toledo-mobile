// ==UserScript==
// @name         Toledo Mobile
// @namespace    https://toledo.kuleuven.be/portal
// @version      4.9.0
// @description  KU Leuven Toledo as a real phone app: Vandaag, Vakken, Rooster, Updates and Meer, with course content, files and weblectures one tap away. Runs on your own Toledo session.
// @match        https://toledo.kuleuven.be/portal*
// @match        https://ultra.edu.kuleuven.cloud/ultra/*
// @match        https://webwsp.aps.kuleuven.be/sap/bc/ui2/flp*
// @match        https://idp.kuleuven.be/idp/*
// @match        https://icts-p-toledo-journey.cloud.icts.kuleuven.be/*
// @updateURL    https://raw.githubusercontent.com/vj4542662/toledo-mobile/main/toledo-mobile.user.js
// @downloadURL  https://raw.githubusercontent.com/vj4542662/toledo-mobile/main/toledo-mobile.user.js
// @run-at       document-start
// @inject-into  content
// @grant        none
// ==/UserScript==

/*
  Toledo Mobile 4 for iPhone (Userscripts extension in Safari).
  - toledo.kuleuven.be/portal/ becomes the app: Vandaag, Vakken, Rooster, Updates, Meer.
  - A course opens on ultra.edu.kuleuven.cloud/ultra/app: content, announcements and grades. PDFs, files and weblectures open directly.
  - The timetable and exams come from KU Loket (same KU Leuven sign-in), read in a hidden frame.
  - Pages the app doesn't cover (submitting an assignment, tests, KU Loket apps) keep the phone layout of version 3.
  - The KU Leuven sign-in page gets an app look, and "Log in via KU Leuven Authenticator" opens the
    Authenticator app straight away. The script never reads or fills in your username or password there.
  - While the app is open, Toledo, Blackboard and KU Loket get a small request every few minutes so their sessions don't time out.
  Everything uses your own session in your own browser; nothing is sent anywhere else.
*/
(() => {
  'use strict';
  if (window.__TM4__) return;
  window.__TM4__ = true;
  const CSS = "html.tm4{-webkit-text-size-adjust:100%;text-size-adjust:100%;color-scheme:light dark;\n--bg:#f2f2f7;--card:#fff;--raised:#fff;--text:#000;--sub:#6d6d72;--ter:#c3c3c8;--tabi:#9a9aa0;--sep:rgba(60,60,67,.18);\n--fill:rgba(118,118,128,.12);--fill2:rgba(118,118,128,.2);--press:rgba(0,0,0,.07);\n--accent:#0a6cd6;--red:#ff3b30;--orange:#ff9500;--green:#30b955;--bar:rgba(246,246,248,.84);--sheet:rgba(249,249,251,.97);\n--hero1:#17508a;--hero2:#0b2c52;--shadow:0 1px 2px rgba(0,0,0,.04),0 4px 14px rgba(0,0,0,.05);\n--font:-apple-system,BlinkMacSystemFont,\"SF Pro Text\",\"Helvetica Neue\",system-ui,sans-serif;\n--nav:44px;--tab:50px;--st:env(safe-area-inset-top,0px);--sb:env(safe-area-inset-bottom,0px)}\nhtml.tm4.dark{color-scheme:dark;--bg:#000;--card:#1c1c1e;--raised:#636366;--text:#fff;--sub:#98989f;--ter:#4a4a4e;--tabi:#8b8b90;\n--sep:rgba(84,84,88,.62);--fill:rgba(118,118,128,.24);--fill2:rgba(118,118,128,.36);--press:rgba(255,255,255,.09);\n--accent:#409cff;--bar:rgba(20,20,22,.82);--sheet:rgba(44,44,46,.97);--hero1:#18497a;--hero2:#0a2342;--shadow:none}\n@media (prefers-color-scheme:dark){html.tm4:not(.light){--bg:#000;--card:#1c1c1e;--raised:#636366;--text:#fff;--sub:#98989f;--ter:#4a4a4e;--tabi:#8b8b90;\n--sep:rgba(84,84,88,.62);--fill:rgba(118,118,128,.24);--fill2:rgba(118,118,128,.36);--press:rgba(255,255,255,.09);\n--accent:#409cff;--bar:rgba(20,20,22,.82);--sheet:rgba(44,44,46,.97);--hero1:#18497a;--hero2:#0a2342;--shadow:none}}\nhtml.tm4.light{color-scheme:light}\nhtml.tm4,html.tm4 body{margin:0;background:var(--bg);color:var(--text);font:17px/1.3 var(--font);-webkit-font-smoothing:antialiased}\nhtml.tm4 body{min-height:100vh;padding:calc(var(--st) + var(--nav)) 0 calc(var(--sb) + var(--tab) + 30px);-webkit-tap-highlight-color:transparent;-webkit-touch-callout:none}\nhtml.tm4 body.no-tabs{padding-bottom:calc(var(--sb) + 30px)}\nhtml.tm4 *,html.tm4 *::before,html.tm4 *::after{box-sizing:border-box}\nhtml.tm4 a{color:inherit;text-decoration:none}\nhtml.tm4 button{font:inherit;color:inherit;background:none;border:0;padding:0;margin:0;cursor:pointer;-webkit-appearance:none;appearance:none;text-align:inherit}\nhtml.tm4 [hidden]{display:none!important}\nhtml.tm4 body > :not([data-tm4]){display:none!important}\n.tm4 .i{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex:none;display:block}\n.tm4 .nav{position:fixed;z-index:60;top:0;left:0;right:0;height:calc(var(--st) + var(--nav));padding:var(--st) 4px 0;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;\ntransition:background-color .2s,box-shadow .2s}\n.tm4 .nav.scrolled{background:var(--bar);-webkit-backdrop-filter:saturate(180%) blur(20px);backdrop-filter:saturate(180%) blur(20px);box-shadow:0 .5px 0 var(--sep)}\n.tm4 .nav-l{justify-self:start;display:flex;min-width:0}\n.tm4 .nav-r{justify-self:end;display:flex;min-width:0}\n.tm4 .nav-t{font-weight:600;font-size:17px;max-width:56vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:0;transform:translateY(4px);transition:opacity .18s,transform .18s}\n.tm4 .nav.titled .nav-t,.tm4 .nav.always .nav-t{opacity:1;transform:none}\n.tm4 .nb{display:inline-flex;align-items:center;gap:3px;height:44px;padding:0 10px;color:var(--accent);font-size:17px;max-width:44vw;white-space:nowrap}\n.tm4 .nb span{overflow:hidden;text-overflow:ellipsis}\n.tm4 .nb .i{width:24px;height:24px}\n.tm4 .nb.back{padding-left:6px}\n.tm4 .nb.back .i{width:14px;height:22px;stroke-width:2.6}\n.tm4 .nb.pressed{opacity:.35}\n.tm4 .lt{padding:2px 20px 12px}\n.tm4 .lt h1{margin:0;font-size:34px;line-height:40px;font-weight:700;letter-spacing:.2px;overflow-wrap:anywhere}\n.tm4 .lt h1.long{font-size:28px;line-height:33px}\n.tm4 .lt-sub{margin:3px 0 0;color:var(--sub);font-size:15px;line-height:20px}\n.tm4 [style*=\"--c:\"]{--cd:var(--cd-l,var(--c))}\n.tm4.dark [style*=\"--c:\"]{--cd:var(--cd-d,var(--c))}\n@media (prefers-color-scheme:dark){.tm4:not(.light) [style*=\"--c:\"]{--cd:var(--cd-d,var(--c))}}\n.tm4 .lt-kicker{display:inline-flex;align-items:center;gap:6px;margin:0 0 6px;padding:3px 9px;border-radius:7px;font-size:13px;font-weight:600;\ncolor:var(--cd,var(--accent));background:color-mix(in srgb,var(--c,var(--accent)) 16%,transparent)}\n.tm4 .view{display:none}\n.tm4 .view.on{display:block}\n.tm4 .view.push{animation:tm-push .34s cubic-bezier(.2,.85,.25,1)}\n.tm4 .view.pop{animation:tm-pop .3s cubic-bezier(.2,.85,.25,1)}\n.tm4 .view.fade{animation:tm-fade .18s ease-out}\n@keyframes tm-push{from{transform:translate3d(32%,0,0);opacity:0}to{transform:none;opacity:1}}\n@keyframes tm-pop{from{transform:translate3d(-14%,0,0);opacity:0}to{transform:none;opacity:1}}\n@keyframes tm-fade{from{opacity:0}to{opacity:1}}\n.tm4 .appear{animation:tm-fade .22s ease-out}\n.tm4 #tm-main{transition:transform .34s cubic-bezier(.2,.85,.25,1),opacity .34s ease}\n.tm4.tm-leave-fwd #tm-main{transform:translate3d(-9%,0,0);opacity:.4}\n.tm4.tm-leave-back #tm-main{transform:translate3d(9%,0,0);opacity:.4}\n.tm4.tm-leaving #tm-main{pointer-events:none}\n.tm4.tm-arrive #tm-main{animation:tm-fade .2s ease-out}\n.tm4.tm-arrive-fwd #tm-main{animation:tm-push .36s cubic-bezier(.2,.85,.25,1)}\n.tm4.tm-arrive-back #tm-main{animation:tm-pop .32s cubic-bezier(.2,.85,.25,1)}\n.tm4 .nav::after{content:\"\";position:absolute;left:0;right:0;bottom:-1px;height:2.5px;background:var(--accent);transform:scaleX(0);transform-origin:0 50%;opacity:0;pointer-events:none}\n.tm4.tm-leaving .nav::after{opacity:1;animation:tm-load 7s cubic-bezier(.08,.75,.2,1) forwards}\n@keyframes tm-load{0%{transform:scaleX(.02)}12%{transform:scaleX(.42)}100%{transform:scaleX(.94)}}\n@media (prefers-reduced-motion:reduce){.tm4.tm-leaving .nav::after{transform:scaleX(.6)}}\n@media (prefers-reduced-motion:reduce){.tm4 *,.tm4 *::before,.tm4 *::after{animation:none!important;transition:none!important}}\n.tm4 .sh{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:26px 20px 9px}\n.tm4 .sh h2{margin:0;font-size:22px;line-height:27px;font-weight:700;letter-spacing:.1px}\n.tm4 .sh a,.tm4 .sh button{flex:none;font-size:16px;color:var(--accent)}\n.tm4 .sh-note{flex:none;font-size:15px;color:var(--sub)}\n.tm4 .gh{margin:24px 36px 7px;font-size:13px;line-height:18px;color:var(--sub);text-transform:uppercase;letter-spacing:.3px}\n.tm4 .gf{margin:7px 36px 0;font-size:13px;line-height:18px;color:var(--sub)}\n.tm4 .gf a,.tm4 .gf button{color:var(--accent)}\n.tm4 .group{margin:0 16px;background:var(--card);border-radius:12px;overflow:hidden;--inset:58px}\n.tm4 .group.plain{--inset:16px}\n.tm4 .group + .group{margin-top:16px}\n.tm4 .row{position:relative;display:flex;align-items:center;gap:12px;width:100%;min-height:46px;padding:9px 14px 9px 16px;transition:background-color .12s}\n.tm4 .row + .row::before,.tm4 .row + .sub::before,.tm4 .grp-h + .row::before,.tm4 .row + .grp-h::before,.tm4 .sub + .grp-h::before{content:\"\";position:absolute;top:0;right:0;left:var(--inset);height:.5px;background:var(--sep)}\n.tm4 .row.pressed,.tm4 .ann.pressed,.tm4 .lesson.pressed{background:var(--press);transition:none}\n.tm4 .ic{flex:none;width:30px;height:30px;border-radius:8px;display:grid;place-items:center;background:var(--c,var(--accent));color:var(--ct,#fff)}\n.tm4 .ic .i{width:19px;height:19px;stroke-width:2}\n.tm4 .ic.soft{background:color-mix(in srgb,var(--c,var(--accent)) 16%,transparent);color:var(--cd,var(--c,var(--accent)))}\n.tm4 .ic.txt{font-size:12px;font-weight:700;letter-spacing:.2px}\n.tm4 .fi{flex:none;width:30px;height:30px;border-radius:7px;display:grid;place-items:center;background:var(--c);color:#fff;font-size:9.5px;font-weight:800;letter-spacing:.3px}\n.tm4 .main{flex:1;min-width:0}\n.tm4 .t{display:block;font-size:17px;line-height:22px;overflow-wrap:anywhere}\n.tm4 .t.b{font-weight:600}\n.tm4 .s{display:block;margin-top:1px;font-size:14px;line-height:19px;color:var(--sub);overflow:hidden;text-overflow:ellipsis}\n.tm4 .s.one{white-space:nowrap}\n.tm4 .clamp2{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}\n.tm4 .end{flex:none;display:flex;align-items:center;gap:8px;color:var(--sub);font-size:15px}\n.tm4 .chev{width:8px;height:14px;fill:none;stroke:var(--ter);stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}\n.tm4 .ext{width:15px;height:15px;stroke:var(--ter);stroke-width:2.2}\n.tm4 .dot{width:9px;height:9px;border-radius:50%;background:var(--accent);flex:none}\n.tm4 .row .dot.lead{position:absolute;left:5px;top:50%;margin-top:-4.5px;width:7px;height:7px}\n.tm4 .cap{display:inline-flex;align-items:center;height:22px;padding:0 8px;border-radius:11px;background:var(--fill);color:var(--sub);font-size:13px;font-weight:600;white-space:nowrap}\n.tm4 .cap.blue{background:color-mix(in srgb,var(--accent) 14%,transparent);color:var(--accent)}\n.tm4 .cap.red{background:color-mix(in srgb,var(--red) 14%,transparent);color:var(--red)}\n.tm4 .cap.orange{background:color-mix(in srgb,var(--orange) 16%,transparent);color:#c46a00}\n.tm4.dark .cap.orange{color:var(--orange)}\n@media (prefers-color-scheme:dark){.tm4:not(.light) .cap.orange{color:var(--orange)}}\n.tm4 .row.sub{padding-left:58px;min-height:44px}\n.tm4 .row.sub .fi{width:26px;height:26px;font-size:8.5px}\n.tm4 .grp-h{position:relative;display:flex;align-items:center;gap:12px;padding:11px 16px 4px}\n.tm4 .grp-h .t{font-weight:600}\n.tm4 .row.off{opacity:.5}\n.tm4 .row.note .s{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}\n.tm4 .more-row{display:block;width:100%;padding:13px 16px;color:var(--accent);font-size:16px;text-align:center}\n.tm4 .row + .more-row{border-top:.5px solid var(--sep)}\n.tm4 .tabbar{position:fixed;z-index:60;left:0;right:0;bottom:0;display:flex;height:calc(var(--tab) + var(--sb));padding:0 2px var(--sb);\nbackground:var(--bar);-webkit-backdrop-filter:saturate(180%) blur(20px);backdrop-filter:saturate(180%) blur(20px);box-shadow:0 -.5px 0 var(--sep)}\n.tm4 .tabbar a{position:relative;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding-top:1px;color:var(--tabi);font-size:10.5px;font-weight:500;letter-spacing:.1px}\n.tm4 .tabbar a.on{color:var(--accent)}\n.tm4 .tabbar .i{width:27px;height:27px;stroke-width:1.7}\n.tm4 .tabbar a.on .i{stroke-width:2.1}\n.tm4 .tabbar a.pressed{opacity:.55}\n.tm4 .badge{display:inline-grid;place-items:center;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:var(--red);color:#fff;font-size:12px;font-weight:600;line-height:1}\n.tm4 .tabbar .badge{position:absolute;top:3px;left:calc(50% + 5px)}\n.tm4 .seg{position:relative;display:flex;margin:0 16px 14px;padding:2px;border-radius:9px;background:var(--fill)}\n.tm4 .seg button{position:relative;z-index:1;flex:1;height:30px;border-radius:7px;font-size:13.5px;font-weight:500;text-align:center;color:var(--text)}\n.tm4 .seg button.on{font-weight:600}\n.tm4 .seg .thumb{position:absolute;z-index:0;top:2px;bottom:2px;left:2px;border-radius:7px;background:var(--raised);\nbox-shadow:0 3px 8px rgba(0,0,0,.12),0 3px 1px rgba(0,0,0,.04);transition:transform .28s cubic-bezier(.3,.75,.25,1)}\n.tm4 .stick{position:sticky;z-index:20;top:calc(var(--st) + var(--nav));background:var(--bg);padding-top:2px}\n.tm4 .nav.scrolled ~ main .stick{background:transparent}\n.tm4 .search{display:flex;align-items:center;gap:6px;height:38px;margin:0 16px 14px;padding:0 8px;border-radius:10px;background:var(--fill);color:var(--sub)}\n.tm4 .search .i{width:19px;height:19px;stroke-width:2.2}\n.tm4 .search input{flex:1;min-width:0;height:100%;border:0;outline:0;background:transparent;color:var(--text);font:17px var(--font);-webkit-appearance:none;appearance:none}\n.tm4 .search input::placeholder{color:var(--sub)}\n.tm4 .search input::-webkit-search-cancel-button{display:none}\n.tm4 .search .clr{display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:var(--sub);color:var(--bg);font-size:13px;font-weight:700;line-height:1}\n.tm4 .chips{display:flex;gap:8px;overflow-x:auto;padding:0 16px 14px;scrollbar-width:none;-webkit-overflow-scrolling:touch}\n.tm4 .chips::-webkit-scrollbar{display:none}\n.tm4 .chip{flex:none;height:34px;padding:0 14px;border-radius:17px;background:var(--fill);font-size:15px;font-weight:500;white-space:nowrap}\n.tm4 .chip.on{background:var(--text);color:var(--bg)}\n.tm4 .chip.pressed{opacity:.6}\n.tm4 .hero{position:relative;display:block;margin:2px 16px 0;padding:16px 16px 15px;border-radius:20px;color:#fff;overflow:hidden;\nbackground:linear-gradient(140deg,var(--hero1),var(--hero2));box-shadow:0 8px 24px rgba(11,44,82,.22)}\n.tm4 .hero::after{content:\"\";position:absolute;right:-40px;top:-60px;width:180px;height:180px;border-radius:50%;background:var(--c,#3a86d6);opacity:.35;filter:blur(30px)}\n.tm4 .hero > *{position:relative;z-index:1}\n.tm4 .hero.pressed{transform:scale(.985);transition:transform .12s}\n.tm4 .hero-top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}\n.tm4 .hero-lbl{display:inline-flex;align-items:center;gap:7px;font-size:13px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;opacity:.9}\n.tm4 .hero-lbl i{width:8px;height:8px;border-radius:50%;background:var(--c,#7fc1ff);box-shadow:0 0 0 3px rgba(255,255,255,.18)}\n.tm4 .hero-lbl.live i{background:#4cd964;animation:tm-pulse 1.8s infinite}\n@keyframes tm-pulse{0%,100%{box-shadow:0 0 0 0 rgba(76,217,100,.55)}60%{box-shadow:0 0 0 7px rgba(76,217,100,0)}}\n.tm4 .hero-cd{font-size:14px;font-weight:600;padding:4px 10px;border-radius:12px;background:rgba(255,255,255,.17);white-space:nowrap}\n.tm4 .hero-title{font-size:24px;line-height:29px;font-weight:700;letter-spacing:.1px}\n.tm4 .hero-meta{display:flex;flex-wrap:wrap;gap:4px 14px;margin-top:6px;font-size:15px;opacity:.92}\n.tm4 .hero-meta span{display:inline-flex;align-items:center;gap:5px}\n.tm4 .hero-meta .i{width:16px;height:16px;stroke-width:2}\n.tm4 .hero-prog{height:4px;margin-top:12px;border-radius:2px;background:rgba(255,255,255,.22);overflow:hidden}\n.tm4 .hero-prog i{display:block;height:100%;border-radius:2px;background:#fff}\n.tm4 .hero-acts{display:flex;flex-wrap:nowrap;gap:6px;margin-top:13px}\n.tm4 .hero-acts a,.tm4 .hero-acts button{flex:0 1 auto;min-width:0;overflow:hidden;white-space:nowrap;display:inline-flex;align-items:center;gap:5px;height:31px;padding:0 11px;border-radius:16px;background:rgba(255,255,255,.18);color:#fff;font-size:14px;font-weight:600}\n.tm4 .hero-acts a.pri{background:#fff;color:#0b2c52}\n.tm4 .hero-acts .i{flex:none;width:15px;height:15px;stroke-width:2.1}\n@media (max-width:380px){.tm4 .hero-acts{gap:5px}.tm4 .hero-acts a,.tm4 .hero-acts button{padding:0 9px;gap:4px;font-size:13.5px}}\n.tm4 .hero.calm{background:var(--card);color:var(--text);box-shadow:var(--shadow)}\n.tm4 .hero.calm::after{display:none}\n.tm4 .hero.calm .hero-cd{background:var(--fill)}\n.tm4 .tiles{display:flex;gap:10px;overflow-x:auto;padding:0 16px 2px;scroll-snap-type:x mandatory;scroll-padding:0 16px;scrollbar-width:none}\n.tm4 .tiles::-webkit-scrollbar{display:none}\n.tm4 .tile{flex:none;width:148px;height:92px;padding:11px 12px;border-radius:16px;scroll-snap-align:start;display:flex;flex-direction:column;justify-content:space-between;\nbackground:color-mix(in srgb,var(--c) 15%,var(--card));box-shadow:inset 0 0 0 .5px color-mix(in srgb,var(--c) 30%,transparent)}\n.tm4 .tile.pressed{transform:scale(.97);transition:transform .12s}\n.tm4 .tile b{font-size:15px;line-height:19px;font-weight:600;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}\n.tm4 .tile span{display:flex;align-items:center;justify-content:space-between;font-size:12.5px;font-weight:600;color:var(--cd,var(--c))}\n.tm4 .tile .cap{height:20px;padding:0 7px;font-size:12px;background:var(--c);color:var(--ct,#fff)}\n.tm4 .lesson{position:relative;display:flex;gap:12px;align-items:stretch;padding:12px 14px 12px 16px}\n.tm4 .lesson + .lesson::before{content:\"\";position:absolute;top:0;right:0;left:86px;height:.5px;background:var(--sep)}\n.tm4 .lesson .tm{flex:none;width:46px;text-align:right;padding-top:1px}\n.tm4 .lesson .tm b{display:block;font-size:15px;line-height:20px;font-weight:600;font-variant-numeric:tabular-nums}\n.tm4 .lesson .tm span{display:block;font-size:13px;line-height:18px;color:var(--sub);font-variant-numeric:tabular-nums}\n.tm4 .lesson .bar{flex:none;width:4px;border-radius:2px;background:var(--c,var(--accent))}\n.tm4 .lesson .main .t{font-weight:600}\n.tm4 .lesson .meta{display:flex;flex-wrap:wrap;gap:2px 12px;margin-top:3px;font-size:14px;line-height:19px;color:var(--sub)}\n.tm4 .lesson .meta a{display:inline-flex;align-items:center;gap:4px;color:var(--accent)}\n.tm4 .lesson .meta .i{width:14px;height:14px;stroke-width:2.1}\n.tm4 .lesson.now{background:color-mix(in srgb,var(--c,var(--accent)) 9%,transparent)}\n.tm4 .lesson.past{opacity:.5}\n.tm4 .exam-tag{display:inline-block;margin-right:6px;padding:1px 6px;border-radius:6px;background:var(--red);color:#fff;font-size:11px;font-weight:700;vertical-align:2px;letter-spacing:.3px}\n.tm4 .lesson.exam-l .bar{background:var(--red)}\n.tm4 .now-tag{display:inline-block;margin-left:6px;padding:1px 7px;border-radius:8px;background:#30b955;color:#fff;font-size:11.5px;font-weight:700;vertical-align:2px;letter-spacing:.3px}\n.tm4 .wk-head{display:flex;align-items:center;justify-content:space-between;margin:0 10px 4px 20px}\n.tm4 .wk-head b{font-size:17px;font-weight:600}\n.tm4 .wk-head .btns{display:flex;align-items:center}\n.tm4 .wk-head button{display:grid;place-items:center;min-width:40px;height:40px;color:var(--accent);font-size:16px}\n.tm4 .wk-head button .i{width:22px;height:22px;stroke-width:2.2}\n.tm4 .wk-head .today-btn{padding:0 10px;font-weight:500}\n.tm4 .week{display:flex;padding:0 10px 10px;touch-action:pan-y}\n.tm4 .wd{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:2px 0}\n.tm4 .wd small{font-size:11px;font-weight:600;color:var(--sub);text-transform:uppercase}\n.tm4 .wd b{display:grid;place-items:center;width:36px;height:36px;border-radius:50%;font-size:18px;font-weight:500;font-variant-numeric:tabular-nums;transition:background-color .15s,color .15s}\n.tm4 .wd i{width:5px;height:5px;border-radius:50%;background:var(--sub);opacity:0}\n.tm4 .wd.has i{opacity:.7}\n.tm4 .wd.today b{color:var(--red);font-weight:600}\n.tm4 .wd.sel b{background:var(--text);color:var(--bg);font-weight:600}\n.tm4 .wd.today.sel b{background:var(--red);color:#fff}\n.tm4 .wd.we small,.tm4 .wd.we b{opacity:.55}\n.tm4 .wk-sticky{position:sticky;z-index:20;top:calc(var(--st) + var(--nav));background:var(--bg);padding-top:2px;box-shadow:0 .5px 0 var(--sep)}\n.tm4 .lt-next{display:flex;align-items:center;gap:6px;margin-top:6px;color:var(--cd,var(--sub));font-weight:500}\n.tm4 .lt-next .i{width:16px;height:16px;stroke-width:2.1}\n.tm4 .day-title{scroll-margin-top:150px;margin:18px 20px 8px;font-size:15px;font-weight:600;color:var(--sub)}\n.tm4 .day-wrap{touch-action:pan-y;min-height:200px}\n.tm4 .slide-l{animation:tm-sl .24s cubic-bezier(.2,.85,.25,1)}\n.tm4 .slide-r{animation:tm-sr .24s cubic-bezier(.2,.85,.25,1)}\n@keyframes tm-sl{from{transform:translate3d(18%,0,0);opacity:0}to{transform:none;opacity:1}}\n@keyframes tm-sr{from{transform:translate3d(-18%,0,0);opacity:0}to{transform:none;opacity:1}}\n.tm4 .exam{position:relative;display:flex;gap:14px;align-items:center;padding:13px 14px 13px 16px}\n.tm4 .exam + .exam::before{content:\"\";position:absolute;top:0;right:0;left:82px;height:.5px;background:var(--sep)}\n.tm4 .dt{flex:none;width:52px;padding:5px 0 6px;border-radius:12px;text-align:center;background:var(--fill)}\n.tm4 .dt small{display:block;font-size:11px;line-height:14px;font-weight:700;color:var(--red);text-transform:uppercase;letter-spacing:.3px}\n.tm4 .dt b{display:block;font-size:24px;line-height:28px;font-weight:600;font-variant-numeric:tabular-nums}\n.tm4 .dt em{display:block;font-size:11px;line-height:13px;font-style:normal;color:var(--sub);text-transform:uppercase}\n.tm4 .exam .t{font-weight:600}\n.tm4 .exam .s a{display:inline-flex;align-items:center;gap:4px;color:var(--accent)}\n.tm4 .exam .s a .i{width:14px;height:14px;stroke-width:2.1}\n.tm4 .card{margin:0 16px;padding:16px;border-radius:14px;background:var(--card)}\n.tm4 .ann{display:block;margin:0 16px 12px;padding:14px 16px;border-radius:14px;background:var(--card);transition:background-color .12s}\n.tm4 .ann-top{display:flex;align-items:center;gap:8px;margin-bottom:4px;font-size:13px;color:var(--sub)}\n.tm4 .ann h3{margin:0;font-size:17px;line-height:22px;font-weight:600}\n.tm4 .ann .body{position:relative;margin-top:6px;font-size:16px;line-height:1.45;max-height:7.25em;overflow:hidden}\n.tm4 .ann.clamped .body::after{content:\"\";position:absolute;left:0;right:0;bottom:0;height:2.2em;background:linear-gradient(transparent,var(--card))}\n.tm4 .ann.open .body{max-height:none}\n.tm4 .ann.open .body::after{display:none}\n.tm4 .ann .more{display:none;margin-top:6px;color:var(--accent);font-size:15px;font-weight:500}\n.tm4 .ann.clamped .more{display:inline-block}\n.tm4 .ann.open .more{display:inline-block}\n.tm4 .ann.hl{box-shadow:0 0 0 2px var(--accent)}\n.tm4 .teaser{display:flex;gap:12px;align-items:flex-start;margin:0 16px 4px;padding:13px 14px;border-radius:14px;background:color-mix(in srgb,var(--c,var(--accent)) 11%,var(--card))}\n.tm4 .teaser .ic{background:var(--c,var(--accent))}\n.tm4 .teaser .t{font-weight:600;font-size:16px;line-height:21px}\n.tm4 .teaser .s{font-size:14.5px;line-height:19px;margin-top:2px;color:var(--text);opacity:.75}\n.tm4 .teaser.pressed{filter:brightness(.96)}\n.tm4 .rt{font-size:16.5px;line-height:1.5;overflow-wrap:anywhere}\n.tm4 .rt > :first-child{margin-top:0}\n.tm4 .rt > :last-child{margin-bottom:0}\n.tm4 .rt p{margin:0 0 11px}\n.tm4 .rt h3,.tm4 .rt h4,.tm4 .rt h5,.tm4 .rt h6{margin:18px 0 8px;font-size:18px;line-height:23px}\n.tm4 .rt ul,.tm4 .rt ol{margin:0 0 11px;padding-left:22px}\n.tm4 .rt li{margin:3px 0}\n.tm4 .rt a{color:var(--accent);text-decoration:underline;text-decoration-color:color-mix(in srgb,var(--accent) 35%,transparent);text-underline-offset:2px}\n.tm4 .rt img{max-width:100%;height:auto;border-radius:10px}\n.tm4 .rt table{display:block;max-width:100%;overflow-x:auto;border-collapse:collapse;font-size:14.5px;margin:0 0 11px}\n.tm4 .rt td,.tm4 .rt th{border:.5px solid var(--sep);padding:6px 8px;vertical-align:top}\n.tm4 .rt blockquote{margin:0 0 11px;padding-left:12px;border-left:3px solid var(--sep);color:var(--sub)}\n.tm4 .rt hr{border:0;border-top:.5px solid var(--sep);margin:14px 0}\n.tm4 .rt pre{white-space:pre-wrap;font-size:14px}\n.tm4 .rt .frow{display:flex;align-items:center;gap:12px;margin:10px 0;padding:11px 12px;border-radius:12px;background:var(--fill);text-decoration:none;color:var(--text)}\n.tm4 .rt .frow .t{font-size:16px;line-height:20px;font-weight:600}\n.tm4 .rt .frow .s{font-size:13.5px}\n.tm4 .rt .frow.pressed{background:var(--fill2)}\n.tm4 .rt .embed{display:inline-flex;align-items:center;gap:8px;padding:10px 14px;border-radius:12px;background:var(--fill);color:var(--accent);text-decoration:none;font-weight:600}\n.tm4 .doc{margin:0 16px;padding:16px;border-radius:14px;background:var(--card)}\n.tm4 .empty{padding:44px 36px;text-align:center;color:var(--sub);font-size:15px;line-height:20px}\n.tm4 .empty .i{width:44px;height:44px;margin:0 auto 10px;stroke-width:1.5;color:var(--ter)}\n.tm4 .empty b{display:block;margin-bottom:4px;color:var(--text);font-size:17px;font-weight:600}\n.tm4 .empty.small{padding:22px 24px}\n.tm4 .banner{display:flex;align-items:center;gap:12px;margin:0 16px 14px;padding:12px 14px;border-radius:12px;background:var(--card);font-size:15px;line-height:20px}\n.tm4 .banner .i{width:22px;height:22px;color:var(--orange)}\n.tm4 .banner .main{flex:1}\n.tm4 .banner button,.tm4 .banner a.act{flex:none;color:var(--accent);font-weight:600}\n.tm4 .sk{border-radius:7px;background:linear-gradient(90deg,var(--fill) 25%,var(--fill2) 50%,var(--fill) 75%);background-size:300% 100%;animation:tm-sk 1.3s ease-in-out infinite}\n@keyframes tm-sk{from{background-position:100% 0}to{background-position:0 0}}\n.tm4 .sk-row{display:flex;align-items:center;gap:12px;padding:12px 16px}\n.tm4 .sk-row .sk.ic{width:30px;height:30px;border-radius:8px}\n.tm4 .sk-row .lines{flex:1}\n.tm4 .sk-row .lines .sk{height:13px}\n.tm4 .sk-row .lines .sk + .sk{margin-top:7px;width:55%;height:11px}\n.tm4 .spin{width:26px;height:26px;margin:0 auto;border-radius:50%;border:2.5px solid var(--fill2);border-top-color:var(--sub);animation:tm-spin .8s linear infinite}\n@keyframes tm-spin{to{transform:rotate(360deg)}}\n.tm4 .center{min-height:60vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:30px;text-align:center;color:var(--sub)}\n.tm4 .center b{color:var(--text);font-size:19px}\n.tm4 .fresh{margin:18px 36px 0;font-size:13px;line-height:18px;color:var(--sub);text-align:center}\n.tm4 .fresh button,.tm4 .fresh a{color:var(--accent)}\n.tm4 .row .spin{width:18px;height:18px;margin:0;border-width:2px}\n.tm4 .btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;height:46px;padding:0 20px;border-radius:13px;background:var(--accent);color:#fff;font-size:17px;font-weight:600}\n.tm4 .btn.ghost{background:var(--fill);color:var(--accent)}\n.tm4 .btn.pressed{opacity:.7}\n.tm4 .btn .i{width:20px;height:20px;stroke-width:2.1}\n.tm4 .scrim{position:fixed;z-index:90;inset:0;background:rgba(0,0,0,.32);opacity:0;transition:opacity .25s}\n.tm4 .scrim.on{opacity:1}\n.tm4 .sheet{position:fixed;z-index:91;left:8px;right:8px;bottom:calc(8px + var(--sb));transform:translate3d(0,115%,0);transition:transform .34s cubic-bezier(.2,.9,.25,1)}\n.tm4 .sheet.on{transform:none}\n.tm4 .sheet .sg{overflow:hidden;border-radius:14px;background:var(--sheet);-webkit-backdrop-filter:blur(30px);backdrop-filter:blur(30px)}\n.tm4 .sheet .sg + .sg{margin-top:8px}\n.tm4 .sheet .sh-t{padding:14px 16px 12px;text-align:center;font-size:13px;line-height:18px;color:var(--sub)}\n.tm4 .sheet .sh-t b{display:block;color:var(--text);font-size:14px;font-weight:600;margin-bottom:2px}\n.tm4 .sheet .sa{display:block;width:100%;padding:17px 12px;text-align:center;font-size:19px;color:var(--accent);border-top:.5px solid var(--sep)}\n.tm4 .sheet .sh-t + .sa,.tm4 .sheet .sg > .sa:first-child{border-top:0}\n.tm4 .sheet .sa.red{color:var(--red)}\n.tm4 .sheet .sa.bold{font-weight:600}\n.tm4 .sheet .sa.pressed{background:var(--press)}\n.tm4 .toast{position:fixed;z-index:95;left:50%;bottom:calc(var(--tab) + var(--sb) + 18px);max-width:calc(100% - 40px);padding:11px 18px;border-radius:22px;background:rgba(28,28,30,.92);color:#fff;font-size:15px;line-height:20px;text-align:center;\ntransform:translate3d(-50%,16px,0);opacity:0;transition:opacity .22s,transform .22s;pointer-events:none}\n.tm4 .toast.on{opacity:1;transform:translate3d(-50%,0,0)}\n.tm4 .prof{display:flex;align-items:center;gap:14px;padding:14px 16px}\n.tm4 .avatar{flex:none;width:56px;height:56px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(140deg,var(--hero1),var(--hero2));color:#fff;font-size:21px;font-weight:600}\n.tm4 .prof .t{font-size:20px;line-height:25px;font-weight:600}\n.tm4 .foot{margin:26px 20px 0;text-align:center;color:var(--sub);font-size:12.5px;line-height:18px}\n.tm4 .legal{margin:10px 28px 0;text-align:center;color:var(--sub);opacity:.8;font-size:10px;line-height:14px}\n.tm4 .sync{min-height:80vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;color:var(--sub);text-align:center;padding:24px}\n.tm4 .sync small{max-width:320px;font-size:12px;line-height:1.4;color:var(--sub);opacity:.75;word-break:break-word}\nhtml.tm4 > :not(head):not(body){display:none!important}\n.tm4 .udoc > * + *{margin-top:16px}\n.tm4 .cap.green{background:color-mix(in srgb,var(--green) 16%,transparent);color:#1f8a3d}\n.tm4.dark .cap.green{color:#4cd964}\n@media (prefers-color-scheme:dark){.tm4:not(.light) .cap.green{color:#4cd964}}\n.tm4 .gh span{float:right;text-transform:none;letter-spacing:0}\n.tm4 .gc{display:flex;align-items:center;gap:8px;color:var(--text);text-transform:none;letter-spacing:0;font-size:15px;font-weight:600;text-decoration:none;margin-top:22px}\n.tm4 .gc i{flex:none;width:10px;height:10px;border-radius:50%;background:var(--c)}\n.tm4 a.gc .chev{margin-left:auto;flex:none;width:7px;height:12px;stroke:var(--sub);fill:none;stroke-width:2}\n.tm4 .row.muted .t{color:var(--sub)}\n.tm4 .card{margin:16px 16px 0;padding:14px 16px 16px;border-radius:16px;background:var(--card);box-shadow:var(--shadow)}\n.tm4 .card-h{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:12px}\n.tm4 .card-h b{font-size:17px;font-weight:600}\n.tm4 .card-h span{color:var(--sub);font-size:15px;font-weight:500}\n.tm4 .card-note{margin:12px 0 0;color:var(--sub);font-size:13.5px;line-height:18px}\n.tm4 .card-note b{color:var(--text)}\n.tm4 .stack{display:flex;gap:3px;height:14px;border-radius:7px;overflow:hidden;background:var(--fill)}\n.tm4 .stack i{display:block;min-width:4px;border-radius:3px;transform-origin:0 50%;animation:tm-grow .7s cubic-bezier(.2,.85,.25,1) both}\n.tm4 .legend{display:flex;flex-wrap:wrap;gap:6px 16px;margin-top:11px;font-size:13.5px;color:var(--sub)}\n.tm4 .legend span{display:inline-flex;align-items:center;gap:6px}\n.tm4 .legend i{width:9px;height:9px;border-radius:50%}\n.tm4 .legend b{color:var(--text);font-weight:600}\n@keyframes tm-grow{from{transform:scaleX(0)}to{transform:none}}\n@keyframes tm-rise{from{transform:scaleY(0)}to{transform:none}}\n.tm4 .ring{position:relative;flex:none}\n.tm4 .ring svg{display:block;width:100%;height:100%}\n.tm4 .ring circle{transition:stroke-dasharray .8s cubic-bezier(.2,.85,.25,1)}\n.tm4 .ring-mid{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;line-height:1}\n.tm4 .ring-mid b{font-size:28px;font-weight:700;letter-spacing:-.5px}\n.tm4 .ring-mid small{margin-top:4px;font-size:11.5px;font-weight:600;opacity:.8}\n.tm4 .st-hero{position:relative;margin:2px 16px 0;padding:16px;border-radius:22px;color:#fff;overflow:hidden;background:linear-gradient(150deg,#1d5fa0,#0b2c52 70%);box-shadow:0 10px 28px rgba(11,44,82,.25)}\n.tm4 .st-hero.isp{background:linear-gradient(150deg,#5b3fb0,#24124f 72%);box-shadow:0 10px 28px rgba(45,20,95,.25)}\n.tm4 .st-hero::after{content:\"\";position:absolute;right:-50px;top:-70px;width:200px;height:200px;border-radius:50%;background:#4cd964;opacity:.22;filter:blur(34px)}\n.tm4 .st-hero > *{position:relative;z-index:1}\n.tm4 .st-top{display:flex;align-items:center;justify-content:space-between;gap:10px}\n.tm4 .st-hero .hero-lbl i{background:#4cd964}\n.tm4 .st-name{margin-top:8px;font-size:22px;line-height:27px;font-weight:700}\n.tm4 .st-spec{margin-top:3px;font-size:14.5px;line-height:19px;opacity:.85}\n.tm4 .st-row{display:flex;align-items:center;gap:18px;margin-top:14px}\n.tm4 .st-kpis{display:flex;flex-direction:column;gap:12px;min-width:0}\n.tm4 .kpi b{display:block;font-size:30px;line-height:32px;font-weight:700;letter-spacing:-.5px}\n.tm4 .kpi b small{font-size:17px;font-weight:600;opacity:.85}\n.tm4 .kpi span{display:block;margin-top:1px;font-size:13px;opacity:.8}\n.tm4 .vbars{display:flex;align-items:flex-end;gap:10px;height:150px}\n.tm4 .vb{flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;height:100%;min-width:0}\n.tm4 .vb-v{font-size:13px;font-weight:600}\n.tm4 .vb-bar{flex:1;width:100%;max-width:46px;display:flex;align-items:flex-end;border-radius:8px;background:var(--fill)}\n.tm4 .vb-bar i{display:block;width:100%;border-radius:8px;transform-origin:50% 100%;animation:tm-rise .7s cubic-bezier(.2,.85,.25,1) both}\n.tm4 .vb-l{font-size:12px;color:var(--sub);white-space:nowrap}\n.tm4 .vbars.hist{height:120px;gap:8px}\n.tm4 .score{display:inline-flex;align-items:baseline;gap:1px;min-width:52px;justify-content:center;height:28px;padding:0 9px;border-radius:14px;background:color-mix(in srgb,var(--sc) 15%,transparent);color:var(--sc);font-size:17px;font-weight:700;line-height:28px}\n.tm4 .score small{font-size:11px;font-weight:600;opacity:.8}\n.tm4 .res{position:relative}\n.tm4 .res + .res::before{content:\"\";position:absolute;top:0;right:0;left:16px;height:.5px;background:var(--sep)}\n.tm4 .res.open{background:color-mix(in srgb,var(--fill) 40%,transparent)}\n.tm4 .res[role=button]{cursor:pointer}\n.tm4 .res .row{transition:none}\n.tm4 .res-d{padding:0 16px 14px;color:var(--sub);font-size:13.5px;line-height:18px;animation:tm-fade .2s ease-out}\n.tm4 .rk-box{margin-top:10px;padding:12px;border-radius:12px;background:var(--fill)}\n.tm4 .rk-line{margin:0 0 9px;color:var(--text);font-size:14px;line-height:19px}\n.tm4 .rk{display:grid;grid-template-columns:18px 1fr auto;align-items:center;gap:8px;height:24px}\n.tm4 .rk-c{font-weight:700;color:var(--sub)}\n.tm4 .rk-bar{height:9px;border-radius:5px;background:var(--fill)}\n.tm4 .rk-bar i{display:block;height:100%;border-radius:5px;background:var(--ter);transform-origin:0 50%;animation:tm-grow .6s cubic-bezier(.2,.85,.25,1) both}\n.tm4 .rk-v{min-width:92px;text-align:right;font-size:12.5px;color:var(--sub);font-variant-numeric:tabular-nums}\n.tm4 .rk-v small{display:inline-block;min-width:48px;margin-left:4px;font-size:12.5px}\n.tm4 .rk.me .rk-c,.tm4 .rk.me .rk-v{color:var(--accent);font-weight:700}\n.tm4 .rk.me .rk-bar i{background:var(--accent)}\n.tm4 .row.done .t{color:var(--sub)}\n.tm4 .row.plain-note{min-height:40px}\n.tm4 .row.failed .t{color:var(--red)}\n.tm4 .ptr{position:fixed;z-index:55;left:50%;top:calc(var(--st) + var(--nav) - 38px);width:36px;height:36px;margin-left:-18px;border-radius:50%;background:var(--card);\nbox-shadow:0 2px 12px rgba(0,0,0,.16);display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:transform .3s cubic-bezier(.2,.85,.25,1),opacity .2s}\n.tm4 .ptr.drag{transition:none}\n.tm4 .ptr .spin{width:18px;height:18px;margin:0;border-width:2.2px;border-top-color:var(--accent);animation:none}\n.tm4 .ptr.busy .spin{animation:tm-spin .75s linear infinite}";
  const LOGIN_CSS = "html.tm4-login{--bg:#f2f2f7;--card:#fff;--text:#000;--sub:#6d6d72;--sep:rgba(60,60,67,.2);--fill:rgba(118,118,128,.12);--accent:#0a6cd6;--red:#ff3b30;\n--font:-apple-system,BlinkMacSystemFont,\"SF Pro Text\",\"Helvetica Neue\",system-ui,sans-serif;color-scheme:light;background:var(--bg)!important}\nhtml.tm4-login.dark{color-scheme:dark;--bg:#000;--card:#1c1c1e;--text:#fff;--sub:#98989f;--sep:rgba(84,84,88,.65);--fill:rgba(118,118,128,.24);--accent:#409cff}\n@media (prefers-color-scheme:dark){html.tm4-login:not(.light){color-scheme:dark;--bg:#000;--card:#1c1c1e;--text:#fff;--sub:#98989f;--sep:rgba(84,84,88,.65);--fill:rgba(118,118,128,.24);--accent:#409cff}}\nhtml.tm4-login body{background:var(--bg)!important;color:var(--text)!important;font-family:var(--font)!important;-webkit-font-smoothing:antialiased;-webkit-text-size-adjust:100%}\nhtml.tm4-login .vw-100{width:100%!important}\nhtml.tm4-login .vh-100{height:auto!important;min-height:100vh;min-height:100dvh}\nhtml.tm4-login #background,html.tm4-login #footer{display:none!important}\nhtml.tm4-login .sidebar{width:100%!important;max-width:none!important;min-height:100vh;min-height:100dvh;background:var(--bg)!important;border:0!important;box-shadow:none!important;\npadding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom)!important}\nhtml.tm4-login #language{width:100%;padding:8px 10px 0!important}\nhtml.tm4-login #language .nav-link{color:var(--sub)!important;font-size:14px!important;padding:6px 8px!important}\nhtml.tm4-login #content{width:100%!important;max-width:460px;margin:0 auto;justify-content:flex-start!important;padding:4vh 22px 28px!important}\nhtml.tm4-login #service-info{display:flex;flex-direction:column;align-items:center;text-align:center;margin:0 0 30px!important}\nhtml.tm4-login #serviceDescription,html.tm4-login #serviceDescription .description-logo-text{display:contents!important}\nhtml.tm4-login #serviceDescription .col-3{order:0;flex:none!important;width:auto!important;max-width:none!important;padding:0!important}\nhtml.tm4-login #serviceLogo{display:block;width:80px;height:80px;object-fit:contain;padding:12px;border-radius:20px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.06),0 8px 24px rgba(0,0,0,.1)}\nhtml.tm4-login #service-info h5{order:1;margin:18px 0 6px!important;font:700 30px/36px var(--font)!important;letter-spacing:.2px;color:var(--text)!important}\nhtml.tm4-login #serviceDescription .col-9{order:2;flex:none!important;width:auto!important;max-width:30ch!important;padding:0!important;color:var(--sub)!important;font-size:15px!important;line-height:20px}\nhtml.tm4-login .auth-forms{display:flex;flex-direction:column}\nhtml.tm4-login .loginbutton{margin:0!important;padding:0!important}\nhtml.tm4-login .loginMethod:not(.hidden){display:flex!important;align-items:center;justify-content:center;gap:12px;width:100%;min-height:56px;margin:0!important;padding:12px 18px!important;\nborder:0!important;border-radius:14px!important;font:600 16px/21px var(--font)!important;box-shadow:none!important;text-align:left!important;-webkit-tap-highlight-color:transparent;transition:transform .12s,opacity .12s}\nhtml.tm4-login .loginMethod:active{transform:scale(.98);opacity:.85}\nhtml.tm4-login .loginMethod br{display:none!important}\nhtml.tm4-login #btnnextauthlogin{background:var(--accent)!important;color:#fff!important}\nhtml.tm4-login #btnnextauthlogin img{flex:none;width:32px;height:32px;margin:0!important;padding:3px;border-radius:8px;background:#fff}\nhtml.tm4-login #btnPwdLogin{background:var(--card)!important;color:var(--accent)!important;box-shadow:inset 0 0 0 1px var(--sep)!important}\nhtml.tm4-login #btnPwdLogin i,html.tm4-login .loginMethod i{flex:none;margin:0!important;font-size:24px!important;color:inherit!important}\nhtml.tm4-login .form-check:not(.hidden){display:flex!important;align-items:center;gap:10px;min-height:36px;margin:10px 4px 0!important;padding:0!important}\nhtml.tm4-login .form-check-input{position:static!important;flex:none;width:22px!important;height:22px!important;margin:0!important;accent-color:var(--accent);background-color:var(--card)}\nhtml.tm4-login .form-check-label,html.tm4-login .text-muted{color:var(--sub)!important}\nhtml.tm4-login .form-check-label{font-size:15px!important;line-height:20px}\nhtml.tm4-login #orSeperator:not(.hidden){display:flex!important;align-items:center;gap:12px;margin:18px 4px!important;padding:0!important;color:var(--sub)!important;font-size:13px!important;text-transform:uppercase;letter-spacing:.4px;background:none!important}\nhtml.tm4-login #orSeperator::before,html.tm4-login #orSeperator::after{content:\"\"!important;flex:1;height:.5px;margin:0!important;border:0!important;background:var(--sep)!important;position:static!important;width:auto!important}\nhtml.tm4-login .input-group{margin:0 0 10px!important}\nhtml.tm4-login .form-control{height:52px!important;padding:0 14px!important;border:1px solid var(--sep)!important;border-radius:12px!important;background:var(--card)!important;color:var(--text)!important;\nfont:17px var(--font)!important;box-shadow:none!important;-webkit-appearance:none;appearance:none}\nhtml.tm4-login .form-control::placeholder{color:var(--sub)!important;opacity:1}\nhtml.tm4-login .form-control:focus{border-color:var(--accent)!important;box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 22%,transparent)!important;outline:0!important}\nhtml.tm4-login .btn-primary,html.tm4-login #pwdLoginBtn{min-height:52px;border:0!important;border-radius:14px!important;background:var(--accent)!important;color:#fff!important;font:600 17px var(--font)!important;box-shadow:none!important}\nhtml.tm4-login .form-group{margin-bottom:0!important}\nhtml.tm4-login #pwdLoginForm .form-group{margin-top:14px!important}\nhtml.tm4-login #btnGoToMain:not(.hidden){display:flex!important;align-items:center;gap:4px;margin:16px auto 0!important;color:var(--accent)!important;font:500 16px var(--font)!important;background:none!important;border:0!important;box-shadow:none!important}\nhtml.tm4-login #revokeConsent{margin-top:14px!important}\nhtml.tm4-login .alert:not(.hidden){border:0!important;border-radius:12px!important;padding:12px 14px!important;font-size:15px!important;line-height:20px}\nhtml.tm4-login .alert-danger{background:color-mix(in srgb,var(--red) 13%,var(--card))!important;color:var(--text)!important}\nhtml.tm4-login .alert-warning{background:color-mix(in srgb,#ff9500 15%,var(--card))!important;color:var(--text)!important}\nhtml.tm4-login .help{margin-top:22px!important;text-align:center}\nhtml.tm4-login .help > a{color:var(--sub)!important;font-size:15px!important;text-decoration:none!important}\nhtml.tm4-login .help-links{margin:12px 0 0!important;padding:0!important;list-style:none!important;text-align:left;background:var(--card);border-radius:12px;overflow:hidden}\nhtml.tm4-login .help-links li{margin:0!important}\nhtml.tm4-login .help-links li + li a{border-top:.5px solid var(--sep)}\nhtml.tm4-login .help-links a{display:block;padding:13px 16px;color:var(--accent)!important;font-size:15px;text-decoration:none!important}\nhtml.tm4-login #content h1,html.tm4-login #content h2,html.tm4-login #content h3,html.tm4-login #content h4{color:var(--text)!important;font-family:var(--font)!important}\nhtml.tm4-login #content p{color:var(--text)}\nhtml.tm4-login #content .btn:not(.loginMethod):not(.close):not(#btnGoToMain){min-height:50px;border-radius:14px!important;font:600 17px var(--font)!important}\nhtml.tm4-login #content .btn-secondary,html.tm4-login #content .btn-light,html.tm4-login #content .btn-outline-primary{background:var(--card)!important;color:var(--accent)!important;border:1px solid var(--sep)!important}\nhtml.tm4-login #content a{color:var(--accent)}";
  /* ================================================================== environment */
  const W = window;
  const VERSION = '4.9.0';
  const SITE = { 'toledo.kuleuven.be': 'portal', 'ultra.edu.kuleuven.cloud': 'ultra', 'webwsp.aps.kuleuven.be': 'loket', 'idp.kuleuven.be': 'idp', 'icts-p-toledo-journey.cloud.icts.kuleuven.be': 'journey' }[location.hostname];
  const TOP = W.top === W;
  const TEST = !!W.__TM_TEST__;
  const PATH = W.__TM_PATH__ || location.pathname;
  const PORTAL = 'https://toledo.kuleuven.be/portal/';
  const PORTAL_ORIGIN = 'https://toledo.kuleuven.be';
  const ULTRA = 'https://ultra.edu.kuleuven.cloud';
  const LOKET_ORIGIN = 'https://webwsp.aps.kuleuven.be';
  const LOKET = LOKET_ORIGIN + '/sap/bc/ui2/flp';
  const JOURNEY = 'https://icts-p-toledo-journey.cloud.icts.kuleuven.be/learningUnits/ultraLink?batchUid=';
  const MAIL = 'https://outlook.office.com/mail/';
  const PHONE = TEST || Math.min(screen.width, screen.height) < 600;
  const params = new URLSearchParams(location.search);

  const ss = {
    get(k) { try { return sessionStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (_) {} },
    del(k) { try { sessionStorage.removeItem(k); } catch (_) {} },
  };
  const classicOn = (site) => { const v = Number(ss.get('tm4-classic-' + site)); return v > 0 && Date.now() - v < 30 * 60e3; };

  /* ================================================================== helpers */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (t) => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const fromYmd = (s, hm) => {
    const [y, m, d] = String(s).split('-').map(Number);
    const [h, mi] = String(hm || '0:0').split(':').map(Number);
    return new Date(y, (m || 1) - 1, d || 1, h || 0, mi || 0).getTime();
  };
  const DAYS = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
  const DAYS_S = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
  const MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  const MONTHS_S = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
  const sod = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const addDays = (t, n) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes()).getTime(); };
  const dayDiff = (a, b) => Math.round((sod(a) - sod(b)) / 864e5);
  const mondayOf = (t) => { const d = new Date(sod(t)); return addDays(d.getTime(), -((d.getDay() + 6) % 7)); };
  const hhmm = (t) => { const d = new Date(t); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const dLong = (t) => { const d = new Date(t); return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; };
  const dShort = (t) => { const d = new Date(t); return `${DAYS_S[d.getDay()]} ${d.getDate()} ${MONTHS_S[d.getMonth()]}`; };
  const relDay = (t, now = Date.now()) => {
    const n = dayDiff(t, now);
    if (n === 0) return 'Vandaag';
    if (n === 1) return 'Morgen';
    if (n === -1) return 'Gisteren';
    if (n > 1 && n < 7) return cap(DAYS[new Date(t).getDay()]);
    return cap(dShort(t));
  };
  const until = (t, now = Date.now()) => {
    const m = Math.round((t - now) / 60e3);
    if (m < 1) return 'nu';
    if (m < 60) return `over ${m} min`;
    const d = dayDiff(t, now);
    if (d === 0) { const h = Math.floor(m / 60), r = m % 60; return r && h < 3 ? `over ${h} u ${r} min` : `over ${Math.round(m / 60)} u`; }
    if (d === 1) return 'morgen';
    if (d < 14) return `over ${d} dagen`;
    return `over ${Math.round(d / 7)} weken`;
  };
  const shortWhen = (t, now = Date.now()) => {
    const n = dayDiff(t, now);
    if (n === 0) return hhmm(t);
    if (n === -1) return 'gisteren';
    if (n > -7 && n < 0) return DAYS_S[new Date(t).getDay()];
    return `${new Date(t).getDate()} ${MONTHS_S[new Date(t).getMonth()]}`;
  };
  const fsize = (b) => (!b ? '' : b >= 1e6 ? (b / 1e6).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1e3)) + ' kB');
  const fold = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const cleanTitle = (t) => String(t || '').replace(/\s*\[[A-Za-z0-9]{4,9}\]/g, '').replace(/\s{2,}/g, ' ').trim();
  const codeOf = (t) => (/\[([A-Za-z0-9]{4,9})\]/.exec(String(t || '')) || [])[1] || '';
  const luCode = (lu) => (/^ULTRA-[A-Z]-KUL-([A-Za-z0-9]+)-\d{4}$/.exec(String(lu || '')) || [])[1] || '';
  const STOP = /^(and|of|the|in|on|for|to|a|an|en|van|de|het|voor|met|op|der|des|und|und|la|le|du|des|et)$/i;
  const initials = (t) => {
    const w = cleanTitle(t).replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter((x) => x && !STOP.test(x));
    return ((w[0] || '?')[0] + (w[1] ? w[1][0] : (w[0] || '').slice(1, 2))).toUpperCase();
  };
  const textOf = (html) => {
    if (!html) return '';
    if (typeof html === 'object') html = html.displayText || html.rawText || '';
    return String(html).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
  };
  const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (_) { return ''; } };
  const absU = (u, base = ULTRA + '/') => { try { const x = new URL(u, base); return /^(https?:|mailto:)$/.test(x.protocol) ? x.href : ''; } catch (_) { return ''; } };
  const put = (el, html) => { if (el && el.__h !== html) { el.innerHTML = html; el.__h = html; } };

  /* course colours (Toledo palette, 1-16) */
  const PAL = [null, [144, 81, 78], [198, 111, 72], [217, 45, 45], [242, 109, 80], [211, 148, 37], [255, 187, 108], [222, 197, 134], [242, 207, 59],
    [90, 155, 79], [122, 191, 30], [30, 112, 105], [50, 195, 181], [74, 109, 136], [87, 160, 209], [145, 94, 208], [210, 100, 157]];
  function colorVars(i) {
    const c = PAL[Number(i)] || [10, 108, 214];
    const lum = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    const dk = c.map((v) => Math.round(v * (lum > 150 ? 0.55 : 0.8)));
    const lt = c.map((v) => Math.round(v + (255 - v) * 0.3));
    return `--c:rgb(${c});--ct:${lum > 170 ? '#1c1c1e' : '#fff'};--cd-l:rgb(${dk});--cd-d:rgb(${lt})`;
  }

  /* ================================================================== updates */
  // Userscripts on iPhone never updates by itself. Check GitHub now and then and offer the new version in the app.
  const UPDATE_URL = 'https://raw.githubusercontent.com/vj4542662/toledo-mobile/main/toledo-mobile.user.js';
  const newerThan = (a, b) => {
    const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number);
    for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); }
    return false;
  };
  function checkUpdate(cb) {
    if (TEST) return;
    let st = null; try { st = JSON.parse(localStorage.getItem('tm4:upd') || 'null'); } catch (_) {}
    if (st && st.v && newerThan(st.v, VERSION)) cb(st.v);
    if (st && Date.now() - st.ts < 3 * 3600e3) return;
    fetch(UPDATE_URL + '?t=' + Date.now(), { cache: 'no-store', credentials: 'omit' })
      .then((r) => (r.ok ? r.text() : ''))
      .then((t) => {
        const m = /@version\s+([\d.]+)/.exec(t);
        if (!m) return;
        try { localStorage.setItem('tm4:upd', JSON.stringify({ ts: Date.now(), v: m[1] })); } catch (_) {}
        if (newerThan(m[1], VERSION)) cb(m[1]);
      }, () => {});
  }

  /* ================================================================== storage + network */
  const NS = 'tm4:';
  const store = {
    get(k) { try { const v = localStorage.getItem(NS + k); return v ? JSON.parse(v) : null; } catch (_) { return null; } },
    set(k, v) {
      const s = JSON.stringify(v);
      try { localStorage.setItem(NS + k, s); } catch (_) { store.prune(); try { localStorage.setItem(NS + k, s); } catch (__) {} }
    },
    del(k) { try { localStorage.removeItem(NS + k); } catch (_) {} },
    prune() {
      // storage full: drop the oldest half of the cached course content
      try {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && /^tm4:[cia]:/.test(k)) { let ts = 0; try { ts = JSON.parse(localStorage.getItem(k)).ts || 0; } catch (_) {} keys.push([ts, k]); }
        }
        keys.sort((a, b) => a[0] - b[0]).slice(0, Math.ceil(keys.length / 2)).forEach(([, k]) => localStorage.removeItem(k));
      } catch (_) {}
    },
    clear() { try { Object.keys(localStorage).filter((k) => k.startsWith(NS)).forEach((k) => localStorage.removeItem(k)); } catch (_) {} },
  };

  class AuthError extends Error { constructor(m) { super(m || 'session'); this.auth = true; } }
  async function api(url, opt = {}) {
    const r = await fetch(url, Object.assign({ credentials: 'include' }, opt, { headers: Object.assign({ Accept: 'application/json' }, opt.headers || {}) }));
    if (r.status === 401) throw new AuthError('401');
    if (!r.ok) { const e = new Error('HTTP ' + r.status); e.status = r.status; throw e; }
    if (r.status === 204) return null;
    const ct = r.headers.get('content-type') || '';
    if (/text\/html/.test(ct)) throw new AuthError('html');
    return r.json();
  }
  /* Keep a session alive while the app is open: a small request every few minutes while you look at it, and
     one straight away when you come back to the page. It only refreshes a session that is still valid; it never
     signs you in. Each ping is a plain GET of something the app reads anyway. */
  function keepAlive(name, pings, every = 4 * 60e3) {
    if (TEST) return;
    const KEY = 'ka:' + name;
    const ping = () => {
      if (document.visibilityState !== 'visible') return;
      const last = Number(ss.get(KEY)) || 0;
      if (Date.now() - last < every - 5e3) return;
      ss.set(KEY, String(Date.now()));
      pings.forEach(([url, mode]) => fetch(url, { credentials: 'include', mode: mode || 'cors', cache: 'no-store', headers: mode === 'no-cors' ? {} : { Accept: 'application/json' } }).catch(() => {}));
    };
    setInterval(ping, 60e3);
    document.addEventListener('visibilitychange', ping);
    W.addEventListener('pageshow', ping);
    setTimeout(ping, 20e3);
  }
  const inflight = new Map();
  const once = (key, fn) => {
    if (!inflight.has(key)) inflight.set(key, fn().finally(() => inflight.delete(key)));
    return inflight.get(key);
  };
  /* stale-while-revalidate: onData(value, fromCache) runs with the cached copy right away and again when
     the network copy differs. Resolves with the fresh value. */
  function swr(key, fetcher, onData, { maxAge = 0 } = {}) {
    const c = store.get(key);
    if (c && c.v != null) onData(c.v, true, c.ts);
    if (c && maxAge && Date.now() - c.ts < maxAge) return Promise.resolve(c.v);
    return once('swr:' + key, fetcher).then((v) => {
      const same = c && JSON.stringify(c.v) === JSON.stringify(v);
      store.set(key, { ts: Date.now(), v });
      if (!same) onData(v, false, Date.now());
      return v;
    });
  }

  /* ================================================================== icons */
  const ICONS = {
    house: '<path d="M3.8 10.4 12 3.8l8.2 6.6V19a1.6 1.6 0 0 1-1.6 1.6h-4v-5.8H9.4v5.8h-4A1.6 1.6 0 0 1 3.8 19z"/>',
    book: '<path d="M5 5.6A2.1 2.1 0 0 1 7.1 3.5H19v13.8H7.1A2.1 2.1 0 0 0 5 19.4z"/><path d="M5 19.4a2.1 2.1 0 0 0 2.1 2.1H19v-4.2"/><path d="M9 7.8h6"/>',
    calendar: '<rect x="3.6" y="4.8" width="16.8" height="15.8" rx="3"/><path d="M3.6 9.6h16.8M8 3v3.4M16 3v3.4"/><path d="M7.6 13.2h1.6M11.2 13.2h1.6M14.8 13.2h1.6M7.6 16.8h1.6M11.2 16.8h1.6" stroke-width="2.2"/>',
    bell: '<path d="M6 16.4V11a6 6 0 0 1 12 0v5.4l1.6 2.1H4.4z"/><path d="M10 20.6a2 2 0 0 0 4 0"/>',
    grid: '<rect x="4" y="4" width="6.6" height="6.6" rx="1.8"/><rect x="13.4" y="4" width="6.6" height="6.6" rx="1.8"/><rect x="4" y="13.4" width="6.6" height="6.6" rx="1.8"/><rect x="13.4" y="13.4" width="6.6" height="6.6" rx="1.8"/>',
    ext: '<path d="M8 16 16.5 7.5M9.5 7.5h7v7"/>',
    folder: '<path d="M3.5 7.6a2 2 0 0 1 2-2h4.1l2 2.2h6.9a2 2 0 0 1 2 2v7.6a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>',
    doc: '<path d="M7 3.6h6.6l4.9 4.9V19a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 19V5.1A1.5 1.5 0 0 1 7 3.6z"/><path d="M13.4 3.8v4.9h4.9M8.6 12.6h6.8M8.6 16h4.6"/>',
    play: '<circle cx="12" cy="12" r="8.6"/><path d="M10.2 8.7v6.6l5.2-3.3z" fill="currentColor" stroke-width="1.2"/>',
    link: '<path d="M10.2 13.8a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.1 1.1"/><path d="M13.8 10.2a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.1-1.1"/>',
    pencil: '<path d="M14.6 5.4 18.6 9.4M4.6 19.4l1-4.3L15.7 5a2 2 0 0 1 2.8 0l.5.5a2 2 0 0 1 0 2.8L8.9 18.4z"/>',
    bubble: '<path d="M4.6 18.6V7a2 2 0 0 1 2-2h10.8a2 2 0 0 1 2 2v7.4a2 2 0 0 1-2 2H8.5z"/>',
    megaphone: '<path d="M4 10v4a1 1 0 0 0 1 1h2l6.5 4V5L7 9H5a1 1 0 0 0-1 1z"/><path d="M16.8 9.2a4 4 0 0 1 0 5.6M19.2 6.8a7.4 7.4 0 0 1 0 10.4"/>',
    chart: '<path d="M5 20v-7M10 20V5.5M15 20v-9.5M20 20V8.5"/>',
    clock: '<circle cx="12" cy="12" r="8.6"/><path d="M12 7.4V12l3.1 1.9"/>',
    pin: '<path d="M12 21s-6.4-5.5-6.4-10.9a6.4 6.4 0 0 1 12.8 0C18.4 15.5 12 21 12 21z"/><circle cx="12" cy="10" r="2.3"/>',
    mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2.6"/><path d="m4.6 7.6 7.4 5.4 7.4-5.4"/>',
    search: '<circle cx="10.8" cy="10.8" r="6.3"/><path d="m15.5 15.5 4.4 4.4"/>',
    refresh: '<path d="M19.4 12.6a7.4 7.4 0 1 1-2.1-6"/><path d="M19.6 4.4v3.8h-3.8"/>',
    check: '<path d="m5 12.6 4.4 4.4L19 7.4"/>',
    checks: '<path d="m2.8 12.8 4.3 4.3 9-9.6M12.6 16.6l.5.5 9-9.6"/>',
    more: '<circle cx="12" cy="12" r="8.8"/><circle cx="7.9" cy="12" r=".9" fill="currentColor"/><circle cx="12" cy="12" r=".9" fill="currentColor"/><circle cx="16.1" cy="12" r=".9" fill="currentColor"/>',
    cap: '<path d="M2.6 9.4 12 5l9.4 4.4L12 13.8z"/><path d="M6.4 11.4v4.5c1.6 1.4 3.6 2.1 5.6 2.1s4-.7 5.6-2.1v-4.5M21.4 9.4v5"/>',
    info: '<circle cx="12" cy="12" r="8.6"/><path d="M12 11v5.6M12 7.7v.2"/>',
    warn: '<path d="M12 4.2 2.9 19.6h18.2z"/><path d="M12 10v4.4M12 17.2v.2"/>',
    lock: '<rect x="5" y="10.4" width="14" height="10" rx="2.2"/><path d="M8 10.4V8a4 4 0 0 1 8 0v2.4"/>',
    globe: '<circle cx="12" cy="12" r="8.6"/><path d="M3.4 12h17.2M12 3.4c2.3 2.4 3.4 5.3 3.4 8.6s-1.1 6.2-3.4 8.6c-2.3-2.4-3.4-5.3-3.4-8.6S9.7 5.8 12 3.4z"/>',
    library: '<path d="M4 20.2h16M5.6 17.2V9.6M9.6 17.2V9.6M14.4 17.2V9.6M18.4 17.2V9.6M3.6 9.4 12 4.4l8.4 5z"/>',
    inbox: '<path d="M4 13.6 6.4 5.6h11.2l2.4 8v4.6a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 18.2z"/><path d="M4 13.6h4.6l1 2h4.8l1-2H20"/>',
    video: '<rect x="3" y="6.4" width="12.6" height="11.2" rx="2.6"/><path d="m15.6 10.6 5.2-3v8.8l-5.2-3z"/>',
    swap: '<path d="M6.5 8h12l-3.2-3.2M17.5 16h-12l3.2 3.2"/>',
    cloud: '<path d="M7.2 18.6h10.3a3.6 3.6 0 0 0 .6-7.2 5.6 5.6 0 0 0-10.8-1.3 4.2 4.2 0 0 0-.1 8.5z"/>',
    idcard: '<rect x="3.5" y="5.5" width="17" height="13" rx="2.6"/><circle cx="9" cy="11" r="2"/><path d="M6 15.6c.7-1.3 1.8-2 3-2s2.3.7 3 2M14 10.2h3.6M14 13.6h3.6"/>',
    trend: '<path d="m4 16.4 5.2-5.2 3.6 3.6L20 7.6"/><path d="M15 7.6h5v5"/>',
    sparkle: '<path d="M12 3.6c.6 4.3 2.1 5.8 6.4 6.4-4.3.6-5.8 2.1-6.4 6.4-.6-4.3-2.1-5.8-6.4-6.4 4.3-.6 5.8-2.1 6.4-6.4z"/>',
    help: '<circle cx="12" cy="12" r="8.6"/><path d="M9.6 9.5a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.7M12 17v.2"/>',
    person: '<circle cx="12" cy="8.6" r="3.6"/><path d="M5 20.2a7 7 0 0 1 14 0"/>',
    seat: '<path d="M6 11V6.6A2.6 2.6 0 0 1 8.6 4h6.8A2.6 2.6 0 0 1 18 6.6V11"/><path d="M4.5 11h15v4.4h-15zM6.4 15.4V20M17.6 15.4V20"/>',
  };
  const ico = (n, cls) => `<svg class="i${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;
  const CHEV = '<svg class="chev" viewBox="0 0 8 14" aria-hidden="true"><path d="M1.5 1.5 6.5 7l-5 5.5"/></svg>';
  const BACK = '<svg class="i" viewBox="0 0 12 22" aria-hidden="true"><path d="M10 2 2 11l8 9"/></svg>';
  const EXT = ico('ext', 'ext');

  /* ================================================================== light / dark */
  // 'auto' follows the phone. The choice is kept per site (localStorage), on *.kuleuven.be in a cookie
  // (so the login page knows it too) and handed to the course pages on ultra.edu.kuleuven.cloud in the link (th=).
  const THEME_KEY = 'tm4:theme';
  function readTheme() {
    const m = /[?&#]th=(light|dark|auto)\b/.exec(location.hash + '&' + location.search);
    if (m) return m[1];
    let t = '';
    try { t = localStorage.getItem(THEME_KEY) || ''; } catch (_) {}
    if (!t) { try { const c = /(?:^|;\s*)tm4theme=(light|dark|auto)/.exec(document.cookie || ''); if (c) t = c[1]; } catch (_) {} }
    return t || 'auto';
  }
  function saveTheme(t) {
    try { localStorage.setItem(THEME_KEY, t); } catch (_) {}
    if (/(^|\.)kuleuven\.be$/.test(location.hostname)) {
      try { document.cookie = `tm4theme=${t}; domain=kuleuven.be; path=/; max-age=31536000; secure; samesite=lax`; } catch (_) {}
    }
  }
  let THEME = readTheme();
  const isDark = () => THEME === 'dark' || (THEME === 'auto' && W.matchMedia && W.matchMedia('(prefers-color-scheme: dark)').matches);
  function applyTheme(t) {
    THEME = t;
    const r = document.documentElement;
    if (!r) return;
    r.classList.toggle('light', t === 'light');
    r.classList.toggle('dark', t === 'dark');
    const head = document.head;
    if (!head) return;
    let m = head.querySelector('meta[name="theme-color"]');
    if (!m) { m = document.createElement('meta'); m.setAttribute('name', 'theme-color'); head.appendChild(m); }
    m.setAttribute('content', isDark() ? '#000000' : '#f2f2f7');
  }
  try { W.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (THEME === 'auto') applyTheme('auto'); }); } catch (_) {}
  // links are drawn once and kept, so a link drawn before the choice changed still carries the old one:
  // put the current choice in at the moment the link is used
  const withTheme = (url) => String(url || '').replace(/([?&#]th=)(light|dark|auto)\b/, '$1' + THEME);
  function initThemeLinks() {
    if (W.__tm4themelinks) return;
    W.__tm4themelinks = true;
    const fix = (e) => {
      const a = e.target && e.target.closest && e.target.closest('a[href*="th="]');
      if (!a) return;
      const h = a.getAttribute('href'), n = withTheme(h);
      if (n !== h) a.setAttribute('href', n);
    };
    W.addEventListener('pointerdown', fix, true);
    W.addEventListener('click', fix, true);
  }

  /* Blackboard's and KU Loket's own pages (the ones the app leaves alone) have no dark look of their own. In dark
     mode they get a "smart invert": light becomes dark, colours keep their hue, and pictures, videos and embedded
     documents are turned back so they look exactly as they should. */
  function classicDark() {
    if (THEME === 'light') return;
    const css = 'html{filter:invert(1) hue-rotate(180deg)!important;background:#fff!important}'
      + 'html :is(img,video,iframe,canvas,picture,embed,object,[style*="background-image"]){filter:invert(1) hue-rotate(180deg)!important}'
      + 'html picture img,html :is(img,video,iframe,canvas,picture,embed,object,[style*="background-image"]) :is(img,video,iframe,canvas,picture,embed,object,[style*="background-image"]){filter:none!important}';
    const st = document.createElement('style');
    st.id = 'tm4-dark';
    st.textContent = THEME === 'dark' ? css : `@media (prefers-color-scheme:dark){${css}}`;
    const add = () => { const box = document.head || document.documentElement; if (box && !document.getElementById('tm4-dark')) box.appendChild(st); };
    if (document.documentElement) add();
    else { const mo = new MutationObserver(() => { if (document.documentElement) { mo.disconnect(); add(); } }); mo.observe(document, { childList: true }); }
    // keep it last, so later stylesheets can't win
    const keep = () => { if (document.head && st.parentNode && st !== document.head.lastElementChild) document.head.appendChild(st); };
    W.addEventListener('DOMContentLoaded', keep);
    W.addEventListener('load', keep);
  }

  const TM_ICON = 'https://toledo.kuleuven.be/portal/images/favicon/apple-touch-icon.png'; // Toledo's own icon (public)

  /* ================================================================== shell */
  /* The site's own app must not start next to ours: Toledo's portal app, Blackboard's app or the KU Loket launchpad
     running hidden in the background costs a lot of memory, and on an iPhone that makes Safari kill the tab ("A
     problem repeatedly occurred", a black screen). Scripts the parser still adds are switched off before they run
     (the parser hands new nodes to observers before it runs a script). */
  function blockScripts(match) {
    const off = (n) => {
      if (n.nodeType !== 1 || n.tagName !== 'SCRIPT' || n.hasAttribute('data-tm4')) return;
      if (match && !match(n)) return;
      n.type = 'text/tm4-blocked';
      n.removeAttribute('src');
      n.remove();
    };
    const mo = new MutationObserver((list) => list.forEach((m) => m.addedNodes.forEach((n) => {
      off(n);
      if (n.nodeType === 1 && n.firstElementChild && n.getElementsByTagName('script').length) Array.from(n.getElementsByTagName('script')).forEach(off);
    })));
    mo.observe(document, { childList: true, subtree: true });
    document.querySelectorAll('script').forEach(off);
    return mo;
  }
  function takeover(title, preconnect) {
    try { W.stop(); } catch (_) {}
    blockScripts();
    // reuse the page's own <html> and let the parser create head + body (a detached, script-built body
    // can leave the browser without a first paint)
    let root = document.documentElement;
    if (!root) { root = document.createElement('html'); document.appendChild(root); }
    Array.from(root.attributes).forEach((a) => root.removeAttribute(a.name));
    root.innerHTML = '<head></head><body></body>';
    root.lang = 'nl';
    root.className = 'tm4';
    const head = document.head;
    const add = (tag, attrs) => { const m = document.createElement(tag); Object.entries(attrs).forEach(([k, v]) => m.setAttribute(k, v)); head.appendChild(m); return m; };
    add('meta', { charset: 'utf-8' });
    add('meta', { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' });
    add('meta', { name: 'format-detection', content: 'telephone=no' });
    (preconnect || []).forEach((h) => add('link', { rel: 'preconnect', href: h, crossorigin: 'use-credentials' }));
    add('title', {}).textContent = title;
    // home-screen icon (Safari's "Zet op beginscherm" reads it from the page; without one it draws a letter)
    add('link', { rel: 'apple-touch-icon', sizes: '180x180', href: TM_ICON });
    add('link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: 'https://toledo.kuleuven.be/portal/images/favicon/favicon-32x32.png' });
    add('style', { 'data-tm4': '' }).textContent = CSS;
    applyTheme(THEME);
    if (/[?&#]th=(light|dark|auto)\b/.test(location.hash + '&' + location.search)) saveTheme(THEME);
    try { history.scrollRestoration = 'manual'; } catch (_) {}
    initPress();
    initMotion();
    initThemeLinks();
    keepOut();
  }

  // Safari can keep handing the page's own markup and styles to the document after we took over (when the whole
  // page had already arrived, or when the extension started the script a moment late), and the site's own app may
  // still add things. None of that may show for even a moment or restyle the app: the CSS hides everything in
  // <body> that isn't ours, and stylesheets that aren't ours are taken out as soon as they appear.
  function keepOut() {
    const root = document.documentElement;
    if (!root || root.__tmKeep) return;
    root.__tmKeep = true;
    const foreignStyle = (n) => n.nodeType === 1 && !n.hasAttribute('data-tm4') && (n.tagName === 'STYLE' || (n.tagName === 'LINK' && /stylesheet/i.test(n.getAttribute('rel') || '')));
    const clean = () => {
      [root, document.head].forEach((box) => { if (box) Array.from(box.children).forEach((n) => { if (foreignStyle(n)) n.remove(); }); });
      if (document.head && headObs.__on !== document.head) { headObs.disconnect(); headObs.observe(document.head, { childList: true }); headObs.__on = document.head; }
    };
    const headObs = new MutationObserver(clean);
    new MutationObserver(clean).observe(root, { childList: true });
    clean();
  }

  // a page on the way somewhere else (a redirect, Toledo's link service): cover it in the app's colours instead of
  // showing it, without touching it (its own redirect has to keep running)
  function cover(text) {
    const dark = isDark();
    const st = document.createElement('style');
    st.textContent = `html{background:${dark ? '#000' : '#f2f2f7'}!important}body{visibility:hidden!important}html::after{content:"${text}";visibility:visible;position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:${dark ? '#000' : '#f2f2f7'};color:${dark ? '#98989f' : '#6d6d72'};font:600 17px -apple-system,system-ui,sans-serif}`;
    (document.head || document.documentElement).appendChild(st);
    // still here after a while: the page has something to say (an error, a question), so show it after all
    setTimeout(() => st.remove(), 7000);
  }

  /* ================================================================== page-to-page motion */
  // Going to another page (a course, back to the app's tabs, a file) is a real page load in Safari. Safari keeps
  // showing the current page until the next one can paint, so the tap gets an answer right away: the content
  // slides aside and dims and a loading bar runs under the navigation bar. The next page then slides in, like
  // a screen being pushed (or popped) in an app, instead of popping up after a white flash.
  let leaveT = 0;
  function leaving(dir) {
    const r = document.documentElement;
    if (!r || !r.classList.contains('tm4')) return;
    r.classList.remove('tm-arrive', 'tm-arrive-fwd', 'tm-arrive-back', 'tm-leave-fwd', 'tm-leave-back');
    void r.offsetWidth;
    r.classList.add('tm-leaving', dir === 'back' ? 'tm-leave-back' : 'tm-leave-fwd');
    clearTimeout(leaveT);
    leaveT = setTimeout(stay, 8000); // a download, or a link that opened elsewhere: give the page back
  }
  function stay() {
    clearTimeout(leaveT);
    const r = document.documentElement;
    if (r) r.classList.remove('tm-leaving', 'tm-leave-fwd', 'tm-leave-back');
  }
  function goTo(url, { replace, dir } = {}) {
    url = withTheme(url);
    if (!TEST) leaving(dir);
    if (replace) location.replace(url); else location.href = url;
  }
  // which way does a link go? back to the app's tabs (portal) is "back", everything else is "forward"
  const dirOf = (url) => (SITE !== 'portal' && /^https:\/\/toledo\.kuleuven\.be\/portal/.test(url) ? 'back' : 'fwd');
  function initMotion() {
    if (W.__tm4motion) return;
    W.__tm4motion = true;
    const r = document.documentElement;
    const ref = hostOf(document.referrer);
    const arrive = SITE === 'ultra' ? (/^toledo\.kuleuven\.be$|journey/.test(ref) ? 'fwd' : '')
      : (/kuleuven\.cloud$|journey|^webwsp\./.test(ref) ? 'back' : '');
    r.classList.add(arrive ? 'tm-arrive-' + arrive : 'tm-arrive');
    setTimeout(() => r.classList.remove('tm-arrive', 'tm-arrive-fwd', 'tm-arrive-back'), 600);
    // ordinary links that leave the page (the app's own handlers run first and cancel what they handle)
    W.addEventListener('click', (e) => {
      if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target && e.target.closest && e.target.closest('a[href]');
      if (!a || a.hasAttribute('download') || (a.target && a.target !== '_self')) return;
      const u = absU(a.getAttribute('href'), location.href);
      if (!/^https:/.test(u) || u.split('#')[0] === location.href.split('#')[0]) return;
      if (!TEST) leaving(dirOf(u));
    });
    // back here from the next page (Safari's back/forward cache): slide the page back into place
    W.addEventListener('pageshow', (e) => { if (e.persisted) stay(); });
    // a link that opened another app (Outlook, Teams…): give the page back when you return
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') stay(); });
  }

  function buildShell(tabs, active) {
    document.body.innerHTML = '<header class="nav" id="tm-nav" data-tm4><div class="nav-l"></div><div class="nav-t"></div><div class="nav-r"></div></header><main id="tm-main" data-tm4></main>'
      + (tabs ? `<nav class="tabbar" id="tm-tabs" data-tm4 aria-label="Navigatie">${tabs.map((t) => `<a href="${esc(t.href)}" data-tab="${t.id}"${t.id === active ? ' class="on" aria-current="page"' : ''}>${ico(t.icon)}<span>${t.label}</span><b class="badge" hidden></b></a>`).join('')}</nav>` : '');
    if (!tabs) document.body.classList.add('no-tabs');
    const nav = $('#tm-nav');
    let ticking = false;
    const upd = () => { ticking = false; nav.classList.toggle('scrolled', W.scrollY > 3); };
    W.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true });
  }
  const setTabOn = (id) => $$('#tm-tabs a').forEach((a) => {
    const on = a.dataset.tab === id;
    a.classList.toggle('on', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  function setBadge(id, n) {
    const b = $(`#tm-tabs a[data-tab="${id}"] .badge`);
    if (!b) return;
    b.hidden = !n;
    b.textContent = n > 99 ? '99+' : String(n || '');
  }
  function setNav({ back, title, right, always } = {}) {
    const nav = $('#tm-nav');
    if (!nav) return;
    put(nav.querySelector('.nav-l'), back ? `<a class="nb back" href="${esc(back.href || '#')}"${back.act ? ` data-act="${back.act}"` : ''}>${BACK}<span>${esc(back.label || 'Terug')}</span></a>` : '');
    nav.querySelector('.nav-t').textContent = title || '';
    put(nav.querySelector('.nav-r'), right || '');
    nav.classList.toggle('always', !!always);
    nav.classList.toggle('scrolled', W.scrollY > 3);
  }
  let navIO = null;
  function watchTitle(scope) {
    const nav = $('#tm-nav');
    if (!nav) return;
    if (navIO) navIO.disconnect();
    nav.classList.remove('titled');
    const h = scope && scope.querySelector('.lt h1');
    if (!h || !('IntersectionObserver' in W)) { nav.classList.add('titled'); return; }
    const top = Math.round(nav.getBoundingClientRect().height);
    navIO = new IntersectionObserver(([e]) => nav.classList.toggle('titled', !e.isIntersecting && e.boundingClientRect.top < top), { rootMargin: `-${top}px 0px 0px 0px` });
    navIO.observe(h);
  }

  /* if the site's own app got to run before we took over, it may still rewrite the address: keep ours */
  function guardPath() {
    const path = location.pathname;
    setInterval(() => {
      if (location.pathname !== path) { try { history.replaceState(history.state, '', path + location.hash); } catch (_) {} }
    }, 700);
  }

  /* touch feedback that waits a moment, so rows don't flash while you scroll */
  function initPress() {
    if (W.__tm4press) return;
    W.__tm4press = true;
    const SEL = '.row, .tile, .chip, .btn, .hero, .lesson[data-href], .exam[data-href], .ann, .teaser, .wd, .nb, .tabbar a, .sheet .sa, .frow, .more-row';
    let el = null, t = 0, x = 0, y = 0;
    const clear = () => { clearTimeout(t); if (el) { const e = el; setTimeout(() => e.classList.remove('pressed'), 110); } el = null; };
    document.addEventListener('touchstart', (ev) => {
      const target = ev.target.closest && ev.target.closest(SEL);
      clearTimeout(t);
      if (el) el.classList.remove('pressed');
      el = target || null;
      if (!el) return;
      x = ev.touches[0].clientX; y = ev.touches[0].clientY;
      t = setTimeout(() => el && el.classList.add('pressed'), 65);
    }, { passive: true });
    document.addEventListener('touchmove', (ev) => {
      if (!el) return;
      const p = ev.touches[0];
      if (Math.abs(p.clientX - x) > 9 || Math.abs(p.clientY - y) > 9) { clearTimeout(t); el.classList.remove('pressed'); el = null; }
    }, { passive: true });
    document.addEventListener('touchend', () => { if (el) el.classList.add('pressed'); clear(); }, { passive: true });
    document.addEventListener('touchcancel', clear, { passive: true });
  }

  function sheet({ title, msg, actions }) {
    const layer = document.createElement('div');
    layer.setAttribute('data-tm4', '');
    layer.innerHTML = `<div class="scrim"></div><div class="sheet" role="dialog" aria-modal="true"><div class="sg">${title || msg ? `<div class="sh-t">${title ? `<b>${esc(title)}</b>` : ''}${msg ? esc(msg) : ''}</div>` : ''}${actions.map((a, i) => (a.href ? `<a class="sa${a.red ? ' red' : ''}" href="${esc(a.href)}" data-i="${i}">${esc(a.label)}</a>` : `<button type="button" class="sa${a.red ? ' red' : ''}" data-i="${i}">${esc(a.label)}</button>`)).join('')}</div><div class="sg"><button type="button" class="sa bold" data-i="-1">Annuleer</button></div></div>`;
    document.body.appendChild(layer);
    const scrim = layer.querySelector('.scrim');
    const sh = layer.querySelector('.sheet');
    requestAnimationFrame(() => requestAnimationFrame(() => { scrim.classList.add('on'); sh.classList.add('on'); }));
    const close = () => { scrim.classList.remove('on'); sh.classList.remove('on'); setTimeout(() => layer.remove(), 340); };
    scrim.addEventListener('click', close);
    sh.addEventListener('click', (e) => {
      const b = e.target.closest('[data-i]');
      if (!b) return;
      const a = actions[Number(b.dataset.i)];
      close();
      if (a && a.run) { e.preventDefault(); try { a.run(); } catch (err) { console.error(err); } }
    });
    return close;
  }

  let toastT = 0;
  function toast(msg) {
    let t = $('#tm-toast');
    if (!t) { t = document.createElement('div'); t.id = 'tm-toast'; t.className = 'toast'; t.setAttribute('role', 'status'); t.setAttribute('data-tm4', ''); document.body.appendChild(t); }
    t.textContent = msg;
    requestAnimationFrame(() => t.classList.add('on'));
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('on'), 2300);
  }

  /* pull down at the top of the page to refresh, like in an app. run() returns a promise (or nothing). */
  function pullRefresh(run) {
    if (W.__tm4ptr || !('ontouchstart' in W)) return;
    W.__tm4ptr = true;
    const ind = document.createElement('div');
    ind.className = 'ptr';
    ind.setAttribute('data-tm4', '');
    ind.setAttribute('aria-hidden', 'true');
    ind.innerHTML = '<span class="spin"></span>';
    document.body.appendChild(ind);
    const spin = ind.firstChild;
    const GO = 72;
    let y0 = 0, x0 = 0, pull = 0, on = false, busy = false;
    const reset = () => { ind.classList.remove('drag', 'busy'); ind.style.transform = ''; ind.style.opacity = ''; spin.style.transform = ''; };
    document.addEventListener('touchstart', (e) => {
      on = false;
      if (busy || W.scrollY > 0 || e.touches.length !== 1 || document.querySelector('.sheet') || (e.target.closest && e.target.closest('input, textarea, .tiles, .chips, .week'))) return;
      on = true; pull = 0; y0 = e.touches[0].clientY; x0 = e.touches[0].clientX;
    }, { passive: true });
    document.addEventListener('touchmove', (e) => {
      if (!on) return;
      const dy = e.touches[0].clientY - y0, dx = Math.abs(e.touches[0].clientX - x0);
      if (W.scrollY > 2 || (pull < 10 && dx > Math.max(dy, 8))) { on = false; pull = 0; reset(); return; }
      pull = Math.max(0, dy);
      const d = Math.min(GO * 1.5, pull * 0.6);
      ind.classList.add('drag');
      ind.style.opacity = String(Math.min(1, pull / GO));
      ind.style.transform = `translate3d(0,${d}px,0)`;
      spin.style.transform = `rotate(${Math.round(pull * 3)}deg)`;
    }, { passive: true });
    const end = () => {
      if (!on) return;
      on = false;
      if (pull * 0.6 < GO * 0.75) { reset(); pull = 0; return; }
      pull = 0;
      busy = true;
      ind.classList.remove('drag');
      ind.classList.add('busy');
      ind.style.opacity = '1';
      ind.style.transform = 'translate3d(0,52px,0)';
      const t0 = Date.now();
      let p; try { p = Promise.resolve(run()); } catch (_) { p = Promise.resolve(); }
      const done = () => setTimeout(() => { busy = false; ind.style.opacity = '0'; ind.style.transform = ''; setTimeout(reset, 300); }, Math.max(0, 650 - (Date.now() - t0)));
      Promise.race([p, new Promise((r) => setTimeout(r, 12000))]).then(done, done);
    };
    document.addEventListener('touchend', end, { passive: true });
    document.addEventListener('touchcancel', () => { if (on) { on = false; pull = 0; reset(); } }, { passive: true });
  }

  /* ================================================================== building blocks */
  function row(o) {
    const isLink = !!o.href;
    const tag = isLink ? 'a' : (o.act ? 'button' : 'div');
    const attrs = (isLink ? ` href="${esc(o.href)}"` : o.act ? ` type="button" data-act="${o.act}"` : '') + (o.attrs || '') + (o.style ? ` style="${o.style}"` : '');
    const lead = o.iconHtml || (o.icon ? `<span class="ic${o.soft ? ' soft' : ''}">${ico(o.icon)}</span>` : '');
    const tail = (o.end || '') + (o.external ? EXT : (o.chevron === false || (!isLink && !o.act) ? '' : CHEV));
    return `<${tag} class="row${o.cls ? ' ' + o.cls : ''}"${attrs}>${o.dot ? '<i class="dot lead"></i>' : ''}${lead}<span class="main"><span class="t${o.bold ? ' b' : ''}${o.clamp ? ' clamp2' : ''}">${o.titleHtml || esc(o.title)}</span>${o.sub || o.subHtml ? `<span class="s${o.subOne ? ' one' : ''}">${o.subHtml || esc(o.sub)}</span>` : ''}</span>${tail ? `<span class="end">${tail}</span>` : ''}</${tag}>`;
  }
  const skRows = (n) => Array.from({ length: n }, (_, i) => `<div class="sk-row"><span class="sk ic"></span><span class="lines"><span class="sk" style="display:block;width:${70 + ((i * 37) % 25)}%"></span><span class="sk" style="display:block"></span></span></div>`).join('');
  const skGroup = (n) => `<div class="group">${skRows(n)}</div>`;
  const empty = (icon, title, text, extra) => `<div class="empty">${ico(icon)}<b>${esc(title)}</b>${text ? esc(text) : ''}${extra || ''}</div>`;
  function segHtml(items, active, act) {
    const i = Math.max(0, items.findIndex((x) => x.id === active));
    return `<div class="seg" role="tablist"><span class="thumb" style="width:calc((100% - 4px) / ${items.length});transform:translateX(${i * 100}%)"></span>${items.map((x) => `<button type="button" role="tab" data-act="${act}" data-id="${x.id}"${x.id === active ? ' class="on" aria-selected="true"' : ' aria-selected="false"'}>${esc(x.label)}</button>`).join('')}</div>`;
  }
  function segSet(scope, id) {
    const seg = scope.querySelector('.seg');
    if (!seg) return;
    const btns = $$('button', seg);
    const i = Math.max(0, btns.findIndex((b) => b.dataset.id === id));
    btns.forEach((b, j) => { b.classList.toggle('on', j === i); b.setAttribute('aria-selected', String(j === i)); });
    seg.querySelector('.thumb').style.transform = `translateX(${i * 100}%)`;
  }

  function ftype(name, mime) {
    const s = `${name || ''} ${mime || ''}`.toLowerCase();
    if (/pdf/.test(s)) return ['PDF', '#e5484d'];
    if (/powerpoint|presentation|\.pptx?\b|\.key\b/.test(s)) return ['PPT', '#ef6c2a'];
    if (/msword|wordprocessing|\.docx?\b|\.rtf\b|\.pages\b/.test(s)) return ['DOC', '#2f6fde'];
    if (/excel|spreadsheet|\.xlsx?\b|\.csv\b|\.numbers\b/.test(s)) return ['XLS', '#1f9d55'];
    if (/video|\.(mp4|mov|m4v|avi|webm)\b/.test(s)) return ['VID', '#8e5bd8'];
    if (/audio|\.(mp3|m4a|wav|aac)\b/.test(s)) return ['AUD', '#0fa5a5'];
    if (/image|\.(png|jpe?g|gif|heic|webp|svg)\b/.test(s)) return ['IMG', '#d6409f'];
    if (/zip|compressed|\.(zip|rar|7z)\b/.test(s)) return ['ZIP', '#8e8e93'];
    return ['FILE', '#8e8e93'];
  }

  /* allow-list HTML cleaner: rebuilds the markup from scratch, so no scripts, styles or handlers survive */
  const KEEP = { P: 1, BR: 1, B: 1, STRONG: 1, I: 1, EM: 1, U: 1, S: 1, A: 1, UL: 1, OL: 1, LI: 1, H1: 'H3', H2: 'H3', H3: 1, H4: 1, H5: 1, H6: 1, BLOCKQUOTE: 1, PRE: 1, CODE: 1,
    TABLE: 1, THEAD: 1, TBODY: 1, TFOOT: 1, TR: 1, TD: 1, TH: 1, IMG: 1, SPAN: 1, DIV: 1, HR: 1, SUP: 1, SUB: 1, FIGURE: 1, FIGCAPTION: 1, SMALL: 1, MARK: 1 };
  const DROP = /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|OBJECT|EMBED|FORM|INPUT|BUTTON|SELECT|TEXTAREA|LINK|META|SVG|MATH|HEAD|TITLE|BASE|CANVAS|AUDIO|SOURCE|TRACK)$/;
  function sanitize(html, onAnchor) {
    const src = new DOMParser().parseFromString(String(html || ''), 'text/html').body;
    const out = document.createElement('div');
    const walk = (from, to) => {
      for (const n of Array.from(from.childNodes)) {
        if (n.nodeType === 3) { to.appendChild(document.createTextNode(n.nodeValue)); continue; }
        if (n.nodeType !== 1) continue;
        const tag = n.tagName;
        if (DROP.test(tag)) continue;
        if (tag === 'A' && onAnchor) { const rep = onAnchor(n); if (rep) { to.insertAdjacentHTML('beforeend', rep); continue; } }
        if (tag === 'IFRAME' || tag === 'VIDEO') {
          const srcEl = n.getAttribute('src') ? n : n.querySelector('source');
          const s = absU(srcEl ? srcEl.getAttribute('src') || '' : '');
          if (s.startsWith('https:')) to.insertAdjacentHTML('beforeend', `<a class="embed" href="${esc(s)}">${ico('play')}Video openen</a>`);
          continue;
        }
        const k = KEEP[tag];
        if (!k) { walk(n, to); continue; }
        const el = document.createElement(k === 1 ? tag : k);
        if (tag === 'A') { const h = absU(n.getAttribute('href') || ''); if (h) el.setAttribute('href', h); }
        else if (tag === 'IMG') {
          const s = absU(n.getAttribute('src') || '');
          if (!s.startsWith('https:')) continue;
          el.setAttribute('src', s); el.setAttribute('loading', 'lazy'); el.setAttribute('alt', n.getAttribute('alt') || '');
        } else if (tag === 'TD' || tag === 'TH') ['colspan', 'rowspan'].forEach((a) => { if (n.hasAttribute(a)) el.setAttribute(a, n.getAttribute(a)); });
        to.appendChild(el);
        if (tag !== 'IMG') walk(n, el);
      }
    };
    walk(src, out);
    $$('p, div, span', out).reverse().forEach((e) => { if (!e.textContent.trim() && !e.querySelector('img, a, br, hr, table')) e.remove(); });
    return out.innerHTML;
  }
  /* ================================================================== study progress + ISP pages (portal) */
  // Pure renderers: they take the data read from KU Loket (see studyData / ispData in loket.js) and return HTML.
  const nl = (n, d = 1) => { if (n == null || !Number.isFinite(n)) return ''; const s = n.toFixed(d).replace('.', ','); return d ? s.replace(/,0+$/, '') : s; };
  const spTxt = (n) => `${nl(n, 1)} sp`;
  const acy = (y) => { const n = Number(y); return n ? `${n}–${n + 1}` : String(y || ''); };
  const acyS = (y) => { const n = Number(y); return n ? `${String(n).slice(2)}–${String(n + 1).slice(2)}` : String(y || ''); };
  const scoreOf = (c) => { const n = parseFloat(String(c.r || '').replace(',', '.')); return /^\d+([.,]\d+)?$/.test(String(c.r || '')) && (!c.sc || /20$/.test(c.sc)) ? n : null; };
  const scoreCol = (n) => (n == null ? 'var(--sub)' : n >= 16 ? '#30b955' : n >= 14 ? '#0fa5a5' : n >= 12 ? '#0a84ff' : n >= 10 ? '#ff9500' : '#ff3b30');
  const dNice = (s) => { const t = s ? fromYmd(s) : 0; return t ? `${new Date(t).getDate()} ${MONTHS_S[new Date(t).getMonth()]} ${new Date(t).getFullYear()}` : ''; };
  const RESULT_WORD = { NA: 'Niet afgelegd', NI: 'Niet ingeschreven', VR: 'Vrijstelling', VZ: 'Vrijstelling', GR: 'Geslaagd', ND: 'Niet deelgenomen', GO: 'Gewettigd afwezig', TO: 'Tolerantie' };
  const shortProg = (n) => String(n || '').replace(/\s*\((Leuven|Brussel|Kortrijk|Gent|Antwerpen|Kulak)[^)]*\)\s*$/i, '').trim();

  // ring chart: segments [{v, c}] of a total, with something in the middle
  function ringSvg(segs, total, { size = 112, w = 12, mid = '', track = 'var(--fill)' } = {}) {
    const r = (size - w) / 2, C = 2 * Math.PI * r;
    let off = 0;
    const sum = total || segs.reduce((a, s) => a + s.v, 0) || 1;
    const arcs = segs.filter((s) => s.v > 0).map((s) => {
      const len = Math.max(0, (s.v / sum) * C - (segs.length > 1 ? 2 : 0));
      const a = `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${s.c}" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="${len.toFixed(2)} ${C.toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>`;
      off += (s.v / sum) * C;
      return a;
    }).join('');
    return `<div class="ring" style="width:${size}px;height:${size}px"><svg viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${track}" stroke-width="${w}"/>${arcs}</svg><div class="ring-mid">${mid}</div></div>`;
  }
  // horizontal stacked bar with a legend underneath
  function stackHtml(segs) {
    const sum = segs.reduce((a, s) => a + s.v, 0) || 1;
    return `<div class="stack">${segs.filter((s) => s.v > 0).map((s) => `<i style="flex:${s.v};background:${s.c}"></i>`).join('')}</div>`
      + `<div class="legend">${segs.map((s) => `<span><i style="background:${s.c}"></i>${esc(s.label)} <b>${esc(spTxt(s.v))}</b></span>`).join('')}</div>`
      + (sum ? '' : '');
  }
  const card = (title, body, right) => `<div class="card">${title ? `<div class="card-h"><b>${esc(title)}</b>${right || ''}</div>` : ''}${body}</div>`;

  const ST_COL = (k) => (/^(behaald|verworven)/i.test(k) ? '#30b955' : /^getolereerd/i.test(k) ? '#ff9500' : /^opgenomen/i.test(k) ? 'var(--accent)' : 'var(--fill2)');
  function creditsOf(s) {
    const pick = (list, re) => (list || []).filter(([k]) => re.test(k)).reduce((a, [, v]) => a + v, 0);
    const list = s.now && s.now.length ? s.now : s.prog;
    const earned = pick(list, /^(behaald|verworven|getolereerd)/i);
    const taking = pick(list, /^opgenomen/i);
    const failed = s.active ? pick(s.prog, /^niet (behaald|verworven)/i) : 0;
    const total = s.total || 0;
    return { list, earned, taking, failed, total, rest: total ? Math.max(0, total - earned - taking) : 0 };
  }
  function yearAvg(y) {
    let a = 0, w = 0;
    y.c.forEach((c) => { const n = scoreOf(c); if (n != null && c.sp) { a += n * c.sp; w += c.sp; } });
    return w ? a / w : null;
  }

  // the course's place among everyone who took the exam (KU Loket's "situering": groups A to E)
  function rankHtml(c) {
    if (!c.rk || !c.rk.length) return '';
    const all = c.rk.reduce((a, k) => a + k[3], 0);
    let above = 0, mine = null;
    for (const k of c.rk) { if (k[5]) { mine = k; break; } above += k[4]; }
    const max = Math.max(...c.rk.map((k) => k[4]), 1);
    const bars = c.rk.map((k) => `<div class="rk${k[5] ? ' me' : ''}"><span class="rk-c">${esc(k[0])}</span><span class="rk-bar"><i style="width:${Math.max(3, (k[4] / max) * 100).toFixed(1)}%"></i></span><span class="rk-v">${esc(nl(k[1]))}–${esc(nl(k[2]))}<small>${esc(nl(k[4]))}%</small></span></div>`).join('');
    const line = mine ? `Je zit in groep <b>${esc(mine[0])}</b>${above + mine[4] <= 50 ? `: bij de beste ${esc(nl(above + mine[4], 0))}%` : ''} van ${all} studenten.` : `${all} studenten legden dit examen af.`;
    return `<div class="rk-box"><p class="rk-line">${line}</p>${bars}</div>`;
  }
  function resultRow(c, key, open, current) {
    const n = scoreOf(c);
    const word = RESULT_WORD[String(c.r || '').toUpperCase()] || '';
    const failed = /niet geslaagd/i.test(c.st);
    const pill = current && !c.r ? '<span class="cap blue">Bezig</span>'
      : n != null ? `<span class="score" style="--sc:${failed ? '#ff3b30' : scoreCol(n)}">${esc(nl(n))}<small>/20</small></span>`
        : `<span class="cap${failed ? ' red' : ''}">${esc(c.r || c.st || '—')}</span>`;
    const sub = [c.code, spTxt(c.sp), c.n > 1 ? `${c.n}e keer` : '', c.tol ? 'tolerantie' : ''].filter(Boolean).join(' · ');
    const canOpen = !current || c.r;
    const det = open ? `<div class="res-d">${[c.d ? `Bekendgemaakt op ${esc(dNice(c.d))}` : '', c.st ? esc(c.st) + (word && word !== c.st ? ` (${esc(word)})` : '') : ''].filter(Boolean).join(' · ')}${rankHtml(c)}</div>` : '';
    return `<div class="res${open ? ' open' : ''}"${canOpen ? ` data-act="resopen" data-k="${esc(key)}" role="button"` : ''}><div class="row${failed ? ' failed' : ''}"><span class="main"><span class="t">${esc(c.t)}</span><span class="s">${esc(sub)}</span></span><span class="end">${pill}</span></div>${det}</div>`;
  }

  function studyHtml(S, sel, open, meta) {
    if (!S || !S.length) return '';
    const s = S[Math.min(sel, S.length - 1)];
    const cr = creditsOf(s);
    let h = '';
    if (S.length > 1) h += segHtml(S.map((x, i) => ({ id: String(i), label: /^master/i.test(x.name) ? 'Master' : /^bachelor/i.test(x.name) ? 'Bachelor' : shortProg(x.name).split(' ')[0] })), String(sel), 'stsel');
    // hero: credits ring + diploma percentage
    const ringSegs = [{ v: cr.earned, c: '#4cd964' }, { v: cr.taking, c: '#7fc1ff' }];
    const mid = cr.total ? `<b>${esc(nl(cr.earned, 0))}</b><small>van ${esc(nl(cr.total, 0))} sp</small>` : `<b>${esc(nl(cr.earned, 0))}</b><small>sp verworven</small>`;
    h += `<div class="st-hero"><div class="st-top"><span class="hero-lbl"><i></i>${s.done ? 'Diploma behaald' : s.active ? 'Bezig' : 'Vorige opleiding'}</span>${s.done && s.doneYear ? `<span class="hero-cd">${esc(acy(s.doneYear))}</span>` : ''}</div>
      <div class="st-name">${esc(shortProg(s.name))}</div>
      <div class="st-row">${ringSvg(ringSegs, cr.total || cr.earned + cr.taking, { mid, track: 'rgba(255,255,255,.2)' })}
        <div class="st-kpis">${s.pct != null ? `<div class="kpi"><b>${esc(nl(s.pct, 2))}<small>%</small></b><span>Diplomapercentage</span></div>` : ''}
        ${cr.total ? `<div class="kpi"><b>${esc(nl(Math.round(((cr.earned) / cr.total) * 100), 0))}<small>%</small></b><span>van je opleiding verworven</span></div>` : ''}</div></div></div>`;
    // credits
    const LBL = { behaald: 'Verworven', opgenomen: s.active ? 'Dit jaar opgenomen' : 'Opgenomen' };
    const segs = cr.list.filter(([k]) => !/^niet/i.test(k)).map(([k, v]) => ({ v, c: ST_COL(k), label: LBL[k.toLowerCase()] || k }));
    if (cr.rest) segs.push({ v: cr.rest, c: 'var(--fill2)', label: 'Nog te doen' });
    h += card('Studiepunten', stackHtml(segs) + (cr.failed ? `<p class="card-note">${esc(spTxt(cr.failed))} nog niet verworven uit vorige zittijden.</p>` : ''), cr.total ? `<span>${esc(spTxt(cr.total))}</span>` : '');
    // averages per year
    // every academic year you have results for, across all your studies (so the master continues where the bachelor ended)
    const allYears = {};
    S.forEach((x) => x.years.forEach((y) => { (allYears[y.y] = allYears[y.y] || []).push(...y.c); }));
    const graded = Object.keys(allYears).sort().map((k) => ({ y: k, a: yearAvg({ c: allYears[k] }) })).filter((x) => x.a != null).slice(-6);
    if (graded.length) {
      let A = 0, W = 0;
      s.years.forEach((y) => y.c.forEach((c) => { const n = scoreOf(c); if (n != null && c.sp) { A += n * c.sp; W += c.sp; } }));
      const lo = 8, hi = 20;
      const bars = graded.map((g) => `<div class="vb"><span class="vb-v">${esc(nl(g.a, 1))}</span><span class="vb-bar"><i style="height:${Math.max(6, ((g.a - lo) / (hi - lo)) * 100).toFixed(1)}%;background:${scoreCol(g.a)}"></i></span><span class="vb-l">${esc(acyS(g.y))}</span></div>`).join('');
      h += card('Gemiddelde per academiejaar', `<div class="vbars">${bars}</div><p class="card-note">Gewogen naar studiepunten, op 20${S.length > 1 ? ', over al je opleidingen' : ''}. ${esc(shortProg(s.name))}: <b>${esc(nl(A / W, 2))}</b> gemiddeld.</p>`);
      // spread of your own scores
      const B = [['<10', 0, 10, '#ff3b30'], ['10–11', 10, 12, '#ff9500'], ['12–13', 12, 14, '#0a84ff'], ['14–15', 14, 16, '#0fa5a5'], ['16–17', 16, 18, '#30b955'], ['18–20', 18, 21, '#30b955']];
      const cnt = B.map((b) => s.years.reduce((a, y) => a + y.c.filter((c) => { const n = scoreOf(c); return n != null && n >= b[1] && n < b[2]; }).length, 0));
      const mx = Math.max(...cnt, 1);
      h += card('Je scores', `<div class="vbars hist">${B.map((b, i) => `<div class="vb"><span class="vb-v">${cnt[i] || ''}</span><span class="vb-bar"><i style="height:${cnt[i] ? Math.max(8, (cnt[i] / mx) * 100).toFixed(1) : 0}%;background:${b[3]}"></i></span><span class="vb-l">${b[0]}</span></div>`).join('')}</div>`);
    }
    // results per year
    s.years.forEach((y) => {
      const cur = y.c.every((c) => !c.r);
      const avg = yearAvg(y);
      const sp = y.c.reduce((a, c) => a + c.sp, 0);
      h += `<div class="gh">${esc(acy(y.y))}${cur ? ' · dit jaar' : ''}<span>${esc(spTxt(sp))}${avg != null ? ` · gem. ${esc(nl(avg, 1))}` : ''}</span></div>`;
      const list = y.c.slice().sort((a, b) => (scoreOf(b) ?? -1) - (scoreOf(a) ?? -1) || a.t.localeCompare(b.t));
      h += `<div class="group">${(cur ? y.c : list).map((c) => { const k = `${s.id}:${y.y}:${c.code}`; return resultRow(c, k, !!open[k], cur); }).join('')}</div>`;
    });
    h += `<p class="fresh">${meta || ''}<br><a href="https://www.kuleuven.be/kuloket/zr_1017?sap-language=NL">Open het studievoortgangsdossier in KU Loket</a></p>`;
    return h;
  }

  const PER = { '001': 'jaarvak', '002': '1e semester', '003': '2e semester' };
  const GCOL = ['#0a84ff', '#8e5bd8', '#ff9500', '#30b955', '#d6409f', '#0fa5a5'];
  function ispHtml(I, S, meta) {
    if (!I) return '';
    const byId = {};
    I.groups.forEach((g) => { byId[g.id] = g; });
    const topOf = (id) => { let g = byId[id], guard = 0; while (g && g.l > 1 && byId[g.p] && guard++ < 10) g = byId[g.p]; return g; };
    const tops = I.groups.filter((g) => g.l === 1);
    const ok = I.courses.filter((c) => c.st === 'ok'), now = I.courses.filter((c) => c.st === 'now');
    const sum = (l) => l.reduce((a, c) => a + c.sp, 0);
    const st = (S || []).find((x) => shortProg(x.name) === shortProg(I.name)) || (S || []).find((x) => x.active);
    const total = (st && st.total) || 0;
    const earned = sum(ok), taking = sum(now), rest = total ? Math.max(0, total - earned - taking) : 0;
    let h = `<div class="st-hero isp"><div class="st-top"><span class="hero-lbl"><i></i>ISP ${esc(acy(I.yr))}</span></div><div class="st-name">${esc(shortProg(I.name))}</div>${I.spec ? `<div class="st-spec">${esc(I.spec)}</div>` : ''}
      <div class="st-row">${ringSvg([{ v: earned, c: '#4cd964' }, { v: taking, c: '#7fc1ff' }], total || earned + taking, { mid: `<b>${esc(nl(taking, 0))}</b><small>sp dit jaar</small>`, track: 'rgba(255,255,255,.2)' })}
      <div class="st-kpis"><div class="kpi"><b>${esc(nl(earned, 0))}<small> sp</small></b><span>al verworven</span></div>${total ? `<div class="kpi"><b>${esc(nl(rest, 0))}<small> sp</small></b><span>nog te kiezen</span></div>` : `<div class="kpi"><b>${now.length}</b><span>vakken dit jaar</span></div>`}</div></div></div>`;
    // this year by period
    let [s1, s2, yy] = I.sem;
    if (!s1 && !s2 && !yy) { s1 = sum(now.filter((c) => c.per === '002')); s2 = sum(now.filter((c) => c.per === '003')); yy = sum(now.filter((c) => c.per === '001')); }
    h += card(`Dit jaar · ${acy(I.yr)}`, stackHtml([{ v: s1, c: '#0a84ff', label: '1e semester' }, { v: s2, c: '#8e5bd8', label: '2e semester' }, { v: yy, c: '#ff9500', label: 'Jaarvak' }]), `<span>${esc(spTxt(taking))}</span>`);
    // per part of the programme
    tops.forEach((g, gi) => {
      const mine = I.courses.filter((c) => { const t = topOf(c.g); return t && t.id === g.id; });
      const others = Object.entries(I.other).filter(([id]) => { const t = topOf(id); return t && t.id === g.id; }).reduce((a, [, n]) => a + n, 0);
      if (!mine.length && !others) return;
      const col = GCOL[gi % GCOL.length];
      const o = sum(mine.filter((c) => c.st === 'ok')), n = sum(mine.filter((c) => c.st === 'now'));
      h += `<div class="gh">${esc(g.t)}<span>${[o ? `${spTxt(o)} verworven` : '', n ? `${spTxt(n)} dit jaar` : ''].filter(Boolean).map(esc).join(' · ')}</span></div>`;
      const rows = mine.slice().sort((a, b) => (a.st === 'now' ? 0 : 1) - (b.st === 'now' ? 0 : 1) || (a.per || '').localeCompare(b.per || '') || a.t.localeCompare(b.t)).map((c) => {
        const sg = byId[c.g] && byId[c.g].l > 1 ? byId[c.g].t.replace(/^(Major|Minor|Electives)\s*[:-]\s*/i, '') : '';
        const sub = [c.code, spTxt(c.sp), c.st === 'now' ? PER[c.per] || '' : c.yr ? acy(c.yr) : '', sg && sg.length < 40 ? sg : ''].filter(Boolean).join(' · ');
        return row({ href: c.url || undefined, iconHtml: `<span class="ic soft" style="--c:${col}">${c.st === 'ok' ? ico('check') : ico('book')}</span>`, title: c.t, sub, chevron: false, cls: c.st === 'ok' ? 'done' : '',
          end: c.st === 'now' ? '<span class="cap blue">Dit jaar</span>' : '<span class="cap green">Verworven</span>' });
      }).join('');
      h += `<div class="group">${rows}${others ? `<div class="row plain-note"><span class="main"><span class="s">Nog ${others} andere keuzemogelijkhe${others === 1 ? 'id' : 'den'} in deze groep</span></span></div>` : ''}</div>`;
    });
    h += `<p style="margin:22px 16px 0;text-align:center"><a class="btn ghost" href="https://www.kuleuven.be/kuloket/zr_0442?sap-language=NL">${ico('pencil')}ISP aanpassen in KU Loket</a></p>`;
    h += `<p class="fresh">${meta || ''}</p>`;
    return h;
  }
  /* ================================================================== portal app (toledo.kuleuven.be/portal/) */
  function portalApp() {
    takeover('Toledo', [ULTRA, new URL(JOURNEY).origin, LOKET_ORIGIN]);
    // the course pages say when Blackboard last answered (?ub=): while that session is surely still alive,
    // course links go straight to the course instead of through Toledo's link service (one redirect less)
    { const ub = Number(params.get('ub')) || 0; if (ub > 0 && ub * 1e3 <= Date.now() + 60e3) store.set('p:ultraok', ub * 1e3); }
    const cv = (k) => { const c = store.get(k); return c ? c.v : null; };
    const P = {
      tab: '', seg: 'lessen', filter: 'alles', search: '', showComm: false, showOff: false, feedN: 50,
      weekOff: 0, sel: ymd(Date.now()),
      user: cv('p:user'), enr: cv('p:enr') || [], events: cv('p:events') || [], upcoming: cv('p:upcoming') || [],
      links: cv('p:links') || [], mail: cv('p:mail'), agenda: store.get('p:agenda'),
      lu2pk: store.get('p:lu2pk') || {}, seen: store.get('p:seen') || Date.now() - 2 * 864e5,
      err: {}, ag: '', loadedAt: 0, authFail: false,
      study: store.get('p:study'), stSel: 0, stOpen: {}, done: store.get('p:done') || {},
    };
    // the course pages report which assignments you already handed in (?done=pk~contentId~…!pk~…)
    {
      const dn = params.get('done');
      if (dn != null) {
        String(dn).split('!').forEach((part) => {
          const [pk, ...ids] = part.split('~');
          if (/^_\d+_\d+$/.test(pk)) P.done[pk] = ids.filter((x) => /^_\d+_\d+$/.test(x));
        });
        store.set('p:done', P.done);
      }
    }
    // your student number, handed over by the course pages (?rn=r0123456); Toledo itself only gives the login id
    {
      const rn = String(params.get('rn') || '').toLowerCase();
      if (/^r\d{7}$/.test(rn)) store.set('p:rn', rn);
    }
    const isDone = (e) => {
      const u = e.url || '';
      const pk = (/(?:\/courses\/|courseId=)(_\d+_\d+)/.exec(u) || [])[1];
      const cid = (/contentId=(_\d+_\d+)/.exec(u) || [])[1];
      return !!(pk && cid && P.done[pk] && P.done[pk].includes(cid));
    };
    function saveStudy(v) {
      if (!v || (!v.study && !v.isp)) return;
      const old = (P.study && P.study.v) || {};
      P.study = { ts: Date.now(), v: { study: v.study || old.study || null, isp: v.isp || old.isp || null } };
      store.set('p:study', P.study);
    }

    function saveAgenda(v) {
      const old = (P.agenda && P.agenda.v) || {};
      const merged = { lessons: v.lessons || old.lessons || [], exams: v.exams || old.exams || [], range: v.lessons ? v.range : old.range || v.range };
      P.agenda = { ts: Date.now(), v: merged };
      store.set('p:agenda', P.agenda);
    }
    // agenda handed over by the KU Loket page (see syncPage)
    const syncM = /[#&]tmsync=([^&]*)/.exec(location.hash);
    if (syncM) {
      try { const v = JSON.parse(decodeURIComponent(syncM[1])); if (v && (v.lessons || v.exams)) saveAgenda(v); if (v) saveStudy(v); } catch (_) {}
    }

    const TABS = [
      { id: 'vandaag', label: 'Vandaag', icon: 'house', href: '#vandaag' },
      { id: 'vakken', label: 'Vakken', icon: 'book', href: '#vakken' },
      { id: 'rooster', label: 'Rooster', icon: 'calendar', href: '#rooster' },
      { id: 'updates', label: 'Updates', icon: 'bell', href: '#updates' },
      { id: 'meer', label: 'Meer', icon: 'grid', href: '#meer' },
    ];
    buildShell(TABS, '');

    /* ---------------- derived data ---------------- */
    let enrIdx = null, enrIdxSrc = null;
    const byLu = () => {
      if (enrIdxSrc !== P.enr) {
        enrIdxSrc = P.enr; enrIdx = { lu: {}, code: {} };
        P.enr.forEach((e) => { enrIdx.lu[e.learningUnitId] = e; const c = luCode(e.learningUnitId) || codeOf(e.title); if (c) enrIdx.code[c.toLowerCase()] = e; });
      }
      return enrIdx;
    };
    function learnPk() {
      let ch = false;
      P.events.forEach((e) => {
        const m = /(?:\/courses\/|courseId=)(_\d+_\d+)/.exec(e.url || '');
        if (m && /^ULTRA-/.test(e.sourceId || '') && P.lu2pk[e.sourceId] !== m[1]) { P.lu2pk[e.sourceId] = m[1]; ch = true; }
      });
      if (ch) store.set('p:lu2pk', P.lu2pk);
    }
    function nextLesson(lu, now = Date.now()) {
      if (!lu) return null;
      return lessons().find((l) => l.lu === lu && l.end > now && l.start - now < 8 * 864e5) || null;
    }
    function nextText(l, now = Date.now()) {
      const room = String(l.room || '').split(' · ')[0];
      if (l.start <= now) return `Nu bezig tot ${hhmm(l.end)}${room ? ' · ' + room : ''}`;
      const d = dayDiff(l.start, now);
      const when = d === 0 ? `vandaag ${hhmm(l.start)}` : d === 1 ? `morgen ${hhmm(l.start)}` : `${DAYS[new Date(l.start).getDay()]} ${hhmm(l.start)}`;
      return `${l.exam ? 'Examen' : 'Les'} ${when}${room ? ' · ' + room : ''}`;
    }
    // Course links go through Toledo's own link service (like the official portal does): it signs you in to
    // Blackboard first when that session has expired and lands on the course, where the app takes over.
    // The part after # (route + context) survives those redirects.
    function courseHref(lu, from, extra, pk0) {
      const e = byLu().lu[lu] || {};
      const pk = pk0 || P.lu2pk[lu];
      const q = new URLSearchParams({ lu: lu || '', t: cleanTitle(e.title || ''), k: String(e.color || ''), f: from || P.tab || 'vakken', th: THEME });
      const nl = nextLesson(lu);
      if (nl) q.set('n', nextText(nl));
      const dl = dlPks();
      if (dl) q.set('dl', dl);
      const route = pk ? `#/c/${pk}${extra || ''}` : `#/vak/${encodeURIComponent(lu)}${extra || ''}`;
      const ultraOk = pk && Date.now() - (Number(store.get('p:ultraok')) || 0) < 45 * 60e3;
      if (/^ULTRA-/.test(lu || '') && !ultraOk) return `${JOURNEY}${encodeURIComponent(lu)}${route}?${q}`;
      return pk ? `${ULTRA}/ultra/courses/${pk}/outline${route}?${q}` : '';
    }
    function lessons() {
      const ag = P.agenda && P.agenda.v;
      const idx = byLu();
      const out = [];
      if (ag && ag.lessons && ag.lessons.length) {
        ag.lessons.forEach((l) => {
          const st = fromYmd(l.d, l.s);
          const en = l.e && l.e !== '00:00' ? fromYmd(l.d, l.e) : st + 2 * 3600e3;
          const e = idx.code[String(l.c || '').toLowerCase()];
          const exam = /^(evaluation|evaluatie|examen|exam)\b\s*:?/i.test(l.t || '');
          let title = String(l.t || '').replace(/^(evaluation|evaluatie|examen|exam)\b\s*:?\s*/i, '');
          if (e && (!title || (title.length >= 26 && cleanTitle(e.title).startsWith(title)))) title = cleanTitle(e.title);
          out.push({ start: st, end: en, title: title || 'Les', lu: e && e.learningUnitId, color: e ? e.color : 0, room: l.r, url: l.u, form: exam ? 'Examen' : l.f, who: exam ? '' : l.p, exam });
        });
      } else {
        (P.upcoming || []).forEach((u) => {
          const loc = u.location || {}, src = u.source || {};
          out.push({ start: u.start, end: u.end, title: u.name || 'Les', lu: src.learningUnitId, color: src.color, room: [loc.mnemonic, loc.roomNumber].filter(Boolean).join(' '), url: (loc.url || '').replace(/^http:/, 'https:') });
        });
      }
      return out.sort((a, b) => a.start - b.start);
    }
    function exams() {
      const ag = P.agenda && P.agenda.v;
      const idx = byLu();
      return ((ag && ag.exams) || []).map((x) => {
        const e = idx.code[String(x.c || '').toLowerCase()];
        return { start: fromYmd(x.d, x.s || '00:00'), time: x.s && x.s !== '00:00' ? x.s : '', end: x.e && x.e !== '00:00' ? x.e : '', title: String(x.t || '').replace(/^(evaluation|evaluatie)\s*:\s*/i, '') || (e ? cleanTitle(e.title) : 'Examen'), room: x.r, url: x.u, note: x.x, lu: e && e.learningUnitId, color: e ? e.color : 0 };
      }).sort((a, b) => a.start - b.start);
    }
    const deadlines = (now = Date.now()) => P.events.filter((e) => e.subType === 'due' && !e.dismissed && e.date > now - 3600e3).sort((a, b) => a.date - b.date);
    // courses with a deadline coming up: the course pages check there whether you already handed it in
    const dlPks = () => Array.from(new Set(deadlines().filter((e) => e.date - Date.now() < 21 * 864e5).map((e) => (/(?:\/courses\/|courseId=)(_\d+_\d+)/.exec(e.url || '') || [])[1]).filter(Boolean))).slice(0, 10).join('.');
    const feed = () => P.events.filter((e) => e.subType !== 'due' && !e.dismissed).sort((a, b) => b.date - a.date);
    const newFor = (lu, now = Date.now()) => P.events.filter((e) => e.sourceId === lu && !e.read && !e.dismissed && e.subType !== 'due' && e.date > now - 7 * 864e5).length;

    const EV_ICON = { announcement: 'megaphone', content: 'doc', gradebook: 'chart', due: 'pencil', course: 'book', advalvas: 'inbox', other: 'bell' };
    const EV_LABEL = { announcement: 'Aankondiging', content: 'Nieuw materiaal', gradebook: 'Cijfer', due: 'Deadline', course: 'Vak', advalvas: 'Ad Valvas', other: 'Update' };
    function eventHref(e) {
      const u = e.url || '';
      if (!/^https:\/\/ultra\.edu\.kuleuven\.cloud\//.test(u)) return u;
      const pk = (/(?:\/courses\/|courseId=)(_\d+_\d+)/.exec(u) || [])[1];
      if (!pk) return u;
      const ctid = (/contentId=(_\d+_\d+)/.exec(u) || [])[1];
      const ann = (/announcementId=(_\d+_\d+)/.exec(u) || [])[1];
      let r = '';
      if (e.subType === 'announcement' && ann) r = '/a/' + ann;
      else if (e.subType === 'gradebook') r = '/cijfers';
      else if (ctid) r = '/item/' + ctid;
      const lu = /^ULTRA-/.test(e.sourceId || '') ? e.sourceId : '';
      if (!lu) {
        const q = new URLSearchParams({ t: cleanTitle(e.source || ''), k: String(e.color || ''), f: P.tab || 'updates', th: THEME });
        return `${ULTRA}/ultra/courses/${pk}/outline#/c/${pk}${r}?${q}`;
      }
      return courseHref(lu, P.tab || 'updates', r, pk);
    }
    function markRead(list) {
      const todo = list.filter((e) => e && !e.read);
      if (!todo.length) return;
      todo.forEach((e) => { e.read = true; });
      store.set('p:events', { ts: Date.now(), v: P.events });
      for (let i = 0; i < todo.length; i += 150) {
        const body = todo.slice(i, i + 150).map((e) => ({ id: e.id, type: e.type, subType: e.subType, read: true }));
        fetch(PORTAL_ORIGIN + '/portal/api/batch/events', { method: 'PATCH', credentials: 'include', keepalive: true, headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'Toledo-Language': 'nl' }, body: JSON.stringify(body) }).catch(() => {});
      }
    }
    const linkMap = () => {
      const m = {};
      (P.links || []).forEach((g) => (g.links || []).forEach((l) => { if (l.url) m[l.label] = l.url; }));
      return m;
    };

    /* ---------------- rows ---------------- */
    function lessonRow(l, now, from) {
      const live = l.start <= now && l.end > now, past = l.end <= now;
      const href = l.lu ? courseHref(l.lu, from || P.tab) : '';
      const meta = [
        l.room ? (l.url ? `<a href="${esc(l.url)}">${ico('pin')}${esc(l.room)}</a>` : `<span>${esc(l.room)}</span>`) : '',
        l.form ? `<span>${esc(l.form)}</span>` : '',
        l.who ? `<span>${esc(l.who)}</span>` : '',
      ].filter(Boolean).join('');
      return `<div class="lesson${live ? ' now' : ''}${past ? ' past' : ''}${l.exam ? ' exam-l' : ''}"${href ? ` data-href="${esc(href)}" role="link"` : ''} style="${colorVars(l.color)}"><div class="tm"><b>${hhmm(l.start)}</b><span>${hhmm(l.end)}</span></div><div class="bar"></div><div class="main"><div class="t">${l.exam ? '<span class="exam-tag">EXAMEN</span>' : ''}${esc(l.title)}${live ? '<span class="now-tag">NU</span>' : ''}</div>${meta ? `<div class="meta">${meta}</div>` : ''}</div>${href ? `<span class="end">${CHEV}</span>` : ''}</div>`;
    }
    function dueLabel(t, now) {
      const m = Math.round((t - now) / 60e3);
      if (m < 0) return 'verlopen';
      if (m < 60) return `nog ${m} min`;
      const d = dayDiff(t, now);
      if (d === 0) return `vandaag ${hhmm(t)}`;
      if (d === 1) return `morgen ${hhmm(t)}`;
      if (d < 7) return `${DAYS_S[new Date(t).getDay()]} ${hhmm(t)}`;
      return `${new Date(t).getDate()} ${MONTHS_S[new Date(t).getMonth()]}`;
    }
    function dueRow(e, now) {
      const hrs = (e.date - now) / 3600e3;
      const done = isDone(e);
      const tone = done ? 'green' : hrs < 48 ? 'red' : hrs < 120 ? 'orange' : '';
      return row({ href: eventHref(e) || undefined, icon: done ? 'check' : 'pencil', style: colorVars(e.color), title: e.title || 'Deadline', clamp: true, cls: done ? 'done' : '',
        sub: cleanTitle(e.source) + (done ? ` · ${dueLabel(e.date, now)}` : ''), end: `<span class="cap ${tone}">${esc(done ? 'Ingeleverd' : dueLabel(e.date, now))}</span>`, attrs: ` data-ev="${esc(e.id)}"`, chevron: false });
    }
    function eventRow(e, now, timeOnly) {
      const src = e.subType === 'advalvas' ? 'Ad Valvas' : cleanTitle(e.source || '');
      return row({ href: eventHref(e) || undefined, icon: EV_ICON[e.subType] || 'bell', style: colorVars(e.color), title: e.title || EV_LABEL[e.subType] || 'Update', clamp: true,
        sub: e.subType === 'advalvas' ? 'Ad Valvas' : `${src} · ${EV_LABEL[e.subType] || 'Update'}`, end: `<span>${esc(timeOnly ? hhmm(e.date) : shortWhen(e.date, now))}</span>`,
        attrs: ` data-ev="${esc(e.id)}"`, chevron: false, dot: !e.read });
    }
    function examRow(x, now) {
      const d = new Date(x.start);
      const days = dayDiff(x.start, now);
      const tone = days < 0 ? '' : days <= 7 ? 'red' : days <= 21 ? 'orange' : 'blue';
      const when = days < 0 ? 'voorbij' : days === 0 ? 'vandaag' : days === 1 ? 'morgen' : `${days} d`;
      const href = x.lu ? courseHref(x.lu, P.tab) : '';
      const room = x.room ? (x.url ? `<a href="${esc(x.url)}">${ico('pin')}${esc(x.room)}</a>` : esc(x.room)) : '';
      const sub = [x.time ? esc(x.time) : '', room].filter(Boolean).join(' · ');
      return `<div class="exam"${href ? ` data-href="${esc(href)}" role="link"` : ''}${days < 0 ? ' style="opacity:.5"' : ''}><div class="dt"><small>${MONTHS_S[d.getMonth()]}</small><b>${d.getDate()}</b><em>${DAYS_S[d.getDay()]}</em></div><div class="main"><div class="t">${esc(x.title)}</div>${sub ? `<div class="s">${sub}</div>` : ''}${x.note ? `<div class="s">${esc(x.note)}</div>` : ''}</div><span class="end"><span class="cap ${tone}">${when}</span></span></div>`;
    }
    function courseRow(e, from) {
      const off = e.available === false;
      const n = off ? 0 : newFor(e.learningUnitId);
      const sem = { SEMESTER1: 'Semester 1', SEMESTER2: 'Semester 2', YEAR: 'Jaarvak' }[e.semester] || '';
      const nl = off ? null : nextLesson(e.learningUnitId);
      const sub = off ? 'Nog niet beschikbaar' : nl ? nextText(nl) : [codeOf(e.title), sem, e.type === 'community' ? 'Gemeenschap' : ''].filter(Boolean).join(' · ');
      return row({ href: off ? undefined : courseHref(e.learningUnitId, from || 'vakken'), act: off ? 'off' : '',
        iconHtml: `<span class="ic txt" style="${colorVars(e.color)}">${esc(initials(e.title))}</span>`, title: cleanTitle(e.title) || e.title, sub,
        end: n ? `<span class="cap blue">${n} nieuw</span>` : '', cls: off ? 'off' : '', chevron: !off });
    }
    function agendaBanner() {
      if (!P.agenda && P.ag !== 'loading' && P.ag) return `<div class="banner">${ico('calendar')}<span class="main">Je volledige rooster komt uit KU Loket en is nog niet geladen.</span><button type="button" data-act="agsync">Laden</button></div>`;
      const stale = !P.agenda || Date.now() - P.agenda.ts > 3 * 864e5;
      if (P.ag === 'failed' && stale) return `<div class="banner">${ico('warn')}<span class="main">${P.agLogin ? 'KU Loket wil dat je even opnieuw aanmeldt om je rooster bij te werken.' : 'Het lessenrooster kon niet bijgewerkt worden.'}</span><button type="button" data-act="agsync">Bijwerken</button></div>`;
      return '';
    }
    function authBanner() {
      return P.authFail ? `<div class="banner">${ico('lock')}<span class="main">Je bent afgemeld bij Toledo.</span><button type="button" data-act="login">Inloggen</button></div>` : '';
    }

    /* ---------------- views ---------------- */
    const V = {};
    const BUILD = {}, FILL = {}, NAVS = {};

    // ---- Vandaag
    BUILD.vandaag = () => '<div class="lt"><h1>Vandaag</h1><p class="lt-sub" data-k="date"></p></div><div data-k="body"></div>';
    NAVS.vandaag = () => ({ title: 'Vandaag' });
    const updateBanner = () => (P.newVer ? `<div class="banner">${ico('refresh')}<span class="main">Nieuwe versie ${esc(P.newVer)} van Toledo Mobile. Tik op Updaten en daarna op Userscripts in de adresbalk.</span><button type="button" data-act="update">Updaten</button></div>` : '');
    // KU Loket published new exam results (in the last two weeks) that you haven't looked at in the app yet
    function resultsBanner(now) {
      const S = P.study && P.study.v && P.study.v.study;
      const s = S && S.find((x) => x.active);
      if (!s || !s.last || store.get('p:resSeen') === s.last || now - fromYmd(s.last) > 14 * 864e5) return '';
      return `<a class="banner" href="#studie">${ico('sparkle')}<span class="main"><b>Nieuwe examenresultaten</b><br>Bekendgemaakt op ${esc(dLong(fromYmd(s.last)))}.</span><span class="act" style="color:var(--accent);font-weight:600">Bekijk</span></a>`;
    }
    function heroHtml(now) {
      const L = lessons();
      const live = L.find((l) => l.start <= now && l.end > now);
      const next = L.find((l) => l.start > now);
      let l = live || next;
      // exam period: the next exam matters more than a lesson weeks away
      const ex = exams().find((x) => x.start + 4 * 3600e3 > now);
      if (ex && !live && (!l || ex.start <= l.start || (dayDiff(ex.start, now) <= 14 && dayDiff(l.start, now) > 2))) {
        const days = dayDiff(ex.start, now);
        const href = ex.lu ? courseHref(ex.lu, 'vandaag') : '#rooster/examens';
        return `<div class="hero" data-href="${esc(href)}" role="link" style="${colorVars(ex.color)}">
          <div class="hero-top"><span class="hero-lbl"><i></i>${days === 0 ? 'Examen vandaag' : 'Volgend examen'}</span><span class="hero-cd">${esc(days === 0 ? (ex.time ? 'om ' + ex.time : 'vandaag') : days === 1 ? 'morgen' : `nog ${days} dagen`)}</span></div>
          <div class="hero-title">${esc(ex.title)}</div>
          <div class="hero-meta"><span>${ico('calendar')}${esc(cap(dLong(ex.start)))}${ex.time ? ' · ' + esc(ex.time) : ''}</span>${ex.room ? `<span>${ico('pin')}${esc(ex.room)}</span>` : ''}</div>
          <div class="hero-acts">${ex.lu ? `<a class="pri" href="${esc(href)}">${ico('book')}Open vak</a>` : ''}${ex.url ? `<a href="${esc(ex.url)}">${ico('pin')}Lokaal</a>` : ''}<a href="#rooster/examens">${ico('cap')}Alle examens</a></div>
        </div>`;
      }
      if (!l) {
        const known = (P.agenda && P.agenda.v) || P.upcoming.length;
        if (!known && (P.ag === 'loading' || !P.loadedAt)) return '<div class="hero calm"><div class="sk" style="height:14px;width:40%"></div><div class="sk" style="height:24px;width:75%;margin-top:12px"></div><div class="sk" style="height:14px;width:55%;margin-top:10px"></div></div>';
        return `<div class="hero calm" data-href="#rooster" role="link"><div class="hero-top"><span class="hero-lbl"><i></i>Lessen</span></div><div class="hero-title">Geen lessen gepland</div><div class="hero-meta"><span>Bekijk je rooster voor de komende weken.</span></div></div>`;
      }
      const isLive = l === live;
      const dd = dayDiff(l.start, now);
      const lbl = isLive ? (l.exam ? 'Examen bezig' : 'Nu bezig') : l.exam ? 'Examen' : 'Volgende les';
      const left = Math.max(1, Math.round((l.end - now) / 60e3));
      const cd = isLive ? (left < 60 ? `nog ${left} min` : `nog ${Math.floor(left / 60)} u ${left % 60 ? (left % 60) + ' min' : ''}`.trim())
        : dd === 0 ? until(l.start, now) : dd === 1 ? 'morgen' : dd < 7 ? DAYS[new Date(l.start).getDay()] : `${new Date(l.start).getDate()} ${MONTHS_S[new Date(l.start).getMonth()]}`;
      const pct = isLive ? Math.min(100, Math.max(2, ((now - l.start) / (l.end - l.start)) * 100)) : 0;
      const href = l.lu ? courseHref(l.lu, 'vandaag') : '#rooster';
      return `<div class="hero" data-href="${esc(href)}" role="link" style="${colorVars(l.color)}">
        <div class="hero-top"><span class="hero-lbl${isLive ? ' live' : ''}"><i></i>${esc(lbl)}</span><span class="hero-cd">${esc(cd)}</span></div>
        <div class="hero-title">${esc(l.title)}</div>
        <div class="hero-meta"><span>${ico('clock')}${hhmm(l.start)} – ${hhmm(l.end)}</span>${l.room ? `<span>${ico('pin')}${esc(l.room)}</span>` : ''}${l.form ? `<span>${esc(l.form)}</span>` : ''}</div>
        ${isLive ? `<div class="hero-prog"><i style="width:${pct.toFixed(1)}%"></i></div>` : ''}
        <div class="hero-acts">${l.lu ? `<a class="pri" href="${esc(href)}">${ico('book')}Open vak</a>` : ''}${l.url ? `<a href="${esc(l.url)}">${ico('pin')}Lokaal</a>` : ''}<a href="#rooster">${ico('calendar')}Rooster</a></div>
      </div>`;
    }
    // Meer > Cijfers: only this semester's courses (Blackboard's own page lists every course you ever had)
    function gradesHref() {
      const m = new Date().getMonth();
      const cur = m >= 7 || m === 0 ? 'SEMESTER1' : 'SEMESTER2';
      let list = P.enr.filter((e) => e.type !== 'community' && e.available !== false && (e.semester === cur || e.semester === 'YEAR' || e.favorite));
      if (!list.length) list = favCourses();
      list = list.filter((e) => /^ULTRA-/.test(e.learningUnitId || '') || P.lu2pk[e.learningUnitId]).sort((a, b) => cleanTitle(a.title).localeCompare(cleanTitle(b.title), 'nl')).slice(0, 16);
      if (!list.length) return '';
      const cs = list.map((e) => [P.lu2pk[e.learningUnitId] || e.learningUnitId, e.color || '', cleanTitle(e.title).replace(/[~!]/g, ' ')].join('~')).join('!');
      const q = new URLSearchParams({ cs, th: THEME });
      const first = list.find((e) => P.lu2pk[e.learningUnitId]) || list[0];
      const pk = P.lu2pk[first.learningUnitId];
      const ultraOk = Date.now() - (Number(store.get('p:ultraok')) || 0) < 45 * 60e3;
      if (/^ULTRA-/.test(first.learningUnitId) && (!ultraOk || !pk)) return `${JOURNEY}${encodeURIComponent(first.learningUnitId)}#/cijfers?${q}`;
      return `${ULTRA}/ultra/courses/${pk}/outline#/cijfers?${q}`;
    }
    function favCourses() {
      const sem = new Date().getMonth();
      const cur = sem >= 7 || sem === 0 ? 'SEMESTER1' : 'SEMESTER2';
      let list = P.enr.filter((e) => e.favorite && e.available !== false);
      if (!list.length) list = P.enr.filter((e) => e.type !== 'community' && e.available !== false && (e.semester === cur || e.semester === 'YEAR'));
      return list.sort((a, b) => cleanTitle(a.title).localeCompare(cleanTitle(b.title), 'nl'));
    }
    FILL.vandaag = (el) => {
      const now = Date.now();
      const d = new Date(now);
      const greet = d.getHours() < 6 ? 'Goedenacht' : d.getHours() < 12 ? 'Goedemorgen' : d.getHours() < 18 ? 'Goedemiddag' : 'Goedenavond';
      put($('[data-k="date"]', el), esc(`${greet}${P.user && P.user.givenName ? ', ' + P.user.givenName : ''} · ${dLong(now)}`));
      let h = updateBanner() + authBanner() + agendaBanner() + resultsBanner(now) + heroHtml(now);
      // rest of today
      const L = lessons();
      const hero = L.find((l) => l.start <= now && l.end > now) || L.find((l) => l.start > now);
      const today = L.filter((l) => l !== hero && dayDiff(l.start, now) === 0 && l.end > now);
      if (today.length) h += `<div class="sh"><h2>Later vandaag</h2></div><div class="group">${today.map((l) => lessonRow(l, now, 'vandaag')).join('')}</div>`;
      // upcoming deadlines, also the ones you already handed in (until the deadline itself has passed)
      const dl = deadlines(now).filter((e) => e.date > now && e.date - now < 21 * 864e5);
      if (dl.length) {
        const open = dl.filter((e) => !isDone(e)).length;
        const shown = P.allDl ? dl : dl.slice(0, 5);
        h += `<div class="sh"><h2>Komende deadlines</h2>${open < dl.length ? `<span class="sh-note">${open} open</span>` : ''}</div><div class="group">${shown.map((e) => dueRow(e, now)).join('')}${dl.length > shown.length ? `<button type="button" class="more-row" data-act="alldl">Toon alle ${dl.length}</button>` : ''}</div>`;
      } else if (P.loadedAt) h += `<div class="sh"><h2>Komende deadlines</h2></div><div class="group">${row({ icon: 'check', soft: true, title: 'Geen deadlines in de komende 3 weken', chevron: false })}</div>`;
      // courses
      const favs = favCourses();
      if (favs.length) {
        h += `<div class="sh"><h2>Mijn vakken</h2><a href="#vakken">Alle</a></div><div class="tiles">${favs.map((e) => {
          const n = newFor(e.learningUnitId, now);
          return `<a class="tile" href="${esc(courseHref(e.learningUnitId, 'vandaag'))}" style="${colorVars(e.color)}"><b>${esc(cleanTitle(e.title))}</b><span>${esc(codeOf(e.title) || '')}${n ? `<i class="cap">${n}</i>` : ''}</span></a>`;
        }).join('')}</div>`;
      } else if (!P.enr.length && !P.loadedAt) h += `<div class="sh"><h2>Mijn vakken</h2></div><div class="tiles">${'<div class="tile sk" style="background:var(--fill)"></div>'.repeat(3)}</div>`;
      // updates
      const f = feed().slice(0, 4);
      if (f.length) h += `<div class="sh"><h2>Nieuw</h2><a href="#updates">Alle</a></div><div class="group">${f.map((e) => eventRow(e, now)).join('')}</div>`;
      // exams
      const ex = exams().filter((x) => dayDiff(x.start, now) >= 0 && dayDiff(x.start, now) <= 75);
      if (ex.length) h += `<div class="sh"><h2>Examens</h2><a href="#rooster/examens">Alle</a></div><div class="group">${ex.slice(0, 2).map((x) => examRow(x, now)).join('')}</div>`;
      put($('[data-k="body"]', el), h);
    };

    // ---- Vakken
    BUILD.vakken = () => `<div class="lt"><h1>Vakken</h1></div><label class="search">${ico('search')}<input type="search" placeholder="Zoek een vak" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" aria-label="Zoek een vak"><button type="button" class="clr" data-act="clr" hidden aria-label="Wis">✕</button></label><div data-k="list"></div>`;
    NAVS.vakken = () => ({ title: 'Vakken' });
    FILL.vakken = (el) => {
      const list = $('[data-k="list"]', el);
      if (!P.enr.length) { put(list, P.loadedAt ? empty('book', 'Geen vakken', 'Je bent nog voor geen enkel vak ingeschreven.') : skGroup(7)); return; }
      const q = fold(P.search.trim());
      const match = (e) => !q || fold(e.title).includes(q) || fold(e.learningUnitId).includes(q);
      const all = P.enr.filter(match);
      const m = new Date().getMonth();
      const cur = m >= 7 || m === 0 ? 'SEMESTER1' : 'SEMESTER2';
      const rank = (e) => (e.semester === cur ? 0 : e.semester === 'YEAR' ? 1 : e.semester === 'UNKNOWN' ? 3 : 2);
      const byT = (a, b) => cleanTitle(a.title).localeCompare(cleanTitle(b.title), 'nl');
      const fav = all.filter((e) => e.favorite).sort((a, b) => (a.available === false) - (b.available === false) || byT(a, b));
      const crs = all.filter((e) => !e.favorite && e.type !== 'community' && e.available !== false).sort((a, b) => rank(a) - rank(b) || byT(a, b));
      const com = all.filter((e) => !e.favorite && e.type === 'community' && e.available !== false).sort(byT);
      const off = all.filter((e) => !e.favorite && e.available === false).sort(byT);
      let h = '';
      const sec = (title, items, opts = {}) => {
        if (!items.length) return '';
        const lim = opts.limit && !q && !opts.open ? opts.limit : Infinity;
        const shown = items.slice(0, lim);
        const rest = items.length - shown.length;
        return `<div class="gh">${esc(title)}</div><div class="group">${shown.map((e) => courseRow(e)).join('')}${rest > 0 ? `<button type="button" class="more-row" data-act="${opts.act}">Toon alle ${items.length}</button>` : ''}</div>`;
      };
      h += sec('Favorieten', fav);
      h += sec(fav.length ? 'Andere vakken' : 'Vakken', crs);
      h += sec('Gemeenschappen', com, { limit: 3, open: P.showComm, act: 'comm' });
      h += sec('Niet beschikbaar', off, { limit: 2, open: P.showOff, act: 'offall' });
      if (!h) h = empty('search', 'Geen resultaten', `Geen vak gevonden voor "${P.search.trim()}".`);
      put(list, h);
    };

    // ---- Rooster
    BUILD.rooster = () => `<div class="lt"><h1>Rooster</h1></div><div data-k="seg">${segHtml([{ id: 'lessen', label: 'Lessen' }, { id: 'examens', label: 'Examens' }], P.seg, 'rseg')}</div><div data-k="body"></div>`;
    NAVS.rooster = () => ({ title: 'Rooster', right: `<button type="button" class="nb" data-act="agrefresh" aria-label="Vernieuwen">${P.ag === 'loading' ? '<span class="spin" style="width:20px;height:20px;border-width:2px"></span>' : ico('refresh')}</button>` });
    function freshLine(noLink) {
      const a = P.agenda;
      if (P.ag === 'loading') return '<p class="fresh">Rooster bijwerken…</p>';
      if (!a) return '';
      const t = a.ts;
      const when = dayDiff(t, Date.now()) === 0 ? 'vandaag ' + hhmm(t) : dShort(t) + ' ' + hhmm(t);
      return `<p class="fresh">Bijgewerkt ${when} · <button type="button" data-act="agrefresh">Bijwerken</button>${noLink ? '' : '<br><a href="https://www.kuleuven.be/kuloket/zr_0367?sap-language=NL">Open in KU Loket</a>'}</p>`;
    }
    function roosterLessen(now) {
      const L = lessons();
      const ws = addDays(mondayOf(now), P.weekOff * 7);
      const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
      const has = new Set(L.map((l) => ymd(l.start)));
      const todayK = ymd(now);
      const mid = days[3];
      const month = `${cap(MONTHS[new Date(mid).getMonth()])} ${new Date(mid).getFullYear()}`;
      const wkLabel = P.weekOff === 0 ? 'Deze week' : P.weekOff === 1 ? 'Volgende week' : P.weekOff === -1 ? 'Vorige week' : month;
      let h = `<div class="wk-sticky"><div class="wk-head"><b>${esc(wkLabel)}</b><span class="btns">${P.weekOff !== 0 ? '<button type="button" class="today-btn" data-act="wktoday">Vandaag</button>' : ''}<button type="button" data-act="wk" data-d="-1" aria-label="Vorige week"><svg class="i" viewBox="0 0 24 24"><path d="M14.5 5 8 12l6.5 7"/></svg></button><button type="button" data-act="wk" data-d="1" aria-label="Volgende week"><svg class="i" viewBox="0 0 24 24"><path d="M9.5 5 16 12l-6.5 7"/></svg></button></span></div>`;
      h += `<div class="week">${days.map((t) => { const k = ymd(t); const dw = new Date(t).getDay(); return `<button type="button" class="wd${k === todayK ? ' today' : ''}${has.has(k) ? ' has' : ''}${dw === 0 || dw === 6 ? ' we' : ''}" data-act="day" data-d="${k}"><small>${DAYS_S[dw]}</small><b>${new Date(t).getDate()}</b><i></i></button>`; }).join('')}</div></div>`;
      const range = P.agenda && P.agenda.v && P.agenda.v.range;
      let body = '';
      days.forEach((t) => {
        const k = ymd(t);
        const list = L.filter((l) => ymd(l.start) === k);
        if (!list.length && k !== todayK) return;
        const dd = dayDiff(t, now);
        const title = dd === 0 ? `Vandaag · ${dLong(t)}` : dd === 1 ? `Morgen · ${dLong(t)}` : cap(dLong(t));
        body += `<div class="day-title" id="tm-d-${k}">${esc(title)}</div>`;
        if (list.length) body += `<div class="group">${list.map((l) => lessonRow(l, now, 'rooster')).join('')}</div>`;
        else body += '<div class="group plain"><div class="empty small" style="padding:14px 16px">Vandaag geen lessen</div></div>';
      });
      if (!L.length && !P.agenda && P.ag !== 'failed') body = skGroup(4);
      else if (!body || !days.some((t) => has.has(ymd(t)))) {
        const out = range && (ymd(days[6]) < range[0] || ymd(days[0]) > range[1]);
        const nx = L.find((l) => l.start > days[6] + 864e5);
        body += out ? empty('calendar', 'Buiten het geladen bereik', 'Open KU Loket voor lessen zo ver vooruit.', '<p style="margin-top:14px"><a class="btn ghost" href="https://www.kuleuven.be/kuloket/zr_0367?sap-language=NL">Open in KU Loket</a></p>')
          : empty('calendar', 'Geen lessen deze week', '', nx ? `<p style="margin-top:12px"><button type="button" class="btn ghost" data-act="jump" data-d="${ymd(nx.start)}">Volgende les: ${esc(dShort(nx.start))}</button></p>` : '');
      }
      return h + `<div class="day-wrap" data-k="day">${body}</div>`;
    }
    function roosterExamens(now) {
      const X = exams();
      if (!X.length) {
        if (!P.agenda) {
          if (P.ag === 'loading' || !P.ag) return skGroup(3);
          return empty('cap', 'Examenrooster nog niet geladen', P.agLogin ? 'Je examens komen uit KU Loket. Die wil dat je even opnieuw aanmeldt.' : 'Je examens komen uit KU Loket.', '<p style="margin-top:14px"><button type="button" class="btn" data-act="agsync">Examenrooster laden</button></p>');
        }
        return empty('cap', 'Geen examens', 'Er staan (nog) geen examens in je individueel examenrooster.');
      }
      const up = X.filter((x) => dayDiff(x.start, now) >= 0);
      const past = X.filter((x) => dayDiff(x.start, now) < 0);
      let h = '';
      if (up.length) { const first = up[0]; h += `<div class="gh">Volgend examen ${esc(until(first.start, now))}</div><div class="group">${up.map((x) => examRow(x, now)).join('')}</div>`; }
      if (past.length) h += `<div class="gh">Voorbij</div><div class="group">${past.map((x) => examRow(x, now)).join('')}</div>`;
      return h + '<p class="fresh"><a href="https://www.kuleuven.be/kuloket/zr_0363">Open je examenrooster in KU Loket</a></p>';
    }
    FILL.rooster = (el) => {
      segSet(el, P.seg);
      const now = Date.now();
      // the empty Examens page has its own button, so no banner above it
      const banner = P.seg === 'examens' && !P.agenda && !exams().length ? '' : agendaBanner();
      put($('[data-k="body"]', el), banner + (P.seg === 'examens' ? roosterExamens(now) : roosterLessen(now)) + freshLine(P.seg === 'examens'));
    };

    // ---- Updates
    const FILTERS = [['alles', 'Alles'], ['ongelezen', 'Ongelezen'], ['announcement', 'Aankondigingen'], ['content', 'Materiaal'], ['gradebook', 'Cijfers'], ['due', 'Deadlines'], ['advalvas', 'Ad Valvas']];
    BUILD.updates = () => '<div class="lt"><h1>Updates</h1></div><div class="chips" data-k="chips"></div><div data-k="list"></div>';
    NAVS.updates = () => ({ title: 'Updates', right: P.events.some((e) => !e.read && !e.dismissed) ? '<button type="button" class="nb" data-act="allread">Alles gelezen</button>' : '' });
    FILL.updates = (el) => {
      const now = Date.now();
      put($('[data-k="chips"]', el), FILTERS.map(([id, label]) => `<button type="button" class="chip${P.filter === id ? ' on' : ''}" data-act="filter" data-id="${id}">${label}</button>`).join(''));
      const list = $('[data-k="list"]', el);
      if (!P.events.length) { put(list, P.loadedAt ? empty('bell', 'Geen updates', 'Nieuwe aankondigingen, materiaal en cijfers verschijnen hier.') : skGroup(8)); return; }
      let items;
      if (P.filter === 'due') {
        items = deadlines(now);
        put(list, items.length ? `<div class="group">${items.map((e) => dueRow(e, now)).join('')}</div>` : empty('check', 'Geen deadlines', 'Er komen geen deadlines aan.'));
        return;
      }
      items = feed().filter((e) => P.filter === 'alles' || (P.filter === 'ongelezen' ? !e.read : e.subType === P.filter));
      if (!items.length) { put(list, empty(P.filter === 'ongelezen' ? 'checks' : 'bell', P.filter === 'ongelezen' ? 'Alles gelezen' : 'Niets gevonden', P.filter === 'ongelezen' ? 'Je bent helemaal bij.' : 'Geen updates in deze categorie.')); return; }
      const shown = items.slice(0, P.feedN);
      let h = '', curKey = '', buf = '';
      const flush = () => { if (buf) h += `<div class="group">${buf}</div>`; buf = ''; };
      shown.forEach((e) => {
        const k = ymd(e.date);
        if (k !== curKey) { flush(); curKey = k; const dd = dayDiff(e.date, now); h += `<div class="gh">${esc(dd === 0 ? 'Vandaag' : dd === -1 ? 'Gisteren' : cap(dLong(e.date)))}</div>`; }
        buf += eventRow(e, now, true);
      });
      flush();
      if (items.length > shown.length) h += `<p class="fresh"><button type="button" data-act="feedmore">Toon oudere updates (${items.length - shown.length})</button></p>`;
      put(list, h);
    };

    // ---- Meer
    BUILD.meer = () => '<div class="lt"><h1>Meer</h1></div><div data-k="body"></div>';
    NAVS.meer = () => ({ title: 'Meer' });
    FILL.meer = (el) => {
      const L = linkMap();
      const u = P.user || {};
      const name = [u.givenName, u.familyName].filter(Boolean).join(' ');
      const unread = P.mail && typeof P.mail.value === 'number' ? P.mail.value : 0;
      const link = (href, icon, color, title, sub, extra) => row({ href, iconHtml: `<span class="ic" style="--c:${color}">${ico(icon)}</span>`, title, sub, end: extra || '' });
      let h = `<div class="group plain" style="margin-bottom:16px"><div class="prof"><span class="avatar">${esc(initials(name || 'KU L'))}</span><span class="main"><span class="t">${esc(name || 'Student')}</span><span class="s">KU Leuven${store.get('p:rn') || u.userId ? ' · ' + esc(store.get('p:rn') || u.userId) : ''}</span></span></div></div>`;
      const mailApp = store.get('mailApp') !== 'web';
      h += `<div class="group">${row({ act: 'mail', iconHtml: `<span class="ic" style="--c:#0a84ff">${ico('mail')}</span>`, title: 'Mail', sub: mailApp ? 'Opent in de Outlook-app' : 'Outlook in Safari', end: unread ? `<span class="badge">${unread > 99 ? '99+' : unread}</span>` : '' })}${link(L.ADVALVAS || 'https://icts-p-toledo-valvas.cloud.icts.kuleuven.be/student/messages', 'inbox', '#ff9500', 'Ad Valvas', 'Berichten van je faculteit')}${link(L['BB-MESSAGES-ULTRA'] || ULTRA + '/ultra/messages', 'bubble', '#30b955', 'Berichten', 'Blackboard')}</div>`;
      const S0 = P.study && P.study.v && P.study.v.study && P.study.v.study[0];
      const stSub = S0 && S0.pct != null ? `Diplomapercentage ${nl(S0.pct, 2)}%` : 'Resultaten, studiepunten en grafieken';
      const I0 = P.study && P.study.v && P.study.v.isp;
      const ispSub = I0 ? `${I0.courses.filter((c) => c.st === 'now').length} vakken dit jaar · ${nl(I0.courses.filter((c) => c.st === 'now').reduce((a, c) => a + c.sp, 0), 0)} sp` : 'Je vakken en studiepunten';
      h += `<div class="gh">Studie</div><div class="group">${row({ href: '#rooster/examens', iconHtml: `<span class="ic" style="--c:#ff3b30">${ico('cap')}</span>`, title: 'Examenrooster' })}${row({ href: gradesHref() || L['BB-GRADES-ULTRA'] || ULTRA + '/ultra/grades', iconHtml: `<span class="ic" style="--c:#5856d6">${ico('chart')}</span>`, title: 'Cijfers', sub: 'Je vakken van dit semester' })}${row({ href: '#studie', iconHtml: `<span class="ic" style="--c:#34aadc">${ico('trend')}</span>`, title: 'Studievoortgang', sub: stSub })}${row({ href: '#isp', iconHtml: `<span class="ic" style="--c:#00a79d">${ico('idcard')}</span>`, title: 'Mijn ISP', sub: ispSub })}${row({ act: 'loket', iconHtml: `<span class="ic" style="--c:#1d4f86">${ico('grid')}</span>`, title: 'KU Loket', sub: 'Studietracker, uurrooster en meer' })}</div>`;
      h += `<div class="gh">Tools</div><div class="group">${link(L['KALTURA-MYMEDIA'] || ULTRA + '/ultra/tools', 'video', '#8e5bd8', 'My Media', 'Kaltura-video\'s')}${link(L.KURT || 'https://bib.kuleuven.be/faciliteiten/reserveren', 'seat', '#ff2d55', 'KURT', 'Studieplek reserveren')}${link(L.LIMO || 'https://limo.libis.be/index.html', 'library', '#a2845e', 'LIMO', 'Bibliotheek zoeken')}${link(L['KUL-ONEDRIVE'] || 'https://onedrive.kuleuven.be', 'cloud', '#0078d4', 'OneDrive')}${link(L['KUL-MS-OFFICE-365'] || 'https://office.com', 'grid', '#d83b01', 'Microsoft 365')}</div>`;
      h += `<div class="gh">Weergave</div>${segHtml([{ id: 'auto', label: 'Automatisch' }, { id: 'light', label: 'Licht' }, { id: 'dark', label: 'Donker' }], THEME, 'theme')}<p class="gf" style="margin-top:-6px">Automatisch volgt de instelling van je iPhone.</p>`;
      h += `<div class="gh">Mail openen in</div>${segHtml([{ id: 'app', label: 'Outlook-app' }, { id: 'web', label: 'Safari' }], mailApp ? 'app' : 'web', 'mailpref')}<p class="gf" style="margin-top:-6px">In de Outlook-app blijf je aangemeld met je KU Leuven-account.</p>`;
      h += `<div class="gh">App</div><div class="group">${row({ act: 'reload', iconHtml: `<span class="ic" style="--c:#8e8e93">${ico('refresh')}</span>`, title: 'Alles vernieuwen', chevron: false })}${row({ act: 'classic', iconHtml: `<span class="ic" style="--c:#8e8e93">${ico('swap')}</span>`, title: 'Klassieke Toledo', sub: 'De gewone website, zonder app-weergave' })}${link(L['HELP-LEUVEN-STUDENT'] || 'https://associatie.kuleuven.be/toledo/nl/help_KULeuven_campus_Leuven_student', 'help', '#8e8e93', 'Hulp bij Toledo')}</div>`;
      if (P.newVer) h += `<div class="group">${row({ act: 'update', iconHtml: `<span class="ic" style="--c:#34c759">${ico('refresh')}</span>`, title: 'Update naar ' + P.newVer, sub: 'Daarna op Userscripts in de adresbalk tikken' })}</div>`;
      h += `<p class="foot">Toledo Mobile ${VERSION}<br>Gebruikt je eigen Toledo-sessie.</p><p class="legal">Gemaakt met behulp van AI door Jeremy Verschuren. Toledo Mobile is een onafhankelijk project en is niet verbonden aan, goedgekeurd door of geassocieerd met KU Leuven. Toledo Mobile telt anoniem hoeveel mensen het gebruiken, zonder persoonsgegevens of studiegegevens. Je studiegegevens blijven op je eigen toestel en gaan nooit naar de maker. Gebruik op eigen risico.</p>`;
      put($('[data-k="body"]', el), h);
    };

    // ---- Studievoortgang + ISP (from KU Loket, opened from Meer)
    const stMeta = () => {
      if (P.st === 'loading') return 'Bijwerken…';
      const t = P.study && P.study.ts;
      if (!t) return '';
      return `Bijgewerkt ${dayDiff(t, Date.now()) === 0 ? 'vandaag ' + hhmm(t) : dShort(t) + ' ' + hhmm(t)} · <button type="button" data-act="strefresh">Bijwerken</button>`;
    };
    function stEmpty(what) {
      if (P.st === 'loading' || (!P.study && !P.st && bridgeBusy)) return `<div class="st-hero" style="min-height:190px"><div class="sk" style="height:14px;width:35%;opacity:.5"></div><div class="sk" style="height:24px;width:70%;margin-top:12px;opacity:.5"></div></div>${skGroup(5)}`;
      return empty(what === 'isp' ? 'idcard' : 'trend', what === 'isp' ? 'ISP nog niet geladen' : 'Studievoortgang nog niet geladen', 'Deze gegevens komen uit KU Loket.' + (P.stLogin ? ' KU Loket wil dat je even opnieuw aanmeldt.' : ''), '<p style="margin-top:14px"><button type="button" class="btn" data-act="stsync">Laden uit KU Loket</button></p>');
    }
    BUILD.studie = () => '<div class="lt"><h1>Studievoortgang</h1></div><div data-k="body"></div>';
    NAVS.studie = () => ({ back: { label: 'Meer', href: '#meer' }, title: 'Studievoortgang', right: `<button type="button" class="nb" data-act="strefresh" aria-label="Vernieuwen">${P.st === 'loading' ? '<span class="spin" style="width:20px;height:20px;border-width:2px"></span>' : ico('refresh')}</button>` });
    FILL.studie = (el) => {
      const S = P.study && P.study.v && P.study.v.study;
      put($('[data-k="body"]', el), S && S.length ? studyHtml(S, P.stSel, P.stOpen, stMeta()) : stEmpty('studie'));
    };
    BUILD.isp = () => '<div class="lt"><h1>Mijn ISP</h1></div><div data-k="body"></div>';
    NAVS.isp = () => ({ back: { label: 'Meer', href: '#meer' }, title: 'Mijn ISP', right: NAVS.studie().right });
    FILL.isp = (el) => {
      const v = P.study && P.study.v;
      put($('[data-k="body"]', el), v && v.isp ? ispHtml(v.isp, v.study, stMeta()) : stEmpty('isp'));
    };
    const SUBVIEW = { studie: 'meer', isp: 'meer' };

    /* ---------------- view switching ---------------- */
    function view(id) {
      if (!V[id]) {
        const el = document.createElement('section');
        el.className = 'view';
        el.dataset.view = id;
        el.innerHTML = BUILD[id]();
        $('#tm-main').appendChild(el);
        V[id] = { id, el, dirty: true, y: 0 };
        if (id === 'vakken') bindSearch(el);
        if (id === 'rooster') bindSwipe(el);
      }
      return V[id];
    }
    function render(id) { const v = view(id); FILL[id](v.el); v.dirty = false; }
    let rq = 0;
    function dirty(...ids) {
      ids.forEach((i) => { if (V[i]) V[i].dirty = true; });
      if (rq) return;
      rq = requestAnimationFrame(() => {
        rq = 0;
        const v = V[P.tab];
        if (v && v.dirty) { render(P.tab); setNav(NAVS[P.tab]()); }
        badges();
      });
    }
    function show(id, sub) {
      const prev = V[P.tab];
      if (id === P.tab && prev && !sub) { W.scrollTo({ top: 0, behavior: 'smooth' }); return; }
      if (prev) prev.y = W.scrollY;
      if (id === 'rooster' && sub) P.seg = sub === 'examens' ? 'examens' : 'lessen';
      const first = !P.tab;
      P.tab = id;
      const v = view(id);
      Object.values(V).forEach((x) => x.el.classList.toggle('on', x === v));
      if (!first) { v.el.classList.remove('fade'); void v.el.offsetWidth; v.el.classList.add('fade'); }
      setTabOn(SUBVIEW[id] || id);
      if (SUBVIEW[id]) {
        // nothing to show yet: get it, and if the hidden frame can't, open KU Loket for a moment (at most once per 5 minutes, never right after a sync)
        const auto = !P.study && !syncM && Date.now() - (Number(ss.get('tm4-stauto')) || 0) > 5 * 60e3;
        if (auto) ss.set('tm4-stauto', String(Date.now()));
        refreshAgenda(auto, true);
      }
      render(id);
      if (id === 'studie') { const S = P.study && P.study.v && P.study.v.study; const a = S && S.find((x) => x.active); if (a && a.last) store.set('p:resSeen', a.last); }
      badges();
      setNav(NAVS[id]());
      W.scrollTo(0, v.y || 0);
      watchTitle(v.el);
      const hash = '#' + id + (id === 'rooster' && P.seg === 'examens' ? '/examens' : '');
      if (location.hash !== hash || location.search) history.replaceState(null, '', location.pathname + hash);
      if (id === 'updates') setTimeout(() => { if (P.tab === 'updates') { P.seen = Date.now(); store.set('p:seen', P.seen); badges(); } }, 1200);
    }
    function routeFromUrl(ignoreQuery) {
      // links from the course pages say where to go in ?tm= (the site's own app can rewrite #..., not ?...)
      const q = ignoreQuery ? '' : new URLSearchParams(location.search).get('tm') || '';
      let h = location.hash.replace(/^#\/?/, '').split('&')[0];
      const qmap = { courses: 'vakken', menu: 'meer', agenda: 'rooster', examens: 'rooster/examens', vandaag: 'vandaag', vakken: 'vakken', rooster: 'rooster', updates: 'updates', meer: 'meer', studie: 'studie', isp: 'isp' };
      if (qmap[q] && h.split('/')[0] !== qmap[q].split('/')[0]) h = qmap[q];
      const [a, b] = h.split('/');
      const map = { '': 'vandaag', home: 'vandaag', vandaag: 'vandaag', vakken: 'vakken', courses: 'vakken', rooster: 'rooster', agenda: 'rooster', updates: 'updates', messages: 'updates', meer: 'meer', menu: 'meer', studie: 'studie', isp: 'isp' };
      return { tab: map[a] || 'vandaag', sub: b || '' };
    }
    function badges() {
      const n = P.events.filter((e) => e.subType !== 'due' && !e.dismissed && e.date > P.seen && e.date <= Date.now() + 60e3).length;
      setBadge('updates', P.tab === 'updates' ? 0 : n);
    }

    /* ---------------- interaction ---------------- */
    function bindSearch(el) {
      const inp = $('input', el), clr = $('.clr', el);
      inp.addEventListener('input', () => { P.search = inp.value; clr.hidden = !inp.value; FILL.vakken(el); });
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') inp.blur(); });
    }
    function bindSwipe(el) {
      let x0 = 0, y0 = 0, t0 = 0, on = false;
      el.addEventListener('touchstart', (e) => { if (P.seg !== 'lessen' || !e.target.closest('.day-wrap, .week')) return; on = true; x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now(); }, { passive: true });
      el.addEventListener('touchend', (e) => {
        if (!on) return;
        on = false;
        const t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0;
        if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.7 || Date.now() - t0 > 700) return;
        shiftWeek(dx < 0 ? 1 : -1);
      }, { passive: true });
    }
    function animWeek(dir) {
      const d = $('[data-k="day"]', V.rooster.el);
      if (!d) return;
      d.classList.remove('slide-l', 'slide-r'); void d.offsetWidth; d.classList.add(dir > 0 ? 'slide-l' : 'slide-r');
    }
    function shiftWeek(dir) { P.weekOff += dir; FILL.rooster(V.rooster.el); animWeek(dir); const st = $('.wk-sticky', V.rooster.el); if (st && W.scrollY > st.offsetTop) W.scrollTo(0, Math.max(0, st.offsetTop - 60)); }
    function scrollToDay(k) {
      const sec = document.getElementById('tm-d-' + k);
      const st = $('.wk-sticky', V.rooster.el);
      if (!sec) { toast('Geen lessen op ' + dLong(fromYmd(k))); return; }
      const off = ($('#tm-nav').offsetHeight || 44) + (st ? st.offsetHeight : 0) + 4;
      W.scrollTo({ top: sec.getBoundingClientRect().top + W.scrollY - off, behavior: 'smooth' });
    }
    const ACTS = {
      update: () => { location.href = UPDATE_URL; },
      clr: () => { const el = V.vakken.el, inp = $('input', el); inp.value = ''; P.search = ''; $('.clr', el).hidden = true; FILL.vakken(el); inp.focus(); },
      comm: () => { P.showComm = true; FILL.vakken(V.vakken.el); },
      offall: () => { P.showOff = true; FILL.vakken(V.vakken.el); },
      off: () => toast('Dit vak is nog niet beschikbaar in Toledo.'),
      alldl: () => { P.allDl = true; FILL.vandaag(V.vandaag.el); },
      rseg: (b) => { P.seg = b.dataset.id; history.replaceState(null, '', location.pathname + '#rooster' + (P.seg === 'examens' ? '/examens' : '')); FILL.rooster(V.rooster.el); },
      wk: (b) => shiftWeek(Number(b.dataset.d)),
      wktoday: () => { const dir = P.weekOff > 0 ? -1 : 1; P.weekOff = 0; FILL.rooster(V.rooster.el); animWeek(dir); scrollToDay(ymd(Date.now())); },
      day: (b) => scrollToDay(b.dataset.d),
      jump: (b) => { const k = b.dataset.d; const dir = 1; P.weekOff = Math.round((mondayOf(fromYmd(k)) - mondayOf(Date.now())) / (7 * 864e5)); FILL.rooster(V.rooster.el); animWeek(dir); setTimeout(() => scrollToDay(k), 60); },
      filter: (b) => { P.filter = b.dataset.id; P.feedN = 50; FILL.updates(V.updates.el); W.scrollTo(0, 0); },
      feedmore: () => { P.feedN += 50; FILL.updates(V.updates.el); },
      allread: () => {
        const todo = P.events.filter((e) => !e.read && !e.dismissed);
        sheet({ title: 'Alles als gelezen markeren?', msg: `${todo.length} update${todo.length === 1 ? '' : 's'} worden ook in Toledo als gelezen gemarkeerd.`, actions: [{ label: 'Markeer als gelezen', run: () => { markRead(todo); dirty('updates', 'vandaag', 'vakken'); setNav(NAVS.updates()); toast('Alles gelezen'); } }] });
      },
      agrefresh: () => refreshAgenda(true),
      agsync: () => { goTo(LOKET + '?tm=sync&back=' + encodeURIComponent(P.tab === 'rooster' && P.seg === 'examens' ? 'rooster/examens' : P.tab || 'rooster') + (SUBVIEW[P.tab] || studyStale() ? '&x=study' : '')); },
      stsync: () => ACTS.agsync(),
      strefresh: () => refreshAgenda(true, true),
      stsel: (b) => { P.stSel = Number(b.dataset.id) || 0; FILL.studie(V.studie.el); },
      resopen: (b) => { const k = b.dataset.k; P.stOpen[k] = !P.stOpen[k]; FILL.studie(V.studie.el); },
      // Outlook-app first (iOS lets a tap open another app). Safari first asks "Open in Outlook?", and that can take
      // longer than any timer, so the app never goes to Outlook on the web by itself (that is the Microsoft sign-in
      // you'd get on returning): only if the app clearly didn't open, it offers the web version as a choice.
      mail: () => {
        if (store.get('mailApp') === 'web') { goTo(MAIL); return; }
        let away = false, closeSheet = null;
        const seen = () => { if (document.visibilityState === 'hidden') { away = true; store.set('mailOk', 1); if (closeSheet) { closeSheet(); closeSheet = null; } } };
        const gone = () => { away = true; };
        document.addEventListener('visibilitychange', seen);
        W.addEventListener('pagehide', gone, { once: true });
        W.addEventListener('blur', gone, { once: true });
        location.href = 'ms-outlook://emails';
        setTimeout(() => {
          W.removeEventListener('blur', gone);
          if (away || store.get('mailOk')) { setTimeout(() => document.removeEventListener('visibilitychange', seen), 60e3); return; }
          closeSheet = sheet({ title: 'Outlook-app niet geopend', msg: 'Staat de Outlook-app op je iPhone? Je kan je mail ook in Safari openen.', actions: [
            { label: 'Opnieuw in de Outlook-app', run: () => ACTS.mail() },
            { label: 'Outlook op het web', run: () => goTo(MAIL) },
          ] });
        }, 2600);
      },
      mailpref: (b) => { store.set('mailApp', b.dataset.id); FILL.meer(V.meer.el); toast(b.dataset.id === 'web' ? 'Mail opent in Safari' : 'Mail opent in de Outlook-app'); },
      loket: () => sheet({ title: 'KU Loket', actions: [
        { label: 'Studietracker', href: 'https://kuleuven.be/kuloket/zr_0184?sap-language=NL' },
        { label: 'Uurrooster in KU Loket', href: 'https://www.kuleuven.be/kuloket/zr_0367?sap-language=NL' },
        { label: 'Examenrooster in KU Loket', href: 'https://www.kuleuven.be/kuloket/zr_0363' },
        { label: 'ISP aanpassen', href: 'https://www.kuleuven.be/kuloket/zr_0442?sap-language=NL' },
        { label: 'Studievoortgangsdossier', href: 'https://kuleuven.be/kuloket/zr_1017?sap-language=NL' },
      ] }),
      login: () => { ss.set('tm4-login', '1'); location.reload(); },
      theme: (b) => {
        const t = b.dataset.id;
        saveTheme(t);
        applyTheme(t);
        segSet(V.meer.el, t);
        toast(t === 'light' ? 'Lichte modus' : t === 'dark' ? 'Donkere modus' : 'Volgt je iPhone');
      },
      reload: () => { ['p:events', 'p:enr', 'p:upcoming', 'p:mail'].forEach((k) => store.del(k)); toast('Bezig met vernieuwen…'); loadAll(true); refreshAgenda(true); },
      classic: () => sheet({ title: 'Klassieke Toledo openen?', msg: 'Je kan altijd terug naar de app via de knop onderaan.', actions: [{ label: 'Open klassieke Toledo', run: () => { ss.set('tm4-classic', '1'); history.replaceState(null, '', location.pathname + '#/home'); location.reload(); } }] }),
    };

    W.addEventListener('click', (e) => {
      if (!e.target || !e.target.closest) return;
      const tab = e.target.closest('#tm-tabs a');
      if (tab) { e.preventDefault(); show(tab.dataset.tab); return; }
      const act = e.target.closest('[data-act]');
      if (act && ACTS[act.dataset.act]) { e.preventDefault(); ACTS[act.dataset.act](act, e); return; }
      const ev = e.target.closest('[data-ev]');
      if (ev) { const id = ev.dataset.ev; const item = P.events.find((x) => String(x.id) === id); if (item) markRead([item]); }
      const a = e.target.closest('a[href]');
      if (a) {
        const href = a.getAttribute('href');
        if (href.startsWith('#')) { e.preventDefault(); const r = (() => { const [x, y] = href.slice(1).split('/'); return { tab: x, sub: y }; })(); if (V[r.tab] || BUILD[r.tab]) show(r.tab, r.sub); }
        return;
      }
      const card = e.target.closest('[data-href]');
      if (card && !e.target.closest('button')) {
        const href = card.dataset.href;
        if (href.startsWith('#')) { const [x, y] = href.slice(1).split('/'); show(x, y); } else goTo(href);
      }
    }, true);
    const OWN = /^#(vandaag|vakken|rooster|rooster\/examens|updates|meer|studie|isp)$/;
    W.addEventListener('hashchange', () => {
      if (!OWN.test(location.hash)) { history.replaceState(null, '', location.pathname + '#' + P.tab + (P.tab === 'rooster' && P.seg === 'examens' ? '/examens' : '')); return; }
      const r = routeFromUrl(true);
      if (r.tab !== P.tab || r.sub) show(r.tab, r.sub);
    });

    /* ---------------- data ---------------- */
    const H = { 'Toledo-Language': 'nl' };
    const papi = (p) => api(PORTAL_ORIGIN + '/portal/api/' + p, { headers: H });
    function onFail(key) {
      return (e) => {
        P.err[key] = e;
        if (e && e.auth) goLogin();
      };
    }
    let loginTried = false;
    function goLogin() {
      if (loginTried || TEST) { P.authFail = true; dirty(P.tab); return; }
      loginTried = true;
      const last = Number(ss.get('tm4-login-at')) || 0;
      if (Date.now() - last < 90e3) { P.authFail = true; dirty(P.tab); return; }
      ss.set('tm4-login-at', String(Date.now()));
      ss.set('tm4-login', '1');
      location.reload();
    }
    function loadAll(force) {
      const mark = () => { P.loadedAt = Date.now(); };
      const jobs = [
        swr('p:user', () => papi('user'), (v) => { P.user = v; dirty('vandaag', 'meer'); }),
        swr('p:enr', () => papi('enrollments'), (v) => { P.enr = Array.isArray(v) ? v : []; dirty('vandaag', 'vakken', 'rooster'); }).catch(onFail('enr')),
        swr('p:events', () => papi('events'), (v) => { P.events = Array.isArray(v) ? v : []; learnPk(); dirty('vandaag', 'updates', 'vakken'); }).catch(onFail('events')),
        swr('p:upcoming', () => papi('upcoming'), (v) => { P.upcoming = Array.isArray(v) ? v : []; dirty('vandaag', 'rooster'); }).catch(() => {}),
        swr('p:links', () => papi('links'), (v) => { P.links = Array.isArray(v) ? v : []; dirty('meer'); }, { maxAge: force ? 0 : 12 * 3600e3 }).catch(() => {}),
        swr('p:mail', () => papi('emails/unread'), (v) => { P.mail = v; dirty('meer'); }).catch(() => {}),
      ];
      jobs[0].catch(onFail('user'));
      return Promise.allSettled(jobs).then(() => { mark(); dirty('vandaag', 'vakken', 'updates', 'rooster', 'meer'); });
    }

    /* KU Loket lives on another origin of the same site: a hidden frame reads the timetable there
       (the userscript runs inside it, see bridge()) and hands it over with postMessage. */
    // force = you pressed "vernieuwen": if the hidden frame can't do it quickly (or KU Loket first wants you to
    // sign in), the app opens KU Loket itself for a moment and comes straight back with the timetable.
    let bridgeBusy = false, bridgeSt = false, bridgeDone = Promise.resolve();
    const studyStale = () => !P.study || Date.now() - P.study.ts > 6 * 3600e3;
    // force: you asked for it (button), so when the hidden frame can't, KU Loket opens for a moment.
    // study: also read study progress + ISP (opening those pages, or when that copy is older than 6 hours).
    // quiet: pulled to refresh: try the hidden frame, never leave the page.
    function refreshAgenda(force, study, quiet) {
      const a = P.agenda;
      const wantStudy = !!study && (force || studyStale());
      if (!force && !wantStudy && a && Date.now() - a.ts < 30 * 60e3 && !studyStale()) return Promise.resolve();
      // nothing will load study progress now: say so (with the "Laden uit KU Loket" button) instead of loading forever
      const stIdle = () => { if (wantStudy && P.st !== 'loading') { P.st = 'failed'; dirty('studie', 'isp'); if (SUBVIEW[P.tab]) setNav(NAVS[P.tab]()); } };
      if (bridgeBusy) {
        if (force && !quiet) ACTS.agsync();
        else if (wantStudy && !bridgeSt) bridgeDone.then(() => refreshAgenda(false, true, quiet));
        return Promise.resolve();
      }
      if (TEST && !W.__TM_BRIDGE__) { if (force) toast('Vernieuwen werkt op de iPhone'); stIdle(); return Promise.resolve(); }
      const fail = store.get('p:bridgefail') || { n: 0, ts: 0 };
      if (fail.n >= 2 && Date.now() - fail.ts < 12 * 3600e3) { if (force && !quiet) ACTS.agsync(); else stIdle(); return Promise.resolve(); }
      const withSt = wantStudy || studyStale();
      bridgeBusy = true;
      bridgeSt = withSt;
      P.ag = 'loading';
      if (withSt) P.st = 'loading';
      dirty('vandaag', 'rooster', 'studie', 'isp');
      if (SUBVIEW[P.tab]) setNav(NAVS[P.tab]());
      if (P.tab === 'rooster') setNav(NAVS.rooster());
      const f = document.createElement('iframe');
      f.src = LOKET + '?tm=bridge' + (withSt ? '&x=study' : '');
      f.title = 'KU Loket';
      f.setAttribute('aria-hidden', 'true');
      f.setAttribute('data-tm4', '');
      f.tabIndex = -1;
      f.style.cssText = 'position:fixed;left:-20px;top:-20px;width:1px;height:1px;border:0;opacity:0;pointer-events:none';
      let timer = 0, done = false, settle = () => {};
      const settled = new Promise((r) => { settle = r; });
      bridgeDone = settled;
      const finish = (ok, login, noSt) => {
        if (done) return;
        done = true;
        if (withSt) { P.st = ok && !noSt ? 'ok' : 'failed'; P.stLogin = !ok && !!login; }
        clearTimeout(timer);
        W.removeEventListener('message', onMsg);
        setTimeout(() => f.remove(), 50);
        bridgeBusy = false;
        bridgeSt = false;
        settle();
        P.ag = ok ? 'ok' : 'failed';
        P.agLogin = !ok && !!login;
        if (ok) store.del('p:bridgefail');
        else if (!login) { const fl = store.get('p:bridgefail') || { n: 0 }; store.set('p:bridgefail', { n: fl.n + 1, ts: Date.now() }); }
        dirty('vandaag', 'rooster', 'studie', 'isp', 'meer');
        if (P.tab === 'rooster' || SUBVIEW[P.tab]) setNav(NAVS[P.tab]());
        if ((!ok || (withSt && noSt && SUBVIEW[P.tab])) && force && !quiet) ACTS.agsync();
        else if (ok && force && !quiet) toast(SUBVIEW[P.tab] ? 'Bijgewerkt' : 'Rooster bijgewerkt');
      };
      const onMsg = (e) => {
        if (e.origin !== LOKET_ORIGIN || !e.data || e.data.tm4 !== 'agenda') return;
        if (e.data.ok && e.data.data) { const d = e.data.data; saveAgenda(d); saveStudy(d); finish(true, false, withSt && !d.study && !d.isp); return; }
        if (e.data.pending) {
          // KU Loket wants you to sign in first: that needs the real page
          if (force && !quiet) { finish(false, true); return; }
          // show the "Laden" button right away; the frame may still get through by itself, so give it a little longer
          if (P.ag === 'loading') {
            P.ag = 'failed';
            P.agLogin = true;
            dirty('vandaag', 'rooster');
            if (P.tab === 'rooster') setNav(NAVS.rooster());
          }
          clearTimeout(timer);
          timer = setTimeout(() => finish(false, true), 20000);
          return;
        }
        finish(false);
      };
      W.addEventListener('message', onMsg);
      timer = setTimeout(() => finish(false), (force && !quiet ? 7000 : 10000) + (withSt ? 8000 : 0));
      document.body.appendChild(f);
      return settled;
    }

    /* ---------------- start ---------------- */
    guardPath();
    learnPk();
    const r0 = routeFromUrl();
    show(r0.tab, r0.sub);
    badges();
    loadAll(false);
    setTimeout(() => refreshAgenda(false), 350);
    setTimeout(() => checkUpdate((v) => { P.newVer = v; dirty('vandaag', 'meer'); }), 1500);
    setInterval(() => { if (document.visibilityState === 'visible' && (P.tab === 'vandaag' || P.tab === 'rooster')) dirty(P.tab); }, 30e3);
    // Toledo itself, and KU Loket (same site, so its cookies go along) for the timetable
    pullRefresh(() => {
      if (SUBVIEW[P.tab]) return refreshAgenda(true, true, true);
      return Promise.all([loadAll(true), refreshAgenda(true, false, true)]);
    });
    keepAlive('portal', [[PORTAL_ORIGIN + '/portal/api/user'], [LOKET_ORIGIN + '/sap/bc/ui2/start_up', 'no-cors']]);
    const wake = () => {
      if (document.visibilityState !== 'visible') return;
      dirty(P.tab);
      if (Date.now() - P.loadedAt > 120e3) loadAll(false);
      refreshAgenda(false);
    };
    document.addEventListener('visibilitychange', wake);
    W.addEventListener('pageshow', (e) => { if (e.persisted) wake(); });
  }
  /* ================================================================== course app (ultra.edu.kuleuven.cloud/ultra/app) */
  function ultraApp() {
    takeover('Toledo', [PORTAL_ORIGIN]);
    const TAB_LABEL = { vandaag: 'Vandaag', vakken: 'Vakken', rooster: 'Rooster', updates: 'Updates', meer: 'Meer' };
    const TABS = [
      { id: 'vandaag', label: 'Vandaag', icon: 'house', href: PORTAL + '?tm=vandaag' },
      { id: 'vakken', label: 'Vakken', icon: 'book', href: PORTAL + '?tm=vakken' },
      { id: 'rooster', label: 'Rooster', icon: 'calendar', href: PORTAL + '?tm=rooster' },
      { id: 'updates', label: 'Updates', icon: 'bell', href: PORTAL + '?tm=updates' },
      { id: 'meer', label: 'Meer', icon: 'grid', href: PORTAL + '?tm=meer' },
    ];
    buildShell(TABS, '');
    // The app also runs on the course address Blackboard itself uses (/ultra/courses/<id>/outline),
    // which is where Toledo's link service lands after signing in.
    const PATH_PK = W.__TM_PK__ || '';
    if (PATH_PK) {
      ss.del('tm4-classic-ultra');
      let h = location.hash || '';
      const qs = h.includes('?') ? h.slice(h.indexOf('?')) : '';
      const resume = ss.get('tm4-resume') || '';
      ss.del('tm4-resume');
      if (resume.startsWith('#/c/' + PATH_PK) || resume.startsWith('#/cijfers')) h = resume + qs;
      if (/^#\/vak\//.test(h)) h = h.replace(/^#\/vak\/[^/?]*/, '#/c/' + PATH_PK);
      if (!/^#\/c\/_\d+_\d+/.test(h) && !/^#\/cijfers/.test(h)) h = '#/c/' + PATH_PK + qs;
      history.replaceState(history.state && history.state.tm ? history.state : { tm: 1, d: 0 }, '', location.pathname + h);
    }
    guardPath();
    const U = { depth: (history.state && history.state.tm && history.state.d) || 0, views: new Map(), titles: {}, items: {}, cur: null, curKey: '', animBack: false, scroll: {} };
    try { U.scroll = JSON.parse(ss.get('tm4-uscroll') || '{}') || {}; } catch (_) {}
    const fromPortal = /^https:\/\/toledo\.kuleuven\.be\//.test(document.referrer);
    // remember when Blackboard last answered, to tell the portal (see leave())
    let okAt = 0;
    const uget = (p) => api(ULTRA + p).then((v) => { okAt = Date.now(); return v; });

    /* ---------------- routes + context ---------------- */
    function parse() {
      const h = location.hash.replace(/^#/, '');
      const i = h.indexOf('?');
      const path = i >= 0 ? h.slice(0, i) : h;
      const q = new URLSearchParams(i >= 0 ? h.slice(i + 1) : '');
      const s = path.split('/').filter(Boolean);
      const r = { path, q, type: 'none' };
      if (s[0] === 'cijfers') r.type = 'grades';
      else if (s[0] === 'vak' && s[1]) { r.type = 'resolve'; r.lu = decodeURIComponent(s[1]); r.rest = s.slice(2).join('/'); }
      else if (s[0] === 'c' && /^_\d+_\d+$/.test(s[1] || '')) {
        r.pk = s[1];
        const t = s[2] || '';
        if (t === 'f' && s[3]) { r.type = 'folder'; r.id = s[3]; }
        else if (t === 'd' && s[3]) { r.type = 'doc'; r.id = s[3]; }
        else if (t === 'item' && s[3]) { r.type = 'item'; r.id = s[3]; }
        else { r.type = 'course'; r.tab = t === 'cijfers' ? 'cijfers' : (t === 'aankondigingen' || t === 'a') ? 'aankondigingen' : 'inhoud'; if (t === 'a') r.ann = s[3] || ''; }
      }
      return r;
    }
    const ctxKey = (pk) => 'tm4-ctx:' + pk;
    const tabOf = (r) => (r.type === 'grades' ? 'meer' : getCtx(r.pk).f || 'vakken');
    function getCtx(pk) { try { return JSON.parse(ss.get(ctxKey(pk)) || '{}') || {}; } catch (_) { return {}; } }
    function saveCtx(pk, q) {
      const c = getCtx(pk);
      ['lu', 't', 'k', 'f', 'n'].forEach((k) => { if (q.get(k)) c[k] = q.get(k); });
      if (q.get('lu') && !q.get('n')) delete c.n;
      ss.set(ctxKey(pk), JSON.stringify(c));
      if (c.k) saveMeta(pk, { color: c.k });
      if (c.lu) saveMeta(pk, { lu: c.lu });
    }
    function meta(pk) {
      const m = store.get('m:' + pk) || {};
      const c = getCtx(pk);
      const lu = m.lu || c.lu || '';
      return { pk, lu, name: cleanTitle(m.name || c.t || ''), color: c.k || m.color || '', code: luCode(lu) || codeOf(m.name || '') };
    }
    function saveMeta(pk, patch) { store.set('m:' + pk, Object.assign(store.get('m:' + pk) || {}, patch)); }
    const deepLink = (pk, it) => `${ULTRA}/ultra/redirect?redirectType=nautilus&courseId=${pk}&contentId=${it.id}${/^_\d+_\d+$/.test(it.p || '') ? '&parentId=' + it.p : ''}`;
    const ltiUrl = (pk, id) => `${ULTRA}/webapps/blackboard/execute/blti/launchLink?course_id=${pk}&content_id=${id}&from_ultra=true`;

    /* ---------------- content model ---------------- */
    function fileFromAnchor(a) {
      let info = {};
      try { info = JSON.parse(a.getAttribute('data-bbfile') || '{}') || {}; } catch (_) {}
      const raw = String(a.getAttribute('href') || info.resourceUrl || '').replace(/^@X@[^@]*@X@/i, '/');
      const isFile = a.getAttribute('data-bbtype') === 'attachment' || /\/bbcswebdav\//.test(raw) || !!info.fileName;
      if (!isFile) return null;
      const u = absU(raw);
      if (!u) return null;
      return { u, n: info.displayName || info.fileName || a.textContent.trim() || 'Bestand', mi: info.mimeType || '', s: Number(info.fileSize) || 0 };
    }
    function parseDoc(html) {
      const out = { files: [], x: false, sn: '' };
      if (!html) return out;
      const d = new DOMParser().parseFromString(String(html), 'text/html');
      $$('a', d).forEach((a) => { const f = fileFromAnchor(a); if (f) { if (!out.files.some((x) => x.u === f.u)) out.files.push(f); a.remove(); } });
      const txt = d.body.textContent.replace(/\s+/g, ' ').trim();
      const rich = !!d.body.querySelector('img, iframe, video, table, a[href]');
      out.x = txt.length > 0 || rich;
      // a short note above some files: show the note and open the files straight from the list
      if (out.files.length && !rich && txt.length && txt.length < 200) { out.x = false; out.sn = txt; }
      return out;
    }
    const UDB = /^ultra[\s_-]*document[\s_-]*body$/i;
    const bodyOf = (x) => (x.body && typeof x.body === 'object' ? (x.body.displayText || x.body.rawText || '') : (x.body || ''));
    function normItem(x) {
      const h = typeof x.contentHandler === 'string' ? x.contentHandler : (x.contentHandler && x.contentHandler.id) || '';
      const cd = (x.contentDetail && x.contentDetail[h]) || {};
      const it = { id: x.id, p: x.parentId || '', t: String(x.title || '').trim() || 'Zonder titel', m: Number(x.modifiedDate) || Date.parse(x.modified || x.created || '') || 0 };
      const d = textOf(x.description);
      if (d) it.d = d.slice(0, 200);
      if (/x-bb-(folder|lesson)/.test(h) || cd.isFolder) { it.k = 'folder'; if (/x-bb-document/.test(h)) it.ud = 1; }
      else if (/x-bb-file/.test(h)) {
        it.k = 'file';
        const f = cd.file || {};
        it.f = { u: f.permanentUrl ? absU(f.permanentUrl) : '', n: f.fileName || it.t, mi: f.mimeType || '', s: Number(f.fileSize) || 0 };
      } else if (/x-bb-document/.test(h)) { it.k = 'doc'; const pd = parseDoc(bodyOf(x)); it.files = pd.files; it.x = pd.x; if (pd.sn) it.sn = pd.sn; }
      else if (/externallink/.test(h)) { it.k = 'link'; it.u = cd.url || (x.contentHandler && x.contentHandler.url) || ''; }
      else if (/blti|lti/.test(h)) it.k = 'lti';
      else if (/asmt|assignment|assessment|test|survey|turnitin/.test(h)) it.k = 'task';
      else if (/forum|discussion|journal|blog|wiki|conversation/.test(h)) it.k = 'talk';
      else it.k = 'other';
      // Ultra's newer "Document" pages keep their text in child items called "ultraDocumentBody":
      // that text is shown on the page itself (see folderView), never as a row of its own
      if (it.k === 'doc' && UDB.test(it.t)) { it.ub = 1; if (x.body != null) it.html = sanitize(bodyOf(x), (a) => { const f = fileFromAnchor(a); return f ? frowHtml(f) : ''; }); }
      U.items[it.id] = it;
      return it;
    }
    const kidsMem = new Map();
    function cachedKids(pk, id) {
      const k = `c:${pk}:${id}`;
      if (kidsMem.has(k)) return kidsMem.get(k);
      const c = store.get(k);
      if (c) { c.v.forEach((it) => { U.items[it.id] = it; }); kidsMem.set(k, c); }
      return c;
    }
    function fetchChildren(pk, id) {
      return once('k:' + pk + id, () => uget(`/learn/api/v1/courses/${pk}/contents/${id}/children?limit=200`)
        .catch((e) => { if (e.auth) throw e; return uget(id === 'ROOT' ? `/learn/api/public/v1/courses/${pk}/contents?limit=200` : `/learn/api/public/v1/courses/${pk}/contents/${id}/children?limit=200`); })
        .then((j) => {
          const v = (j.results || []).filter((x) => x.visibility !== 'HIDDEN').map(normItem);
          const rec = { ts: Date.now(), v };
          kidsMem.set(`c:${pk}:${id}`, rec);
          store.set(`c:${pk}:${id}`, rec);
          return v;
        }));
    }
    function fetchItem(pk, id) {
      return once('i:' + pk + id, () => uget(`/learn/api/v1/courses/${pk}/contents/${id}`).then((x) => {
        const it = normItem(x);
        it.html = sanitize(bodyOf(x), (a) => { const f = fileFromAnchor(a); return f ? frowHtml(f) : ''; });
        store.set(`i:${pk}:${id}`, { ts: Date.now(), v: it });
        return it;
      }));
    }
    function fetchAnn(pk) {
      return once('a:' + pk, () => uget(`/learn/api/public/v1/courses/${pk}/announcements?limit=100`).then((j) => {
        const now = Date.now();
        const v = (j.results || []).filter((a) => !a.draft).filter((a) => {
          const d = a.availability && a.availability.duration;
          if (!d || d.type !== 'Restricted') return true;
          const s = d.start ? Date.parse(d.start) : 0, e = d.end ? Date.parse(d.end) : 0;
          return (!s || s <= now) && (!e || e >= now);
        }).map((a) => {
          const d = a.availability && a.availability.duration;
          return { id: a.id, t: a.title || 'Aankondiging', date: Date.parse((d && d.start) || a.created || '') || 0, html: sanitize(a.body || '') };
        }).sort((a, b) => b.date - a.date);
        store.set('a:' + pk, { ts: Date.now(), v });
        return v;
      }));
    }
    function getMe() {
      const c = store.get('me2');
      if (c && Date.now() - c.ts < 7 * 864e5) return Promise.resolve(c.v);
      return once('me', () => uget('/learn/api/public/v1/users/me?fields=id,userName,studentId').then((v) => { store.set('me2', { ts: Date.now(), v }); return v; }));
    }
    // your student number (r0123456): the portal only knows your login id, so it is handed over on the way back
    function rnParam() {
      const c = store.get('me2');
      const d = c && c.v && /^\d{7,8}$/.test(c.v.studentId || '') ? String(c.v.studentId).slice(-7) : '';
      return d && store.get('rnSent') !== d ? '&rn=r' + d : '';
    }
    const num = (n) => String(Math.round(Number(n) * 100) / 100).replace('.', ',');
    function gradeText(x, c) {
      if (x.exempt) return 'Vrijgesteld';
      const d = x.displayGrade || {};
      const NL = { complete: 'Voltooid', completed: 'Voltooid', incomplete: 'Onvolledig', pass: 'Geslaagd', passed: 'Geslaagd', fail: 'Niet geslaagd', failed: 'Niet geslaagd' };
      if (d.text) return NL[String(d.text).toLowerCase()] || d.text;
      const poss = d.possible || (c.score && c.score.possible);
      if (d.score != null) return d.scaleType === 'Percent' ? Math.round(d.score) + '%' : num(d.score) + (poss ? '/' + num(poss) : '');
      if (x.score != null) return num(x.score) + (poss ? '/' + num(poss) : '');
      return '';
    }
    function fetchGrades(pk) {
      return once('g:' + pk, async () => {
        const me = await getMe();
        const [cols, mine] = await Promise.all([
          uget(`/learn/api/public/v2/courses/${pk}/gradebook/columns?limit=200`),
          uget(`/learn/api/public/v2/courses/${pk}/gradebook/users/${me.id}?limit=200`).catch((e) => { if (e.auth) throw e; return { results: [] }; }),
        ]);
        const g = {};
        (mine.results || []).forEach((x) => { g[x.columnId] = x; });
        const v = (cols.results || []).filter((c) => !(c.availability && c.availability.available === 'No')).map((c) => {
          const x = g[c.id] || {};
          return { id: c.id, t: c.displayName || c.name || 'Beoordeling', due: c.grading && c.grading.due ? Date.parse(c.grading.due) : 0, cid: c.contentId || '', st: x.status || '', g: gradeText(x, c) };
        });
        store.set('g:' + pk, { ts: Date.now(), v });
        return v;
      });
    }

    /* ---------------- rows ---------------- */
    const isNew = (it) => it.m && Date.now() - it.m < 7 * 864e5;
    function frowHtml(f) {
      const [lbl, col] = ftype(f.n, f.mi);
      return `<a class="frow" href="${esc(f.u)}"><span class="fi" style="--c:${col}">${lbl}</span><span class="main"><span class="t">${esc(f.n)}</span><span class="s">${esc([lbl === 'FILE' ? 'Bestand' : lbl, fsize(f.s)].filter(Boolean).join(' · '))}</span></span>${EXT}</a>`;
    }
    // "Langenaeker_2024_attribution.pdf" -> "Langenaeker 2024 attribution" (the type is in the icon)
    const niceName = (n) => String(n || '').replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[_]+/g, ' ').replace(/\s{2,}/g, ' ').trim() || n;
    function fileRow(f, o = {}) {
      const [lbl, col] = ftype(f.n, f.mi);
      const sub = o.sub != null ? o.sub : [lbl === 'FILE' ? 'Bestand' : lbl, fsize(f.s)].filter(Boolean).join(' · ');
      return row({ href: f.u || undefined, act: f.u ? '' : 'att', attrs: f.u ? '' : ` data-id="${esc(o.id || '')}"`, iconHtml: `<span class="fi" style="--c:${col}">${lbl}</span>`,
        title: o.title && o.title !== f.n ? o.title : niceName(f.n), sub, external: true, cls: (o.cls || '') + (o.clamp ? ' note' : ''), dot: o.dot });
    }
    // a folder that is really a Document page: its children hold the page's text
    function isDocPage(pk, it) {
      const c = cachedKids(pk, it.id);
      if (c) return c.v.some((k) => k.ub);
      return !!it.ud;
    }
    function folderInfo(pk, it) {
      const c = cachedKids(pk, it.id);
      if (!c) return { sub: it.d || 'Map', fresh: 0 };
      const n = c.v.length;
      const fresh = c.v.filter((k) => k.k !== 'folder' && isNew(k)).length;
      return { sub: n ? `${n} item${n === 1 ? '' : 's'}${fresh ? ` · ${fresh} nieuw` : ''}` : 'Leeg', fresh };
    }
    function itemRow(it, pk, o = {}) {
      const path = o.path;
      const cvs = colorVars(meta(pk).color);
      const lead = (icon) => `<span class="ic soft" style="${cvs}">${ico(icon)}</span>`;
      const solid = (icon, c) => `<span class="ic" style="--c:${c}">${ico(icon)}</span>`;
      const dot = isNew(it);
      switch (it.k) {
        case 'folder': {
          const fi = folderInfo(pk, it);
          if (isDocPage(pk, it)) {
            // a Document page that only holds a file or a few files (no text of its own): open them straight from the list
            const kids = (cachedKids(pk, it.id) || { v: [] }).v;
            const files = kids.flatMap((k) => k.files || []);
            if (kids.length && kids.every((k) => k.ub && !k.x) && files.length && files.length <= 8) {
              const sn = kids.map((k) => k.sn || '').filter(Boolean).join(' ');
              return itemRow({ id: it.id, p: it.p, t: it.t, m: it.m, k: 'doc', x: false, files, sn }, pk, o);
            }
            return row({ href: `#/c/${pk}/f/${it.id}`, attrs: ` data-nav="1" data-title="${esc(it.t)}"`, iconHtml: lead('doc'), title: it.t, sub: path != null ? path : it.d || 'Document', dot: fi.fresh > 0 });
          }
          return row({ href: `#/c/${pk}/f/${it.id}`, attrs: ` data-nav="1" data-title="${esc(it.t)}"`, iconHtml: lead('folder'), title: it.t, sub: path != null ? path : fi.sub, dot: fi.fresh > 0 });
        }
        case 'file':
          return fileRow(it.f, { title: it.t, name: it.f.n, id: it.id, dot, sub: path != null ? path : undefined });
        case 'doc': {
          if (it.ub) {
            // the text of a Document page (e.g. in "Nieuw" or a search): open the page it belongs to
            const par = U.items[it.p];
            const t = par && !par.ub ? par.t : 'Document';
            return row({ href: it.p ? `#/c/${pk}/f/${it.p}` : `#/c/${pk}`, attrs: ` data-nav="1" data-title="${esc(t)}"`, iconHtml: lead('doc'), title: t, sub: path != null ? path : textOf(it.html).slice(0, 120) || 'Document', dot });
          }
          const files = it.files || [];
          if (!it.x && files.length === 1) return fileRow(files[0], { title: it.t, name: files[0].n, dot, sub: path != null ? path : it.sn || undefined, clamp: !!it.sn });
          if (!it.x && files.length > 1 && files.length <= 8) {
            return `<div class="grp-h">${lead('doc')}<span class="main"><span class="t">${esc(it.t)}</span><span class="s clamp2">${esc(path != null ? path : it.sn || files.length + ' bestanden')}</span></span></div>${files.map((f) => fileRow(f, { cls: 'sub', dot })).join('')}`;
          }
          return row({ href: `#/c/${pk}/d/${it.id}`, attrs: ` data-nav="1" data-title="${esc(it.t)}"`, iconHtml: lead('doc'), title: it.t,
            sub: path != null ? path : (it.d || ('Document' + (files.length ? ` · ${files.length} bestand${files.length > 1 ? 'en' : ''}` : ''))), dot });
        }
        case 'lti': return row({ href: ltiUrl(pk, it.id), iconHtml: solid('play', '#8e5bd8'), title: it.t, sub: path != null ? path : 'Weblecture · speelt meteen af', external: true, dot });
        case 'link': return row({ href: it.u || deepLink(pk, it), iconHtml: solid('link', '#0a84ff'), title: it.t, sub: path != null ? path : hostOf(it.u) || 'Link', external: true, dot });
        case 'task': return row({ href: deepLink(pk, it), iconHtml: solid('pencil', '#ff9500'), title: it.t, sub: path != null ? path : 'Opdracht · indienen in Blackboard', external: true, dot });
        case 'talk': return row({ href: deepLink(pk, it), iconHtml: solid('bubble', '#30b955'), title: it.t, sub: path != null ? path : 'Discussie · in Blackboard', external: true, dot });
        default: return row({ href: deepLink(pk, it), iconHtml: solid('globe', '#8e8e93'), title: it.t, sub: path != null ? path : 'Opent in Blackboard', external: true, dot });
      }
    }
    const errorBox = () => `<div class="banner">${ico('warn')}<span class="main">Dit kon niet geladen worden. Controleer je verbinding.</span><button type="button" data-act="retry">Opnieuw</button></div>`;
    const section = () => { const el = document.createElement('section'); el.className = 'view'; return el; };

    /* ---------------- course ---------------- */
    const SEGS = [{ id: 'inhoud', label: 'Inhoud' }, { id: 'aankondigingen', label: 'Aankondigingen' }, { id: 'cijfers', label: 'Cijfers' }];
    const STATUS = { NeedsGrading: 'Ingeleverd · wacht op beoordeling', InProgress: 'Bezig', Graded: 'Beoordeeld' };
    function courseView(r) {
      const pk = r.pk;
      const el = section();
      const st = { tab: r.tab, ann: r.ann || '', q: '', root: null, anns: null, grades: null, idx: null, crawled: false, moreNew: false, at: 0, single: null };
      const head = () => {
        const m = meta(pk);
        const name = m.name || 'Vak';
        const next = getCtx(pk).n;
        return `<div class="lt" style="${colorVars(m.color)}">${m.code ? `<span class="lt-kicker">${esc(m.code)}</span>` : ''}<h1 class="${name.length > 26 ? 'long' : ''}">${esc(name)}</h1>${next ? `<p class="lt-sub lt-next">${ico('clock')}${esc(next)}</p>` : ''}</div>`;
      };
      el.innerHTML = `<div data-k="head">${head()}</div>${segHtml(SEGS, st.tab, 'seg')}
        <div data-p="inhoud"${st.tab !== 'inhoud' ? ' hidden' : ''}><label class="search">${ico('search')}<input type="search" placeholder="Zoek in dit vak" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" aria-label="Zoek in dit vak"><button type="button" class="clr" data-act="clr" hidden aria-label="Wis">✕</button></label><div data-k="res"></div><div data-k="top"></div><div data-k="root">${skGroup(6)}</div></div>
        <div data-p="aankondigingen"${st.tab !== 'aankondigingen' ? ' hidden' : ''}>${skGroup(3)}</div>
        <div data-p="cijfers"${st.tab !== 'cijfers' ? ' hidden' : ''}>${skGroup(4)}</div>`;
      const P = (id) => $(`[data-p="${id}"]`, el);
      const pathLabel = (x) => [x.path.join(' › ') || 'Hoofdmap', x.it.m ? shortWhen(x.it.m) : ''].filter(Boolean).join(' · ');

      function buildIndex() {
        const out = [];
        const walk = (items, path, depth) => items.forEach((it) => {
          out.push({ it, path });
          if (it.k === 'folder' && depth < 7) { const c = cachedKids(pk, it.id); if (c) walk(c.v, path.concat(it.t), depth + 1); }
        });
        walk(st.root || [], [], 0);
        return out;
      }
      function drawRoot() {
        const box = $('[data-k="root"]', el);
        if (!st.root) return;
        if (!st.root.length) { put(box, empty('folder', 'Nog geen inhoud', 'Je docent heeft nog niets gepubliceerd.')); return; }
        // a course that is one big folder: show what's inside right away
        const only = st.root.length === 1 && st.root[0].k === 'folder' ? st.root[0] : null;
        const inner = only && cachedKids(pk, only.id);
        if (only && inner) { put(box, `<div class="gh">${esc(only.t)}</div><div class="group">${inner.v.map((it) => itemRow(it, pk)).join('')}</div>`); return; }
        if (only && !st.single) { st.single = fetchChildren(pk, only.id).then(drawRoot, () => {}); }
        put(box, `<div class="group">${st.root.map((it) => itemRow(it, pk)).join('')}</div>`);
      }
      function drawTop() {
        const box = $('[data-k="top"]', el);
        const now = Date.now();
        let h = '';
        const a = st.anns && st.anns[0];
        if (a && now - a.date < 14 * 864e5) {
          h += `<button type="button" class="teaser" data-act="openann" data-id="${esc(a.id)}" style="${colorVars(meta(pk).color)}"><span class="ic">${ico('megaphone')}</span><span class="main"><span class="t">${esc(a.t)}</span><span class="s clamp2">${esc(relDay(a.date, now))} · ${esc(textOf(a.html).slice(0, 200))}</span></span>${CHEV}</button>`;
        }
        const fresh = (st.idx || []).filter((x) => x.it.k !== 'folder' && isNew(x.it)).sort((p, q) => q.it.m - p.it.m);
        if (fresh.length) {
          const lim = st.moreNew ? 20 : 4;
          h += `<div class="sh"><h2>Nieuw</h2></div><div class="group">${fresh.slice(0, lim).map((x) => itemRow(x.it, pk, { path: pathLabel(x), flat: true })).join('')}${fresh.length > lim ? `<button type="button" class="more-row" data-act="morenew">Toon nog ${fresh.length - lim}</button>` : ''}</div><div class="sh"><h2>Alle inhoud</h2></div>`;
        } else if (h) h += '<div style="height:16px"></div>';
        put(box, h);
      }
      function drawSearch() {
        const res = $('[data-k="res"]', el);
        const q = fold(st.q.trim());
        $('[data-k="top"]', el).hidden = $('[data-k="root"]', el).hidden = !!q;
        if (!q) { put(res, ''); return; }
        const idx = st.idx || (st.root || []).map((it) => ({ it, path: [] }));
        const hits = [];
        idx.forEach((x) => {
          if (fold(x.it.t).includes(q) || (x.it.d && fold(x.it.d).includes(q))) hits.push({ x });
          else if (x.it.files) x.it.files.forEach((f) => { if (fold(f.n).includes(q)) hits.push({ x, f }); });
          else if (x.it.f && fold(x.it.f.n).includes(q)) hits.push({ x });
        });
        if (!hits.length) { put(res, empty('search', 'Niets gevonden', st.crawled ? `Niets in dit vak past bij "${st.q.trim()}".` : 'Nog niet alle mappen zijn doorzocht. Probeer zo opnieuw.')); return; }
        put(res, `<div class="gh">${hits.length} resulta${hits.length === 1 ? 'at' : 'ten'}</div><div class="group">${hits.slice(0, 80).map(({ x, f }) => (f ? fileRow(f, { sub: `${pathLabel(x)} › ${x.it.t}` }) : itemRow(x.it, pk, { path: pathLabel(x), flat: true }))).join('')}</div>`);
      }
      async function crawl() {
        const queue = [];
        const seen = new Set();
        (st.root || []).forEach((it) => { if (it.k === 'folder') queue.push([it, 1]); });
        let n = 0, dirty = 0;
        const work = async () => {
          while (queue.length && n < 90) {
            const [f, depth] = queue.shift();
            if (seen.has(f.id)) continue;
            seen.add(f.id);
            n++;
            const c = cachedKids(pk, f.id);
            let kids = c && Date.now() - c.ts < 15 * 60e3 ? c.v : null;
            if (!kids) { try { kids = await fetchChildren(pk, f.id); dirty++; } catch (e) { if (e.auth) return; kids = c ? c.v : []; } }
            kids.forEach((k) => { if (k.k === 'folder' && depth < 6) queue.push([k, depth + 1]); });
          }
        };
        await Promise.all([work(), work(), work(), work()]);
        st.idx = buildIndex();
        st.crawled = true;
        drawTop();
        drawRoot();
        if (st.q) drawSearch();
      }
      function drawAnn() {
        const box = P('aankondigingen');
        if (!st.anns) return;
        if (!st.anns.length) { put(box, empty('megaphone', 'Geen aankondigingen', 'Aankondigingen van je docent verschijnen hier.')); return; }
        const fresh = (a, i) => i === 0 && !st.ann && Date.now() - a.date < 14 * 864e5;
        put(box, st.anns.map((a, i) => `<article class="ann${a.id === st.ann ? ' open hl' : fresh(a, i) ? ' open' : ''}" data-id="${esc(a.id)}"><div class="ann-top">${esc(relDay(a.date))} · ${hhmm(a.date)}</div><h3>${esc(a.t)}</h3><div class="body rt">${a.html}</div><button type="button" class="more" data-act="annmore">${a.id === st.ann || fresh(a, i) ? 'Minder' : 'Meer'}</button></article>`).join(''));
        measureAnn();
      }
      function measureAnn() {
        if (st.tab !== 'aankondigingen') return;
        requestAnimationFrame(() => {
          $$('.ann', P('aankondigingen')).forEach((n) => { const b = $('.body', n); n.classList.toggle('clamped', !n.classList.contains('open') && b.scrollHeight > b.clientHeight + 6); });
          if (st.ann) { const n = $(`.ann[data-id="${st.ann}"]`, el); if (n) { const y = n.getBoundingClientRect().top + W.scrollY - 60; W.scrollTo(0, Math.max(0, y)); } st.ann = ''; }
        });
      }
      function drawGrades() {
        const box = P('cijfers');
        if (!st.grades) return;
        if (!st.grades.length) { put(box, empty('chart', 'Geen cijfers', 'Er zijn nog geen beoordelingen voor dit vak.')); return; }
        const rowG = (g) => row({ href: g.cid ? deepLink(pk, { id: g.cid }) : undefined, title: g.t,
          sub: g.g ? '' : STATUS[g.st] || (g.due ? `Deadline ${dShort(g.due)} ${hhmm(g.due)}` : 'Nog geen cijfer'),
          end: g.g ? `<b style="color:var(--text);font-size:17px;font-weight:600">${esc(g.g)}</b>` : '<span>—</span>', chevron: false, cls: '' });
        const done = st.grades.filter((g) => g.g), open = st.grades.filter((g) => !g.g);
        let h = '';
        if (done.length) h += `<div class="gh">Beoordeeld</div><div class="group plain">${done.map(rowG).join('')}</div>`;
        if (open.length) h += `<div class="gh">Nog geen cijfer</div><div class="group plain">${open.map(rowG).join('')}</div>`;
        put(box, h + `<p class="fresh"><a href="${ULTRA}/ultra/courses/${pk}/grades">Bekijk details in Blackboard</a></p>`);
      }

      const fail = (where) => (e) => { if (e && e.auth) return relogin(); if (where === 'root' && !st.root) put($('[data-k="root"]', el), errorBox()); };
      function loadRoot() {
        const c = cachedKids(pk, 'ROOT');
        if (c && !st.root) { st.root = c.v; st.idx = buildIndex(); drawRoot(); drawTop(); }
        return fetchChildren(pk, 'ROOT').then((v) => { st.root = v; st.idx = buildIndex(); drawRoot(); drawTop(); setTimeout(crawl, 250); }, fail('root'));
      }
      function loadAnn() {
        const c = store.get('a:' + pk);
        if (c && !st.anns) { st.anns = c.v; drawAnn(); drawTop(); }
        return fetchAnn(pk).then((v) => { st.anns = v; drawAnn(); drawTop(); }, fail('ann'));
      }
      function loadGrades() {
        const c = store.get('g:' + pk);
        if (c && !st.grades) { st.grades = c.v; drawGrades(); }
        if (st.gAt && Date.now() - st.gAt < 120e3) return;
        st.gAt = Date.now();
        fetchGrades(pk).then((v) => { st.grades = v; drawGrades(); }, (e) => { if (e && e.auth) return relogin(); if (!st.grades) put(P('cijfers'), errorBox()); });
      }
      function loadMeta() {
        uget(`/learn/api/public/v3/courses/${pk}?fields=id,name,courseId`).then((c) => {
          saveMeta(pk, { name: c.name, lu: c.courseId });
          put($('[data-k="head"]', el), head());
          if (U.cur === view) { setNav(navFor(view)); watchTitle(el); }
        }).catch(() => {});
      }
      function setTab(t, fromRoute) {
        st.tab = t;
        segSet(el, t);
        $$('[data-p]', el).forEach((p) => { p.hidden = p.dataset.p !== t; });
        if (!fromRoute) history.replaceState(Object.assign({}, history.state), '', `#/c/${pk}${t === 'inhoud' ? '' : '/' + t}`);
        const seg = $('.seg', el);
        const top = seg.getBoundingClientRect().top + W.scrollY - ($('#tm-nav').offsetHeight + 8);
        if (W.scrollY > top) W.scrollTo(0, top);
        if (t === 'aankondigingen') { if (st.anns) drawAnn(); loadAnn(); }
        if (t === 'cijfers') loadGrades();
      }

      const inp = $('input', el), clr = $('.clr', el);
      inp.addEventListener('input', () => { st.q = inp.value; clr.hidden = !inp.value; drawSearch(); });
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') inp.blur(); });

      const view = {
        el,
        title: () => meta(pk).name || 'Vak',
        right: () => `<button type="button" class="nb" data-act="menu" aria-label="Meer opties">${ico('more')}</button>`,
        route(r2) { if (r2.ann) st.ann = r2.ann; if (r2.tab && r2.tab !== st.tab) setTab(r2.tab, true); else if (r2.ann) drawAnn(); },
        show() {
          if (Date.now() - st.at < 90e3) return;
          st.at = Date.now();
          loadRoot();
          loadAnn();
          if (st.tab === 'cijfers') loadGrades(); else setTimeout(() => { if (!st.grades) loadGrades(); }, 2500);
        },
        refresh() {
          st.at = Date.now(); st.gAt = 0;
          ['ROOT'].concat((st.root || []).filter((it) => it.k === 'folder').map((it) => it.id)).forEach((id) => kidsMem.delete(`c:${pk}:${id}`));
          return Promise.allSettled([loadRoot(), loadAnn(), st.tab === 'cijfers' ? fetchGrades(pk).then((v) => { st.grades = v; drawGrades(); }) : null]);
        },
        act(n, b) {
          if (n === 'seg') { setTab(b.dataset.id); return true; }
          if (n === 'clr') { inp.value = ''; st.q = ''; clr.hidden = true; drawSearch(); inp.focus(); return true; }
          if (n === 'morenew') { st.moreNew = true; drawTop(); return true; }
          if (n === 'openann') { st.ann = b.dataset.id; setTab('aankondigingen'); return true; }
          if (n === 'annmore') { toggleAnn(b.closest('.ann')); return true; }
          return false;
        },
      };
      loadMeta();
      return view;
    }
    function toggleAnn(n) {
      if (!n) return;
      if (!n.classList.contains('clamped') && !n.classList.contains('open')) return;
      const open = !n.classList.contains('open');
      n.classList.toggle('open', open);
      n.classList.toggle('clamped', !open);
      n.classList.remove('hl');
      const b = $('.more', n);
      if (b) b.textContent = open ? 'Minder' : 'Meer';
    }

    /* ---------------- folder ---------------- */
    function folderView(r) {
      const pk = r.pk, id = r.id, el = section();
      const known = U.items[id];
      const st = { items: null, title: U.titles[id] || (known && known.t) || '', desc: (known && known.d) || '', at: Date.now() };
      el.innerHTML = `<div class="lt"><h1 data-k="title"></h1><p class="lt-sub" data-k="sub"></p></div><div data-k="list">${skGroup(5)}</div>`;
      const draw = () => {
        const t = $('[data-k="title"]', el);
        t.textContent = st.title || (known && known.ud ? 'Document' : 'Map');
        t.className = (st.title || '').length > 26 ? 'long' : '';
        if (!st.items) return;
        const n = st.items.length;
        if (st.items.some((it) => it.ub)) {
          // a Document page: show its text right here, with any files or links in between where they belong
          put($('[data-k="sub"]', el), esc(st.desc));
          let h = '', grp = '';
          const flush = () => { if (grp) { h += `<div class="group">${grp}</div>`; grp = ''; } };
          st.items.forEach((it) => {
            if (!it.ub) { grp += itemRow(it, pk); return; }
            if (it.html == null) {
              // not in the list's answer: fetch this part of the page on its own
              if (!it.__f) { it.__f = 1; fetchItem(pk, it.id).then((x) => { it.html = x.html || ''; draw(); }, () => { it.html = ''; draw(); }); }
              flush();
              h += '<div class="doc"><div class="sk" style="height:14px;width:92%"></div><div class="sk" style="height:14px;width:76%;margin-top:11px"></div><div class="sk" style="height:14px;width:84%;margin-top:11px"></div></div>';
              return;
            }
            if (!it.html.trim()) return;
            flush();
            h += `<div class="doc rt">${it.html}</div>`;
          });
          flush();
          put($('[data-k="list"]', el), `<div class="udoc">${h || empty('doc', 'Dit document is leeg', '')}</div>`);
          return;
        }
        put($('[data-k="sub"]', el), esc([st.desc, n ? `${n} item${n === 1 ? '' : 's'}` : ''].filter(Boolean).join(' · ')));
        put($('[data-k="list"]', el), n ? `<div class="group">${st.items.map((it) => itemRow(it, pk)).join('')}</div>` : empty('folder', 'Deze map is leeg', ''));
      };
      const load = () => {
        const c = cachedKids(pk, id);
        if (c && !st.items) { st.items = c.v; draw(); }
        fetchChildren(pk, id).then((v) => {
          st.items = v;
          draw();
          // Document pages in this folder: look inside, so one that only holds a file opens it in one tap
          const todo = v.filter((it) => it.k === 'folder' && it.ud && !cachedKids(pk, it.id)).slice(0, 12);
          if (todo.length) Promise.allSettled(todo.map((it) => fetchChildren(pk, it.id))).then(draw);
        }, (e) => { if (e.auth) return relogin(); if (!st.items) put($('[data-k="list"]', el), errorBox()); });
      };
      const view = {
        el,
        title: () => st.title || 'Map',
        show() { if (Date.now() - st.at > 120e3) { st.at = Date.now(); load(); } },
        refresh() { st.at = Date.now(); return fetchChildren(pk, id).then((v) => { st.items = v; draw(); }, () => {}); },
      };
      if (!st.title) fetchItem(pk, id).then((it) => { st.title = it.t; st.desc = it.d || ''; draw(); if (U.cur === view) setNav(navFor(view)); }).catch(() => {});
      draw();
      load();
      return view;
    }

    /* ---------------- document ---------------- */
    function docView(r) {
      const pk = r.pk, id = r.id, el = section();
      const known = U.items[id];
      const st = { it: null, title: U.titles[id] || (known && known.t) || '' };
      el.innerHTML = `<div class="lt"><h1 data-k="title" class="${st.title.length > 26 ? 'long' : ''}">${esc(st.title || ' ')}</h1></div><div data-k="body"><div class="doc"><div class="sk" style="height:14px;width:92%"></div><div class="sk" style="height:14px;width:76%;margin-top:11px"></div><div class="sk" style="height:14px;width:84%;margin-top:11px"></div><div class="sk" style="height:44px;margin-top:18px;border-radius:12px"></div></div></div>`;
      const draw = () => {
        if (!st.it) return;
        st.title = st.it.t;
        const t = $('[data-k="title"]', el);
        t.textContent = st.title;
        t.className = st.title.length > 26 ? 'long' : '';
        const html = st.it.html || '';
        put($('[data-k="body"]', el), html.trim() ? `<div class="doc rt">${html}</div>` : empty('doc', 'Dit document is leeg', ''));
      };
      const view = { el, title: () => st.title || 'Document' };
      const c = store.get(`i:${pk}:${id}`);
      if (c) { st.it = c.v; draw(); }
      fetchItem(pk, id).then((it) => { st.it = it; draw(); if (U.cur === view) setNav(navFor(view)); }, (e) => { if (e.auth) relogin(); else if (!st.it) put($('[data-k="body"]', el), errorBox()); });
      return view;
    }


    /* ---------------- all grades of this semester's courses (Meer > Cijfers) ---------------- */
    // The portal names the courses (?cs=pk~color~title!...): Blackboard's own grades page lists every course you ever had.
    function gradesView(r) {
      const el = section();
      let list = [];
      const raw = r.q.get('cs');
      if (raw) {
        list = raw.split('!').map((x) => { const [id, k, ...t] = x.split('~'); return /^_\d+_\d+$/.test(id) ? { pk: id, k, t: t.join('~') } : /^ULTRA-[\w.-]+$/.test(id) ? { lu: id, k, t: t.join('~') } : null; }).filter(Boolean).slice(0, 16);
        ss.set('tm4-gcs', JSON.stringify(list));
      } else { try { list = JSON.parse(ss.get('tm4-gcs') || '[]') || []; } catch (_) {} }
      const st = { g: {}, err: {}, open: {} };
      el.innerHTML = '<div class="lt"><h1>Cijfers</h1><p class="lt-sub">Je vakken van dit semester</p></div><div data-k="body"></div>';
      const num = (g) => { const m = /^(-?\d+(?:[.,]\d+)?)\/(\d+(?:[.,]\d+)?)$/.exec(g || ''); return m ? parseFloat(m[1].replace(',', '.')) / parseFloat(m[2].replace(',', '.')) : null; };
      function draw() {
        if (!list.length) { put($('[data-k="body"]', el), empty('chart', 'Geen vakken', 'Open Cijfers via Meer in de app.')); return; }
        let h = '';
        list.forEach((c) => {
          const name = c.t || (c.pk && meta(c.pk).name) || 'Vak';
          if (!c.pk) { h += `<div class="gh gc" style="${colorVars(c.k)}"><i></i>${esc(name)}</div>` + skGroup(1); return; }
          const g = st.g[c.pk];
          const head = `<a class="gh gc" data-nav="1" href="#/c/${c.pk}/cijfers?t=${encodeURIComponent(name)}&k=${encodeURIComponent(c.k || '')}&f=meer" style="${colorVars(c.k)}"><i></i>${esc(name)}${CHEV}</a>`;
          if (!g) { h += head + (st.err[c.pk] ? `<div class="group plain">${row({ title: 'Kon niet geladen worden', sub: 'Trek omlaag om opnieuw te proberen', chevron: false })}</div>` : skGroup(1)); return; }
          const done = g.filter((x) => x.g);
          const wait = g.filter((x) => !x.g && x.st === 'NeedsGrading');
          const open = g.filter((x) => !x.g && x.st !== 'NeedsGrading' && x.due && x.due > Date.now());
          if (!done.length && !open.length && !wait.length) { h += head + `<div class="group plain">${row({ title: 'Nog geen cijfers', cls: 'muted', chevron: false })}</div>`; return; }
          const rowG = (x) => {
            const p = num(x.g);
            const tone = p == null ? '' : p >= 0.5 ? 'var(--green)' : 'var(--red)';
            return row({ href: x.cid ? deepLink(c.pk, { id: x.cid }) : undefined, title: x.t,
              sub: x.g ? '' : STATUS[x.st] || (x.due ? `Deadline ${dShort(x.due)} ${hhmm(x.due)}` : 'Nog geen cijfer'),
              end: x.g ? `<b style="color:${tone || 'var(--text)'};font-size:17px;font-weight:600">${esc(x.g)}</b>` : '<span>—</span>', chevron: false });
          };
          const showWait = st.open[c.pk] || (!done.length && wait.length <= 2);
          const waitRow = wait.length && !showWait ? row({ act: 'gwait', attrs: ` data-pk="${c.pk}"`, icon: 'clock', soft: true, title: `${wait.length} ingeleverd`, sub: 'Wacht op een cijfer', end: '<span class="cap">Toon</span>', chevron: false }) : '';
          h += head + `<div class="group plain">${done.map(rowG).join('')}${showWait ? wait.map(rowG).join('') : waitRow}${open.map(rowG).join('')}</div>`;
        });
        put($('[data-k="body"]', el), h + `<p class="fresh"><a href="${ULTRA}/ultra/grades">Alle vakken in Blackboard</a></p>`);
      }
      // courses the portal only knew by name (ULTRA-...): ask Blackboard for their id once
      const resolve = (c) => {
        if (c.pk) return Promise.resolve();
        const known = store.get('lu:' + c.lu);
        if (known && known.v) { c.pk = known.v; return Promise.resolve(); }
        return uget(`/learn/api/public/v3/courses/courseId:${encodeURIComponent(c.lu)}?fields=id,name`).then((x) => { store.set('lu:' + c.lu, { ts: Date.now(), v: x.id }); saveMeta(x.id, { name: x.name, lu: c.lu }); c.pk = x.id; }, (e) => { if (e && e.auth) throw e; c.gone = 1; });
      };
      async function load() {
        list.forEach((c) => { if (!c.pk && c.lu) { const k = store.get('lu:' + c.lu); if (k && k.v) c.pk = k.v; } });
        list.forEach((c) => { const x = c.pk && store.get('g:' + c.pk); if (x && !st.g[c.pk]) st.g[c.pk] = x.v; });
        draw();
        try {
          await Promise.all(list.map(resolve));
          const seen = new Set();
          list = list.filter((c) => c.pk && !seen.has(c.pk) && seen.add(c.pk));
          ss.set('tm4-gcs', JSON.stringify(list));
          draw();
          for (let i = 0; i < list.length; i += 3) {
            await Promise.all(list.slice(i, i + 3).map((d) => fetchGrades(d.pk).then((v) => { st.g[d.pk] = v; delete st.err[d.pk]; }, (e) => { if (e && e.auth) throw e; st.err[d.pk] = 1; })));
            draw();
          }
        } catch (e) { if (e && e.auth) relogin(); }
      }
      let at = 0;
      const view = { el, title: () => 'Cijfers', act(n, b) { if (n !== 'gwait') return false; st.open[b.dataset.pk] = 1; draw(); return true; }, show() { if (Date.now() - at > 120e3) { at = Date.now(); load(); } }, refresh: () => { at = Date.now(); return load(); } };
      return view;
    }

    /* ---------------- deep link from Updates: open the thing itself ---------------- */
    function directTarget(pk, it) {
      if (it.k === 'file') return (it.f && it.f.u) || '';
      if (it.k === 'doc' && !it.x && it.files && it.files.length === 1) return it.files[0].u;
      if (it.k === 'lti') return ltiUrl(pk, it.id);
      if (it.k === 'link') return it.u || '';
      if (it.k === 'task' || it.k === 'talk' || it.k === 'other') return deepLink(pk, it);
      return '';
    }
    function itemView(r) {
      const pk = r.pk, id = r.id, el = section();
      el.innerHTML = '<div class="center"><div class="spin"></div><span>Openen…</span></div>';
      const view = { el, title: () => '' };
      fetchItem(pk, id).then((it) => {
        const target = directTarget(pk, it);
        if (target) { goTo(target, { replace: true }); return; }
        if (it.ub && it.p) { replaceRoute(`#/c/${pk}/f/${it.p}`); return; }
        replaceRoute(it.k === 'folder' ? `#/c/${pk}/f/${id}` : it.k === 'doc' ? `#/c/${pk}/d/${id}` : `#/c/${pk}`);
      }, (e) => {
        if (e && e.auth) return relogin();
        el.innerHTML = `<div class="center">${ico('warn')}<b>Dit item kon niet geopend worden</b><a class="btn" href="${esc(deepLink(pk, { id }))}">Open in Blackboard</a></div>`;
      });
      return view;
    }
    function replaceRoute(hash) {
      const v = U.views.get(U.curKey);
      if (v) { v.el.remove(); U.views.delete(U.curKey); }
      history.replaceState(Object.assign({}, history.state, { tm: 1, d: U.depth }), '', hash);
      render('none');
    }

    /* ---------------- navigation ---------------- */
    function resolveLu(r) {
      const lu = r.lu;
      const finish = (pk) => {
        $('#tm-resolving')?.remove();
        const q = r.q;
        if (!q.get('lu')) q.set('lu', lu);
        history.replaceState({ tm: 1, d: U.depth }, '', `#/c/${pk}${r.rest ? '/' + r.rest : ''}?${q}`);
        render('none');
      };
      const known = store.get('lu:' + lu);
      if (known && known.v) { finish(known.v); return; }
      const box = document.createElement('div');
      box.id = 'tm-resolving';
      box.className = 'center';
      box.innerHTML = `<div class="spin"></div><span>${esc(r.q.get('t') || 'Vak openen')}…</span>`;
      $('#tm-main').appendChild(box);
      setNav({ back: { label: TAB_LABEL[r.q.get('f')] || 'Vakken', act: 'back', href: PORTAL + '?tm=vakken' } });
      uget(`/learn/api/public/v3/courses/courseId:${encodeURIComponent(lu)}?fields=id,name,courseId`).then((c) => {
        store.set('lu:' + lu, { ts: Date.now(), v: c.id });
        saveMeta(c.id, { name: c.name, lu });
        finish(c.id);
      }, () => { if (!TEST) goTo(JOURNEY + encodeURIComponent(lu), { replace: true }); });
    }
    const keyOf = (r) => (r.type === 'course' ? '/c/' + r.pk : r.path);
    function navFor(v) {
      const r = parse();
      const st = history.state || {};
      const f = tabOf(r);
      const back = U.depth > 0 ? { label: st.back || 'Terug', act: 'back', href: '#' } : { label: TAB_LABEL[f] || 'Vakken', act: 'back', href: PORTAL + '?tm=' + f };
      return { back, title: v.title(), right: v.right ? v.right() : '' };
    }
    function saveScroll() { if (U.curKey) U.scroll[U.curKey] = W.scrollY; }
    function render(anim) {
      const r = parse();
      if (r.type === 'resolve') { resolveLu(r); return; }
      if (r.type === 'none') {
        if (PATH_PK) { history.replaceState(history.state, '', location.pathname + '#/c/' + PATH_PK); render(anim); return; }
        goTo(PORTAL + '?tm=vakken', { replace: true, dir: 'back' });
        return;
      }
      if (r.pk && [...r.q.keys()].length) saveCtx(r.pk, r.q);
      if (r.q.get('dl') != null) store.set('dlpks', { ts: Date.now(), v: String(r.q.get('dl')).split('.').filter((x) => /^_\d+_\d+$/.test(x)).slice(0, 10) });
      const key = keyOf(r);
      let v = U.views.get(key);
      if (!v) {
        v = r.type === 'grades' ? gradesView(r) : r.type === 'course' ? courseView(r) : r.type === 'folder' ? folderView(r) : r.type === 'doc' ? docView(r) : itemView(r);
        U.views.set(key, v);
        $('#tm-main').appendChild(v.el);
      } else if (v.route) v.route(r);
      U.views.forEach((x) => { if (x !== v) x.el.classList.remove('on', 'push', 'pop'); });
      v.el.classList.remove('push', 'pop');
      v.el.classList.add('on');
      if (anim === 'push' || anim === 'pop') { void v.el.offsetWidth; v.el.classList.add(anim); }
      U.cur = v;
      U.curKey = key;
      setNav(navFor(v));
      setTabOn(tabOf(r));
      const y = anim === 'push' ? 0 : U.scroll[key] || 0;
      W.scrollTo(0, y);
      if (y) requestAnimationFrame(() => W.scrollTo(0, y));
      watchTitle(v.el);
      if (v.show) v.show();
      if (U.views.size > 12) for (const [k, x] of U.views) { if (x !== v && U.views.size > 12) { x.el.remove(); U.views.delete(k); } }
    }
    function go(hash) {
      saveScroll();
      const back = U.cur ? U.cur.title() : '';
      U.depth += 1;
      history.pushState({ tm: 1, d: U.depth, back }, '', hash);
      render('push');
    }
    /* Which upcoming deadlines did you already hand in? The portal can't ask Blackboard itself (another site), so the
       course page checks the courses the portal named (?dl=) and tells it on the way back (?done=). */
    const doneMap = () => (store.get('done') || {}).v || {};
    function scanDone() {
      const dl = store.get('dlpks');
      const pks = Array.from(new Set(((dl && Date.now() - dl.ts < 7 * 864e5 && dl.v) || []).concat(PATH_PK ? [PATH_PK] : [])));
      const st = store.get('done') || { ts: 0, v: {} };
      if (!pks.length || Date.now() - st.ts < 10 * 60e3) return;
      st.ts = Date.now();
      store.set('done', st);
      pks.reduce((chain, pk) => chain.then(() => fetchGrades(pk).then((g) => {
        const cur = store.get('done') || { ts: Date.now(), v: {} };
        cur.v[pk] = g.filter((x) => x.cid && (x.g || x.st === 'NeedsGrading' || x.st === 'Graded')).map((x) => x.cid);
        store.set('done', cur);
      }, () => {})), Promise.resolve());
    }
    const doneParam = () => {
      const m = doneMap();
      const s2 = Object.keys(m).slice(0, 12).map((pk) => [pk].concat(m[pk].slice(0, 40)).join('~')).join('!');
      return s2 ? '&done=' + encodeURIComponent(s2) : '';
    };
    function leave(tab) {
      const f = tabOf(parse());
      saveScroll();
      setTabOn(tab);
      // the portal already knows this list: just go back (fast, the page is kept); otherwise load it with the news
      const done = doneParam();
      const rn = rnParam();
      const known = !rn && (!done || store.get('doneSent') === done);
      const url = PORTAL + '?tm=' + tab + (okAt ? '&ub=' + Math.floor(okAt / 1e3) : '') + done + rn;
      if (fromPortal && f === tab && history.length > U.depth + 1 && known) {
        // Safari's history doesn't always lead back to the app (an entry it dropped, a page in between): when
        // nothing happened after a moment, load the app's tab instead of staying dimmed and loading forever
        if (!TEST) leaving('back');
        let gone = false;
        const g = () => { gone = true; };
        W.addEventListener('pagehide', g, { once: true });
        history.go(-(U.depth + 1));
        setTimeout(() => { W.removeEventListener('pagehide', g); if (!gone && document.visibilityState === 'visible') goTo(url, { dir: 'back' }); }, 2500);
        return;
      }
      if (done) store.set('doneSent', done);
      if (rn) store.set('rnSent', rn.slice(-7));
      goTo(url, { dir: 'back' });
    }
    W.addEventListener('popstate', (e) => {
      saveScroll();
      U.depth = (e.state && e.state.d) || 0;
      render(U.animBack ? 'pop' : 'none');
      U.animBack = false;
    });
    W.addEventListener('pagehide', () => { saveScroll(); ss.set('tm4-uscroll', JSON.stringify(U.scroll)); });

    // Signed out of Blackboard: load the course page once without the app, so Blackboard can sign you in its
    // own way; it then lands back on the course and the app takes over again (see the classic layer).
    let relogging = false;
    function relogin() {
      if (relogging) return;
      relogging = true;
      const r = parse();
      const pk = r.pk || PATH_PK;
      ss.set('tm4-resume', r.type === 'grades' ? location.hash : location.hash.split('?')[0]);
      const last = Number(ss.get('tm4-relogin')) || 0;
      const target = `${ULTRA}/ultra/courses/${pk}/outline`;
      if (!TEST && pk && Date.now() - last > 60e3) {
        ss.set('tm4-relogin', String(Date.now()));
        ss.set('tm4-noapp', String(Date.now()));
        location.replace(target);
        return;
      }
      const box = document.createElement('div');
      box.className = 'center';
      box.innerHTML = `${ico('lock')}<b>Je bent afgemeld bij Blackboard</b><span>Log opnieuw in om verder te gaan.</span><button type="button" class="btn" id="tm4-relog">Inloggen</button>`;
      $('#tm-main').replaceChildren(box);
      U.views.clear();
      $('#tm4-relog').addEventListener('click', () => { ss.set('tm4-noapp', String(Date.now())); location.replace(target); });
    }

    const ACTS = {
      back: () => { if (U.depth > 0) { U.animBack = true; history.back(); } else leave(tabOf(parse())); },
      menu: () => {
        const pk = parse().pk;
        sheet({ title: meta(pk).name || 'Vak', actions: [
          { label: 'Openen in Blackboard', run: () => { ss.set('tm4-classic-ultra', String(Date.now())); goTo(`${ULTRA}/ultra/courses/${pk}/outline?tm=classic`); } },
          { label: 'Vernieuwen', run: () => { try { Object.keys(localStorage).filter((k) => k.startsWith(`${NS}c:${pk}:`) || k === `${NS}a:${pk}` || k === `${NS}g:${pk}` || k.startsWith(`${NS}i:${pk}:`)).forEach((k) => localStorage.removeItem(k)); } catch (_) {} location.reload(); } },
        ] });
      },
      att: async (b) => {
        const pk = parse().pk, id = b.dataset.id;
        const end = $('.end', b);
        if (end) end.innerHTML = '<span class="spin"></span>';
        try {
          const j = await uget(`/learn/api/public/v1/courses/${pk}/contents/${id}/attachments`);
          const a = (j.results || [])[0];
          if (a) { goTo(`${ULTRA}/learn/api/public/v1/courses/${pk}/contents/${id}/attachments/${a.id}/download`); return; }
        } catch (e) { if (e.auth) { relogin(); return; } }
        goTo(deepLink(pk, { id }));
      },
      retry: () => location.reload(),
    };
    W.addEventListener('click', (e) => {
      if (!e.target || !e.target.closest) return;
      const tab = e.target.closest('#tm-tabs a');
      if (tab) { e.preventDefault(); leave(tab.dataset.tab); return; }
      const act = e.target.closest('[data-act]');
      if (act) {
        const n = act.dataset.act;
        if (U.cur && U.cur.act && U.cur.act(n, act, e)) { e.preventDefault(); return; }
        if (ACTS[n]) { e.preventDefault(); ACTS[n](act, e); return; }
      }
      const nv = e.target.closest('a[data-nav]');
      if (nv) {
        e.preventDefault();
        const href = nv.getAttribute('href');
        const id = (/\/(?:f|d)\/(_\d+_\d+)/.exec(href) || [])[1];
        if (id && nv.dataset.title) U.titles[id] = nv.dataset.title;
        go(href);
        return;
      }
      const ann = e.target.closest('.ann');
      if (ann && !e.target.closest('a')) { toggleAnn(ann); return; }
      if (e.target.closest('a[href]')) saveScroll();
    }, true);

    if (!history.state || !history.state.tm) history.replaceState({ tm: 1, d: 0 }, '', location.hash);
    render('none');
    setTimeout(() => { scanDone(); getMe().catch(() => {}); }, 2500);
    pullRefresh(() => (U.cur && U.cur.refresh ? U.cur.refresh() : null));
    keepAlive('ultra', [[ULTRA + '/learn/api/public/v1/users/me?fields=id']], 5 * 60e3);
    const wake = () => { if (document.visibilityState === 'visible' && U.cur && U.cur.show) U.cur.show(); };
    document.addEventListener('visibilitychange', wake);
    W.addEventListener('pageshow', (e) => { if (e.persisted) wake(); });
  }
  /* ================================================================== KU Loket: timetable + exams */
  async function loketData() {
    const sapDay = (v) => { const m = /\/Date\((-?\d+)/.exec(String(v || '')); if (!m) return ''; const u = new Date(Number(m[1])); return `${u.getUTCFullYear()}-${pad(u.getUTCMonth() + 1)}-${pad(u.getUTCDate())}`; };
    const hm = (v) => { const m = /PT(\d+)H(\d+)M/.exec(String(v || '')); return m ? `${pad(m[1])}:${pad(m[2])}` : ''; };
    const res = (v) => (Array.isArray(v) ? v : v && Array.isArray(v.results) ? v.results : []);
    const https = (u) => { const s = String(u || '').trim().replace(/^http:\/\//i, 'https://'); return /^https:\/\/[^\s"'<>]+$/.test(s) ? s : ''; };
    const get = (p) => api(LOKET_ORIGIN + p);
    const from = addDays(mondayOf(Date.now()), -7);
    const to = addDays(from, 7 * 20);
    const filter = `(date ge datetime'${ymd(from)}T00:00:00' and date le datetime'${ymd(to)}T00:00:00')`;
    const [ev, ex] = await Promise.allSettled([
      get(`/sap/opu/odata/sap/ZC_EP_SCHEDULE_SRV/Events?sap-client=200&$format=json&$skip=0&$top=3000&$filter=${encodeURIComponent(filter)}&$expand=EventTeacherSet,EventLocationSet`),
      get('/sap/opu/odata/sap/ZC_IER_SRV/EvaluationSet?sap-client=200&$format=json&$expand=toLocation,toStaff'),
    ]);
    if (ev.status === 'rejected' && ex.status === 'rejected') {
      const x = ev.reason, y = ex.reason;
      const detail = `lessen: ${why(x)} · examens: ${why(y)}`;
      const e = (x && x.auth) ? x : (y && y.auth) ? y : new Error('KU Loket');
      e.detail = detail;
      e.http = !!(x && x.status && y && y.status); // KU Loket itself answered with an error
      throw e;
    }
    const lessons = ev.status === 'fulfilled' ? res(ev.value && ev.value.d).map((e) => {
      const loc = res(e.EventLocationSet)[0] || {};
      return {
        d: sapDay(e.date), s: hm(e.start_time), e: hm(e.end_time), t: String(e.ola_description || e.workFormDesc || '').trim(), c: String(e.ects_code || '').trim(),
        f: String(e.workFormDesc || '').trim(), g: String(e.groupinfo_general || '').trim(),
        r: [[loc.mnemonic, loc.roomNumber].filter(Boolean).join(' '), loc.roomName].filter(Boolean).join(' · '), u: https(loc.url_location) || (/^\d{6,10}$/.test(String(loc.locationId || loc.location_id || '')) ? `https://www.kuleuven.be/lokalen/${loc.locationId || loc.location_id}.htm` : ''),
        p: res(e.EventTeacherSet).map((x) => x.name || x.fullName || '').filter(Boolean).join(', '),
      };
    }).filter((x) => x.d && x.s).sort((a, b) => (a.d + a.s).localeCompare(b.d + b.s)) : null;
    const exams = ex.status === 'fulfilled' ? res(ex.value && ex.value.d).map((x) => {
      const loc = res(x.toLocation)[0] || {};
      return {
        d: sapDay(x.examDate), s: hm(x.examBegtime), e: hm(x.examEndtime), t: String(x.moduleTitle || '').trim(), c: String(x.moduleCode || '').trim(),
        r: [[loc.mnemonic, loc.roomNumber].filter(Boolean).join(' '), loc.roomName].filter(Boolean).join(' · '), u: https(loc.urlLocation) || (/^\d{6,10}$/.test(String(loc.locationId || '')) ? `https://www.kuleuven.be/lokalen/${loc.locationId}.htm` : ''), x: String(x.evaluationText || '').trim(),
      };
    }).filter((x) => x.d).sort((a, b) => (a.d + a.s).localeCompare(b.d + b.s)) : null;
    return { lessons, exams, range: [ymd(from), ymd(to)] }; // null = could not be read this time (keep the old copy)
  }

  /* ================================================================== KU Loket: study progress + ISP (read only) */
  const sapGet = (svc, path) => api(`${LOKET_ORIGIN}/sap/opu/odata/sap/${svc}/${path}${path.includes('?') ? '&' : '?'}$format=json&sap-client=200`);
  const odRes = (v) => { const d = v && v.d; return Array.isArray(d) ? d : d && Array.isArray(d.results) ? d.results : d ? [d] : []; };
  const arrOf = (v) => (Array.isArray(v) ? v : v && Array.isArray(v.results) ? v.results : []);
  const numOf = (v) => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return Number.isFinite(n) ? n : null; };
  const sapDate = (v) => { const m = /^(\d{2})[.-](\d{2})[.-](\d{4})$/.exec(String(v || '').trim()) || /^(\d{4})(\d{2})(\d{2})$/.exec(String(v || '').trim()); if (!m) return ''; return m[1].length === 4 ? `${m[1]}-${m[2]}-${m[3]}` : `${m[3]}-${m[2]}-${m[1]}`; };
  // "Studievoortgangsdossier" (zr_1017) and "Mijn resultaten" (zr_1018): every study, its credits and every result
  async function studyData() {
    const HOME = 'ZC_ES_SVD_HOME_SRV', AW = 'ZC_ES_SVD_AW_SRV';
    const list = odRes(await sapGet(HOME, 'StudySet?$top=50')).filter((s) => s.studyId);
    list.sort((a, b) => (b.isActive === true) - (a.isActive === true) || String(b.acjaarLaatsteInschrijving).localeCompare(String(a.acjaarLaatsteInschrijving)));
    const out = await Promise.all(list.slice(0, 4).map(async (s) => {
      const id = s.studyId, acj = s.acjaarDiplomaObtained || '0000';
      const hk = `StudySet(studyId='${id}',acjaarDiplomaObtained='${acj}')`;
      const ak = `StudySet(studyId='${id}',acYearZittijd='9999',peridZittijd='999',studyIdZittijd='${id}',acjaarDiplomaObtained='${acj}',multipleStudyRecords=false)`;
      const [kn, prog, akn, aprog, years] = await Promise.allSettled([
        sapGet(HOME, hk + '/toKeyNumbers'), sapGet(HOME, hk + '/toStudyProgress'), sapGet(AW, ak + '/toKeyNumber'), sapGet(AW, ak + '/toStudyProgress'),
        sapGet(AW, ak + '/toAcyearTotal?$expand=toResultTotal/toRanking'),
      ]);
      const ok = (x) => (x.status === 'fulfilled' ? odRes(x.value) : []);
      const pct = ok(kn).find((k) => /diploma/i.test(k.keyName || ''));
      const total = numOf(String((ok(akn)[0] || {}).posStudyPoints || '').replace(/[^\d.,]/g, ''));
      return {
        id, name: String(s.oplName || '').trim(), inst: String(s.instName || '').trim(), active: !!s.isActive,
        done: s.diplomaObtained === 'DiplomaBehaald', doneYear: acj !== '0000' ? acj : '', pct: pct ? numOf(pct.keyValue) : null, total,
        last: sapDate(s.datumLaatsteVrijgave),
        prog: ok(prog).map((p) => [String(p.status || '').trim(), numOf(p.credits) || 0]),
        now: ok(aprog).map((p) => [String(p.status || '').trim(), numOf(p.credits) || 0]),
        years: ok(years).map((y) => ({
          y: String(y.academicYear || ''),
          c: arrOf(y.toResultTotal).map((r) => {
            const rk = arrOf(r.toRanking).map((k) => [String(k.code || ''), numOf(k.lowGrade), numOf(k.highGrade), numOf(k.numberOfStudents) || 0, numOf(k.percentage) || 0, k.myRanking === 'X' ? 1 : 0]);
            return { code: String(r.moduleCode || '').trim(), t: String(r.moduleDescription || '').trim(), sp: numOf(r.studyPoints) || 0, r: String(r.resultTotal || '').trim(),
              sc: String(r.resultTotalScale || '').trim(), st: String(r.awStatus || '').trim(), d: sapDate(r.releaseDate), n: Number(r.numberOfBookings) || 1, sit: String(r.situeringsCode || '').trim(),
              tol: !!r.tolerance, rk: rk.length ? rk : undefined };
          }),
        })).filter((y) => y.c.length).sort((a, b) => b.y.localeCompare(a.y)),
      };
    }));
    return out;
  }
  // "Jouw individueel studieprogramma" (zr_0442): what you obtained and what you take this year, per part of the programme
  async function ispData() {
    const ISP = 'ZC_ISP_ST_OPO_SRV';
    const reg = odRes(await sapGet(ISP, "RegistrationSet?$filter=page%20eq%20%27boekOpo%27")).sort((a, b) => (a.ispPrio || 9) - (b.ispPrio || 9))[0];
    if (!reg) return null;
    const pid = reg.programmeId, yr = reg.academicYear;
    const [tree, spt] = await Promise.allSettled([
      sapGet(ISP, `IndividualStudyProgrammeSet?$filter=${encodeURIComponent(`programmeId eq '${pid}' and academicYear eq '${yr}'`)}`),
      sapGet(ISP, `RegistrationSet(page='boekOpo',programmeId='${pid}',academicYear='${yr}')/toStudyPointTotal`),
    ]);
    const nodes = tree.status === 'fulfilled' ? odRes(tree.value) : [];
    const groups = nodes.filter((n) => n.otype === 'CG').map((n) => ({ id: String(n.nodeId), p: String(n.parentNodeId || ''), t: String(n.title || '').trim(), l: Number(n.hierarchyLevel) || 0 }));
    const other = {};
    const courses = [];
    nodes.filter((n) => n.otype === 'SM').forEach((n) => {
      const b = String(n.bookingStatus || '');
      const g = String(n.parentNodeId || '');
      if (b === 'credit' || /^booked/.test(b)) {
        if (courses.some((c) => c.code === n.ectsCode && c.st === (b === 'credit' ? 'ok' : 'now'))) return;
        courses.push({ g, code: String(n.ectsCode || '').trim(), t: String(n.title || '').trim(), sp: numOf(n.credits) || 0, per: String(n.offerPeriod || ''),
          ph: [Number(n.startPhase) || 0, Number(n.endPhase) || 0], url: n.ectsURL ? 'https://' + String(n.ectsURL).replace(/^https?:\/\//, '') : '', st: b === 'credit' ? 'ok' : 'now', yr: String(n.academicYear || ''), must: n.opoObligated === 'X' });
      } else if (/bookable/.test(b)) other[g] = (other[g] || 0) + 1;
    });
    const t = (spt.status === 'fulfilled' ? odRes(spt.value)[0] : null) || {};
    const sp = nodes.find((n) => n.otype === 'SP');
    return { name: String(reg.programmeDescription || '').trim(), yr, spec: sp ? String(sp.description || '').trim() : '', deadline: sapDate(reg.deadlineDate),
      sem: [numOf(t.firstPeriod) || 0, numOf(t.secondPeriod) || 0, numOf(t.wholeYear) || 0], groups, courses, other };
  }

  /* what went wrong, in a few words: shown small under an error, so a screenshot says what happened */
  function why(e) {
    if (!e) return 'onbekend';
    if (e.detail) return e.detail;
    if (e.auth) return 'aanmelden nodig';
    if (e.status) return 'HTTP ' + e.status;
    if (e.name === 'SyntaxError') return 'onverwacht antwoord';
    return 'geen verbinding (' + String(e.message || e).slice(0, 40) + ')';
  }
  /* When KU Loket's own session has run out, the page we are on is its sign-in step: a form that sends you to
     the KU Leuven login by itself. Meanwhile the timetable requests fail (Safari cancels them, or they are sent to
     the login), so a failed request says nothing until we know which page this is. The sign-in step must never be stopped. */
  const signInStep = () => !!document.querySelector('input[name="SAMLRequest"],input[name="SAMLResponse"],form[action*="idp.kuleuven.be"]');
  const whenParsed = (fn) => {
    if (document.readyState !== 'loading') setTimeout(fn, 250);
    else document.addEventListener('DOMContentLoaded', () => setTimeout(fn, 250), { once: true });
  };

  // the timetable first; study progress and ISP along with it when the app asks (?x=study). Those never make it fail.
  function withStudy(p) {
    if (params.get('x') !== 'study' && !/(^|&)x=study\b/.test(ss.get('tm4-sync-x') || '')) return p;
    return p.then((data) => Promise.allSettled([studyData(), ispData()]).then(([a, b]) => {
      if (a.status === 'fulfilled') data.study = a.value;
      if (b.status === 'fulfilled') data.isp = b.value;
      return data;
    }));
  }

  /* runs inside the hidden KU Loket frame that the app opens. Read first, stop the page only when that worked. */
  function bridge() {
    let sent = false;
    const post = (m) => {
      if (sent) return;
      sent = true;
      try { W.parent.postMessage(Object.assign({ tm4: 'agenda' }, m), PORTAL_ORIGIN); } catch (_) {}
    };
    // leaving for the KU Leuven login (which can't finish inside a hidden frame): the app opens KU Loket itself
    W.addEventListener('pagehide', () => post({ ok: false, pending: 'login' }));
    let tries = 0;
    const attempt = () => {
      tries++;
      withStudy(loketData()).then((data) => { try { W.stop(); } catch (_) {} post({ ok: true, data }); }, (e) => {
        if (e && e.auth) { post({ ok: false, pending: 'login', why: why(e) }); return; }
        whenParsed(() => {
          if (sent) return;
          if (signInStep()) { post({ ok: false, pending: 'login', why: why(e) }); return; }
          if (tries < 2) { setTimeout(attempt, 1000); return; }
          post({ ok: false, error: why(e) });
        });
      });
    };
    attempt();
  }

  /* top-level: "Bijwerken" opens KU Loket itself (signing in if needed), which reads the timetable and goes
     straight back to the app with the data in the address (#...&tmsync=). */
  function syncBack() {
    let back = String(params.get('back') || '').replace(/[^a-z/]/g, '');
    if (!back) { try { back = (JSON.parse(ss.get('tm4-sync') || '{}').back || '').replace(/[^a-z/]/g, ''); } catch (_) {} }
    return back || 'rooster';
  }
  function syncPage() {
    const back = syncBack();
    if (params.get('x') === 'study') ss.set('tm4-sync-x', 'x=study');
    let prev = {};
    try { prev = JSON.parse(ss.get('tm4-sync') || '{}'); } catch (_) {}
    const reloads = prev.ts && Date.now() - prev.ts < 10 * 60e3 ? prev.reloads || 0 : 0;
    ss.set('tm4-sync', JSON.stringify({ back, ts: Date.now(), reloads }));
    // cover whatever KU Loket shows meanwhile, without touching it (its sign-in step has to keep running)
    const dark = isDark();
    const cover = document.createElement('style');
    cover.textContent = `html{background:${dark ? '#000' : '#f2f2f7'}!important}html::after{content:"${/^(studie|isp)/.test(back) ? 'KU Loket openen' : 'Rooster bijwerken'}\\2026";position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:${dark ? '#000' : '#f2f2f7'};color:${dark ? '#98989f' : '#6d6d72'};font:600 17px -apple-system,system-ui,sans-serif}`;
    (document.head || document.documentElement).appendChild(cover);
    let gone = false;
    W.addEventListener('pagehide', () => { gone = true; });
    W.addEventListener('beforeunload', () => { gone = true; });
    // came back here with the back button (e.g. from the KU Leuven login): return to the app instead of waiting
    W.addEventListener('pageshow', (ev) => { if (ev.persisted) { ss.del('tm4-sync'); location.replace(`${PORTAL}?tm=${back.split('/')[0]}`); } });
    const again = () => location.replace(`${LOKET}?tm=sync&back=${encodeURIComponent(back)}`);
    const fail = (title, text, detail) => {
      ss.del('tm4-sync');
      ss.del('tm4-sync-x');
      takeover('Rooster bijwerken', [PORTAL_ORIGIN]);
      document.body.classList.add('no-tabs');
      document.body.innerHTML = `<div class="sync" data-tm4>${ico('warn')}<b style="color:var(--text);font-size:19px">${esc(title)}</b><span>${esc(text)}</span><button type="button" class="btn" id="tm4-retry">Opnieuw proberen</button><a class="btn ghost" href="${PORTAL}?tm=${back.split('/')[0]}">Terug naar Toledo</a>${detail ? `<small>${esc(detail)}</small>` : ''}</div>`;
      document.getElementById('tm4-retry').addEventListener('click', again);
    };
    let tries = 0;
    const attempt = () => {
      tries++;
      withStudy(loketData()).then((data) => {
        ss.del('tm4-sync');
        ss.del('tm4-sync-x');
        try { W.stop(); } catch (_) {}
        location.replace(`${PORTAL}?tm=${back.split('/')[0]}#${back}&tmsync=${encodeURIComponent(JSON.stringify(data))}`);
      }, (e) => {
        if (gone) return; // on its way to the KU Leuven login: the page after it carries on
        whenParsed(() => {
          if (gone) return;
          if (signInStep()) {
            // KU Loket is signing you in from this very page: let it. If nothing happens, say so.
            setTimeout(() => { if (!gone) fail('Aanmelden bij KU Loket lukte niet', 'Open KU Loket één keer gewoon en probeer het daarna opnieuw.', why(e)); }, 30000);
            return;
          }
          if (tries < 3) { setTimeout(attempt, tries === 1 ? 1200 : 3000); return; }
          if (!(e && e.http) && reloads < 1) {
            // a fresh page from KU Loket: if its session ran out, that page signs you in again
            ss.set('tm4-sync', JSON.stringify({ back, ts: Date.now(), reloads: reloads + 1 }));
            again();
            return;
          }
          if (e && e.auth) fail('Aanmelden bij KU Loket lukte niet', 'Open KU Loket één keer gewoon en probeer het daarna opnieuw.', why(e));
          else fail('Het rooster kon niet geladen worden', 'KU Loket reageert nu niet. Probeer het over een paar minuten opnieuw.', why(e));
        });
      });
    };
    attempt();
  }

  /* portal while signing in: the normal Toledo page does the login, then we switch back to the app */
  function loginWatch() {
    const started = Date.now();
    const tick = () => fetch(PORTAL_ORIGIN + '/portal/api/user', { credentials: 'include', headers: { Accept: 'application/json' } })
      .then((r) => { if (r.ok) { ss.del('tm4-login'); location.reload(); } else again(); }, again);
    const again = () => { if (Date.now() - started > 30 * 60e3) { ss.del('tm4-login'); return; } setTimeout(tick, 2500); };
    setTimeout(tick, 1500);
  }

  /* classic portal (chosen in Meer): a button to come back */
  function classicPill() {
    const add = () => {
      if (!document.body) { setTimeout(add, 150); return; }
      if (document.getElementById('tm4-pill')) return;
      const b = document.createElement('button');
      b.id = 'tm4-pill';
      b.type = 'button';
      b.textContent = '← Terug naar de app';
      b.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:calc(74px + env(safe-area-inset-bottom));z-index:2147483000;padding:11px 18px;border:0;border-radius:22px;background:#0a6cd6;color:#fff;font:600 15px -apple-system,system-ui,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.25)';
      b.addEventListener('click', () => { ss.del('tm4-classic'); history.replaceState(null, '', location.pathname + '#vandaag'); location.reload(); });
      document.body.appendChild(b);
      const st = document.createElement('style');
      st.textContent = '#tm-classic,#tm-on-pill{display:none!important}';
      document.head.appendChild(st);
    };
    add();
  }

  /* Version 4.4 switched KU Leuven's "Remember my device" preference on for you. That sends a notification to the
     Authenticator instead of showing the "Open de app" button, so it is switched off again once (cookie removed).
     After that the box is yours: the script no longer touches it. */
  function forgetDevice() {
    try {
      if (localStorage.getItem('tm4-rd-cleared')) return;
      localStorage.setItem('tm4-rd-cleared', '1');
      localStorage.removeItem('tm4-autopush');
    } catch (_) { return; }
    try { document.cookie = '__Host-rememberDevice=; secure; samesite=none; path=/; max-age=0'; } catch (_) {}
  }

  /* "Log in via KU Leuven Authenticator" normally opens a second step with an "Open KU Leuven Authenticator app" button.
     iOS only lets a web page open another app from a real tap, so the script uses your tap on the first button for it:
     it fetches that second step itself (the same request the button would send), shows it, and in the same moment
     opens the app link from it (icts.kuleuven.be/apps/authenticator/…). You approve in the app and come back to a page
     that finishes the login by itself, as before. If anything is off (slow network, page changed), the normal second
     step simply appears, so you never end up worse off. Nothing is filled in: no username, no password. */
  const APP_LINK = /^https:\/\/icts\.kuleuven\.be\/apps\/authenticator\/[\w-]+$/;
  // ask KU Leuven for the second step (the same request the blue button sends) and pull the app link out of it
  function fetchStep2(form, b) {
    const body = new URLSearchParams(new FormData(form));
    body.append(b.name, b.value || '');
    return fetch(form.action, { method: 'POST', body, credentials: 'include', redirect: 'follow' })
      .then((r) => (r.ok ? r.text().then((html) => ({ html, url: r.url })) : Promise.reject(new Error('HTTP ' + r.status))))
      .then(({ html, url }) => {
        const doc2 = new DOMParser().parseFromString(html, 'text/html');
        const a = doc2.getElementById('btnMobileDevice');
        const app = a && a.getAttribute('href');
        const cont = doc2.getElementById('loginformnextauth');
        if (!app || !APP_LINK.test(app) || !cont) throw new Error('no app link');
        return { html, url, app, action: new URL(cont.getAttribute('action'), url || location.href).href };
      });
  }
  // show the second step (it waits for your approval and finishes by itself), and open the app if this is still your tap
  function showStep2(st, openApp) {
    ss.set('tm4-fa', JSON.stringify({ action: st.action, ts: Date.now() })); // see finishAfterApp
    if (st.url && new URL(st.url).origin === location.origin) history.replaceState(null, '', st.url);
    document.open();
    document.write(st.html);
    document.close();
    loginSkin(true);
    if (openApp) location.href = st.app;
    finishAfterApp();
  }
  const plainSubmit = (form, b) => {
    const h = document.createElement('input');
    h.type = 'hidden'; h.name = b.name; h.value = b.value || '';
    form.appendChild(h);
    HTMLFormElement.prototype.submit.call(form);
  };

  /* Opening Toledo from the home screen while signed out: the KU Leuven page becomes one big "tap to open the
     Authenticator" screen. The next step is already fetched in the background, so the moment you tap (anywhere),
     the app opens. A tap is needed because iOS never lets a page open another app on its own. "Andere manier" gives
     you the normal KU Leuven page (password, QR code). */
  function quickLogin() {
    const form = document.getElementById('nextauthLoginForm');
    const b = document.getElementById('btnnextauthlogin');
    if (!form || !b || ss.get('tm4-ql-off')) return false;
    const rd = form.querySelector('[name="__Host-rememberDevice"]');
    if (rd && rd.checked) return false;
    if (Array.from(document.querySelectorAll('.alert-danger, .alert-warning')).some((el) => el.offsetParent !== null && el.id !== 'rss-status')) return false; // a message from KU Leuven: let you read it
    const last = Number(ss.get('tm4-ql-at')) || 0;
    if (Date.now() - last < 20e3) return false; // just tried: don't loop
    ss.set('tm4-ql-at', String(Date.now()));
    const ov = document.createElement('div');
    ov.id = 'tm4-ql';
    ov.setAttribute('role', 'button');
    ov.innerHTML = '<img src="https://stijl.kuleuven.be/shibboleth/images/authenticator.svg" alt=""><b>Inloggen</b><span class="q">Even geduld…</span><button type="button" class="other">Andere manier</button>';
    const css = document.createElement('style');
    css.textContent = '#tm4-ql{position:fixed;inset:0;z-index:2147483000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;background:var(--bg,#f2f2f7);color:var(--text,#000);font:17px -apple-system,system-ui,sans-serif;text-align:center;-webkit-tap-highlight-color:transparent}'
      + '#tm4-ql img{width:96px;height:96px;border-radius:22px;box-shadow:0 8px 24px rgba(0,0,0,.15)}#tm4-ql b{font-size:26px;margin-top:8px}'
      + '#tm4-ql .q{min-height:50px;display:flex;align-items:center;padding:0 22px;border-radius:14px;color:var(--sub,#6d6d72)}'
      + '#tm4-ql.ready .q{background:var(--accent,#0a6cd6);color:#fff;font-weight:600}'
      + '#tm4-ql .other{position:absolute;bottom:calc(28px + env(safe-area-inset-bottom));border:0;background:none;color:var(--accent,#0a6cd6);font:500 16px -apple-system,system-ui,sans-serif;padding:10px}';
    document.head.appendChild(css);
    document.body.appendChild(ov);
    let st = null, gone = false;
    const off = () => { gone = true; ov.remove(); };
    ov.querySelector('.other').addEventListener('click', (e) => {
      e.stopPropagation();
      ss.set('tm4-ql-off', '1');
      if (st) showStep2(st, false); else off(); // the second step has a "Go back" to the password login
    });
    ov.addEventListener('click', () => {
      if (gone) return;
      if (st) { gone = true; showStep2(st, true); return; }
      ov.querySelector('.q').textContent = 'Bezig…';
    });
    fetchStep2(form, b).then((v) => {
      if (gone) return;
      st = v;
      ov.classList.add('ready');
      ov.querySelector('.q').textContent = 'Tik om de Authenticator te openen';
    }, () => { if (!gone) plainSubmit(form, b); }); // fetching failed: take the normal route (the button you would press)
    return true;
  }

  /* Your own tap on "Log in via KU Leuven Authenticator": fetch the second step and open the app from that same tap
     (iOS only opens another app from a real tap). If anything is off, the normal second step simply appears. */
  function fastAuthenticator() {
    let busy = false;
    W.addEventListener('click', (e) => {
      const b = e.target && e.target.closest && e.target.closest('#btnnextauthlogin');
      const form = b && b.form;
      if (!form || busy || e.defaultPrevented) return;
      const rd = form.querySelector('[name="__Host-rememberDevice"]');
      if (rd && rd.checked) return; // you chose the notification route yourself: leave it alone
      e.preventDefault();
      e.stopImmediatePropagation();
      busy = true;
      const t0 = Date.now();
      fetchStep2(form, b).then((v) => showStep2(v, Date.now() - t0 < 900)).catch(() => { busy = false; plainSubmit(form, b); });
    }, true);
    const ql = () => { try { quickLogin(); } catch (_) {} };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ql, { once: true }); else ql();
  }

  /* Back from the Authenticator app: KU Leuven's page should notice the approval by itself, but iOS pauses it while
     you are in the app (and sometimes reloads it as an empty page). So once you are back, the script presses KU Leuven's
     own "Click this button after you signed in with the app" for you: the same request, sent to the same step. */
  function finishAfterApp() {
    const saved = () => { try { const v = JSON.parse(ss.get('tm4-fa') || 'null'); return v && Date.now() - v.ts < 10 * 60e3 ? v : null; } catch (_) { return null; } };
    const go = () => {
      const v = saved();
      if (!v || new URL(v.action).origin !== location.origin) return;
      ss.del('tm4-fa');
      const f = document.getElementById('loginformnextauth') || (() => {
        const n = document.createElement('form');
        n.method = 'post';
        n.innerHTML = '<input type="hidden" name="_eventId_proceed" value="">';
        (document.body || document.documentElement).appendChild(n);
        return n;
      })();
      f.setAttribute('action', f.id ? f.getAttribute('action') || v.action : v.action);
      HTMLFormElement.prototype.submit.call(f);
    };
    let away = document.visibilityState === 'hidden';
    const back = () => {
      if (document.visibilityState === 'hidden') { away = true; return; }
      if (away) setTimeout(() => { if (document.visibilityState === 'visible') go(); }, 1200); // KU Leuven's page gets a moment first
    };
    document.addEventListener('visibilitychange', back);
    W.addEventListener('pageshow', (e) => { if (e.persisted) { away = true; back(); } });
  }

  /* iOS reloaded the page while you were in the app (it then comes back empty, or as the waiting step again):
     finish the login from the saved step. The saved step only exists after the app was opened by fastAuthenticator. */
  function emptyAfterApp() {
    let v = null;
    try { v = JSON.parse(ss.get('tm4-fa') || 'null'); } catch (_) {}
    if (!v || Date.now() - v.ts > 10 * 60e3) return;
    const check = () => {
      if (document.getElementById('nextauthLoginForm') || document.querySelector('input[name="SAMLResponse"]')) { ss.del('tm4-fa'); return; }
      const wait = document.getElementById('loginformnextauth');
      if (!wait && document.body && document.body.innerText.trim().length > 40) return; // a real page (e.g. an error): leave it
      ss.del('tm4-fa');
      const n = wait || document.createElement('form');
      n.method = 'post';
      if (!wait) n.action = v.action;
      if (!wait) { n.innerHTML = '<input type="hidden" name="_eventId_proceed" value="">'; (document.body || document.documentElement).appendChild(n); }
      HTMLFormElement.prototype.submit.call(n);
    };
    if (document.readyState === 'complete') setTimeout(check, 600); else W.addEventListener('load', () => setTimeout(check, 600), { once: true });
  }

  /* The last step of a login is an empty-looking page that passes the result to Toledo / KU Loket by itself.
     If iOS paused it (you were in the app), it can stay white: send it on once you look at it again. */
  function nudgeSamlPost() {
    let sent = false;
    const nudge = () => {
      const i = document.querySelector('form input[name="SAMLResponse"]');
      if (sent || !i || document.visibilityState !== 'visible') return;
      sent = true;
      HTMLFormElement.prototype.submit.call(i.form);
    };
    W.addEventListener('beforeunload', () => { sent = true; }); // the page sent it itself: never twice
    const later = () => setTimeout(nudge, 1500);
    if (document.readyState === 'complete') later(); else W.addEventListener('load', later, { once: true });
    document.addEventListener('visibilitychange', later);
    W.addEventListener('pageshow', later);
  }

  /* KU Leuven sign-in page (idp.kuleuven.be): a new look, and the Authenticator app opened straight from your tap */
  /* "Stale Request": the KU Leuven login page you came back to (back button, or a tab reopened later) was already used.
     Nothing to do there: start again from where you were going, which signs you in afresh (usually without a password). */
  function staleLogin() {
    const check = () => {
      const b = document.body;
      if (!b || !/stale request|verouderd verzoek|verlopen aanvraag/i.test(b.innerText || '')) return;
      const ref = hostOf(document.referrer);
      const to = /^webwsp\./.test(ref) ? LOKET : /kuleuven\.cloud$/.test(ref) ? ULTRA + '/ultra/course' : PORTAL + '?tm=vandaag';
      cover('Opnieuw verbinden\u2026');
      setTimeout(() => location.replace(to), 150);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', check, { once: true }); else check();
  }
  function loginSkin(again) {
    if (!again) { forgetDevice(); fastAuthenticator(); emptyAfterApp(); nudgeSamlPost(); staleLogin(); }
    const r = document.documentElement;
    r.classList.add('tm4-login');
    const st = document.createElement('style');
    st.textContent = LOGIN_CSS;
    (document.head || r).appendChild(st);
    const finish = () => {
      applyTheme(THEME);
      const vp = document.querySelector('meta[name="viewport"]');
      if (vp && !/viewport-fit/.test(vp.content)) vp.content += ', viewport-fit=cover';
      if (document.head && st.parentNode !== document.head) document.head.appendChild(st);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', finish, { once: true }); else finish();
  }
  /* ================================================================== what does this page become? */
  if (!SITE) return;
  let mode = 'classic', target = '';
  if (SITE === 'idp') mode = TOP && PHONE ? 'login-skin' : 'none';
  else if (SITE === 'journey') mode = TOP && PHONE ? 'cover' : 'none'; // Toledo's link service, on its way to the course
  else if (SITE === 'loket') {
    if (!TOP && params.get('tm') === 'bridge') mode = 'bridge';
    else if (!TOP) mode = 'none';
    else if (params.get('tm') === 'sync') mode = 'sync';
    else if ((() => { try { return Date.now() - (JSON.parse(ss.get('tm4-sync') || '{}').ts || 0) < 10 * 60e3; } catch (_) { return false; } })()) mode = 'sync'; // back from signing in (approving in the Authenticator can take a while)
    else if (PHONE && params.get('tm') === 'agenda') { mode = 'redirect'; target = PORTAL + '?tm=rooster'; } // link from v3
  } else if (!TOP && !TEST) mode = 'none';
  else if (!PHONE) mode = 'classic';
  else if (SITE === 'portal') {
    if (!/^\/portal\/?(index\.html)?$/.test(PATH)) mode = 'none';
    else if (ss.get('tm4-classic') === '1') mode = 'classic';
    else if (ss.get('tm4-login')) mode = 'login';
    else mode = 'app';
  } else if (SITE === 'ultra') {
    const outline = /^\/ultra\/courses\/(_\d+_\d+)\/outline\/?$/.exec(PATH);
    const tmq = params.get('tm');
    if (!PATH.startsWith('/ultra/')) mode = 'none';
    else if (/^\/ultra\/app\/?$/.test(PATH)) mode = 'app';
    else if (outline && tmq === 'classic') { ss.set('tm4-classic-ultra', String(Date.now())); mode = 'classic'; }
    else if (outline && tmq !== 'app' && !location.search && Date.now() - (Number(ss.get('tm4-noapp')) || 0) < 5 * 60e3) mode = 'classic';
    else if (outline && (!location.search || tmq === 'app')) { mode = 'app'; W.__TM_PK__ = outline[1]; ss.del('tm4-noapp'); }
    else if (!classicOn('ultra') && /^\/ultra\/?$|^\/ultra\/(course|stream|institution-page)\/?$/.test(PATH)) {
      mode = 'redirect';
      target = PORTAL + (/stream/.test(PATH) ? '?tm=updates' : /\/course\/?$/.test(PATH) ? '?tm=vakken' : '?tm=vandaag');
    }
  }
  W.__TM_MODE__ = mode;

  // build our page once the parser has created <html> (before any of the page's own scripts can run)
  const whenRoot = (fn) => {
    if (document.documentElement) { fn(); return; }
    const mo = new MutationObserver(() => { if (document.documentElement) { mo.disconnect(); fn(); } });
    mo.observe(document, { childList: true });
  };
  if (mode === 'redirect') { try { W.stop(); } catch (_) {} whenRoot(() => cover('')); location.replace(target); return; }
  if (mode === 'bridge') {
    // the hidden frame only reads data: don't let the KU Loket launchpad (SAPUI5) boot in it as well
    if (/^\/sap\/bc\/ui2\/flp/.test(PATH)) blockScripts((n) => /ui5_ui5|sap-ui-core|ushell|\/resources\//.test(n.getAttribute('src') || '') || n.id === 'sap-ui-bootstrap');
    bridge();
    return;
  }
  if (mode === 'cover') {
    // came back here with the back button: this page would only send you forward again, so step over it
    const back = () => { try { return (performance.getEntriesByType('navigation')[0] || {}).type === 'back_forward'; } catch (_) { return false; } };
    if (back() && history.length > 1) { try { W.stop(); } catch (_) {} whenRoot(() => cover('')); history.back(); return; }
    W.addEventListener('pageshow', (e) => { if (e.persisted && history.length > 1) history.back(); });
    whenRoot(() => cover('Openen\u2026'));
    return;
  }
  if (mode === 'classic' && PHONE && TOP && (SITE === 'ultra' || SITE === 'loket')) classicDark();
  if (mode === 'sync') { whenRoot(syncPage); return; }
  if (mode === 'login-skin') { whenRoot(loginSkin); return; }
  if (mode === 'login') { loginWatch(); return; }
  if (mode === 'classic') { if (SITE === 'portal' && PHONE && TOP) classicPill(); return; }
  if (mode !== 'app') return;
  whenRoot(SITE === 'portal' ? portalApp : ultraApp);
})();

/* ===== version 3 phone layout, for the Blackboard and KU Loket pages the app does not replace ===== */
(() => {
  const run = () => {
(() => {
  'use strict';
  if (window.__TM_MODE__ !== 'classic') return; // the app layer (above) decided this page keeps its own layout
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
    const put = () => (document.head || document.documentElement).appendChild(s);
    if (document.head || document.documentElement) put();
    else { const mo = new MutationObserver(() => { if (document.documentElement) { mo.disconnect(); put(); } }); mo.observe(document, { childList: true }); }
  }

  /* ================================================================== shared: tab bar */
  const ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    courses: '<path d="M5 4.5h11.5a1.5 1.5 0 0 1 1.5 1.5v14H6.5A1.5 1.5 0 0 1 5 18.5z"/><path d="M5 18.5A1.5 1.5 0 0 1 6.5 17H18"/><path d="M9 8.5h5"/>',
    updates: '<path d="M6 16.5v-5.5a6 6 0 1 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    messages: '<path d="M21 3 3 10.5l7.2 2.6L12.8 21z"/><path d="m21 3-10.8 10.1"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    vandaag: '<path d="M3.8 10.4 12 3.8l8.2 6.6V19a1.6 1.6 0 0 1-1.6 1.6h-4v-5.8H9.4v5.8h-4A1.6 1.6 0 0 1 3.8 19z"/>',
    vakken: '<path d="M5 5.6A2.1 2.1 0 0 1 7.1 3.5H19v13.8H7.1A2.1 2.1 0 0 0 5 19.4z"/><path d="M5 19.4a2.1 2.1 0 0 0 2.1 2.1H19v-4.2"/><path d="M9 7.8h6"/>',
    rooster: '<rect x="3.6" y="4.8" width="16.8" height="15.8" rx="3"/><path d="M3.6 9.6h16.8M8 3v3.4M16 3v3.4"/>',
    meer: '<rect x="4" y="4" width="6.6" height="6.6" rx="1.8"/><rect x="13.4" y="4" width="6.6" height="6.6" rx="1.8"/><rect x="4" y="13.4" width="6.6" height="6.6" rx="1.8"/><rect x="13.4" y="13.4" width="6.6" height="6.6" rx="1.8"/>',
  };
  // Same five destinations everywhere; on the portal they are in-page, elsewhere they lead back to the portal.
  const TABS = SITE !== 'portal' ? [
    { id: 'vandaag', label: 'Vandaag', url: PORTAL + '?tm=vandaag' },
    { id: 'vakken', label: 'Vakken', url: PORTAL + '?tm=vakken' },
    { id: 'rooster', label: 'Rooster', url: PORTAL + '?tm=rooster' },
    { id: 'updates', label: 'Updates', url: PORTAL + '?tm=updates' },
    { id: 'meer', label: 'Meer', url: PORTAL + '?tm=meer' },
  ] : [
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
      setActiveTab(/^\/ultra\/(courses|course)\b/.test(location.pathname) ? 'vakken' : '');
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
        // closing an item in Blackboard lands on the course outline: go back to the app's course page
        const toApp = () => {
          const m = /^\/ultra\/courses\/(_\d+_\d+)\/outline\/?$/.exec(location.pathname);
          let c = 0; try { c = Number(sessionStorage.getItem('tm4-classic-ultra')) || 0; } catch (_) {}
          const classic = c && Date.now() - c < 30 * 60e3;
          if (classic || Math.min(screen.width, screen.height) >= 600) return;
          if (m && !location.search) {
            const toAppUrl = 'https://ultra.edu.kuleuven.cloud/ultra/courses/' + m[1] + '/outline?tm=app#/c/' + m[1];
            const noapp = Number(sessionStorage.getItem('tm4-noapp')) || 0;
            if (noapp && Date.now() - noapp < 5 * 60e3) {
              // the app stepped aside so Blackboard could sign you in: go back once that is done
              if (window.__tm4wait) return;
              window.__tm4wait = true;
              const check = () => fetch('/learn/api/public/v1/users/me', { credentials: 'include', headers: { Accept: 'application/json' } })
                .then((r) => { if (r.ok && /json/.test(r.headers.get('content-type') || '')) { sessionStorage.removeItem('tm4-noapp'); location.replace(toAppUrl); } else setTimeout(check, 2500); }, () => setTimeout(check, 4000));
              setTimeout(check, 1500);
              return;
            }
            location.replace(toAppUrl);
            return;
          }
          // Blackboard's own start pages (e.g. after signing in): back to the app
          const home = /^\/ultra\/?$|^\/ultra\/(course|stream|institution-page)\/?$/.exec(location.pathname);
          if (home) location.replace('https://toledo.kuleuven.be/portal/' + (/stream/.test(location.pathname) ? '?tm=updates' : /\/course\/?$/.test(location.pathname) ? '?tm=vakken' : '?tm=vandaag'));
        };
        // the app's tab bar: handle the tap before Blackboard's own click handling can swallow it
        window.addEventListener('click', (e) => {
          const a = e.target && e.target.closest && e.target.closest('#tm-tabbar a[href]');
          if (!a) return;
          e.preventDefault(); e.stopImmediatePropagation();
          location.href = a.href;
        }, true);
        toApp();
        setInterval(() => { if (location.href !== last) { last = location.href; toApp(); schedule(); } }, 400);
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
  };
  if (document.documentElement) run();
  else { const mo = new MutationObserver(() => { if (document.documentElement) { mo.disconnect(); run(); } }); mo.observe(document, { childList: true }); }
})();
