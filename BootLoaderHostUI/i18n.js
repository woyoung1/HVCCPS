"use strict";

(function initHvccpsI18n(global) {
  const STORAGE_KEY = "hvccps-ui-language";
  const SUPPORTED = new Set(["en", "zh-CN"]);
  const ATTRIBUTES = ["title", "aria-label", "placeholder"];
  const zh = {
    "Language": "语言",
    "STM32G474 UART3 firmware loader": "STM32G474 UART3 固件加载器",
    "CONNECTED": "已连接",
    "DISCONNECTED": "未连接",
    "Connect": "连接",
    "Disconnect": "断开连接",
    "Select HEX/BIN": "选择 HEX/BIN",
    "File": "文件",
    "Address": "地址",
    "Size": "大小",
    "Flash Firmware": "烧录固件",
    "Abort": "中止",
    "Flash progress": "烧录进度",
    "Idle": "空闲",
    "Log": "日志",
    "Clear": "清除",
    "Waiting for reset": "等待复位",
    "Erasing": "正在擦除",
    "Programming": "正在写入",
    "Done": "完成",
    "Failed": "失败",
    "Payload too large.": "载荷过大。",
    "Serial port is not connected.": "串口未连接。",
    "Serial read timeout.": "串口读取超时。",
    "Frame length check failed.": "帧长度校验失败。",
    "Frame payload is too large.": "帧载荷过大。",
    "This browser does not support Web Serial.": "此浏览器不支持 Web Serial。",
    "Serial connected at 115200 8N1.": "串口已连接：115200 8N1。",
    "Serial disconnected.": "串口已断开。",
    "HEX contains no data.": "HEX 文件不包含数据。",
    "BIN file is empty.": "BIN 文件为空。",
    "BIN is too large for App region.": "BIN 文件超出应用程序区域容量。",
    "READY payload is too short.": "READY 载荷过短。",
    "STATUS payload is too short.": "STATUS 载荷过短。",
    "REQUEST payload is too short.": "REQUEST 载荷过短。",
    "No firmware selected.": "尚未选择固件。",
    "Sending 0x45 entry stream. Press the target RST now.": "正在发送 0x45 进入序列，请立即按下目标板 RST。",
    "Aborted by user.": "用户已中止。",
    "Bootloader did not respond.": "Bootloader 未响应。",
    "Firmware exceeds bootloader App limit.": "固件超过 Bootloader 的应用程序容量上限。",
    "Sending manifest and waiting for erase.": "正在发送清单并等待擦除。",
    "BEGIN_ACK timeout.": "BEGIN_ACK 超时。",
    "Expected BEGIN_ACK.": "未收到预期的 BEGIN_ACK。",
    "Programming started.": "开始写入固件。",
    "Firmware programmed and verified. Target will reset.": "固件写入并校验完成，目标板即将复位。",
    "Abort requested.": "已请求中止。",
    "missing ':'": "缺少 ':'",
    "too short": "长度过短",
    "checksum failed": "校验和错误",
    "bad extended linear address": "扩展线性地址无效",
    "bad extended segment address": "扩展段地址无效",
    "OK": "正常",
    "BUSY": "忙",
    "BAD_FRAME": "帧错误",
    "BAD_CRC": "CRC 错误",
    "BAD_SEQUENCE": "序列号错误",
    "BAD_OFFSET": "偏移错误",
    "BAD_LENGTH": "长度错误",
    "FLASH_ERROR": "Flash 错误",
    "IMAGE_CRC_ERROR": "固件 CRC 错误",
    "IMAGE_INVALID": "固件无效",
    "TIMEOUT": "超时",
    "ABORTED": "已中止",
    "ERASE_LIMIT": "擦除次数限制"
  };

  const prefixZh = [
    ["Connect failed: ", "连接失败："],
    ["Disconnect failed: ", "断开连接失败："],
    ["Serial read error (recovering): ", "串口读取错误（正在恢复）："],
    ["File load failed: ", "文件加载失败："],
    ["Flash failed: ", "烧录失败："],
    ["Entry stream stopped: ", "进入序列已停止："]
  ];

  const patternsZh = [
    [/^(\d+) bytes$/, (m) => `${m[1]} 字节`],
    [/^Bad HEX byte: (.+)$/, (m) => `HEX 字节无效：${m[1]}`],
    [/^HEX line (\d+): (.+)$/, (m) => `HEX 第 ${m[1]} 行：${translateNormalized(m[2])}`],
    [/^unsupported record type (.+)$/, (m) => `不支持的记录类型 ${m[1]}`],
    [/^HEX range (.+)-(.+) is outside App region\.$/, (m) => `HEX 地址范围 ${m[1]}-${m[2]} 超出应用程序区域。`],
    [/^Frame CRC mismatch (.+) != (.+)\.$/, (m) => `帧 CRC 不匹配：${m[1]} != ${m[2]}。`],
    [/^Loaded (.+): (\d+) bytes, CRC (.+)\.$/, (m) => `已加载 ${m[1]}：${m[2]} 字节，CRC ${m[3]}。`],
    [/^Bootloader ready: App (.+), max (\d+) bytes, chunk (\d+)\.$/, (m) => `Bootloader 已就绪：应用地址 ${m[1]}，最大 ${m[2]} 字节，分块 ${m[3]} 字节。`],
    [/^Bootloader App base mismatch: (.+)\.$/, (m) => `Bootloader 应用基址不匹配：${m[1]}。`],
    [/^Target pairing failed: (.+)\.$/, (m) => `目标配对失败：${m[1]}。`],
    [/^BEGIN failed: (.+), detail (.+)\.$/, (m) => `BEGIN 失败：${translateNormalized(m[1])}，详情 ${m[2]}。`],
    [/^Bootloader requested invalid range (.+)\.$/, (m) => `Bootloader 请求了无效范围 ${m[1]}。`],
    [/^Programming (.+)$/, (m) => `正在写入 ${m[1]}`]
  ];

  let language = resolveInitialLanguage();
  const textSources = new WeakMap();
  const attributeSources = new WeakMap();

  function resolveInitialLanguage() {
    try {
      const stored = global.localStorage.getItem(STORAGE_KEY);
      if (SUPPORTED.has(stored)) return stored;
    } catch (_) {}
    return String(global.navigator.language || "en").toLowerCase().startsWith("zh") ? "zh-CN" : "en";
  }

  function normalize(value) {
    return String(value).replace(/\s+/g, " ").trim();
  }

  function translateNormalized(source) {
    if (language === "en" || !source) return source;
    if (Object.prototype.hasOwnProperty.call(zh, source)) return zh[source];
    for (const [prefix, translatedPrefix] of prefixZh) {
      if (source.startsWith(prefix)) return translatedPrefix + translateNormalized(source.slice(prefix.length));
    }
    for (const [pattern, replace] of patternsZh) {
      const match = source.match(pattern);
      if (match) return replace(match);
    }
    return source;
  }

  function translateLine(value) {
    const leading = value.match(/^\s*/)[0];
    const trailing = value.match(/\s*$/)[0];
    const body = normalize(value);
    if (!body) return value;
    const timestamp = body.match(/^(\[[^\]]+\]\s*)(.*)$/);
    const translated = timestamp ? timestamp[1] + translateNormalized(timestamp[2]) : translateNormalized(body);
    return leading + translated + trailing;
  }

  function render(value) {
    if (language === "en") return value;
    const normalized = normalize(value);
    if (Object.prototype.hasOwnProperty.call(zh, normalized)) {
      const leading = value.match(/^\s*/)[0];
      const trailing = value.match(/\s*$/)[0];
      return leading + zh[normalized] + trailing;
    }
    return String(value).split("\n").map(translateLine).join("\n");
  }

  function translateTextNode(node, force = false) {
    const current = node.nodeValue;
    let source = textSources.get(node);
    if (source === undefined || (!force && current !== render(source))) {
      source = current;
      textSources.set(node, source);
    }
    const translated = render(source);
    if (current !== translated) node.nodeValue = translated;
  }

  function translateAttributes(element, force = false) {
    let sources = attributeSources.get(element);
    if (!sources) {
      sources = new Map();
      attributeSources.set(element, sources);
    }
    for (const attribute of ATTRIBUTES) {
      if (!element.hasAttribute(attribute)) continue;
      const current = element.getAttribute(attribute);
      let source = sources.get(attribute);
      if (source === undefined || (!force && current !== render(source))) {
        source = current;
        sources.set(attribute, source);
      }
      const translated = render(source);
      if (current !== translated) element.setAttribute(attribute, translated);
    }
  }

  function translateTree(root, force = false) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) return translateTextNode(root, force);
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
    if (root.nodeType === Node.ELEMENT_NODE) translateAttributes(root, force);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      if (node.nodeType === Node.TEXT_NODE) translateTextNode(node, force); else translateAttributes(node, force);
      node = walker.nextNode();
    }
  }

  function syncSelectors() {
    document.querySelectorAll("[data-i18n-language]").forEach((select) => {
      select.value = language;
      if (!select.dataset.i18nBound) {
        select.dataset.i18nBound = "true";
        select.addEventListener("change", () => setLanguage(select.value));
      }
    });
  }

  function setLanguage(nextLanguage, persist = true) {
    const next = SUPPORTED.has(nextLanguage) ? nextLanguage : "en";
    const changed = next !== language;
    language = next;
    document.documentElement.lang = next;
    if (persist) {
      try { global.localStorage.setItem(STORAGE_KEY, next); } catch (_) {}
    }
    syncSelectors();
    translateTree(document, changed);
    if (changed) document.dispatchEvent(new CustomEvent("hvccps-languagechange", { detail: { language } }));
  }

  function start() {
    setLanguage(language, false);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") translateTextNode(mutation.target);
        if (mutation.type === "attributes") translateAttributes(mutation.target);
        for (const node of mutation.addedNodes || []) translateTree(node);
      }
    });
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATTRIBUTES
    });
  }

  global.HvccpsI18n = {
    get language() { return language; },
    setLanguage,
    t(value) { return translateNormalized(normalize(value)); },
    translateTree
  };
  document.addEventListener("DOMContentLoaded", start, { once: true });
})(window);
