import createDefaultPlans from './createDefaultPlans';

// Execute a criação dos planos
createDefaultPlans()
  .then(() => {
    console.log('Script de criação de planos finalizado.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Erro ao executar script:', error);
    process.exit(1);
  });
