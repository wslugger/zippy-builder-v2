import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { contextType, promptData } = body;

        // Simulate AI processing latency
        await new Promise(resolve => setTimeout(resolve, 800));

        if (contextType === "sa_lan_ports") {
            // Mock reasoning based on selected site type name
            const siteTypeName = promptData?.lanSiteTypeName?.toLowerCase() || "";
            let suggestedPorts = 48; // default

            if (siteTypeName.includes("campus") || siteTypeName.includes("large")) {
                suggestedPorts = 96;
            } else if (siteTypeName.includes("branch") || siteTypeName.includes("small") || siteTypeName.includes("micro")) {
                suggestedPorts = 24;
            }

            return NextResponse.json({
                suggestion: suggestedPorts
            });
        }

        if (contextType === "admin_service_description") {
            const { name, shortDescription, pros, cons } = promptData || {};
            const pText = (pros || []).join(", ");
            const cText = (cons || []).join(", ");

            const suggestion = `The ${name || "Service"} provides ${shortDescription || "robust connectivity"}. Engineered for modern enterprise environments, it maximizes operational efficiency while minimizing downtime. Key advantages include ${pText || "scalability and high availability"}. Technical considerations to review include ${cText || "environmental constraints"}.`;
            return NextResponse.json({
                suggestion
            });
        }

        return NextResponse.json(
            { error: "Unknown context type" },
            { status: 400 }
        );

    } catch (error) {
        console.error("Copilot API Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
