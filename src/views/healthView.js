function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return 'n/a';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(1)} ${units[unit]}`;
}

function formatLoadAvg(loadAvg) {
  if (!Array.isArray(loadAvg)) return 'n/a';
  return loadAvg.map((value) => value.toFixed(2)).join(' ');
}

function renderKeyValueRows(items) {
  return items
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(
      ([label, value]) => `
        <div class="kv-row">
          <span class="kv-label">${escapeHtml(label)}</span>
          <span class="kv-value">${escapeHtml(value)}</span>
        </div>
      `
    )
    .join('');
}

function renderServiceCard(service) {
  const details = service.details || {};
  const rows = renderKeyValueRows([
    ['State', details.state],
    ['Ping', details.pingMs !== undefined ? `${details.pingMs} ms` : undefined],
    ['Note', details.note],
    ['Error', details.error],
  ]);

  return `
    <article class="card service-card status-${escapeHtml(service.status)}">
      <header class="card-header">
        <h3>${escapeHtml(service.name)}</h3>
        <span class="status-pill">${escapeHtml(service.status.toUpperCase())}</span>
      </header>
      <div class="card-body">
        ${rows || '<div class="kv-empty">No details reported.</div>'}
      </div>
    </article>
  `;
}

function renderHealthPage(report) {
  const serviceCards = report.services.map(renderServiceCard).join('');
  const processRows = renderKeyValueRows([
    ['Environment', report.env],
    ['Node', report.process.node],
    ['PID', report.process.pid],
    ['Uptime', report.process.uptime],
    ['RSS', formatBytes(report.process.memory.rss)],
    ['Heap Used', formatBytes(report.process.memory.heapUsed)],
    ['Heap Total', formatBytes(report.process.memory.heapTotal)],
  ]);
  const systemRows = renderKeyValueRows([
    ['Hostname', report.system.hostname],
    ['Platform', report.system.platform],
    ['CPU Count', report.system.cpuCount],
    ['Load Avg', formatLoadAvg(report.system.loadAvg)],
    ['Uptime', report.system.uptime],
    ['Total Memory', formatBytes(report.system.totalMemory)],
    ['Free Memory', formatBytes(report.system.freeMemory)],
  ]);

  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>HPN Backend Health</title>
      <style>
        :root {
          --bg-1: #0b1020;
          --bg-2: #1b2138;
          --card: rgba(255, 255, 255, 0.08);
          --card-border: rgba(255, 255, 255, 0.18);
          --text: #f8fafc;
          --muted: rgba(248, 250, 252, 0.7);
          --ok: #30d990;
          --warn: #f7b731;
          --fail: #ff6b6b;
          --accent: #f2c14e;
        }

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          min-height: 100vh;
          font-family: "Trebuchet MS", "Lucida Sans", "Lucida Grande", sans-serif;
          color: var(--text);
          background:
            radial-gradient(1200px 600px at 10% 0%, rgba(242, 193, 78, 0.2), transparent 60%),
            radial-gradient(900px 500px at 90% 10%, rgba(48, 217, 144, 0.18), transparent 65%),
            linear-gradient(135deg, var(--bg-1), var(--bg-2));
        }

        .page {
          max-width: 1100px;
          margin: 0 auto;
          padding: 40px 24px 60px;
          position: relative;
        }

        .page::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image: linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
          background-size: 40px 40px;
          opacity: 0.35;
          pointer-events: none;
        }

        header.hero {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          position: relative;
          z-index: 1;
          padding: 24px 28px;
          background: rgba(11, 16, 32, 0.7);
          border: 1px solid var(--card-border);
          border-radius: 20px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
          animation: rise 700ms ease-out both;
        }

        .eyebrow {
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: var(--muted);
          font-size: 11px;
        }

        h1 {
          margin: 6px 0;
          font-size: clamp(28px, 4vw, 42px);
          font-family: "Palatino Linotype", "Book Antiqua", Palatino, serif;
        }

        .meta {
          color: var(--muted);
          font-size: 14px;
        }

        .overall {
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 700;
          font-size: 16px;
          background: rgba(255, 255, 255, 0.08);
          padding: 12px 16px;
          border-radius: 999px;
          border: 1px solid var(--card-border);
        }

        .overall .dot {
          width: 12px;
          height: 12px;
          border-radius: 999px;
          background: var(--ok);
          box-shadow: 0 0 12px rgba(48, 217, 144, 0.6);
        }

        .status-warn .dot {
          background: var(--warn);
          box-shadow: 0 0 12px rgba(247, 183, 49, 0.6);
        }

        .status-fail .dot {
          background: var(--fail);
          box-shadow: 0 0 12px rgba(255, 107, 107, 0.6);
        }

        .section {
          margin-top: 32px;
          position: relative;
          z-index: 1;
        }

        .section h2 {
          font-family: "Palatino Linotype", "Book Antiqua", Palatino, serif;
          font-size: 20px;
          margin: 0 0 16px;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 18px;
        }

        .card {
          background: var(--card);
          border: 1px solid var(--card-border);
          border-radius: 18px;
          padding: 18px 20px;
          backdrop-filter: blur(6px);
          animation: fadeIn 800ms ease-out both;
        }

        .card:nth-child(2) {
          animation-delay: 80ms;
        }

        .card:nth-child(3) {
          animation-delay: 160ms;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .card h3 {
          margin: 0;
          font-size: 18px;
        }

        .status-pill {
          font-size: 12px;
          padding: 6px 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid var(--card-border);
          color: var(--text);
        }

        .status-ok .status-pill {
          color: var(--ok);
        }

        .status-warn .status-pill {
          color: var(--warn);
        }

        .status-fail .status-pill {
          color: var(--fail);
        }

        .kv-row {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          font-size: 14px;
          padding: 6px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .kv-row:last-child {
          border-bottom: none;
        }

        .kv-label {
          color: var(--muted);
        }

        .kv-empty {
          color: var(--muted);
          font-size: 14px;
        }

        .footer {
          margin-top: 28px;
          color: var(--muted);
          font-size: 13px;
          text-align: right;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes rise {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 640px) {
          header.hero {
            flex-direction: column;
            align-items: flex-start;
          }

          .overall {
            width: 100%;
            justify-content: space-between;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation: none !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="page">
        <header class="hero status-${escapeHtml(report.status)}">
          <div>
            <div class="eyebrow">HPN Backend</div>
            <h1>Service Health</h1>
            <div class="meta">Generated at ${escapeHtml(report.generatedAt)}</div>
          </div>
          <div class="overall status-${escapeHtml(report.status)}">
            <span class="dot"></span>
            <span>${escapeHtml(report.status.toUpperCase())}</span>
          </div>
        </header>

        <section class="section">
          <h2>Dependencies</h2>
          <div class="grid">
            ${serviceCards}
          </div>
        </section>

        <section class="section">
          <h2>Process</h2>
          <div class="grid">
            <article class="card">
              ${processRows}
            </article>
          </div>
        </section>

        <section class="section">
          <h2>System</h2>
          <div class="grid">
            <article class="card">
              ${systemRows}
            </article>
          </div>
        </section>

        <div class="footer">HPN Mobile Backend Health Report</div>
      </div>
    </body>
  </html>`;
}

module.exports = { renderHealthPage };
