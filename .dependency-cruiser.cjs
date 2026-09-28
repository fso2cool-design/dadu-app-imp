module.exports={
  forbidden:[
    {name:'features-no-direct-firestore-services',severity:'error',comment:'features must not import services/firestore directly (use container.repos)',from:{path:'^src/features'},to:{path:'^src/services/firestore', dependencyTypesNot:['type-only']}},
    {name:'hooks-no-direct-firestore-services',severity:'error',comment:'hooks must not import services/firestore directly',from:{path:'^src/hooks'},to:{path:'^src/services/firestore', dependencyTypesNot:['type-only']}},
    {name:'domain-no-infra',severity:'error',comment:'domain must stay pure',from:{path:'^src/domain'},to:{path:'^(src/infrastructure|src/services|firebase)'}},
    {name:'no-circular',severity:'warn',from:{},to:{circular:true}}
  ],
  options:{doNotFollow:{path:'node_modules'},tsConfig:{fileName:'tsconfig.json'}}
};
