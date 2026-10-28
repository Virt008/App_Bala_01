import { syncSheetsCatalog } from '../src/utils/sheetsAuthSync';
import { getSavedProducts, saveProducts } from '../src/utils/storage';
import { exportToCsv, parseCsvContent } from '../src/utils/csv';
import { Product } from '../src/types';

// Mock localStorage for Node environment
const storageMock: Record<string, string> = {};
(global as any).localStorage = {
  getItem: (key: string) => storageMock[key] || null,
  setItem: (key: string, val: string) => { storageMock[key] = String(val); },
  removeItem: (key: string) => { delete storageMock[key]; },
  clear: () => { Object.keys(storageMock).forEach(k => delete storageMock[k]); }
};

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FALHA: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ SUCESSO: ${msg}`);
}

async function runTests() {
  console.log('=== INICIANDO TESTES DO FLUXO DE DESCRIÇÃO (DESCRICAO) ===\n');

  // TESTE 1: Produto novo com descricao retornado no JSON da API
  console.log('--- Teste 1: Sincronização de produto com descricao vindo da API ---');
  // Mock fetch para simular resposta da API do Google Apps Script
  const mockApiResponse = {
    sucesso: true,
    total: 3,
    produtos: [
      {
        id: '101',
        codigo: '101',
        nome: 'Banana Prata',
        preco: '7,99',
        unidade: 'kg',
        descricao: 'Vendido a granel, ponto de maturação médio',
        disponibilidade: true,
      },
      {
        id: '102',
        codigo: '102',
        nome: 'Maçã Gala',
        preco: '10,50',
        unidade: 'kg',
        description: 'Fruta fresca nacional, selecionada',
        disponibilidade: true,
      },
      {
        id: '103',
        codigo: '103',
        nome: 'Melancia Inteira',
        preco: '3,20',
        unidade: 'kg',
        // Sem descrição na planilha
        disponibilidade: true,
      }
    ]
  };

  (global as any).fetch = async () => ({
    ok: true,
    text: async () => JSON.stringify(mockApiResponse),
    json: async () => mockApiResponse,
  });

  const localExisting: Product[] = [
    {
      id: 'existing-103',
      name: 'Melancia Inteira',
      code: '103',
      descricao: 'Descrição local prévia que não deve ser perdida',
      description: 'Descrição local prévia que não deve ser perdida',
      createdAt: 1000,
      updatedAt: 1000,
    }
  ];

  const syncResult = await syncSheetsCatalog('https://fake-endpoint.test', 'fake-token', localExisting);
  assert(syncResult.sucesso, 'syncSheetsCatalog deve retornar sucesso = true');
  assert(!!syncResult.produtos && syncResult.produtos.length === 3, 'Deve retornar 3 produtos');

  const produtosList = syncResult.produtos || [];

  const prod101 = produtosList.find(p => p.code === '101');
  assert(prod101 !== undefined, 'Produto 101 deve existir');
  assert(prod101?.descricao === 'Vendido a granel, ponto de maturação médio', 'prod101.descricao deve conter a descrição da API');
  assert(prod101?.description === 'Vendido a granel, ponto de maturação médio', 'prod101.description deve estar sincronizado');

  const prod102 = produtosList.find(p => p.code === '102');
  assert(prod102?.descricao === 'Fruta fresca nacional, selecionada', 'prod102.descricao deve mapear a chave description');

  // TESTE 2: Não sobrescrever descrição local válida quando a planilha/API vier vazia
  console.log('\n--- Teste 2: Preservação de descrição local quando resposta remota for vazia ---');
  const prod103 = produtosList.find(p => p.code === '103');
  assert(prod103?.descricao === 'Descrição local prévia que não deve ser perdida', 'prod103.descricao deve preservar o valor local');
  assert(prod103?.description === 'Descrição local prévia que não deve ser perdida', 'prod103.description deve preservar o valor local');

  // TESTE 3: Persistência no armazenamento local (saveProducts e getSavedProducts)
  console.log('\n--- Teste 3: Gravação e recuperação no armazenamento local ---');
  saveProducts(produtosList);
  const reloaded = getSavedProducts();
  assert(reloaded.length === 3, 'Deve carregar 3 produtos do armazenamento');
  const reloaded101 = reloaded.find(p => p.code === '101');
  assert(reloaded101?.descricao === 'Vendido a granel, ponto de maturação médio', 'reloaded101.descricao deve ser recuperada idêntica');
  assert(reloaded101?.description === 'Vendido a granel, ponto de maturação médio', 'reloaded101.description deve ser recuperada idêntica');

  // TESTE 4: Exportação e importação CSV preservando descrição
  console.log('\n--- Teste 4: Ciclo completo CSV (exportação e importação com coluna 6) ---');
  const csvText = exportToCsv(reloaded);
  assert(csvText.includes('Vendido a granel, ponto de maturação médio'), 'CSV gerado deve conter a descrição');
  assert(csvText.startsWith('codigo;nome;preco;unidade;disponibilidade;descricao'), 'Cabeçalho CSV deve incluir coluna descricao');

  const parsedCsv = parseCsvContent(csvText);
  assert(parsedCsv.validProducts.length === 3, 'CSV deve analisar 3 produtos válidos');
  const parsed101 = parsedCsv.validProducts.find(p => p.code === '101');
  assert(parsed101?.descricao === 'Vendido a granel, ponto de maturação médio', 'parsed101.descricao do CSV deve ser idêntica');
  assert(parsed101?.description === 'Vendido a granel, ponto de maturação médio', 'parsed101.description do CSV deve ser idêntica');

  // TESTE 5: Alternância do status de disponibilidade (Disponível <-> Esgotado) e persistência local
  console.log('\n--- Teste 5: Alternância de Disponibilidade (Disponível <-> Esgotado) ---');
  const { saveLocalAvailability, getLocalAvailabilityMap } = await import('../src/utils/storage');
  
  // Marca 101 como Esgotado (false)
  saveLocalAvailability('101', false);
  let availMap = getLocalAvailabilityMap();
  assert(availMap['101'] === false, 'Produto 101 deve estar marcado como Esgotado no mapa local');
  let productsWithAvailability = getSavedProducts();
  let prod101Check = productsWithAvailability.find(p => p.code === '101');
  assert(prod101Check?.isAvailable === false, 'Produto 101 deve carregar como Esgotado');

  // Alterna 101 de volta para Disponível (true)
  saveLocalAvailability('101', true);
  availMap = getLocalAvailabilityMap();
  assert(availMap['101'] === true, 'Produto 101 deve alternar de volta para Disponível');
  productsWithAvailability = getSavedProducts();
  prod101Check = productsWithAvailability.find(p => p.code === '101');
  assert(prod101Check?.isAvailable === true, 'Produto 101 deve carregar como Disponível');

  // TESTE 6: Verificação de remoção de edição manual na interface
  console.log('\n--- Teste 6: Ausência de controles de edição manual e formulário ---');
  const fs = await import('fs');
  const path = await import('path');
  
  const rootDir = process.cwd();
  const productFormModalPath = path.resolve(rootDir, 'src/components/ProductFormModal.tsx');
  assert(!fs.existsSync(productFormModalPath), 'ProductFormModal.tsx não deve mais existir no projeto');

  const appTsxContent = fs.readFileSync(path.resolve(rootDir, 'src/App.tsx'), 'utf-8');
  assert(!appTsxContent.includes('<Edit2'), 'App.tsx não deve renderizar ícone de edição Edit2');
  assert(!appTsxContent.includes('<span>Novo</span>'), 'App.tsx não deve conter o botão Novo de cadastro');
  assert(!appTsxContent.includes('ProductFormModal'), 'App.tsx não deve importar ou usar ProductFormModal');

  const spotlightContent = fs.readFileSync(path.resolve(rootDir, 'src/components/SpotlightModal.tsx'), 'utf-8');
  assert(!spotlightContent.includes('Edit2'), 'SpotlightModal não deve importar ou conter botão Edit2');
  assert(!spotlightContent.includes('onEdit'), 'SpotlightModal não deve possuir prop ou ação onEdit');

  console.log('\n🎉 TODOS OS TESTES PASSARAM COM SUCESSO!');
}

runTests().catch(err => {
  console.error('Erro na execução dos testes:', err);
  process.exit(1);
});
