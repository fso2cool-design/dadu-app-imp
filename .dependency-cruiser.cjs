module.exports={
  forbidden:[
    {name:'features-no-direct-firestore-services',severity:'warn',comment:'features must not import services/firestore directly (warn till thin done)',from:{path:'^src/features'},to:{path:'^src/services/firestore'}},
    {name:'domain-no-infra',severity:'error',comment:'domain must stay pure',from:{path:'^src/domain'},to:{path:'^(src/infrastructure|src/services|firebase)'}},
    {name:'no-circular',severity:'warn',from:{},to:{circular:true}}
  ],
  options:{doNotFollow:{path:'node_modules'},tsConfig:{fileName:'tsconfig.json'}}
};
