"use client";

interface Props {
    requiredLanPorts: number;
    providedLanPorts: number;
    requiredPoePorts: number;
    providedPoePorts: number;
    totalAccessGbps: number;
    totalUplinkGbps: number;
}

interface BadgeProps {
    label: string;
    status: "ok" | "warn" | "error" | "neutral";
    value: string;
    detail: string;
}

function Badge({ label, status, value, detail }: BadgeProps) {
    const colors = {
        ok: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400",
        warn: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400",
        error: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400",
        neutral: "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400",
    };
    const icons = { ok: "✓", warn: "⚠", error: "✗", neutral: "—" };

    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${colors[status]}`}>
            <span className="font-bold text-sm leading-none">{icons[status]}</span>
            <div>
                <span className="text-[10px] uppercase tracking-wider font-bold opacity-70">{label} </span>
                <span className="font-bold">{value}</span>
                <span className="opacity-60 ml-1.5 font-normal">{detail}</span>
            </div>
        </div>
    );
}

export function LANValidationBar({
    requiredLanPorts,
    providedLanPorts,
    requiredPoePorts,
    providedPoePorts,
    totalAccessGbps,
    totalUplinkGbps,
}: Props) {
    // Port badge
    const portStatus = (() => {
        if (requiredLanPorts === 0 && providedLanPorts === 0) return "neutral" as const;
        if (providedLanPorts === 0 && requiredLanPorts > 0) return "error" as const;
        if (providedLanPorts >= requiredLanPorts) return "ok" as const;
        return "error" as const;
    })();
    const portPct = providedLanPorts > 0 ? Math.round((requiredLanPorts / providedLanPorts) * 100) : 0;

    // PoE badge
    const poeStatus = (() => {
        if (requiredPoePorts === 0 && providedPoePorts === 0) return "neutral" as const;
        if (requiredPoePorts === 0) return "neutral" as const;
        if (providedPoePorts === 0) return "error" as const;
        if (providedPoePorts >= requiredPoePorts) return "ok" as const;
        return "error" as const;
    })();

    // Oversubscription badge
    const oversubRatio = totalUplinkGbps > 0 ? totalAccessGbps / totalUplinkGbps : 0;
    const oversubStatus = totalUplinkGbps === 0
        ? ("neutral" as const)
        : oversubRatio > 50
            ? ("error" as const)
            : oversubRatio > 20
                ? ("warn" as const)
                : ("ok" as const);
    const oversubLabel = totalUplinkGbps === 0 ? "N/A" : `${oversubRatio.toFixed(1)}:1`;

    if (providedLanPorts === 0 && providedPoePorts === 0) return null;

    return (
        <div
            id="lan-validation-bar"
            className="flex flex-wrap items-center gap-2 px-1"
        >
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Validation</span>
            <Badge
                label="Ports"
                status={portStatus}
                value={portStatus === "neutral" ? "—" : `${requiredLanPorts}/${providedLanPorts}`}
                detail={portStatus === "ok" ? `${portPct}% utilization` : portStatus === "error" ? "Not covered" : ""}
            />
            {(requiredPoePorts > 0 || providedPoePorts > 0) && (
                <Badge
                    label="PoE"
                    status={poeStatus}
                    value={poeStatus === "neutral" ? "—" : `${requiredPoePorts}/${providedPoePorts} ports`}
                    detail={poeStatus === "ok" ? "Covered" : poeStatus === "error" ? "Insufficient" : ""}
                />
            )}
            <Badge
                label="Oversub"
                status={oversubStatus}
                value={oversubLabel}
                detail={totalUplinkGbps > 0 ? `${totalAccessGbps.toFixed(0)}G edge / ${totalUplinkGbps.toFixed(0)}G up` : "No selections"}
            />
        </div>
    );
}
