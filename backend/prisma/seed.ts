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
