module.exports = {
  forbidden: [
    {
      name: 'features-no-container',
      severity: 'error',
      comment: 'features must not import container directly; access operations via useApplication()',
      from: { path: '^src/features' },
      to: { path: '^src/application/ports/container' }
    },
    {
      name: 'context-no-container',
      severity: 'error',
      comment: 'context must not import container directly; access operations via useApplication() or inject dependencies',
      from: { path: '^src/context' },
      to: { path: '^src/application/ports/container' }
    },
    {
      name: 'components-no-container',
      severity: 'error',
      comment: 'components must not import container directly; access operations via useApplication()',
      from: { path: '^src/components' },
      to: { path: '^src/application/ports/container' }
    },
    {
      name: 'hooks-no-container',
      severity: 'error',
      comment: 'hooks must not import container directly; access operations via useApplication()',
      from: { path: '^src/hooks' },
      to: { path: '^src/application/ports/container' }
    },
    {
      name: 'features-no-direct-firestore-services',
      severity: 'error',
      comment: 'features must not import services/firestore directly',
      from: { path: '^src/features' },
      to: { path: '^src/services/firestore' }
    },
    {
      name: 'hooks-no-direct-firestore-services',
      severity: 'error',
      comment: 'hooks must not import services/firestore directly',
      from: { path: '^src/hooks' },
      to: { path: '^src/services/firestore', dependencyTypesNot: ['type-only'] }
    },
    {
      name: 'domain-no-infra',
      severity: 'error',
      comment: 'domain must stay pure',
      from: { path: '^src/domain' },
      to: { path: '^(src/infrastructure|src/services|firebase)' }
    },
    {
      name: 'ports-no-firestore-services',
      severity: 'error',
      comment: 'application ports must not import services/firestore',
      from: { path: '^src/application/ports' },
      to: { path: '^src/services/firestore' }
    },
    {
      name: 'context-no-infrastructure',
      severity: 'error',
      comment: 'context must not import infrastructure directly',
      from: { path: '^src/context' },
      to: { path: '^src/infrastructure' }
    },
    {
      name: 'features-no-infrastructure',
      severity: 'error',
      comment: 'features must not import infrastructure directly',
      from: { path: '^src/features' },
      to: { path: '^src/infrastructure', dependencyTypesNot: ['type-only'] }
    },
    {
      name: 'no-circular',
      severity: 'warn',
      from: {},
      to: { circular: true }
    }
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' }
  }
};
