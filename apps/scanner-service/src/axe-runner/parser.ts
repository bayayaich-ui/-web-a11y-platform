import { getWCAGCriterion } from "./mapping";


export function parseAxeResults(results: any) {

    return results.violations.map((violation: any) => {

        const wcag = getWCAGCriterion(violation.id);

        return {

            rule: violation.id,

            description: violation.description,

            help: violation.help,

            impact: violation.impact,

            wcag: wcag,

            affectedElements: violation.nodes.map((node: any) => ({
                html: node.html,
                target: node.target
            }))

        };

    });

}
