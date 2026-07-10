import wcagCriteria from "../data/wcag-criteria.json";


export function getWCAGCriterion(ruleId:string){


    const criterion = wcagCriteria.find((item:any)=>

        item.axe_core_rules.includes(ruleId)

    );


    return criterion || null;

}
