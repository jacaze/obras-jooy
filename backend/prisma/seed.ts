import {
  PrismaClient,
  PerfilUsuario,
  StatusRequisicao,
  TipoMovimentacao,
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

  // 3. Seed da Obra Inicial e Pavimentos/Setores (T05)
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

  // 2. Seed de Usuarios para Apresentacao do MVP (Todos os 5 Perfis)
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
      update: {
        nome: usr.nome,
        senhaHash: senhaHashPadrao,
        perfil: usr.perfil,
        cargoId: usr.cargoId,
        obraId: usr.obraId,
        ativo: true,
      },
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
      update: { descricao: un.descricao },
      create: { sigla: un.sigla, descricao: un.descricao },
    })
    unidadesMap[un.sigla] = criada.id
  }

  // 5. Seed de Categorias de Materiais (T07)
  const categoriasIniciais = [
    'Alvenaria e Cimento',
    'Aco e Estrutura',
    'Eletrica',
    'Hidraulica',
    'Pintura e Acabamento',
    'EPIs e Seguranca',
    'Ferramentas Manuais',
    'Ferramentas Eletricas',
    'Madeiras e Formas',
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

  // 6. Seed de Materiais Iniciais Demonstrativos (T07 / F03)
  const materiaisIniciais = [
    {
      codigo: 'MAT-001',
      codigoSienge: '74201',
      descricao: 'Cimento CP-II F 32 50kg',
      categoriaId: categoriasMap['Alvenaria e Cimento'],
      unidadeCompraId: unidadesMap['SC'],
      unidadeConsumoId: unidadesMap['KG'],
      fatorConversao: 50.0,
      ehKit: false,
      exigeTesteQualidade: true,
      ativo: true,
    },
    {
      codigo: 'MAT-002',
      codigoSienge: null,
      descricao: 'Areia Media Lavada',
      categoriaId: categoriasMap['Alvenaria e Cimento'],
      unidadeCompraId: null,
      unidadeConsumoId: unidadesMap['M3'],
      fatorConversao: 1.0,
      ehKit: false,
      exigeTesteQualidade: false,
      ativo: true,
    },
    {
      codigo: 'MAT-003',
      codigoSienge: '88340',
      descricao: 'Cabo Flexivel 2,5mm 750V Azul',
      categoriaId: categoriasMap['Eletrica'],
      unidadeCompraId: unidadesMap['RL'],
      unidadeConsumoId: unidadesMap['M'],
      fatorConversao: 100.0,
      ehKit: false,
      exigeTesteQualidade: false,
      ativo: true,
    },
    {
      codigo: 'MAT-004',
      codigoSienge: null,
      descricao: 'Luva de Vaqueta Mista',
      categoriaId: categoriasMap['EPIs e Seguranca'],
      unidadeCompraId: null,
      unidadeConsumoId: unidadesMap['PAR'],
      fatorConversao: 1.0,
      ehKit: false,
      exigeTesteQualidade: false,
      ativo: true,
    },
  ]

  const materiaisMap: Record<string, string> = {}

  for (const mat of materiaisIniciais) {
    const criado = await prisma.material.upsert({
      where: { codigo: mat.codigo },
      update: {
        codigoSienge: mat.codigoSienge,
        descricao: mat.descricao,
        categoriaId: mat.categoriaId,
        unidadeCompraId: mat.unidadeCompraId,
        unidadeConsumoId: mat.unidadeConsumoId,
        fatorConversao: mat.fatorConversao,
        ehKit: mat.ehKit,
        exigeTesteQualidade: mat.exigeTesteQualidade,
        ativo: mat.ativo,
      },
      create: mat,
    })
    materiaisMap[mat.codigo] = criado.id
  }

  // 7. Seed de Ferramentas Iniciais Demonstrativas (incluindo 1 emprestada para o Encarregado)
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
      update: {
        nome: fer.nome,
        status: fer.status,
        emprestadoParaId: fer.emprestadoParaId,
        ativo: fer.ativo,
      },
      create: fer,
    })
  }

  // 8. Seed de Local de Estoque e Saldos Iniciais na Obra JOOY-01
  const localPrincipal = await prisma.localEstoque.upsert({
    where: {
      local_estoque_obra_nome_unico: {
        obraId: obraInicial.id,
        nome: 'Almoxarifado Central - JOOY-01',
      },
    },
    update: { ativo: true },
    create: {
      obraId: obraInicial.id,
      nome: 'Almoxarifado Central - JOOY-01',
      ativo: true,
    },
  })

  const saldosIniciais = [
    {
      codigoMat: 'MAT-001',
      quantidade: 2500, // 2500 KG (50 sacos de 50kg)
      chaveIdemp: 'seed-receb-mat-001',
      obs: 'Recebimento NF 4510 - Lote inicial de Cimento CP-II (50 sacos)',
    },
    {
      codigoMat: 'MAT-002',
      quantidade: 45, // 45 M3 de Areia
      chaveIdemp: 'seed-receb-mat-002',
      obs: 'Recebimento NF 4512 - Areia Media Lavada para alvenaria',
    },
    {
      codigoMat: 'MAT-003',
      quantidade: 800, // 800 Metros de Cabo Flexivel
      chaveIdemp: 'seed-receb-mat-003',
      obs: 'Recebimento NF 4520 - 8 rolos de 100m Cabo 2,5mm',
    },
    {
      codigoMat: 'MAT-004',
      quantidade: 180, // 180 Pares de Luva de Vaqueta
      chaveIdemp: 'seed-receb-mat-004',
      obs: 'Recebimento NF 4530 - Lote trimestral de EPIs',
    },
  ]

  for (const item of saldosIniciais) {
    const materialId = materiaisMap[item.codigoMat]
    await prisma.estoqueSaldo.upsert({
      where: {
        localId_materialId: {
          localId: localPrincipal.id,
          materialId,
        },
      },
      update: {},
      create: {
        localId: localPrincipal.id,
        materialId,
        quantidade: item.quantidade,
        reservado: 0,
      },
    })

    await prisma.movimentacaoEstoque.upsert({
      where: { chaveIdempotencia: item.chaveIdemp },
      update: {},
      create: {
        localId: localPrincipal.id,
        materialId,
        tipo: TipoMovimentacao.ENTRADA_RECEB,
        quantidade: item.quantidade,
        usuarioId: usuariosMap['almoxarife'],
        chaveIdempotencia: item.chaveIdemp,
        observacao: item.obs,
      },
    })
  }

  // 9. Seed de Limites de Orcamento da Engenharia para a Obra JOOY-01 (T13)
  const orcamentosDemo = [
    {
      codigoMat: 'MAT-001',
      quantidadeOrcada: 3000, // Dentro do limite
      observacao: 'Meta prevista para concretagem e alvenaria dos 3 primeiros pavimentos',
    },
    {
      codigoMat: 'MAT-003',
      quantidadeOrcada: 500, // Em atencao (>80% consumido)
      observacao: 'Teto de cabeamento eletrico etapa 1',
    },
    {
      codigoMat: 'MAT-004',
      quantidadeOrcada: 100, // Ultrapassado (consumido 125 pares > 100 pares orcados!)
      observacao: 'Meta inicial de EPIs (Luva de Vaqueta) definida pela Engenharia',
    },
  ]

  for (const orc of orcamentosDemo) {
    const materialId = materiaisMap[orc.codigoMat]
    await prisma.orcamentoObraMaterial.upsert({
      where: {
        orcamento_obra_material_unico: {
          obraId: obraInicial.id,
          materialId,
        },
      },
      update: {
        quantidadeOrcada: orc.quantidadeOrcada,
        observacao: orc.observacao,
      },
      create: {
        obraId: obraInicial.id,
        materialId,
        quantidadeOrcada: orc.quantidadeOrcada,
        observacao: orc.observacao,
      },
    })
  }

  // 10. Seed de Requisicoes Demonstrativas (Atendida pendente de exportacao SIENGE + Solicitada na fila)
  const reqAtendidaExistente = await prisma.requisicao.findUnique({
    where: { chaveIdempotencia: 'seed-req-atendida-01' },
  })

  if (!reqAtendidaExistente) {
    await prisma.requisicao.create({
      data: {
        areaId: areasMap['1o Pavimento'],
        requisitanteId: usuariosMap['encarregado'],
        status: StatusRequisicao.ATENDIDA,
        chaveIdempotencia: 'seed-req-atendida-01',
        observacao: 'EPIs para equipe de alvenaria e instalacao eletrica do 1o pavimento',
        retiradoPor: 'Jose Carlos - Mestre de Obras',
        atendidoPorId: usuariosMap['almoxarife'],
        atendidoEm: new Date(),
        retiradaEm: new Date(),
        exportadaSienge: false,
        itens: {
          create: [
            {
              materialId: materiaisMap['MAT-004'],
              quantidade: 95,
              quantidadeEntregue: 95,
            },
            {
              materialId: materiaisMap['MAT-003'],
              quantidade: 420,
              quantidadeEntregue: 420,
            },
          ],
        },
      },
    })
  }

  const reqPendenteExistente = await prisma.requisicao.findUnique({
    where: { chaveIdempotencia: 'seed-req-pendente-02' },
  })

  if (!reqPendenteExistente) {
    await prisma.requisicao.create({
      data: {
        areaId: areasMap['2o Pavimento'],
        requisitanteId: usuariosMap['encarregado'],
        status: StatusRequisicao.SOLICITADA,
        chaveIdempotencia: 'seed-req-pendente-02',
        observacao: 'Reforco de EPIs e cimento para inicio da alvenaria no 2o pavimento',
        itens: {
          create: [
            {
              materialId: materiaisMap['MAT-004'],
              quantidade: 30, // 95 entregues + 30 pendentes = 125 (> 100 orcados -> estouro!)
            },
            {
              materialId: materiaisMap['MAT-001'],
              quantidade: 500,
            },
          ],
        },
      },
    })
  }

  console.log('Seed demonstrativo do MVP concluido com sucesso!')
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
