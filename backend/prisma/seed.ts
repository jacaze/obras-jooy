import { PrismaClient, PerfilUsuario } from '@prisma/client'
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

  // 2. Seed do Usuario Administrador Inicial
  const totalUsuarios = await prisma.usuario.count()

  if (totalUsuarios === 0) {
    const cargoAdminId = cargosMap['Administrador do Sistema']
    const senhaHash = await bcrypt.hash(env.ADMIN_PASSWORD, 10)

    await prisma.usuario.create({
      data: {
        nome: env.ADMIN_NOME,
        login: env.ADMIN_LOGIN.toLowerCase().trim(),
        senhaHash,
        perfil: PerfilUsuario.ADMIN,
        cargoId: cargoAdminId,
        ativo: true,
      },
    })

    console.log(`Usuario administrador inicial criado com sucesso: ${env.ADMIN_LOGIN}`)
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

  for (const area of areasIniciais) {
    await prisma.areaObra.upsert({
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

  // 6. Seed de Materiais Iniciais Demonstrativos (T07)
  const materiaisIniciais = [
    {
      codigo: 'MAT-001',
      descricao: 'Cimento CP-II F 32 50kg',
      categoriaId: categoriasMap['Alvenaria e Cimento'],
      tipoControle: 'CONSUMO' as const,
      unidadeCompraId: unidadesMap['SC'],
      unidadeConsumoId: unidadesMap['KG'],
      fatorConversao: 50.0,
      ehKit: false,
      exigeTesteQualidade: true,
      ativo: true,
    },
    {
      codigo: 'MAT-002',
      descricao: 'Areia Media Lavada',
      categoriaId: categoriasMap['Alvenaria e Cimento'],
      tipoControle: 'CONSUMO' as const,
      unidadeCompraId: unidadesMap['M3'],
      unidadeConsumoId: unidadesMap['M3'],
      fatorConversao: 1.0,
      ehKit: false,
      exigeTesteQualidade: false,
      ativo: true,
    },
    {
      codigo: 'MAT-003',
      descricao: 'Cabo Flexivel 2,5mm 750V Azul',
      categoriaId: categoriasMap['Eletrica'],
      tipoControle: 'CONSUMO' as const,
      unidadeCompraId: unidadesMap['RL'],
      unidadeConsumoId: unidadesMap['M'],
      fatorConversao: 100.0,
      ehKit: false,
      exigeTesteQualidade: false,
      ativo: true,
    },
    {
      codigo: 'MAT-004',
      descricao: 'Luva de Vaqueta Mista',
      categoriaId: categoriasMap['EPIs e Seguranca'],
      tipoControle: 'CONSUMO' as const,
      unidadeCompraId: unidadesMap['PAR'],
      unidadeConsumoId: unidadesMap['PAR'],
      fatorConversao: 1.0,
      ehKit: false,
      exigeTesteQualidade: false,
      ativo: true,
    },
    {
      codigo: 'MAT-005',
      descricao: 'Martelete Perfurador Rompedor 800W',
      categoriaId: categoriasMap['Ferramentas Eletricas'],
      tipoControle: 'FERRAMENTA_PATRIMONIO' as const,
      unidadeCompraId: unidadesMap['UN'],
      unidadeConsumoId: unidadesMap['UN'],
      fatorConversao: 1.0,
      ehKit: false,
      exigeTesteQualidade: true,
      ativo: true,
    },
  ]

  for (const mat of materiaisIniciais) {
    await prisma.material.upsert({
      where: { codigo: mat.codigo },
      update: {
        descricao: mat.descricao,
        categoriaId: mat.categoriaId,
        tipoControle: mat.tipoControle,
        unidadeCompraId: mat.unidadeCompraId,
        unidadeConsumoId: mat.unidadeConsumoId,
        fatorConversao: mat.fatorConversao,
        ehKit: mat.ehKit,
        exigeTesteQualidade: mat.exigeTesteQualidade,
        ativo: mat.ativo,
      },
      create: mat,
    })
  }
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
