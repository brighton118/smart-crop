import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("Checking if user exists...");
    const users = await prisma.$queryRawUnsafe(`SELECT id, email FROM auth.users WHERE email = 'brightonkato317@gmail.com'`);

    if (users.length === 0) {
        console.log("User does not exist in auth.users! You must register an account first.");
        process.exit(1);
    } else {
        console.log("User exists. Updating password...");
        await prisma.$executeRawUnsafe(`UPDATE auth.users SET encrypted_password = crypt('password123', gen_salt('bf')) WHERE email = 'brightonkato317@gmail.com'`);
        console.log("Password updated successfully.");
        process.exit(0);
    }
}

main().catch(console.error);
