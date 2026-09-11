import { getWCAGCriteria } from "./mapping";

export function parseAxeResults(violations: any[]) {

    return violations.map((violation: any) => {

        const wcag = getWCAGCriteria(violation.id);

        return {

            rule: violation.id,

            description: violation.description,

            help: violation.help,

            impact: violation.impact,

            wcag,

            affectedElements: violation.nodes.map((node: any) => ({
                html: node.html,
                target: node.target,
                sourceFile: node.source?.file ?? node.sourceFile ?? node.file ?? null,
                sourceLine: node.source?.line ?? node.sourceLine ?? node.line ?? null,
                sourceColumn: node.source?.column ?? node.sourceColumn ?? node.column ?? null,
            }))

        };

    });

}
