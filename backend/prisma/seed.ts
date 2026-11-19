import {
  PrismaClient,
  PerfilUsuario,
  StatusEtapa,
} from '@prisma/client'
import bcrypt from 'bcryptjs'
import { env } from '../src/config/env.js'

const prisma = new PrismaClient()

export async function seedDatabase() {
  // 1. Seed de Cargos Iniciais
  const cargosIniciais = [
    'Administrador do Sistema',
    'Almoxarife',
    'Encarregado de Obras',
    'Engenheiro Residente',
    'Assistente Administrativo',
  ]

  const cargosMap: Record<string, string> = {}

  for (const nomeCargo of cargosIniciais) {
    const cargo = await prisma.cargo.upsert({
      where: { nome: nomeCargo },
      update: {},
      create: { nome: nomeCargo },
    })
    cargosMap[nomeCargo] = cargo.id
  }

  // 2. Seed da Obra Inicial e Pavimentos/Setores (T05)
  const obraInicial = await prisma.obra.upsert({
    where: { codigo: 'JOOY-01' },
    update: {},
    create: {
      codigo: 'JOOY-01',
      nome: 'Residencial Jooy Reserva',
      cidade: 'Campo Grande',
      ativa: true,
    },
  })

  // 3. Seed de Usuarios para Apresentacao do MVP (Todos os 5 Perfis)
  const senhaHashPadrao = await bcrypt.hash(env.ADMIN_PASSWORD, 10)

  const usuariosDemo = [
    {
      login: env.ADMIN_LOGIN.toLowerCase().trim(),
      nome: env.ADMIN_NOME,
      perfil: PerfilUsuario.ADMIN,
      cargoId: cargosMap['Administrador do Sistema'],
      obraId: null,
    },
    {
      login: 'almoxarife',
      nome: 'Maria Silva (Almoxarife)',
      perfil: PerfilUsuario.ALMOXARIFE,
      cargoId: cargosMap['Almoxarife'],
      obraId: obraInicial.id,
    },
    {
      login: 'engenharia',
      nome: 'Carlos Mendes (Engenheiro)',
      perfil: PerfilUsuario.ENGENHARIA,
      cargoId: cargosMap['Engenheiro Residente'],
      obraId: null,
    },
    {
      login: 'administracao',
      nome: 'Ana Paula (Administracao)',
      perfil: PerfilUsuario.ADMINISTRACAO,
      cargoId: cargosMap['Assistente Administrativo'],
      obraId: null,
    },
    {
      login: 'encarregado',
      nome: 'Marcos Oliveira (Encarregado)',
      perfil: PerfilUsuario.ENCARREGADO,
      cargoId: cargosMap['Encarregado de Obras'],
      obraId: obraInicial.id,
    },
  ]

  const usuariosMap: Record<string, string> = {}

  for (const usr of usuariosDemo) {
    const criado = await prisma.usuario.upsert({
      where: { login: usr.login },
      update: {},
      create: {
        nome: usr.nome,
        login: usr.login,
        senhaHash: senhaHashPadrao,
        perfil: usr.perfil,
        cargoId: usr.cargoId,
        obraId: usr.obraId,
        ativo: true,
      },
    })
    usuariosMap[usr.login] = criado.id
  }

  const areasIniciais = [
    { nome: 'Subsolo 02', ordem: -2 },
    { nome: 'Subsolo 01', ordem: -1 },
    { nome: 'Terreo / Acesso', ordem: 0 },
    { nome: '1o Pavimento', ordem: 1 },
    { nome: '2o Pavimento', ordem: 2 },
    { nome: '3o Pavimento', ordem: 3 },
    { nome: 'Area Comum / Lazer', ordem: 10 },
    { nome: 'Cobertura', ordem: 20 },
  ]

  const areasMap: Record<string, string> = {}

  for (const area of areasIniciais) {
    const areaCriada = await prisma.areaObra.upsert({
      where: {
        area_obra_nome_unico: {
          obraId: obraInicial.id,
          nome: area.nome,
        },
      },
      update: {},
      create: {
        obraId: obraInicial.id,
        nome: area.nome,
        ordem: area.ordem,
        ativa: true,
      },
    })
    areasMap[area.nome] = areaCriada.id
  }

  // Seed de Etapas Demonstrativas por Area (F02)
  if (areasMap['Terreo / Acesso']) {
    const terreoId = areasMap['Terreo / Acesso']
    await prisma.etapaArea.upsert({
      where: {
        etapa_area_nome_unico: {
          areaId: terreoId,
          nome: 'Fundacao e Baldrames',
        },
      },
      update: {},
      create: {
        areaId: terreoId,
        nome: 'Fundacao e Baldrames',
        ordem: 1,
        status: StatusEtapa.ENCERRADA,
        encerradaEm: new Date(),
      },
    })

    await prisma.etapaArea.upsert({
      where: {
        etapa_area_nome_unico: {
          areaId: terreoId,
          nome: 'Alvenaria Estrutural',
        },
      },
      update: {},
      create: {
        areaId: terreoId,
        nome: 'Alvenaria Estrutural',
        ordem: 2,
        status: StatusEtapa.EM_ANDAMENTO,
      },
    })

    await prisma.etapaArea.upsert({
      where: {
        etapa_area_nome_unico: {
          areaId: terreoId,
          nome: 'Pisos e Revestimentos',
        },
      },
      update: {},
      create: {
        areaId: terreoId,
        nome: 'Pisos e Revestimentos',
        ordem: 3,
        status: StatusEtapa.EM_ANDAMENTO,
      },
    })
  }

  if (areasMap['1o Pavimento']) {
    const pav1Id = areasMap['1o Pavimento']
    await prisma.etapaArea.upsert({
      where: {
        etapa_area_nome_unico: {
          areaId: pav1Id,
          nome: 'Concretagem e Lajes',
        },
      },
      update: {},
      create: {
        areaId: pav1Id,
        nome: 'Concretagem e Lajes',
        ordem: 1,
        status: StatusEtapa.EM_ANDAMENTO,
      },
    })
  }

  // 4. Seed de Unidades de Medida (T07)
  const unidadesIniciais = [
    { sigla: 'UN', descricao: 'Unidade' },
    { sigla: 'KG', descricao: 'Quilograma' },
    { sigla: 'M', descricao: 'Metro' },
    { sigla: 'M2', descricao: 'Metro Quadrado' },
    { sigla: 'M3', descricao: 'Metro Cubico' },
    { sigla: 'L', descricao: 'Litro' },
    { sigla: 'CX', descricao: 'Caixa' },
    { sigla: 'SC', descricao: 'Saco' },
    { sigla: 'RL', descricao: 'Rolo' },
    { sigla: 'PC', descricao: 'Peca' },
    { sigla: 'PAR', descricao: 'Par' },
    { sigla: 'GL', descricao: 'Galao' },
  ]

  const unidadesMap: Record<string, string> = {}
  for (const un of unidadesIniciais) {
    const criada = await prisma.unidadeMedida.upsert({
      where: { sigla: un.sigla },
      update: {},
      create: { sigla: un.sigla, descricao: un.descricao },
    })
    unidadesMap[un.sigla] = criada.id
  }

  // 5. Seed de Categorias de Materiais (incluindo categorias criadas no site pelo usuario)
  const categoriasIniciais = [
    'Aço - barras',
    'Aço - telas',
    'Aco e Estrutura',
    'Alvenaria e Cimento',
    'Complementos de armação',
    'Concreto',
    'Eletrica',
    'EPIs e Seguranca',
    'Ferramentas Eletricas',
    'Ferramentas Manuais',
    'Formas e acessórios',
    'Hidraulica',
    'Higiene, Limpeza e Copa',
    'Madeiras e Formas',
    'Pintura e Acabamento',
  ]

  const categoriasMap: Record<string, string> = {}
  for (const cat of categoriasIniciais) {
    const criada = await prisma.categoriaMaterial.upsert({
      where: { nome: cat },
      update: {},
      create: { nome: cat },
    })
    categoriasMap[cat] = criada.id
  }

  // 6. Seed dos 49 Materiais da Planilha estoque.xlsx (vinculados as categorias e unidades devidas, sem saldo inicial)
  const listaPlanilhaMateriais: Array<{
    codigo: string
    descricao: string
    unidadeSigla: string
    categoriaNome: string
  }> = [
    { codigo: 'MAT-001', descricao: 'Disco p/ferro 115 x 1,0mm x 22', unidadeSigla: 'UN', categoriaNome: 'Ferramentas Eletricas' },
    { codigo: 'MAT-002', descricao: 'Disco p/ ferro 115mm x 1,0 x 2', unidadeSigla: 'UN', categoriaNome: 'Ferramentas Eletricas' },
    { codigo: 'MAT-003', descricao: 'Rebolo diamantado 115mm / R', unidadeSigla: 'UN', categoriaNome: 'Ferramentas Eletricas' },
    { codigo: 'MAT-004', descricao: 'Tenda 3x3', unidadeSigla: 'UN', categoriaNome: 'EPIs e Seguranca' },
    { codigo: 'MAT-005', descricao: 'Corda poliéster 100m', unidadeSigla: 'M', categoriaNome: 'EPIs e Seguranca' },
    { codigo: 'MAT-006', descricao: 'Fio de nylon', unidadeSigla: 'UN', categoriaNome: 'Ferramentas Manuais' },
    { codigo: 'MAT-007', descricao: 'Mangueira preta', unidadeSigla: 'UN', categoriaNome: 'Hidraulica' },
    { codigo: 'MAT-008', descricao: 'Serra copo 127mm', unidadeSigla: 'UN', categoriaNome: 'Ferramentas Eletricas' },
    { codigo: 'MAT-009', descricao: 'Suporte de serra copo com bro', unidadeSigla: 'UN', categoriaNome: 'Ferramentas Eletricas' },
    { codigo: 'MAT-010', descricao: 'Serra copo 40mm', unidadeSigla: 'UN', categoriaNome: 'Ferramentas Eletricas' },
    { codigo: 'MAT-011', descricao: 'Serra copo 38mm', unidadeSigla: 'UN', categoriaNome: 'Ferramentas Eletricas' },
    { codigo: 'MAT-012', descricao: 'Serra copo 32mm', unidadeSigla: 'UN', categoriaNome: 'Ferramentas Eletricas' },
    { codigo: 'MAT-013', descricao: 'Serra copo 19mm', unidadeSigla: 'UN', categoriaNome: 'Ferramentas Eletricas' },
    { codigo: 'MAT-014', descricao: 'Serra copo 25mm', unidadeSigla: 'UN', categoriaNome: 'Ferramentas Eletricas' },
    { codigo: 'MAT-015', descricao: 'Serra copo diamantada 50mm', unidadeSigla: 'UN', categoriaNome: 'Ferramentas Eletricas' },
    { codigo: 'MAT-016', descricao: 'Serra copo diamantada', unidadeSigla: 'UN', categoriaNome: 'Ferramentas Eletricas' },
    { codigo: 'MAT-017', descricao: 'Pasta lubrificante', unidadeSigla: 'KG', categoriaNome: 'Hidraulica' },
    { codigo: 'MAT-018', descricao: 'T. 85x75mm', unidadeSigla: 'UN', categoriaNome: 'Hidraulica' },
    { codigo: 'MAT-019', descricao: 'T. 75mm', unidadeSigla: 'UN', categoriaNome: 'Hidraulica' },
    { codigo: 'MAT-020', descricao: 'Cotovelo 90° - 85mm', unidadeSigla: 'UN', categoriaNome: 'Hidraulica' },
    { codigo: 'MAT-021', descricao: 'Bucha redutora 110 x 75mm', unidadeSigla: 'UN', categoriaNome: 'Hidraulica' },
    { codigo: 'MAT-022', descricao: 'Curva 90° - DN 50 Esgoto', unidadeSigla: 'UN', categoriaNome: 'Hidraulica' },
    { codigo: 'MAT-023', descricao: 'T. DN 50 esgoto', unidadeSigla: 'UN', categoriaNome: 'Hidraulica' },
    { codigo: 'MAT-024', descricao: 'T. DN 75x50mm', unidadeSigla: 'UN', categoriaNome: 'Hidraulica' },
    { codigo: 'MAT-025', descricao: 'T. DN 100x50mm', unidadeSigla: 'UN', categoriaNome: 'Hidraulica' },
    { codigo: 'MAT-026', descricao: 'T. DN 100mm', unidadeSigla: 'UN', categoriaNome: 'Hidraulica' },
    { codigo: 'MAT-027', descricao: 'T. DN 150', unidadeSigla: 'UN', categoriaNome: 'Hidraulica' },
    { codigo: 'MAT-028', descricao: 'Y. DN 75x50mm', unidadeSigla: 'UN', categoriaNome: 'Hidraulica' },
    { codigo: 'MAT-029', descricao: 'Y. DN 100x 50mm', unidadeSigla: 'UN', categoriaNome: 'Hidraulica' },
    { codigo: 'MAT-030', descricao: 'Y. 150x100mm', unidadeSigla: 'UN', categoriaNome: 'Hidraulica' },
    { codigo: 'MAT-031', descricao: 'Y. DN 150mm', unidadeSigla: 'UN', categoriaNome: 'Hidraulica' },
    { codigo: 'MAT-032', descricao: 'Luva de correr - esgoto DN 100', unidadeSigla: 'UN', categoriaNome: 'Hidraulica' },
    { codigo: 'MAT-033', descricao: 'Veda rosca 18mm x 50m', unidadeSigla: 'UN', categoriaNome: 'Hidraulica' },
    { codigo: 'MAT-034', descricao: 'Sika AnchorFix', unidadeSigla: 'UN', categoriaNome: 'Alvenaria e Cimento' },
    { codigo: 'MAT-035', descricao: 'Selante PU', unidadeSigla: 'UN', categoriaNome: 'Pintura e Acabamento' },
    { codigo: 'MAT-036', descricao: 'Copo descartável', unidadeSigla: 'UN', categoriaNome: 'Higiene, Limpeza e Copa' },
    { codigo: 'MAT-037', descricao: 'Porta copo descartável', unidadeSigla: 'UN', categoriaNome: 'Higiene, Limpeza e Copa' },
    { codigo: 'MAT-038', descricao: 'Papel higiênico', unidadeSigla: 'UN', categoriaNome: 'Higiene, Limpeza e Copa' },
    { codigo: 'MAT-039', descricao: 'Spray vermelho', unidadeSigla: 'UN', categoriaNome: 'Pintura e Acabamento' },
    { codigo: 'MAT-040', descricao: 'Spray amarelo', unidadeSigla: 'UN', categoriaNome: 'Pintura e Acabamento' },
    { codigo: 'MAT-041', descricao: 'Spray rosa', unidadeSigla: 'UN', categoriaNome: 'Pintura e Acabamento' },
    { codigo: 'MAT-042', descricao: 'Spray verde claro', unidadeSigla: 'UN', categoriaNome: 'Pintura e Acabamento' },
    { codigo: 'MAT-043', descricao: 'Spray azul claro', unidadeSigla: 'UN', categoriaNome: 'Pintura e Acabamento' },
    { codigo: 'MAT-044', descricao: 'Spray azul escuro', unidadeSigla: 'UN', categoriaNome: 'Pintura e Acabamento' },
    { codigo: 'MAT-045', descricao: 'Spray dourado metal', unidadeSigla: 'UN', categoriaNome: 'Pintura e Acabamento' },
    { codigo: 'MAT-046', descricao: 'Spray 400ml azul claro', unidadeSigla: 'UN', categoriaNome: 'Pintura e Acabamento' },
    { codigo: 'MAT-047', descricao: 'WD - 40', unidadeSigla: 'UN', categoriaNome: 'Ferramentas Manuais' },
    { codigo: 'MAT-048', descricao: 'Álcool líquido 5l', unidadeSigla: 'L', categoriaNome: 'Higiene, Limpeza e Copa' },
    { codigo: 'MAT-049', descricao: 'Desinfetante Bio- kriss', unidadeSigla: 'UN', categoriaNome: 'Higiene, Limpeza e Copa' },
  ]

  for (const item of listaPlanilhaMateriais) {
    const categoriaId = categoriasMap[item.categoriaNome]
    const unidadeConsumoId = unidadesMap[item.unidadeSigla]

    await prisma.material.upsert({
      where: { codigo: item.codigo },
      update: {},
      create: {
        codigo: item.codigo,
        codigoSienge: null,
        descricao: item.descricao,
        categoriaId,
        unidadeCompraId: null,
        unidadeConsumoId,
        fatorConversao: 1.0,
        ehKit: false,
        exigeTesteQualidade: false,
        ativo: true,
      },
    })
  }

  // 7. Seed de Ferramentas Iniciais Demonstrativas (nao sobrescreve status caso ja exista)
  const ferramentasIniciais = [
    {
      codigo: 'FER-001',
      nome: 'Martelete Perfurador Rompedor 800W',
      status: 'DISPONIVEL' as const,
      emprestadoParaId: null,
      ativo: true,
    },
    {
      codigo: 'FER-002',
      nome: 'Serra Circular Manual 7.1/4"',
      status: 'EMPRESTADO' as const,
      emprestadoParaId: usuariosMap['encarregado'],
      ativo: true,
    },
    {
      codigo: 'FER-003',
      nome: 'Nivel a Laser Autonivelante',
      status: 'DISPONIVEL' as const,
      emprestadoParaId: null,
      ativo: true,
    },
    {
      codigo: 'FER-004',
      nome: 'Furadeira de Impacto 1/2" 650W',
      status: 'COM_DEFEITO' as const,
      emprestadoParaId: null,
      ativo: true,
    },
  ]

  for (const fer of ferramentasIniciais) {
    await prisma.ferramenta.upsert({
      where: { codigo: fer.codigo },
      update: {},
      create: fer,
    })
  }

  // 8. Seed do Local de Estoque Central na Obra JOOY-01 (sem saldos iniciais nem requisicoes demo)
  await prisma.localEstoque.upsert({
    where: {
      local_estoque_obra_nome_unico: {
        obraId: obraInicial.id,
        nome: 'Almoxarifado Central - JOOY-01',
      },
    },
    update: {},
    create: {
      obraId: obraInicial.id,
      nome: 'Almoxarifado Central - JOOY-01',
      ativo: true,
    },
  })

  console.log('Seed do catalogo de materiais e configuracoes base concluido com sucesso!')
}

if (process.env.NODE_ENV !== 'test') {
  seedDatabase()
    .catch((e) => {
      console.error('Erro durante execucao do seed:', e)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
