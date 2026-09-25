/**
 * renderer-echarts.js – der kleine Controller zwischen Diagramm und ECharts.
 *
 * Das Diagramm baut nur die fertige ECharts-Option. Wer sie zeichnet, ist ihm
 * egal – das erledigt ein Renderer mit vier Methoden:
 *
 *   mount(host)          Zeichenfläche in `host` anlegen, Griff zurückgeben
 *   draw(griff, option)  Option anwenden
 *   resize(griff)        Größe neu messen (nach Vollbild, Layoutwechsel …)
 *   destroy(griff)       aufräumen
 *
 * Dieser hier spricht direkt mit ECharts. ECharts wird nicht mitgeliefert,
 * sondern übergeben – so bleibt das Paket klein und jedes Projekt benutzt die
 * Fassung, die es ohnehin schon hat:
 *
 *   import * as echarts from 'echarts';
 *   import { echartsRenderer } from './renderer-echarts.js';
 *   new Diagramm(host, { renderer: echartsRenderer(echarts) });
 *
 * Projekte mit eigener Diagramm-Schicht – Home Assistant liefert mit
 * `ha-chart-base` bereits eine mit – schreiben stattdessen einen eigenen
 * Renderer nach demselben Muster. Nur diese eine Datei ist dann doppelt,
 * alles andere bleibt gleich.
 */

/**
 * @param {object} echarts  Das ECharts-Modul (echarts.init, echarts.dispose …)
 * @param {object} [opts]
 * @param {string} [opts.renderer='canvas']  'canvas' oder 'svg'
 * @param {string|object} [opts.theme]       ECharts-Theme
 */
export function echartsRenderer(echarts, opts = {}) {
  if (!echarts?.init) throw new Error('[diagramm] echartsRenderer braucht das ECharts-Modul.');

  return {
    mount(host) {
      const box = document.createElement('div');
      box.className = 'dg_canvas';
      host.appendChild(box);
      const chart = echarts.init(box, opts.theme ?? null, { renderer: opts.renderer ?? 'canvas' });
      return { box, chart };
    },

    draw(griff, option) {
      // notMerge: alte Reihen sollen verschwinden, wenn die Konfiguration
      // wechselt – sonst bleiben abgewählte Serien als Leichen stehen.
      griff.chart.setOption(option, { notMerge: true });
    },

    resize(griff) {
      griff.chart.resize();
    },

    destroy(griff) {
      griff.chart.dispose();
      griff.box.remove();
    },
  };
}
