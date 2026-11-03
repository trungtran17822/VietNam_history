/* Unicode normalization and rendered-text guard for all data and DOM entry points. */
(function (window, document) {
  'use strict';

  function normalizeVietnamese(value) {
    if (typeof value === 'string') return value.normalize('NFC');
    if (Array.isArray(value)) return value.map(normalizeVietnamese);
    if (value && typeof value === 'object') {
      const normalized = {};
      Object.keys(value).forEach((key) => {
        normalized[normalizeVietnamese(key)] = normalizeVietnamese(value[key]);
      });
      return normalized;
    }
    return value;
  }

  window.normalizeVietnamese = normalizeVietnamese;

  const textDescriptor = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
  if (textDescriptor && textDescriptor.set && textDescriptor.configurable) {
    Object.defineProperty(Node.prototype, 'textContent', Object.assign({}, textDescriptor, {
      set(value) { textDescriptor.set.call(this, typeof value === 'string' ? normalizeVietnamese(value) : value); }
    }));
  }

  const htmlDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
  if (htmlDescriptor && htmlDescriptor.set && htmlDescriptor.configurable) {
    Object.defineProperty(Element.prototype, 'innerHTML', Object.assign({}, htmlDescriptor, {
      set(value) { htmlDescriptor.set.call(this, typeof value === 'string' ? normalizeVietnamese(value) : value); }
    }));
  }

  const setAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (name, value) {
    return setAttribute.call(this, name, typeof value === 'string' ? normalizeVietnamese(value) : value);
  };

  function normalizeTree(root) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let textNode;
    while ((textNode = walker.nextNode())) {
      if (textNode.parentElement && !/^(SCRIPT|STYLE)$/.test(textNode.parentElement.tagName)) {
        const normalized = normalizeVietnamese(textNode.nodeValue);
        if (normalized !== textNode.nodeValue) textNode.nodeValue = normalized;
      }
    }
    if (root.nodeType === Node.ELEMENT_NODE) {
      ['title', 'placeholder', 'aria-label', 'alt'].forEach((name) => {
        if (root.hasAttribute(name)) {
          const value = root.getAttribute(name);
          const normalized = normalizeVietnamese(value);
          if (normalized !== value) setAttribute.call(root, name, normalized);
        }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    normalizeTree(document.body);
    document.title = normalizeVietnamese(document.title);
    new MutationObserver((records) => records.forEach((record) => {
      if (record.type === 'characterData') {
        const normalized = normalizeVietnamese(record.target.nodeValue);
        if (normalized !== record.target.nodeValue) record.target.nodeValue = normalized;
      } else {
        record.addedNodes.forEach(normalizeTree);
      }
    })).observe(document.body, { subtree: true, childList: true, characterData: true });
  }, { once: true });
})(window, document);
