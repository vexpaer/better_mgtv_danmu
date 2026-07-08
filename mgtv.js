// ==UserScript==
// @name         MGTV 弹幕去头像和角色名前缀
// @namespace    https://www.mgtv.com/
// @version      1.0
// @description  隐藏芒果TV弹幕头像，并去掉“角色名: ”前缀，只保留弹幕正文
// @match        *://www.mgtv.com/*
// @match        *://*.mgtv.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const CONFIG = {
    // 是否隐藏头像
    hideAvatar: true,

    // 是否隐藏点赞按钮，默认不隐藏
    hideLikeButton: false,

    // 名字最长长度，防止误删普通弹幕
    maxNameLength: 12,

    debug: false,
  };

  function log(...args) {
    if (CONFIG.debug) console.log('[MGTV Danmu Cleaner]', ...args);
  }

  function stripNamePrefix(text) {
    if (typeof text !== 'string') return text;

    const raw = text;
    const s = raw.trimStart();

    // 匹配：陈异: 弹幕内容 / 陈异：弹幕内容 / 苗靖: 弹幕内容
    const reg = new RegExp(
      `^([\\u4e00-\\u9fa5A-Za-z0-9_·\\-—]{1,${CONFIG.maxNameLength}})\\s*[：:]\\s*(.+)$`,
      'u'
    );

    const match = s.match(reg);
    if (!match) return raw;

    const name = match[1].trim();
    const content = match[2].trimStart();

    if (!name || !content) return raw;

    log('remove prefix:', raw, '=>', content);
    return content;
  }

  function cleanOneDanmuItem(item) {
    if (!item || item.nodeType !== 1) return;

    // 1. 隐藏头像
    if (CONFIG.hideAvatar) {
      const avatar = item.querySelector('[class*="_avatar_"], [class*="avatar" i]');
      if (avatar) {
        avatar.style.setProperty('display', 'none', 'important');
        avatar.style.setProperty('visibility', 'hidden', 'important');
        avatar.style.setProperty('width', '0', 'important');
        avatar.style.setProperty('height', '0', 'important');
        avatar.style.setProperty('margin', '0', 'important');
        avatar.style.setProperty('padding', '0', 'important');
      }
    }

    // 2. 可选：隐藏点赞按钮
    if (CONFIG.hideLikeButton) {
      const like = item.querySelector('[class*="_likeWrap_"], [class*="likeWrap" i]');
      if (like) {
        like.style.setProperty('display', 'none', 'important');
      }
    }

    // 3. 去掉“角色名: ”
    const textEl = item.querySelector('[class*="_danmuText_"], [class*="danmuText" i]');
    if (textEl && textEl.textContent) {
      const oldText = textEl.textContent;
      const newText = stripNamePrefix(oldText);

      if (newText !== oldText) {
        textEl.textContent = newText;
      }
    }

    // 4. 去掉头像后，减少左侧空隙
    item.style.setProperty('gap', '0', 'important');
  }

  function cleanAll() {
    const items = document.querySelectorAll(
      '[class*="_DanmuItem_"], [class*="DanmuItem"], [data-ids][data-intersection]'
    );

    items.forEach(cleanOneDanmuItem);
  }

  function injectCss() {
    if (document.getElementById('mgtv-danmu-cleaner-style')) return;

    const style = document.createElement('style');
    style.id = 'mgtv-danmu-cleaner-style';

    style.textContent = `
      [class*="_DanmuItem_"] [class*="_avatar_"],
      [class*="DanmuItem"] [class*="avatar" i],
      [data-ids][data-intersection] [class*="avatar" i] {
        display: none !important;
        visibility: hidden !important;
        width: 0 !important;
        height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      [class*="_DanmuItem_"],
      [class*="DanmuItem"],
      [data-ids][data-intersection] {
        gap: 0 !important;
      }
    `;

    document.documentElement.appendChild(style);
  }

  function observeDanmu() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== 1) continue;

          const el = node;

          if (
            el.matches?.('[class*="_DanmuItem_"], [class*="DanmuItem"], [data-ids][data-intersection]')
          ) {
            cleanOneDanmuItem(el);
          }

          const children = el.querySelectorAll?.(
            '[class*="_DanmuItem_"], [class*="DanmuItem"], [data-ids][data-intersection]'
          );

          if (children && children.length) {
            children.forEach(cleanOneDanmuItem);
          }
        }
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  injectCss();
  cleanAll();
  observeDanmu();

  // 播放器经常延迟加载，所以补几次
  setInterval(cleanAll, 1000);
})();
