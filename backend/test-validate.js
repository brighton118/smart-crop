const { execSync } = require('child_process');
try {
    const result = execSync('npx prisma validate', { stdio: 'pipe' });
    console.log("Success:\n", result.toString());
} catch (error) {
    console.error("Error stdout:\n", error.stdout ? error.stdout.toString() : '');
    console.error("Error stderr:\n", error.stderr ? error.stderr.toString() : '');
    console.error("Error message:\n", error.message);
}
