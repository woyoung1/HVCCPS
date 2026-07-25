// Searchable multi-select over the metric catalogue. Owns no state of its own:
// it reads and writes the shared chart selection.

HV.define("ui/views/signal-picker", function (require, exports) {
"use strict";

const { h, qs, setChecked, setHidden, setText } = require("core/dom");
const { onLanguageChange, t } = require("i18n/index");
const { METRIC_GROUPS, TELEMETRY_METRICS, metricAxisKey, metricLabelKey } = require("device/metrics");

function mountSignalPicker({ root, selection }) {
  const groups = qs(root, '[data-el="groups"]');
  const noMatch = qs(root, '[data-el="noMatch"]');
  const search = qs(root, '[data-el="search"]');
  const count = qs(root, '[data-el="pickerCount"]');
  const closeButton = qs(root, '[data-el="pickerClose"]');
  const selectAll = qs(root, '[data-el="selectAll"]');
  const clearAll = qs(root, '[data-el="clearAll"]');

  /** @type {Record<string, HTMLInputElement>} */
  let checkboxes = {};
  let query = "";
  const closeHandlers = new Set();

  function build() {
    groups.replaceChildren();
    checkboxes = {};
    for (const groupName of METRIC_GROUPS) {
      const metrics = TELEMETRY_METRICS.filter((metric) => metric.group === groupName);
      if (metrics.length === 0) continue;

      const section = h("section.signal-group", { dataset: { group: groupName } }, h("h3", null, t(`group.${groupName}`)));

      for (const metric of metrics) {
        const label = t(metricLabelKey(metric.key));
        const axis = t(metricAxisKey(metric.key));
        const checkbox = h("input", {
          type: "checkbox",
          onchange: (event) => selection.toggle(metric.key, event.target.checked)
        });
        checkboxes[metric.key] = checkbox;

        const option = h(
          "label.signal-option",
          {
            dataset: {
              option: metric.key,
              search: `${t(`group.${groupName}`)} ${metric.key} ${label} ${axis}`.toLowerCase()
            }
          },
          checkbox,
          h("strong", null, label),
          h("em", null, axis)
        );
        section.append(option);
      }
      groups.append(section);
    }
    filter();
  }

  function filter() {
    const needle = query.trim().toLowerCase();
    let visible = 0;
    for (const section of groups.querySelectorAll("[data-group]")) {
      let groupVisible = 0;
      for (const option of section.querySelectorAll("[data-option]")) {
        const show = needle.length === 0 || option.dataset.search.includes(needle);
        setHidden(option, !show);
        if (show) {
          visible += 1;
          groupVisible += 1;
        }
      }
      setHidden(section, groupVisible === 0);
    }
    setHidden(noMatch, visible > 0);
  }

  search.addEventListener("input", () => {
    query = search.value;
    filter();
  });
  selectAll.addEventListener("click", () => selection.set(TELEMETRY_METRICS.map((metric) => metric.key)));
  clearAll.addEventListener("click", () => selection.set([]));
  closeButton.addEventListener("click", () => {
    for (const handler of closeHandlers) handler();
  });

  onLanguageChange(build);
  build();

  return {
    sync() {
      for (const metric of TELEMETRY_METRICS) {
        setChecked(checkboxes[metric.key], selection.has(metric.key));
      }
      setText(
        count,
        selection.count() === 0 ? t("plot.noSignals") : t("plot.selectedCount", { n: selection.count() })
      );
    },
    focusSearch() {
      window.setTimeout(() => search.focus(), 0);
    },
    onClose(handler) {
      closeHandlers.add(handler);
    }
  };
}

exports.mountSignalPicker = mountSignalPicker;
});
