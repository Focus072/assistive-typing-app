require('dotenv').config({ path: '.env.local' })
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function setupAdmin() {
  try {
    const username = 'galaljobah'
    const email = `${username}@gmail.com`
    const password = 'Galal1023**88'

    console.log(`Setting up admin account for username: ${username} (${email})...`)

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email },
    })

    const hashedPassword = await bcrypt.hash(password, 10)

    if (user) {
      // Update existing user with password
      await prisma.user.update({
        where: { email },
        data: { password: hashedPassword },
      })
      console.log('✅ Admin password updated successfully')
    } else {
      // Create new admin user
      user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
        },
      })
      console.log('✅ Admin account created successfully')
      console.log(`   User ID: ${user.id}`)
    }

    console.log('\n📝 Admin Login Credentials:')
    console.log(`   Email: ${email}`)
    console.log(`   Password: ${password}`)
    console.log('\n🔗 Login at: http://localhost:3002/admin/login')
  } catch (error) {
    console.error('❌ Error setting up admin:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

setupAdmin()
