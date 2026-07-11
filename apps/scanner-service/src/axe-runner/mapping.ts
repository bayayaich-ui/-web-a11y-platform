import wcagCriteria from "../data/wcag-2.2-criteria.json";


export function getWCAGCriteria(ruleId: string) {

    const criteria = wcagCriteria.filter((item: any) =>
        item.axe_core_rules.includes(ruleId)
    );

    return criteria;

}
