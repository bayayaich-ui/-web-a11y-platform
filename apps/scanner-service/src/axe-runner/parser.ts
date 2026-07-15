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
                target: node.target
            }))

        };

    });

}
