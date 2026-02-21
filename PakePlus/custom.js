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

(function () {
    if (window.__ACG_HOOK__) return;
    window.__ACG_HOOK__ = true;

    console.log("[PakePlus] ACG Video Helper Loaded");

    /* ========= 设备识别 ========= */
    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);

    /* ========= 存储视频 URL ========= */
    const videoUrls = new Set();

    /* ========= Hook fetch ========= */
    const rawFetch = window.fetch;
    window.fetch = function (...args) {
        const url = args[0]?.url || args[0];
        if (typeof url === "string" && /\.(m3u8|mp4)(\?|$)/i.test(url)) {
            videoUrls.add(url);
            console.log("[Video URL]", url);
        }
        return rawFetch.apply(this, args);
    };

    /* ========= Hook XHR ========= */
    const rawOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
        if (typeof url === "string" && /\.(m3u8|mp4)(\?|$)/i.test(url)) {
            videoUrls.add(url);
            console.log("[Video URL]", url);
        }
        return rawOpen.apply(this, arguments);
    };

    /* ========= 自动横屏（手机端） ========= */
    function lockLandscape() {
        if (!isMobile) return;
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock("landscape").catch(() => {});
        }
    }

    /* ========= 下载按钮 ========= */
    function createDownloadBtn() {
        if (document.getElementById("acg-download-btn")) return;

        const btn = document.createElement("div");
        btn.id = "acg-download-btn";
        btn.innerText = "⬇ 下载";
        btn.style.cssText = `
            position: fixed;
            top: 80px;
            right: 10px;
            z-index: 99999;
            background: rgba(0,0,0,.6);
            color: #fff;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 14px;
        `;

        btn.onclick = () => {
            if (!videoUrls.size) {
                alert("未捕获到视频地址");
                return;
            }

            const url = [...videoUrls][videoUrls.size - 1];

            if (url.endsWith(".m3u8")) {
                prompt("复制 m3u8 地址（可用 N_m3u8DL / ffmpeg）：", url);
            } else {
                window.open(url);
            }
        };

        document.body.appendChild(btn);
    }

    /* ========= 监听 ArtPlayer ========= */
    const observer = new MutationObserver(() => {
        const video = document.querySelector("video");
        const player = document.querySelector(".art-video-player");

        if (video && player) {
            createDownloadBtn();

            video.addEventListener("fullscreenchange", lockLandscape);
            video.addEventListener("webkitfullscreenchange", lockLandscape);

            observer.disconnect();
            console.log("[PakePlus] ArtPlayer Ready");
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();