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

document.addEventListener('click', hookClick, { capture: true })
// ===============================
// PakePlus Mobile Video Pro
// Android WebView ONLY
// ===============================
;(function () {
  'use strict'

  const ua = navigator.userAgent
  const isAndroid = /Android/i.test(ua)
  const isWebView = /wv|PakePlus|WebView/i.test(ua)
  if (!isAndroid || !isWebView) return

  console.log('[PakePlus] Mobile Video Pro Enabled')

  // ===============================
  // 主视频识别
  // ===============================
  function isMainVideo (v) {
    const rect = v.getBoundingClientRect()
    return (
      rect.width > window.innerWidth * 0.3 &&
      rect.height > window.innerHeight * 0.3 &&
      v.controls &&
      !v.muted
    )
  }

  // ===============================
  // 自动横屏（仅主视频）
  // ===============================
  function lockLandscape () {
    screen.orientation?.lock?.('landscape').catch(() => {})
  }

  function unlock () {
    screen.orientation?.unlock?.()
  }

  function bindVideo (v) {
    if (v.__bind) return
    v.__bind = true

    v.addEventListener('play', () => {
      if (isMainVideo(v)) {
        console.log('[Video] main video play → landscape')
        lockLandscape()
      }
    })

    v.addEventListener('pause', unlock)
    v.addEventListener('ended', unlock)
  }

  // 仅监听 video 插入，不全量扫描
  new MutationObserver(ms => {
    ms.forEach(m =>
      m.addedNodes.forEach(n => {
        if (n.tagName === 'VIDEO') bindVideo(n)
      })
    )
  }).observe(document.documentElement, {
    childList: true,
    subtree: true
  })

  // ===============================
  // 视频嗅探（强过滤）
  // ===============================
  const videoMap = new Map()

  function validVideo (url) {
    if (!url) return false
    if (!/(\.mp4|\.m3u8|\.webm)/i.test(url)) return false
    if (/ad|track|analytics/i.test(url)) return false
    return true
  }

  function collect (url) {
    if (!validVideo(url)) return
    if (videoMap.has(url)) return
    videoMap.set(url, Date.now())
    console.log('%c[📥 Video]', 'color:#4caf50', url)
  }

  // video/source
  document.addEventListener(
    'loadedmetadata',
    e => collect(e.target?.currentSrc),
    true
  )

  // fetch（只嗅探 media）
  const rawFetch = window.fetch
  window.fetch = function (input, init) {
    const url = input?.toString()
    collect(url)
    return rawFetch.apply(this, arguments)
  }

  // xhr
  const rawOpen = XMLHttpRequest.prototype.open
  XMLHttpRequest.prototype.open = function (m, url) {
    collect(url)
    return rawOpen.apply(this, arguments)
  }

  // ===============================
  // 导出接口（手机端用）
  // ===============================
  window.__PAKE_MOBILE_VIDEO__ = () =>
    Array.from(videoMap.keys())

})()