import {
    useCallback,
    useMemo,
    useState,
    startTransition,
    type KeyboardEvent,
} from "react"
import { addPropertyControls, ControlType } from "framer"

// User request: Update the existing SEOAuditWidget.tsx code component to match the user's originally supplied SEOAuditWidget code as closely as possible. Keep the component display name SEOAuditWidget and default export. Use property controls named accent, placeholder, and endpoint with defaults #34D399, yoursite.framer.app, and https://first-rank-proxy.vercel.app/api/audit. Runtime behavior must match: if URL is empty show "Enter a page URL to audit."; if missing protocol prefix https://; POST JSON { url: target }; button text is "Audit" and loading text is "Auditing…"; render score, summary counts, sorted checks by status order fail/warning/pass/summary, and footer copy "Graded by First Rank Pro — a deterministic SEO engine. Same page, same score." Preserve the dark inline styles from the provided code, including input/button row. Do not add unrelated behavior or dependencies. TypeScript adjustments are fine only as needed to compile.

interface MyComponentProps {
    accent: string
    placeholder: string
    endpoint: string
}

type AuditCheck = {
    key?: string
    id?: string
    name?: string
    status: string
    reason?: string
    message?: string
}

type AuditResult = {
    score?: number
    summary?: {
        fail?: number
        warning?: number
        pass?: number
        summary?: number
    }
    checks?:
        | AuditCheck[]
        | Record<
              string,
              {
                  id?: string
                  name?: string
                  status?: string
                  reason?: string
                  message?: string
              }
          >
}

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 */
export default function SEOAuditWidget(props: MyComponentProps) {
    const {
        accent = "#34D399",
        placeholder = "yoursite.framer.app",
        endpoint = "https://first-rank-proxy.vercel.app/api/audit",
    } = props

    const [url, setUrl] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [result, setResult] = useState<AuditResult | null>(null)

    const runAudit = useCallback(async () => {
        const trimmedUrl = url.trim()
        if (!trimmedUrl) {
            startTransition(() => {
                setError("Enter a page URL to audit.")
                setResult(null)
            })
            return
        }

        const target = /^https?:\/\//i.test(trimmedUrl)
            ? trimmedUrl
            : `https://${trimmedUrl}`

        startTransition(() => {
            setLoading(true)
            setError("")
            setResult(null)
        })

        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: target }),
            })

            if (!response.ok) {
                throw new Error(`Request failed with status ${response.status}`)
            }

            const data = await response.json()
            startTransition(() => {
                setResult(data)
            })
        } catch (err) {
            const message = err instanceof Error ? err.message : "Audit failed."
            startTransition(() => {
                setError(message)
                setResult(null)
            })
        } finally {
            startTransition(() => {
                setLoading(false)
            })
        }
    }, [endpoint, url])

    const onInputKeyDown = useCallback(
        (event: KeyboardEvent<HTMLInputElement>) => {
            if (event.key === "Enter") {
                event.preventDefault()
                runAudit()
            }
        },
        [runAudit]
    )

    const sortedChecks = useMemo<AuditCheck[]>(() => {
        if (!result?.checks) return []
        const statusOrder: Record<string, number> = {
            fail: 0,
            warning: 1,
            pass: 2,
            summary: 3,
        }

        if (Array.isArray(result.checks)) {
            return [...result.checks].sort((a, b) => {
                const aStatus = String(a?.status ?? "").toLowerCase()
                const bStatus = String(b?.status ?? "").toLowerCase()
                const aRank =
                    aStatus in statusOrder
                        ? statusOrder[aStatus]
                        : Number.MAX_SAFE_INTEGER
                const bRank =
                    bStatus in statusOrder
                        ? statusOrder[bStatus]
                        : Number.MAX_SAFE_INTEGER
                if (aRank !== bRank) return aRank - bRank
                const aLabel = String(a?.name ?? a?.id ?? a?.key ?? "")
                const bLabel = String(b?.name ?? b?.id ?? b?.key ?? "")
                return aLabel.localeCompare(bLabel)
            })
        }

        const checksRecord = result.checks as Record<
            string,
            { id?: string; name?: string; status?: string; reason?: string; message?: string }
        >
        return Object.keys(checksRecord)
            .map((key) => ({
                key,
                id: checksRecord[key]?.id ?? key,
                name: checksRecord[key]?.name,
                ...checksRecord[key],
                status: String(checksRecord[key]?.status ?? ""),
            }))
            .sort((a, b) => {
                const aStatus = String(a.status).toLowerCase()
                const bStatus = String(b.status).toLowerCase()
                const aRank =
                    aStatus in statusOrder
                        ? statusOrder[aStatus]
                        : Number.MAX_SAFE_INTEGER
                const bRank =
                    bStatus in statusOrder
                        ? statusOrder[bStatus]
                        : Number.MAX_SAFE_INTEGER
                if (aRank !== bRank) return aRank - bRank
                const aLabel = String(a.name ?? a.id ?? a.key ?? "")
                const bLabel = String(b.name ?? b.id ?? b.key ?? "")
                return aLabel.localeCompare(bLabel)
            })
    }, [result])

    const summary = useMemo(() => {
        const fromResult = result?.summary
        if (fromResult) {
            return {
                fail: Number(fromResult.fail ?? 0),
                warning: Number(fromResult.warning ?? 0),
                pass: Number(fromResult.pass ?? 0),
                summary: Number(fromResult.summary ?? 0),
            }
        }

        return sortedChecks.reduce(
            (acc, check) => {
                const status = String(check.status).toLowerCase()
                if (status === "fail") acc.fail += 1
                else if (status === "warning") acc.warning += 1
                else if (status === "pass") acc.pass += 1
                else if (status === "summary") acc.summary += 1
                return acc
            },
            { fail: 0, warning: 0, pass: 0, summary: 0 }
        )
    }, [result, sortedChecks])

    // Group checks into the three scoring dimensions. The geo-*/eeat-* ids only
    // appear once the GEO + E-E-A-T checks are deployed; until then only the
    // "Classic SEO" group renders (empty groups are dropped).
    const groupedChecks = useMemo(() => {
        const groups: { key: string; label: string; checks: AuditCheck[] }[] = [
            { key: "classic", label: "Classic SEO", checks: [] },
            { key: "geo", label: "GEO · AI-citability", checks: [] },
            { key: "eeat", label: "E-E-A-T trust", checks: [] },
        ]
        for (const check of sortedChecks) {
            const id = String(check.id ?? check.key ?? "").toLowerCase()
            if (id.startsWith("geo-")) groups[1].checks.push(check)
            else if (id.startsWith("eeat-")) groups[2].checks.push(check)
            else groups[0].checks.push(check)
        }
        return groups.filter((group) => group.checks.length > 0)
    }, [sortedChecks])

    return (
        <div
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                background: "#111111",
                color: "#EDEDED",
                borderRadius: 12,
                border: "1px solid #222222",
                boxSizing: "border-box",
                padding: 16,
                fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                overflow: "auto",
            }}
        >
            <div style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "flex", gap: 8 }}>
                    <input
                        id="seo-audit-url"
                        type="url"
                        value={url}
                        onChange={(event) => {
                            const nextValue = event.target.value
                            startTransition(() => setUrl(nextValue))
                        }}
                        onKeyDown={onInputKeyDown}
                        placeholder={placeholder}
                        style={{
                            flex: 1,
                            minWidth: 0,
                            background: "#1B1B1B",
                            color: "#F5F5F5",
                            border: "1px solid #2D2D2D",
                            borderRadius: 8,
                            padding: "10px 12px",
                            outline: "none",
                            boxSizing: "border-box",
                        }}
                        aria-label="Website URL"
                    />
                    <button
                        type="button"
                        onClick={runAudit}
                        disabled={loading}
                        style={{
                            width: 96,
                            border: "none",
                            borderRadius: 8,
                            padding: "10px 12px",
                            background: accent,
                            color: "#04220F",
                            cursor: loading ? "not-allowed" : "pointer",
                            opacity: loading ? 0.75 : 1,
                            fontWeight: 600,
                        }}
                        aria-busy={loading}
                    >
                        {loading ? "Auditing…" : "Audit"}
                    </button>
                </div>
            </div>

            {error ? (
                <div
                    role="status"
                    style={{
                        marginTop: 12,
                        fontSize: 12,
                        color: "#FF8A8A",
                        lineHeight: 1.4,
                    }}
                >
                    {error}
                </div>
            ) : null}

            {result ? (
                <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                    <div
                        style={{
                            background: "#161616",
                            border: "1px solid #2B2B2B",
                            borderRadius: 8,
                            padding: "12px",
                        }}
                    >
                        <div style={{ fontSize: 12, color: "#9CA3AF" }}>
                            Score
                        </div>
                        <div
                            style={{
                                fontSize: 28,
                                fontWeight: 700,
                                color: "#F9FAFB",
                            }}
                        >
                            {Number(result.score ?? 0)}
                        </div>
                        <div
                            style={{
                                marginTop: 8,
                                display: "flex",
                                gap: 10,
                                flexWrap: "wrap",
                                fontSize: 12,
                                color: "#D1D5DB",
                            }}
                        >
                            <span>Fail: {summary.fail}</span>
                            <span>Warning: {summary.warning}</span>
                            <span>Pass: {summary.pass}</span>
                            <span>Summary: {summary.summary}</span>
                        </div>
                    </div>
                    {groupedChecks.map((group) => (
                        <div key={group.key} style={{ display: "grid", gap: 8 }}>
                            <div
                                style={{
                                    marginTop: 4,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    letterSpacing: 0.5,
                                    textTransform: "uppercase",
                                    color: "#9CA3AF",
                                }}
                            >
                                {group.label}{" "}
                                <span style={{ color: "#6B7280", fontWeight: 400 }}>
                                    ({group.checks.length})
                                </span>
                            </div>
                            {group.checks.map((check, index: number) => (
                                <div
                                    key={`${String(check.id ?? check.key ?? check.name ?? "check")}-${index}`}
                                    style={{
                                        background: "#191919",
                                        border: "1px solid #2B2B2B",
                                        borderRadius: 8,
                                        padding: "10px 12px",
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            gap: 8,
                                        }}
                                    >
                                        <span style={{ fontSize: 13, color: "#F5F5F5" }}>
                                            {String(
                                                check.name ??
                                                    check.id ??
                                                    check.key ??
                                                    "Check"
                                            )}
                                        </span>
                                        <span
                                            style={{
                                                fontSize: 12,
                                                color:
                                                    String(check.status).toLowerCase() === "pass"
                                                        ? "#78E08F"
                                                        : String(check.status).toLowerCase() === "fail"
                                                          ? "#FF8A8A"
                                                          : "#FFB86B",
                                            }}
                                        >
                                            {String(check.status)}
                                        </span>
                                    </div>
                                    {(check.reason ?? check.message) ? (
                                        <div
                                            style={{
                                                marginTop: 6,
                                                fontSize: 12,
                                                color: "#BEBEBE",
                                                lineHeight: 1.4,
                                            }}
                                        >
                                            {String(check.reason ?? check.message)}
                                        </div>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    ))}
                    <div
                        style={{
                            marginTop: 2,
                            fontSize: 11,
                            color: "#9CA3AF",
                            lineHeight: 1.5,
                        }}
                    >
                        Graded by First Rank Pro — a deterministic SEO engine.
                        Same page, same score.
                    </div>
                </div>
            ) : null}
        </div>
    )
}

addPropertyControls(SEOAuditWidget, {
    accent: {
        type: ControlType.Color,
        title: "Accent",
        defaultValue: "#34D399",
    },
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
