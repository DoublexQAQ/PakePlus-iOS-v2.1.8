window.addEventListener("DOMContentLoaded",()=>{const t=document.createElement("script");t.src="https://www.googletagmanager.com/gtag/js?id=G-W5GKHM0893",t.async=!0,document.head.appendChild(t);const n=document.createElement("script");n.textContent="window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-W5GKHM0893');",document.body.appendChild(n)});// very important, if you don't know what it is, don't touch it
// 非常重要，不懂代码不要动，这里可以解决80%的问题，也可以生产1000+的bug
const hookClick = (e) => {
    const origin = e.target.closest('a')
    const isBaseTargetBlank = document.querySelector(
        'head base[target="_blank"]'
    )
    console.log('origin', origin, isBaseTargetBlank)
    if (
        (origin && origin.href && origin.target === '_blank') ||
        (origin && origin.href && isBaseTargetBlank)
    ) {
        e.preventDefault()
        console.log('handle origin', origin)
        location.href = origin.href
    } else {
        console.log('not handle origin', origin)
    }
}

window.open = function (url, target, features) {
    console.log('open', url, target, features)
    location.href = url
}

document.addEventListener('click', hookClick, { capture: true });

(function () {
  'use strict';
  if (window.__ACG_SAFE_INJECT__) return;
  window.__ACG_SAFE_INJECT__ = true;

  console.log('[ACG-HOOK] init');

  // === 配置 ===
  const IS_MOBILE = /Android|iPhone|iPad/i.test(navigator.userAgent);
  const VIDEO_WAIT_TIMEOUT = 20000; // 等视频最长 20s
  const OBS_POLL = 500;
  const SAFE_HOOK_DELAY = 1500; // 发现播放器后，延迟多少 ms 再 hook fetch/xhr（降低被检测概率）

  // 捕获到的视频 URL 集合（保持顺序）
  const videoUrls = [];

  function addVideoUrl(u) {
    if (!u) return;
    try {
      // 去掉断言参数（常见的 token 参数不影响显示）
      const clean = u.split('#')[0];
      if (!videoUrls.includes(clean)) {
        videoUrls.push(clean);
        console.log('[ACG-HOOK] captured:', clean);
        updateDownloadMenu();
      }
    } catch (e) {}
  }

  // === 广告/弹窗隐藏（保守型，只 hide 明确类名或常见遮罩） ===
  const safeCss = `
    .ads, .ad, .banner, .popup, .modal, .mask, .cookie-consent {
      display: none !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }
  `;
  try {
    const style = document.createElement('style');
    style.id = '__acg_hide_style';
    style.textContent = safeCss;
    document.head && document.head.appendChild(style);
  } catch (e) {
    console.warn('[ACG-HOOK] css inject failed', e);
  }

  // === UI: 下载按钮 / 菜单 ===
  function createDownloadUI() {
    if (document.getElementById('__acg_download_btn')) return;
    const box = document.createElement('div');
    box.id = '__acg_download_btn';
    box.style.cssText = `
      position: fixed;
      top: 12px;
      right: 12px;
      z-index: 999999;
      display: flex;
      gap:8px;
      align-items:center;
      font-family: Arial, Helvetica, sans-serif;
    `;

    const btn = document.createElement('button');
    btn.textContent = '⬇ 下载';
    btn.style.cssText = `
      background: rgba(0,0,0,0.66);
      color: #fff;
      border: none;
      padding: 8px 10px;
      border-radius: 6px;
      cursor: pointer;
    `;
    btn.onclick = () => {
      if (!videoUrls.length) return alert('未捕获到视频地址，请先播放视频或等待片刻。');
      const last = videoUrls[videoUrls.length - 1];
      if (/\.m3u8(\?|$)/i.test(last)) {
        prompt('检测到 m3u8，请复制地址并用 ffmpeg/N_m3u8DL 下载：', last);
      } else {
        // 直接打开 mp4 链接
        window.open(last, '_blank');
      }
    };

    const menu = document.createElement('select');
    menu.style.cssText = `
      background: rgba(255,255,255,0.95);
      border-radius: 6px;
      padding: 6px;
    `;
    menu.id = '__acg_download_menu';
    menu.onchange = () => {
      const v = menu.value;
      if (!v) return;
      if (/\.m3u8(\?|$)/i.test(v)) {
        prompt('m3u8 链接：', v);
      } else {
        window.open(v, '_blank');
      }
    };

    box.appendChild(btn);
    box.appendChild(menu);
    document.body.appendChild(box);
    updateDownloadMenu();
  }

  function updateDownloadMenu() {
    const menu = document.getElementById('__acg_download_menu');
    if (!menu) return;
    // clear
    menu.innerHTML = '';
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = videoUrls.length ? '选择清晰度 / 链接' : '未捕获到视频';
    menu.appendChild(empty);
    videoUrls.forEach(u => {
      const o = document.createElement('option');
      o.value = u;
      o.textContent = (u.length > 60 ? '…' + u.slice(-60) : u);
      menu.appendChild(o);
    });
  }

  // === 读取 video.currentSrc 或 <source>，并尽量从播放器配置里拿到真实地址 ===
  function inspectVideoSources(video) {
    try {
      if (!video) return;
      // currentSrc 优先
      const cs = video.currentSrc || video.src || '';
      if (cs) addVideoUrl(cs);

      // <source> 标签
      const srcs = video.querySelectorAll && video.querySelectorAll('source');
      if (srcs && srcs.length) {
        srcs.forEach(s => addVideoUrl(s.src));
      }

      // 一些播放器将urls写入 data-* 或 window 变量（尝试提取）
      const container = video.closest && (video.closest('.artplayer-app') || video.parentElement);
      if (container) {
        // scan data- attributes
        for (const attr of container.attributes || []) {
          if (/data.*(src|url|play)/i.test(attr.name) && attr.value) {
            addVideoUrl(attr.value);
          }
        }
      }

      // scan inline scripts for new Artplayer(...) 之类的初始化（非破坏性，纯字符串查找）
      try {
        for (const s of document.scripts) {
          if (!s || !s.textContent) continue;
          const txt = s.textContent;
          // 简单匹配 m3u8/mp4 在初始化脚本中出现
          const m = txt.match(/https?:\/\/[^'"\s]+?\.(m3u8|mp4)[^\s'"]*/i);
          if (m && m[0]) addVideoUrl(m[0]);
        }
      } catch (e) {}
    } catch (e) {
      console.warn('[ACG-HOOK] inspectVideoSources error', e);
    }
  }

  // === Safe hooking of fetch/XHR (在播放器就绪后延迟挂载) ===
  function safeHookNetwork() {
    try {
      // 双重保护：如果环境不允许或已有 hook，则不强行替换
      if (window.__ACG_NET_HOOKED__) return;
      window.__ACG_NET_HOOKED__ = true;

      // Hook fetch
      try {
        if (window.fetch && !window.fetch.__acg_wrapped) {
          const rawFetch = window.fetch.bind(window);
          const wrapped = function (...args) {
            try {
              const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url);
              if (url && /\.(m3u8|mp4)(\?|$)/i.test(url)) {
                addVideoUrl(url);
              }
            } catch (e) {}
            return rawFetch(...args);
          };
          wrapped.__acg_wrapped = true;
          window.fetch = wrapped;
          console.log('[ACG-HOOK] fetch wrapped');
        }
      } catch (e) {
        console.warn('[ACG-HOOK] fetch hook failed', e);
      }

      // Hook XHR.open
      try {
        const X = XMLHttpRequest;
        if (X && X.prototype && !X.prototype.open.__acg_wrapped) {
          const rawOpen = X.prototype.open;
          X.prototype.open = function (method, url) {
            try {
              if (typeof url === 'string' && /\.(m3u8|mp4)(\?|$)/i.test(url)) {
                addVideoUrl(url);
              }
            } catch (e) {}
            return rawOpen.apply(this, arguments);
          };
          X.prototype.open.__acg_wrapped = true;
          console.log('[ACG-HOOK] XHR open wrapped');
        }
      } catch (e) {
        console.warn('[ACG-HOOK] XHR hook failed', e);
      }
    } catch (e) {
      console.warn('[ACG-HOOK] safeHookNetwork top', e);
    }
  }

  // === 全屏时尝试锁横屏（手机） ===
  function bindFullscreenLandscape(video) {
    if (!IS_MOBILE) return;
    try {
      const onFull = () => {
        try {
          if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(() => {});
            console.log('[ACG-HOOK] requested orientation lock');
          }
        } catch (e) {}
      };
      document.addEventListener('fullscreenchange', onFull);
      document.addEventListener('webkitfullscreenchange', onFull);
      // 兼容某些播放器在 video 上触发全屏事件
      video && video.addEventListener && video.addEventListener('fullscreenchange', onFull);
    } catch (e) {
      console.warn('[ACG-HOOK] bindFullscreenLandscape failed', e);
    }
  }

  // === 主观察逻辑：等待播放器/视频出现，初次处理，然后延迟 hook 网络 ===
  function startObserve() {
    const t0 = Date.now();
    const poll = setInterval(() => {
      try {
        // 超时保护
        if (Date.now() - t0 > VIDEO_WAIT_TIMEOUT) {
          clearInterval(poll);
          console.warn('[ACG-HOOK] wait video timeout');
          createDownloadUI(); // 仍创建 UI，用户可以手动尝试
          return;
        }

        // 优先查找常见容器类与 video 标签
        const video = document.querySelector('video');
        const art = document.querySelector('.artplayer-app') || document.querySelector('.art-video-player') || null;

        if (!video && !art) return;

        // 找到后做一次被动读取（不替换任何原生 API）
        console.log('[ACG-HOOK] video/player detected');
        inspectVideoSources(video);
        createDownloadUI();
        bindFullscreenLandscape(video);

        // 在安全延迟后才 hook 网络（降低检测概率）
        setTimeout(() => {
          safeHookNetwork();
          // 若 hook 后视频请求马上出现，给几次检测机会
          setTimeout(() => inspectVideoSources(video), 600);
        }, SAFE_HOOK_DELAY);

        clearInterval(poll);
      } catch (e) {
        console.warn('[ACG-HOOK] poll error', e);
      }
    }, OBS_POLL);
  }

  // 启动观察（在 load 之后再启动以更友好）
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(startObserve, 600);
  } else {
    window.addEventListener('DOMContentLoaded', () => setTimeout(startObserve, 600));
    window.addEventListener('load', () => setTimeout(startObserve, 600));
  }

  // 额外：允许手动在控制台运行 window.__acg_force_inspect() 来即时扫描
  window.__acg_force_inspect = function () {
    try {
      const v = document.querySelector('video');
      inspectVideoSources(v);
      createDownloadUI();
      safeHookNetwork();
    } catch (e) {}
  };

  console.log('[ACG-HOOK] injected (passive-mode)');
})();