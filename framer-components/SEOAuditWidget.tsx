import { useState, useCallback } from "react"
import { addPropertyControls, ControlType } from "framer"

/**
 * First Rank Pro — live SEO audit widget.
 *
 * Enter any Framer page URL and get a deterministic SEO score (0–100) plus the
 * per-check results, rendered right below the input. No focus keyword needed.
 *
 * Add in Framer: Assets → Code → New Code File → paste this → drag onto the page.
 * The audit endpoint is CORS-open, so it works on the published site.
 *
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any
 */
export default function SEOAuditWidget(props) {
    const {
        accent = "#34D399",
        placeholder = "yoursite.framer.app",
        endpoint = "https://first-rank-proxy.vercel.app/api/audit",
    } = props

    const [url, setUrl] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [result, setResult] = useState(null)

    const runAudit = useCallback(async () => {
        setError("")
        setResult(null)
        let target = url.trim()
        if (!target) {
            setError("Enter a page URL to audit.")
            return
        }
        if (!/^https?:\/\//i.test(target)) target = "https://" + target
        setLoading(true)
        try {
            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: target }),
            })
            const data = await res.json()
            if (!res.ok || data.error) {
                setError(data.error || "Audit failed. Check the URL and try again.")
            } else {
                setResult(data)
            }
        } catch (e) {
            setError("Couldn't reach the audit service. Check the URL and try again.")
        } finally {
            setLoading(false)
        }
    }, [url, endpoint])

    const onKeyDown = (e) => {
        if (e.key === "Enter") runAudit()
    }

    const scoreColor = (s) => (s >= 80 ? accent : s >= 50 ? "#FBBF24" : "#F87171")
    const statusColor = { pass: accent, warning: "#FBBF24", fail: "#F87171", summary: "#9A9AA2" }
    const statusIcon = { pass: "✓", warning: "!", fail: "✕", summary: "•" }
    const order = { fail: 0, warning: 1, pass: 2, summary: 3 }
    const checks = result ? [...result.checks].sort((a, b) => order[a.status] - order[b.status]) : []

    return (
        <div style={styles.wrap}>
            <div style={styles.inputRow}>
                <input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder={placeholder}
                    style={styles.input}
                    spellCheck={false}
                    autoCapitalize="none"
                    autoCorrect="off"
                />
                <button
                    onClick={runAudit}
                    disabled={loading}
                    style={{ ...styles.button, background: accent, opacity: loading ? 0.6 : 1 }}
                >
                    {loading ? "Auditing…" : "Audit"}
                </button>
            </div>

            {error ? <div style={styles.error}>{error}</div> : null}

            {result ? (
                <div style={styles.results}>
                    <div style={styles.scoreRow}>
                        <div style={{ ...styles.score, color: scoreColor(result.score) }}>
                            {result.score}
                            <span style={styles.scoreMax}>/100</span>
                        </div>
                        <div style={styles.summary}>
                            <span style={{ color: accent }}>{result.summary.pass} passed</span>
                            <span style={{ color: "#FBBF24" }}>{result.summary.warning} warnings</span>
                            <span style={{ color: "#F87171" }}>{result.summary.fail} failing</span>
                        </div>
                    </div>

                    <div style={styles.checkList}>
                        {checks.map((c) => (
                            <div key={c.id} style={styles.checkRow}>
                                <span style={{ ...styles.icon, color: statusColor[c.status] }}>
                                    {statusIcon[c.status]}
                                </span>
                                <div style={styles.checkText}>
                                    <div style={styles.checkName}>{c.name}</div>
                                    <div style={styles.checkReason}>{c.reason}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={styles.foot}>
                        Graded by First Rank Pro — a deterministic SEO engine. Same page, same score.
                    </div>
                </div>
            ) : null}
        </div>
    )
}

const styles = {
    wrap: {
        width: "100%",
        fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif",
        color: "#EDEDED",
        boxSizing: "border-box",
    },
    inputRow: { display: "flex", gap: 8, width: "100%" },
    input: {
        flex: 1,
        minWidth: 0,
        height: 50,
        padding: "0 16px",
        borderRadius: 10,
        border: "1px solid #2A2A30",
        background: "#141418",
        color: "#EDEDED",
        fontSize: 15,
        outline: "none",
        boxSizing: "border-box",
    },
    button: {
        height: 50,
        padding: "0 24px",
        borderRadius: 10,
        border: "none",
        color: "#0A0A0B",
        fontSize: 15,
        fontWeight: 600,
        cursor: "pointer",
        whiteSpace: "nowrap",
    },
    error: {
        marginTop: 12,
        padding: "10px 14px",
        borderRadius: 10,
        background: "rgba(248,113,113,0.10)",
        color: "#F87171",
        fontSize: 14,
    },
    results: {
        marginTop: 20,
        padding: 20,
        borderRadius: 14,
        border: "1px solid #1E1E22",
        background: "#0E0E11",
    },
    scoreRow: { display: "flex", alignItems: "baseline", gap: 18, flexWrap: "wrap" },
    score: {
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
        fontSize: 56,
        fontWeight: 700,
        lineHeight: 1,
    },
    scoreMax: { fontSize: 20, color: "#9A9AA2", marginLeft: 4 },
    summary: { display: "flex", gap: 16, fontSize: 14, fontWeight: 500, flexWrap: "wrap" },
    checkList: { marginTop: 18, display: "flex", flexDirection: "column" },
    checkRow: {
        display: "flex",
        gap: 12,
        padding: "11px 0",
        borderTop: "1px solid #1A1A1E",
        alignItems: "flex-start",
    },
    icon: {
        fontFamily: "ui-monospace, monospace",
        fontWeight: 700,
        fontSize: 14,
        width: 16,
        textAlign: "center",
        flexShrink: 0,
        marginTop: 1,
    },
    checkText: { display: "flex", flexDirection: "column", gap: 2 },
    checkName: { fontSize: 14, fontWeight: 600 },
    checkReason: { fontSize: 13, color: "#9A9AA2", lineHeight: 1.5 },
    foot: { marginTop: 16, fontSize: 12, color: "#6B6B72" },
}

addPropertyControls(SEOAuditWidget, {
    accent: { type: ControlType.Color, title: "Accent", defaultValue: "#34D399" },
    placeholder: {
        type: ControlType.String,
        title: "Placeholder",
        defaultValue: "yoursite.framer.app",
    },
    endpoint: {
        type: ControlType.String,
        title: "Endpoint",
        defaultValue: "https://first-rank-proxy.vercel.app/api/audit",
    },
})
